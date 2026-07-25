// Validation rules for file and directory renaming in Windows environments

export const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

// Windows forbidden characters: < > : " / \ | ? * and ASCII 0-31
/* eslint-disable-next-line no-control-regex */
export const FORBIDDEN_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1F]/;

export function splitFileName(fileName = '') {
  if (!fileName) return { baseName: '', ext: '', hasExtension: false };

  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return { baseName: fileName, ext: '', hasExtension: false };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    ext: fileName.slice(lastDotIndex), // e.g. ".pdf"
    hasExtension: true,
  };
}

export function isExtensionModified(currentName = '', newName = '', isDirectory = false) {
  if (isDirectory) {
    return { isModified: false, oldExt: '', newExt: '' };
  }

  const currentSplit = splitFileName(currentName);
  const newSplit = splitFileName(newName);

  const oldExt = currentSplit.ext.toLowerCase();
  const newExt = newSplit.ext.toLowerCase();

  const isModified = oldExt !== newExt;

  return {
    isModified,
    oldExt: currentSplit.ext,
    newExt: newSplit.ext,
  };
}

export function validateRename({
  currentName,
  newName,
  isDirectory = false,
  parentChildrenNames = [],
  parentPath = '',
  maxPathLength = 260,
}) {
  const trimmedNewName = (newName || '').trim();

  if (!trimmedNewName) {
    return { isValid: false, error: 'Le nom ne peut pas être vide.' };
  }

  if (FORBIDDEN_CHARS_REGEX.test(newName)) {
    return {
      isValid: false,
      error: 'Le nom contient des caractères interdits (< > : " / \\ | ? *).',
    };
  }

  if (newName.endsWith('.') || newName.endsWith(' ')) {
    return {
      isValid: false,
      error: 'Le nom ne peut pas se terminer par un point ou un espace.',
    };
  }

  // Windows reserved device names check (e.g. CON, PRN.txt, NUL.pdf)
  const { baseName } = splitFileName(newName);
  const upperBase = baseName.toUpperCase();
  const upperFull = newName.toUpperCase();

  if (WINDOWS_RESERVED_NAMES.has(upperBase) || WINDOWS_RESERVED_NAMES.has(upperFull)) {
    return {
      isValid: false,
      error: 'Ce nom est un nom réservé par le système Windows (ex: CON, PRN, AUX, NUL, COM1, LPT1).',
    };
  }

  if (currentName && newName === currentName) {
    return {
      isValid: false,
      error: 'Le nouveau nom est identique au nom actuel.',
    };
  }

  // Duplicate name check in parent folder (case-insensitive for Windows)
  const lowerNewName = newName.toLowerCase();
  const lowerCurrentName = currentName ? currentName.toLowerCase() : '';

  const existsConflict = parentChildrenNames.some((existingName) => {
    const lowerExisting = existingName.toLowerCase();
    return lowerExisting === lowerNewName && lowerExisting !== lowerCurrentName;
  });

  if (existsConflict) {
    return {
      isValid: false,
      error: `Un ${isDirectory ? 'dossier' : 'fichier'} portant ce nom existe déjà dans cet emplacement.`,
    };
  }

  // Path length validation
  if (parentPath) {
    const normalizedParent = parentPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const finalPath = `${normalizedParent}/${newName}`;
    if (finalPath.length > maxPathLength) {
      return {
        isValid: false,
        error: `Le chemin final dépasse la limite maximale autorisée (${maxPathLength} caractères).`,
      };
    }
  }

  return { isValid: true, error: null };
}
