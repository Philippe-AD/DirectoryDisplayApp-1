const path = require('path');
const fs = require('fs');

/**
 * Windows reserved device names (case-insensitive).
 */
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/**
 * Windows forbidden characters regex: < > : " / \ | ? * and ASCII 0-31
 */
const FORBIDDEN_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/;

/**
 * Returns canonical system environment paths based on environment variables or provided mocks.
 * @param {object} [mockEnv] Optional mock environment variables for unit testing.
 * @returns {object} Map of system locations.
 */
function getSystemLocations(mockEnv = null) {
  const env = mockEnv || process.env;

  const systemRoot = env.SystemRoot || env.windir || 'C:\\Windows';
  const systemDrive = env.SystemDrive || (systemRoot.slice(0, 2)) || 'C:';
  const programFiles = env.ProgramFiles || `${systemDrive}\\Program Files`;
  const programFilesX86 = env['ProgramFiles(x86)'] || `${systemDrive}\\Program Files (x86)`;
  const programData = env.ProgramData || env.ALLUSERSPROFILE || `${systemDrive}\\ProgramData`;
  const userProfile = env.USERPROFILE || `${systemDrive}\\Users\\Default`;

  const system32 = path.join(systemRoot, 'System32');
  const recycleBin = path.join(systemDrive, '$Recycle.Bin');
  const sysVolInfo = path.join(systemDrive, 'System Volume Information');
  const bootDir = path.join(systemDrive, 'Boot');
  const recoveryDir = path.join(systemDrive, 'Recovery');

  return {
    systemRoot,
    systemDrive,
    programFiles,
    programFilesX86,
    programData,
    userProfile,
    system32,
    recycleBin,
    sysVolInfo,
    bootDir,
    recoveryDir,
  };
}

/**
 * Normalizes path strings securely.
 * Checks for null bytes, absolute paths, and resolves relative components.
 * @param {string} inputPath 
 * @returns {{ valid: boolean, normalizedPath?: string, code?: string, message?: string }}
 */
function normalizePath(inputPath) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    return {
      valid: false,
      code: 'INVALID_PATH',
      message: 'Le chemin d’accès est invalide ou vide.',
    };
  }

  if (inputPath.includes('\0')) {
    return {
      valid: false,
      code: 'INVALID_PATH',
      message: 'Le chemin d’accès contient des caractères nuls interdits.',
    };
  }

  const trimmed = inputPath.trim();
  // Standardize backslashes for Windows path.isAbsolute check if running cross-platform or on Windows
  const standardized = trimmed.replace(/\//g, '\\');
  if (!path.isAbsolute(trimmed) && !path.isAbsolute(standardized) && !/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return {
      valid: false,
      code: 'PATH_NOT_ABSOLUTE',
      message: 'Le chemin d’accès doit être un chemin absolu.',
    };
  }

  const resolved = path.resolve(trimmed);
  const normalized = path.normalize(resolved);

  return {
    valid: true,
    normalizedPath: normalized,
  };
}

/**
 * Checks if candidatePath is equal to or a child of parentPath using path.relative.
 * Avoids false positive string prefix matching (e.g. C:\WindowsBackup vs C:\Windows).
 * @param {string} candidatePath 
 * @param {string} parentPath 
 * @returns {boolean}
 */
function isSameOrChildPath(candidatePath, parentPath) {
  const normCandidate = path.normalize(candidatePath).toLowerCase();
  const normParent = path.normalize(parentPath).toLowerCase();

  if (normCandidate === normParent) {
    return true;
  }

  const rel = path.relative(normParent, normCandidate);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Checks if a path is a drive root (e.g. C:\, D:\).
 * @param {string} normalizedPath 
 * @returns {boolean}
 */
function isDriveRoot(normalizedPath) {
  const parsed = path.parse(normalizedPath);
  return parsed.root.toLowerCase() === normalizedPath.toLowerCase();
}

/**
 * Splits filename into base name and extension.
 * @param {string} fileName 
 */
function splitFileName(fileName = '') {
  if (!fileName) return { baseName: '', ext: '' };
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return { baseName: fileName, ext: '' };
  }
  return {
    baseName: fileName.slice(0, lastDotIndex),
    ext: fileName.slice(lastDotIndex),
  };
}

/**
 * Validates a single filename against Windows rules (reserved names, forbidden chars, etc.).
 * @param {string} fileName 
 * @returns {{ valid: boolean, code?: string, message?: string }}
 */
function validateFileName(fileName) {
  if (typeof fileName !== 'string' || !fileName.trim()) {
    return {
      valid: false,
      code: 'NAME_INVALID',
      message: 'Le nom ne peut pas être vide ou constitué uniquement d’espaces.',
    };
  }

  const trimmed = fileName.trim();
  if (trimmed === '.' || trimmed === '..') {
    return {
      valid: false,
      code: 'NAME_INVALID',
      message: 'Le nom ne peut pas être "." ou "..".',
    };
  }

  if (FORBIDDEN_CHARS_REGEX.test(fileName)) {
    return {
      valid: false,
      code: 'NAME_INVALID',
      message: 'Le nom contient des caractères interdits par Windows (< > : " / \\ | ? *).',
    };
  }

  if (fileName.endsWith('.') || fileName.endsWith(' ')) {
    return {
      valid: false,
      code: 'NAME_INVALID',
      message: 'Le nom ne peut pas se terminer par un point ou un espace.',
    };
  }

  const { baseName } = splitFileName(fileName);
  const upperBase = baseName.toUpperCase();
  const upperFull = fileName.toUpperCase();

  if (WINDOWS_RESERVED_NAMES.has(upperBase) || WINDOWS_RESERVED_NAMES.has(upperFull)) {
    return {
      valid: false,
      code: 'NAME_RESERVED',
      message: 'Ce nom est un nom réservé par le système Windows (ex: CON, PRN, AUX, NUL, COM1, LPT1).',
    };
  }

  return { valid: true };
}

/**
 * Main Central Security Policy Evaluation.
 * @param {object} params
 * @param {string} params.operation - 'rename' | 'copy' | 'move' | 'trash' | 'restore' | 'select-destination'
 * @param {string} [params.sourcePath]
 * @param {string} [params.destinationPath]
 * @param {string} [params.targetPath]
 * @param {string} [params.newName]
 * @param {string} [params.appRootDir]
 * @param {object} [params.mockEnv] Optional environment override for unit testing
 * @returns {{ allowed: boolean, code?: string, message?: string }}
 */
function checkFileOperation({
  operation,
  sourcePath,
  destinationPath,
  targetPath,
  newName,
  appRootDir = '',
  mockEnv = null,
}) {
  const locations = getSystemLocations(mockEnv);

  const protectedSystemPaths = [
    locations.systemRoot,
    locations.system32,
    locations.programFiles,
    locations.programFilesX86,
    locations.programData,
    locations.recycleBin,
    locations.sysVolInfo,
    locations.bootDir,
    locations.recoveryDir,
  ].filter(Boolean);

  // Function to check path protection status
  const evaluatePathProtection = (normalizedPath, role = 'target') => {
    if (isDriveRoot(normalizedPath)) {
      return {
        protected: true,
        code: 'DRIVE_ROOT_PROTECTED',
        message: 'La racine d’un lecteur ne peut pas être renommée, déplacée ou placée dans la Corbeille.',
      };
    }

    if (protectedSystemPaths.some((p) => isSameOrChildPath(normalizedPath, p))) {
      return {
        protected: true,
        code: 'SYSTEM_PATH_PROTECTED',
        message: 'Ce dossier est protégé par le système Windows.',
      };
    }

    if (locations.userProfile && normalizedPath.toLowerCase() === path.normalize(locations.userProfile).toLowerCase()) {
      return {
        protected: true,
        code: 'USER_PROFILE_ROOT_PROTECTED',
        message: 'La racine du profil utilisateur est protégée.',
      };
    }

    if (appRootDir) {
      const normAppRoot = path.normalize(appRootDir).toLowerCase();
      if (normalizedPath.toLowerCase() === normAppRoot) {
        return {
          protected: true,
          code: 'APP_INTERNAL_PATH_PROTECTED',
          message: 'Le dossier racine de l’application est protégé.',
        };
      }
    }

    return { protected: false };
  };

  switch (operation) {
    case 'select-destination': {
      const target = targetPath || destinationPath;
      const norm = normalizePath(target);
      if (!norm.valid) return { allowed: false, code: norm.code, message: norm.message };

      // Destination root can be selected if safe, but verify valid directory
      return { allowed: true };
    }

    case 'rename': {
      const srcNorm = normalizePath(sourcePath);
      if (!srcNorm.valid) return { allowed: false, code: srcNorm.code, message: srcNorm.message };

      const protCheck = evaluatePathProtection(srcNorm.normalizedPath, 'source');
      if (protCheck.protected) {
        return { allowed: false, code: protCheck.code, message: protCheck.message };
      }

      const nameCheck = validateFileName(newName);
      if (!nameCheck.valid) {
        return { allowed: false, code: nameCheck.code, message: nameCheck.message };
      }

      return { allowed: true };
    }

    case 'trash': {
      const target = targetPath || sourcePath;
      const targetNorm = normalizePath(target);
      if (!targetNorm.valid) return { allowed: false, code: targetNorm.code, message: targetNorm.message };

      const protCheck = evaluatePathProtection(targetNorm.normalizedPath, 'target');
      if (protCheck.protected) {
        return { allowed: false, code: protCheck.code, message: protCheck.message };
      }

      return { allowed: true };
    }

    case 'copy': {
      const srcNorm = normalizePath(sourcePath);
      if (!srcNorm.valid) return { allowed: false, code: srcNorm.code, message: `Source: ${srcNorm.message}` };

      const destNorm = normalizePath(destinationPath);
      if (!destNorm.valid) return { allowed: false, code: destNorm.code, message: `Destination: ${destNorm.message}` };

      // Drive root cannot be copied as a single source item if it would cause root duplication/recursion issues
      if (isDriveRoot(srcNorm.normalizedPath)) {
        return {
          allowed: false,
          code: 'DRIVE_ROOT_PROTECTED',
          message: 'La racine d’un lecteur ne peut pas être sélectionnée comme élément source d’une copie.',
        };
      }

      const srcLower = srcNorm.normalizedPath.toLowerCase();
      const destLower = destNorm.normalizedPath.toLowerCase();

      if (srcLower === destLower) {
        return {
          allowed: false,
          code: 'SOURCE_EQUALS_DESTINATION',
          message: 'Un dossier ne peut pas être copié à l’intérieur de lui-même.',
        };
      }

      if (isSameOrChildPath(destNorm.normalizedPath, srcNorm.normalizedPath)) {
        return {
          allowed: false,
          code: 'DESTINATION_INSIDE_SOURCE',
          message: 'Un dossier ne peut pas être copié à l’intérieur de l’un de ses propres descendants.',
        };
      }

      // Check destination protection (cannot copy into protected system folders)
      if (protectedSystemPaths.some((p) => isSameOrChildPath(destNorm.normalizedPath, p))) {
        return {
          allowed: false,
          code: 'SYSTEM_PATH_PROTECTED',
          message: 'Le dossier de destination est un emplacement système protégé.',
        };
      }

      if (newName) {
        const nameCheck = validateFileName(newName);
        if (!nameCheck.valid) {
          return { allowed: false, code: nameCheck.code, message: nameCheck.message };
        }
      }

      return { allowed: true };
    }

    case 'move': {
      const srcNorm = normalizePath(sourcePath);
      if (!srcNorm.valid) return { allowed: false, code: srcNorm.code, message: `Source: ${srcNorm.message}` };

      const destNorm = normalizePath(destinationPath);
      if (!destNorm.valid) return { allowed: false, code: destNorm.code, message: `Destination: ${destNorm.message}` };

      const srcProt = evaluatePathProtection(srcNorm.normalizedPath, 'source');
      if (srcProt.protected) {
        return { allowed: false, code: srcProt.code, message: srcProt.message };
      }

      const srcLower = srcNorm.normalizedPath.toLowerCase();
      const destLower = destNorm.normalizedPath.toLowerCase();

      if (srcLower === destLower) {
        return {
          allowed: false,
          code: 'SOURCE_EQUALS_DESTINATION',
          message: 'Un dossier ne peut pas être déplacé à l’intérieur de lui-même.',
        };
      }

      if (isSameOrChildPath(destNorm.normalizedPath, srcNorm.normalizedPath)) {
        return {
          allowed: false,
          code: 'DESTINATION_INSIDE_SOURCE',
          message: 'Un dossier ne peut pas être déplacé à l’intérieur de l’un de ses propres descendants.',
        };
      }

      // Destination system path check
      if (protectedSystemPaths.some((p) => isSameOrChildPath(destNorm.normalizedPath, p))) {
        return {
          allowed: false,
          code: 'SYSTEM_PATH_PROTECTED',
          message: 'Le dossier de destination est un emplacement système protégé.',
        };
      }

      if (newName) {
        const nameCheck = validateFileName(newName);
        if (!nameCheck.valid) {
          return { allowed: false, code: nameCheck.code, message: nameCheck.message };
        }
      }

      return { allowed: true };
    }

    case 'restore':
    case 'undo': {
      // Undo operation validation (undo copy or undo move)
      const target = targetPath || destinationPath;
      if (target) {
        const targetNorm = normalizePath(target);
        if (!targetNorm.valid) return { allowed: false, code: targetNorm.code, message: targetNorm.message };

        const protCheck = evaluatePathProtection(targetNorm.normalizedPath, 'target');
        if (protCheck.protected) {
          return {
            allowed: false,
            code: protCheck.code,
            message: 'L’annulation concernerait un emplacement système protégé et est refusée.',
          };
        }
      }

      if (sourcePath) {
        const srcNorm = normalizePath(sourcePath);
        if (!srcNorm.valid) return { allowed: false, code: srcNorm.code, message: srcNorm.message };

        const protCheck = evaluatePathProtection(srcNorm.normalizedPath, 'source');
        if (protCheck.protected) {
          return {
            allowed: false,
            code: protCheck.code,
            message: 'L’annulation concernerait un emplacement système protégé et est refusée.',
          };
        }
      }

      return { allowed: true };
    }

    default:
      return {
        allowed: false,
        code: 'INVALID_OPERATION',
        message: `Opération non reconnue: ${operation}`,
      };
  }
}

/**
 * Inspects a file's actual attributes and symlink/junction status safely.
 * @param {string} itemPath 
 * @returns {Promise<{ exists: boolean, isDirectory?: boolean, isSymbolicLink?: boolean, isReadOnly?: boolean, stat?: fs.Stats }>}
 */
async function inspectItemAttributes(itemPath) {
  try {
    const lstat = await fs.promises.lstat(itemPath);
    const isSym = lstat.isSymbolicLink();
    let realStat = lstat;

    if (!isSym) {
      try {
        realStat = await fs.promises.stat(itemPath);
      } catch {
        // Keeps lstat info if stat fails
      }
    }

    // Windows read-only attribute check
    const isReadOnly = (lstat.mode & 0o200) === 0;

    return {
      exists: true,
      isDirectory: realStat.isDirectory(),
      isFile: realStat.isFile(),
      isSymbolicLink: isSym,
      isReadOnly,
      lstat,
      stat: realStat,
    };
  } catch {
    return { exists: false };
  }
}

module.exports = {
  getSystemLocations,
  normalizePath,
  isSameOrChildPath,
  isDriveRoot,
  splitFileName,
  validateFileName,
  checkFileOperation,
  inspectItemAttributes,
  WINDOWS_RESERVED_NAMES,
  FORBIDDEN_CHARS_REGEX,
};
