import { FORBIDDEN_CHARS_REGEX, WINDOWS_RESERVED_NAMES, splitFileName, isExtensionModified } from './renameValidation';

/**
 * Checks whether a path corresponds to a protected or sensitive Windows system directory.
 * @param {string} targetPath 
 * @returns {boolean}
 */
export function isProtectedPath(targetPath = '') {
  if (!targetPath) return false;
  const norm = targetPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

  // Root drive paths like "c:"
  if (/^[a-z]:$/i.test(norm)) {
    return true;
  }

  const protectedPrefixes = [
    'c:/windows',
    'c:/program files',
    'c:/program files (x86)',
    'c:/programdata',
    'c:/system volume information',
    'c:/$recycle.bin',
    'c:/boot',
    'c:/recovery',
  ];

  return protectedPrefixes.some((prefix) => norm === prefix || norm.startsWith(prefix + '/'));
}

/**
 * Validates that sourcePath can be moved to destDirPath.
 * @param {string} sourcePath 
 * @param {string} destDirPath 
 * @param {boolean} isDirectory 
 * @returns {{ isValid: boolean, isSameFolder?: boolean, isProtected?: boolean, error: string | null }}
 */
export function validateMoveTarget(sourcePath = '', destDirPath = '', isDirectory = false) {
  if (!sourcePath || !destDirPath) {
    return { isValid: false, error: 'Chemin de source ou de destination invalide.' };
  }

  const normSource = sourcePath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const normDest = destDirPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

  // Extract source parent directory
  const lastSlashIdx = normSource.lastIndexOf('/');
  const sourceParent = lastSlashIdx !== -1 ? normSource.substring(0, lastSlashIdx) : '';

  if (normDest === sourceParent) {
    return {
      isValid: false,
      isSameFolder: true,
      error: 'L’élément se trouve déjà dans ce dossier. Aucun déplacement n’a été effectué.',
    };
  }

  if (normDest === normSource) {
    return {
      isValid: false,
      error: 'Ce dossier ne peut pas être déplacé à l\'intérieur de lui-même. Aucun fichier n\'a été modifié.',
    };
  }

  if (isDirectory && normDest.startsWith(normSource + '/')) {
    return {
      isValid: false,
      error: 'Ce dossier ne peut pas être déplacé à l\'intérieur de l\'un de ses propres descendants. Aucun fichier n\'a été modifié.',
    };
  }

  if (isProtectedPath(sourcePath) || isProtectedPath(destDirPath)) {
    return {
      isValid: false,
      isProtected: true,
      error: 'L\'opération concerne un emplacement système protégé ou sensible. Le déplacement est refusé.',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Validates name and conflicts when moving an item.
 * @param {object} params
 * @returns {{ isValid: boolean, hasConflict?: boolean, error: string | null }}
 */
export function validateMoveName({
  moveName = '',
  isDirectory = false,
  parentChildrenNames = [],
  parentPath = '',
  maxPathLength = 260,
}) {
  const trimmedName = (moveName || '').trim();

  if (!trimmedName) {
    return { isValid: false, error: 'Le nom ne peut pas être vide.' };
  }

  if (FORBIDDEN_CHARS_REGEX.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Le nom contient des caractères interdits (< > : " / \\ | ? *).',
    };
  }

  if (trimmedName.endsWith('.') || trimmedName.endsWith(' ')) {
    return {
      isValid: false,
      error: 'Le nom ne peut pas se terminer par un point ou un espace.',
    };
  }

  const { baseName } = splitFileName(trimmedName);
  const upperBase = baseName.toUpperCase();
  const upperFull = trimmedName.toUpperCase();

  if (WINDOWS_RESERVED_NAMES.has(upperBase) || WINDOWS_RESERVED_NAMES.has(upperFull)) {
    return {
      isValid: false,
      error: 'Ce nom est un nom réservé par le système Windows (ex: CON, PRN, AUX, NUL, COM1, LPT1).',
    };
  }

  const lowerMoveName = trimmedName.toLowerCase();
  const existsConflict = (parentChildrenNames || []).some(
    (existing) => (existing || '').toLowerCase() === lowerMoveName
  );

  if (existsConflict) {
    return {
      isValid: false,
      hasConflict: true,
      error: `Un ${isDirectory ? 'dossier' : 'fichier'} portant le même nom existe déjà dans la destination.`,
    };
  }

  if (parentPath) {
    const normalizedParent = parentPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const finalPath = `${normalizedParent}/${trimmedName}`;
    if (finalPath.length > maxPathLength) {
      return {
        isValid: false,
        error: `Le chemin final dépasse la limite maximale autorisée (${maxPathLength} caractères).`,
      };
    }
  }

  return { isValid: true, error: null };
}

export { isExtensionModified };
