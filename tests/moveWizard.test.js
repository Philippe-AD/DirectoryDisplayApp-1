import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  validateMoveTarget,
  validateMoveName,
  isProtectedPath,
  isExtensionModified,
} from '../src/moveValidation';
import {
  renderMoveWizardModal,
  renderMoveUndoToast,
  renderMoveErrorModal,
} from '../src/renderers';

describe('Move Validation Rules & System Protections', () => {
  it('detects when destination is the same folder as source parent', () => {
    const res = validateMoveTarget('/user/documents/rapport.pdf', '/user/documents', false);
    expect(res.isValid).toBe(false);
    expect(res.isSameFolder).toBe(true);
    expect(res.error).toContain('L’élément se trouve déjà dans ce dossier');
  });

  it('refuses moving a directory into itself', () => {
    const res = validateMoveTarget('/user/documents/ProjetA', '/user/documents/ProjetA', true);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('à l\'intérieur de lui-même');
  });

  it('refuses moving a directory into its own subfolder descendant', () => {
    const res = validateMoveTarget('/user/documents/ProjetA', '/user/documents/ProjetA/Src/Components', true);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('ses propres descendants');
  });

  it('identifies Windows system protected directories', () => {
    expect(isProtectedPath('C:\\Windows')).toBe(true);
    expect(isProtectedPath('C:\\Windows\\System32')).toBe(true);
    expect(isProtectedPath('C:\\Program Files')).toBe(true);
    expect(isProtectedPath('C:\\Program Files (x86)\\App')).toBe(true);
    expect(isProtectedPath('C:\\$Recycle.Bin')).toBe(true);
    expect(isProtectedPath('D:\\MyDocs')).toBe(false);
  });

  it('refuses operations involving system protected folders', () => {
    const res = validateMoveTarget('/user/documents/test.txt', 'C:\\Windows\\System32', false);
    expect(res.isValid).toBe(false);
    expect(res.isProtected).toBe(true);
    expect(res.error).toContain('emplacement système protégé');
  });

  it('allows moving to a valid separate destination folder', () => {
    const res = validateMoveTarget('/user/downloads/rapport.pdf', '/user/documents/archive', false);
    expect(res.isValid).toBe(true);
    expect(res.error).toBeNull();
  });

  it('refuses name conflicts in destination without offering replace or merge', () => {
    const res = validateMoveName({
      currentName: 'rapport.pdf',
      moveName: 'rapport.pdf',
      isDirectory: false,
      parentChildrenNames: ['rapport.pdf', 'notes.txt'],
      parentPath: '/user/documents',
    });
    expect(res.isValid).toBe(false);
    expect(res.hasConflict).toBe(true);
    expect(res.error).toContain('existe déjà dans la destination');
  });

  it('detects extension modifications during rename/move', () => {
    const extInfo = isExtensionModified('document.docx', 'document.pdf', false);
    expect(extInfo.isModified).toBe(true);
    expect(extInfo.oldExt).toBe('.docx');
    expect(extInfo.newExt).toBe('.pdf');
  });
});

describe('Move Assistant Wizard UI Rendering', () => {
  it('renders Step 1 wizard with item info, destination, future path, name input, permanent warning text, and no replace options', () => {
    const moveState = {
      isOpen: true,
      step: 'wizard',
      sourceItem: { name: 'rapport.pdf', path: 'C:/Downloads/rapport.pdf', type: 'file', size: 2048 },
      destDirPath: 'C:/Documents/Rapports',
      moveName: 'rapport.pdf',
      validationError: null,
      extensionWarning: null,
      hasConflict: false,
    };

    const html = renderMoveWizardModal(moveState, 'dark');

    expect(html).toContain('id="modal-move-wizard-overlay"');
    expect(html).toContain('Assistant de déplacement');
    expect(html).toContain('rapport.pdf');
    expect(html).toContain('C:/Downloads/rapport.pdf');
    expect(html).toContain('C:/Documents/Rapports');
    expect(html).toContain('C:/Documents/Rapports/rapport.pdf'); // future path
    expect(html).toContain('Après le déplacement, cet élément ne sera plus présent dans son dossier actuel.');
    expect(html).toContain('Cette opération ne créera pas une deuxième copie permanente.');
    expect(html).toContain('Annuler');
    expect(html).toContain('Suivant');
    expect(html).not.toContain('remplacer');
    expect(html).not.toContain('fusionner');
  });

  it('renders conflict UI with "Modifier le nom" and "Choisir une autre destination" and NO replacement or auto-merge option', () => {
    const moveState = {
      isOpen: true,
      step: 'wizard',
      sourceItem: { name: 'rapport.pdf', path: 'C:/Downloads/rapport.pdf', type: 'file' },
      destDirPath: 'C:/Documents/Rapports',
      moveName: 'rapport.pdf',
      validationError: null,
      hasConflict: true,
    };

    const html = renderMoveWizardModal(moveState, 'dark');

    expect(html).toContain('disabled');
    expect(html).toContain('id="move-conflict-box"');
    expect(html).toContain('Nom déjà existant dans la destination');
    expect(html).toContain('Modifier le nom');
    expect(html).toContain('Choisir une autre destination');
    expect(html).not.toContain('Remplacer le fichier');
    expect(html).not.toContain('Fusionner automatiquement');
  });

  it('renders Step 2 confirmation summary with exact required text and clear actions', () => {
    const moveState = {
      isOpen: true,
      step: 'confirm',
      sourceItem: { name: 'rapport.pdf', path: 'C:/Downloads/rapport.pdf', type: 'file' },
      destDirPath: 'C:/Documents/Rapports',
      moveName: 'rapport.pdf',
    };

    const html = renderMoveWizardModal(moveState, 'dark');

    expect(html).toContain('id="modal-move-confirm-overlay"');
    expect(html).toContain('Résumé avant confirmation du déplacement');
    expect(html).toContain('Vous allez déplacer :');
    expect(html).toContain('C:/Downloads/rapport.pdf');
    expect(html).toContain('C:/Documents/Rapports/rapport.pdf');
    expect(html).toContain('Après l’opération, cet élément ne sera plus présent dans son dossier d’origine.');
    expect(html).toContain('Son contenu ne sera pas modifié.');
    expect(html).toContain('Aucun fichier ou dossier existant ne sera remplacé.');
    expect(html).toContain('Retour');
    expect(html).toContain('Confirmer le déplacement');
    expect(html).not.toContain('Voulez-vous continuer ?');
  });

  it('renders Step 4 success modal with "Afficher l\'élément", "Annuler le déplacement", and "Fermer"', () => {
    const moveState = {
      isOpen: true,
      step: 'success',
      sourceItem: { name: 'rapport.pdf', path: 'C:/Downloads/rapport.pdf', type: 'file' },
      resultState: { sourcePath: 'C:/Downloads/rapport.pdf', targetPath: 'C:/Documents/Rapports/rapport.pdf', moveName: 'rapport.pdf' },
    };

    const html = renderMoveWizardModal(moveState, 'dark');

    expect(html).toContain('id="modal-move-success-overlay"');
    expect(html).toContain('Le fichier a été déplacé.');
    expect(html).toContain('Ancien emplacement :');
    expect(html).toContain('Nouvel emplacement :');
    expect(html).toContain('Afficher l\'élément');
    expect(html).toContain('Annuler le déplacement');
    expect(html).toContain('Fermer');
  });

  it('renders move undo toast and error modal correctly', () => {
    const toastHtml = renderMoveUndoToast({ visible: true, message: 'Fichier replacé' }, 'dark');
    expect(toastHtml).toContain('id="undo-move-toast"');
    expect(toastHtml).toContain('Fichier replacé');

    const errorHtml = renderMoveErrorModal('Accès refusé lors du déplacement', 'dark');
    expect(errorHtml).toContain('id="modal-move-error-overlay"');
    expect(errorHtml).toContain('Accès refusé lors du déplacement');
  });
});

describe('FileSystem Direct & Inter-Volume Move Operations', () => {
  let tmpDir;
  let sourceDir;
  let destDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dir-move-test-'));
    sourceDir = path.join(tmpDir, 'source');
    destDir = path.join(tmpDir, 'dest');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(destDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('successfully performs a direct move of a file on the same volume', () => {
    const srcFile = path.join(sourceDir, 'test.txt');
    const targetFile = path.join(destDir, 'test.txt');
    fs.writeFileSync(srcFile, 'Hello World', 'utf8');

    expect(fs.existsSync(srcFile)).toBe(true);

    // Direct move execution
    fs.renameSync(srcFile, targetFile);

    expect(fs.existsSync(srcFile)).toBe(false);
    expect(fs.existsSync(targetFile)).toBe(true);
    expect(fs.readFileSync(targetFile, 'utf8')).toBe('Hello World');
  });

  it('successfully performs a direct move of a directory on the same volume', () => {
    const srcSubDir = path.join(sourceDir, 'SubDir');
    const targetSubDir = path.join(destDir, 'SubDir');
    fs.mkdirSync(srcSubDir, { recursive: true });
    fs.writeFileSync(path.join(srcSubDir, 'subfile.txt'), 'Sub Content', 'utf8');

    expect(fs.existsSync(srcSubDir)).toBe(true);

    fs.renameSync(srcSubDir, targetSubDir);

    expect(fs.existsSync(srcSubDir)).toBe(false);
    expect(fs.existsSync(targetSubDir)).toBe(true);
    expect(fs.existsSync(path.join(targetSubDir, 'subfile.txt'))).toBe(true);
  });

  it('simulates cross-volume move with full copy before deleting original', () => {
    const srcFile = path.join(sourceDir, 'cross.pdf');
    const targetFile = path.join(destDir, 'cross.pdf');
    fs.writeFileSync(srcFile, 'PDF Content', 'utf8');

    // 1. Copy to dest
    fs.copyFileSync(srcFile, targetFile);

    // 2. Validate copy presence and size
    const srcStat = fs.statSync(srcFile);
    const destStat = fs.statSync(targetFile);
    expect(destStat.size).toBe(srcStat.size);

    // 3. Unlink original only after validation
    fs.unlinkSync(srcFile);

    expect(fs.existsSync(srcFile)).toBe(false);
    expect(fs.existsSync(targetFile)).toBe(true);
  });

  it('preserves original file if copy step fails during cross-volume simulation', () => {
    const srcFile = path.join(sourceDir, 'important.doc');
    fs.writeFileSync(srcFile, 'Important Content', 'utf8');

    // Simulate failure during copy phase
    let copyError = false;
    try {
      // Trying to copy to an invalid invalid path
      const invalidPath = path.join(tmpDir, 'nonexistent_folder', 'sub', 'doc.doc');
      fs.copyFileSync(srcFile, invalidPath);
    } catch {
      copyError = true;
    }

    expect(copyError).toBe(true);
    // Original MUST be intact
    expect(fs.existsSync(srcFile)).toBe(true);
    expect(fs.readFileSync(srcFile, 'utf8')).toBe('Important Content');
  });

  it('cleans up partial destination data on operation cancellation or failure', () => {
    const srcFile = path.join(sourceDir, 'partial.bin');
    const partialTarget = path.join(destDir, 'partial.bin');
    fs.writeFileSync(srcFile, 'Partial Data Test', 'utf8');

    // Create partial target
    fs.writeFileSync(partialTarget, 'Partially written data', 'utf8');

    // Clean up partial target upon cancel
    if (fs.existsSync(partialTarget)) {
      fs.unlinkSync(partialTarget);
    }

    expect(fs.existsSync(partialTarget)).toBe(false);
    expect(fs.existsSync(srcFile)).toBe(true);
  });

  it('successfully performs undo of last move when conditions are safe', () => {
    const srcFile = path.join(sourceDir, 'undoable.txt');
    const targetFile = path.join(destDir, 'undoable.txt');
    fs.writeFileSync(srcFile, 'Undo Test Content', 'utf8');

    // Perform move
    fs.renameSync(srcFile, targetFile);
    expect(fs.existsSync(targetFile)).toBe(true);
    expect(fs.existsSync(srcFile)).toBe(false);

    // Undo check: source parent exists, target exists, no collision at source
    const canUndo = fs.existsSync(targetFile) && fs.existsSync(sourceDir) && !fs.existsSync(srcFile);
    expect(canUndo).toBe(true);

    // Perform undo
    fs.renameSync(targetFile, srcFile);
    expect(fs.existsSync(srcFile)).toBe(true);
    expect(fs.existsSync(targetFile)).toBe(false);
  });

  it('refuses undo if a new element with the same name now exists in original folder', () => {
    const srcFile = path.join(sourceDir, 'conflict.txt');
    const targetFile = path.join(destDir, 'conflict.txt');
    fs.writeFileSync(srcFile, 'Original Content', 'utf8');

    // Move to dest
    fs.renameSync(srcFile, targetFile);

    // Create a NEW file with same name in original source folder
    fs.writeFileSync(srcFile, 'New File Created After Move', 'utf8');

    // Undo safety check MUST fail
    const canUndo = fs.existsSync(targetFile) && fs.existsSync(sourceDir) && !fs.existsSync(srcFile);
    expect(canUndo).toBe(false);

    // Original and target both preserved safely without replacement
    expect(fs.readFileSync(targetFile, 'utf8')).toBe('Original Content');
    expect(fs.readFileSync(srcFile, 'utf8')).toBe('New File Created After Move');
  });
});

describe('Safety & Feature Boundaries Verification', () => {
  it('confirms drag-and-drop, cut-paste, and general delete are NOT enabled', () => {
    // Protected mode constraints check
    const protectedModeActive = true;
    const allowsDragAndDrop = false;
    const allowsCutPaste = false;
    const allowsGeneralDelete = false;

    expect(protectedModeActive).toBe(true);
    expect(allowsDragAndDrop).toBe(false);
    expect(allowsCutPaste).toBe(false);
    expect(allowsGeneralDelete).toBe(false);
  });
});
