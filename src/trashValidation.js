/**
 * Checks whether a path corresponds to a protected disk root, system folder, or app root folder.
 * @param {string} targetPath 
 * @param {string} appRootDir 
 * @returns {boolean}
 */
export function isProtectedPath(targetPath = '', appRootDir = '') {
  if (!targetPath) return true;
  const norm = targetPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

  // Disk root paths (e.g. "c:", "c:/", "/", "d:")
  if (/^[a-z]:?$/i.test(norm) || norm === '' || norm === '/') {
    return true;
  }

  // App root directory currently opened in DirectoryDisplayApp
  if (appRootDir) {
    const normAppRoot = appRootDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    if (norm === normAppRoot) {
      return true;
    }
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
 * Validates that an item can be moved to the Recycle Bin.
 * @param {object} item 
 * @param {string} appRootDir 
 * @returns {{ isValid: boolean, isProtected?: boolean, error: string | null }}
 */
export function validateTrashTarget(item = null, appRootDir = '') {
  if (!item || !item.path) {
    return {
      isValid: false,
      error: 'Élément introuvable ou chemin d’accès invalide. Aucun fichier n’a été modifié.',
    };
  }

  if (isProtectedPath(item.path, appRootDir)) {
    return {
      isValid: false,
      isProtected: true,
      error: 'Cet élément est protégé et ne peut pas être placé dans la Corbeille depuis DirectoryDisplayApp. Aucun fichier n’a été modifié.',
    };
  }

  return { isValid: true, error: null };
}
