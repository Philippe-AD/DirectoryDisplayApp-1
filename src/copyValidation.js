import { splitFileName } from './renameValidation';

/**
 * Validates that destDirPath is not equal to sourcePath and not a subfolder inside sourcePath.
 * @param {string} sourcePath
 * @param {string} destDirPath
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateCopyTarget(sourcePath = '', destDirPath = '') {
  if (!sourcePath || !destDirPath) {
    return { isValid: false, error: 'Chemin de source ou de destination invalide.' };
  }

  const normSource = sourcePath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const normDest = destDirPath.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

  if (normDest === normSource) {
    return {
      isValid: false,
      error: 'Ce dossier ne peut pas être copié à l\'intérieur de lui-même. Aucun fichier n\'a été modifié.',
    };
  }

  if (normDest.startsWith(normSource + '/')) {
    return {
      isValid: false,
      error: 'Ce dossier ne peut pas être copié à l\'intérieur de l\'un de ses propres sous-dossiers. Aucun fichier n\'a été modifié.',
    };
  }

  return { isValid: true, error: null };
}

/**
 * Generates an automatic copy name like "rapport - copie.pdf" or "rapport - copie (2).pdf"
 * and ensures it does not conflict with any existing items in parentChildrenNames.
 * @param {string} originalName
 * @param {string[]} parentChildrenNames
 * @param {boolean} isDirectory
 * @returns {string}
 */
export function generateAutoCopyName(originalName = '', parentChildrenNames = [], isDirectory = false) {
  if (!originalName) return 'copie';

  const existingLowerSet = new Set(
    (parentChildrenNames || []).map((n) => (n || '').toLowerCase())
  );

  let baseName = originalName;
  let ext = '';

  if (!isDirectory) {
    const split = splitFileName(originalName);
    baseName = split.baseName || originalName;
    ext = split.ext || '';
  }

  // First candidate: "baseName - copie.ext"
  let candidate = `${baseName} - copie${ext}`;
  if (!existingLowerSet.has(candidate.toLowerCase())) {
    return candidate;
  }

  // Next candidates: "baseName - copie (2).ext", "baseName - copie (3).ext", ...
  let counter = 2;
  while (counter < 1000) {
    candidate = `${baseName} - copie (${counter})${ext}`;
    if (!existingLowerSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }

  return candidate;
}
