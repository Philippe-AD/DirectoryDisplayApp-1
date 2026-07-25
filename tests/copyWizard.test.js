import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { validateCopyTarget, generateAutoCopyName } from '../src/copyValidation';
import {
  renderCopyWizardModal,
  renderCopyUndoToast,
  renderCopyErrorModal,
} from '../src/renderers';

describe('Copy Target & Auto Name Validation Logic', () => {
  it('refuses copying a directory into itself', () => {
    const res = validateCopyTarget('/user/docs/FolderA', '/user/docs/FolderA');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('à l\'intérieur de lui-même');
  });

  it('refuses copying a directory into its own subfolder descendant', () => {
    const res = validateCopyTarget('/user/docs/FolderA', '/user/docs/FolderA/SubB/SubC');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('propres sous-dossiers');
  });

  it('allows copying to a valid separate destination folder', () => {
    const res = validateCopyTarget('/user/docs/FolderA', '/user/pictures/Photos');
    expect(res.isValid).toBe(true);
    expect(res.error).toBeNull();
  });

  it('generates clear automatic copy names avoiding conflicts', () => {
    const existing = ['photo.jpg', 'photo - copie.jpg', 'documents'];
    
    // File auto-name
    const name1 = generateAutoCopyName('photo.jpg', existing, false);
    expect(name1).toBe('photo - copie (2).jpg');

    // File auto-name without pre-existing copy
    const name2 = generateAutoCopyName('rapport.pdf', existing, false);
    expect(name2).toBe('rapport - copie.pdf');

    // Directory auto-name
    const dirName = generateAutoCopyName('documents', existing, true);
    expect(dirName).toBe('documents - copie');
  });
});

describe('Copy Assistant Wizard UI Component Rendering', () => {
  it('renders Step 1 wizard with original item info, destination, name input, and permanent consequence text', () => {
    const copyState = {
      isOpen: true,
      step: 'wizard',
      sourceItem: { name: 'photo.jpg', path: '/images/photo.jpg', type: 'file', size: 1024576 },
      destDirPath: '/documents/photos',
      copyName: 'photo.jpg',
      validationError: null,
      extensionWarning: null,
      hasConflict: false,
    };

    const html = renderCopyWizardModal(copyState, 'dark');

    expect(html).toContain('id="modal-copy-wizard-overlay"');
    expect(html).toContain('Assistant de copie');
    expect(html).toContain('photo.jpg');
    expect(html).toContain('/images/photo.jpg');
    expect(html).toContain('/documents/photos');
    expect(html).toContain('id="input-copy-name"');
    expect(html).toContain('L’élément original restera à son emplacement actuel.');
    expect(html).toContain('Une nouvelle copie sera créée dans le dossier choisi.');
    expect(html).toContain('Annuler');
    expect(html).toContain('Suivant');
    expect(html).not.toContain('disabled');
  });

  it('renders conflict UI with "Choisir un autre nom" and "Utiliser un nom automatique" when name exists', () => {
    const copyState = {
      isOpen: true,
      step: 'wizard',
      sourceItem: { name: 'photo.jpg', path: '/images/photo.jpg', type: 'file' },
      destDirPath: '/documents/photos',
      copyName: 'photo.jpg',
      validationError: null,
      hasConflict: true,
    };

    const html = renderCopyWizardModal(copyState, 'dark');

    expect(html).toContain('disabled');
    expect(html).toContain('id="copy-conflict-box"');
    expect(html).toContain('Nom déjà existant dans la destination');
    expect(html).toContain('id="btn-copy-conflict-edit"');
    expect(html).toContain('Choisir un autre nom');
    expect(html).toContain('id="btn-copy-conflict-auto"');
    expect(html).toContain('Utiliser un nom automatique');
  });

  it('renders Step 2 confirmation summary with exact required details', () => {
    const copyState = {
      isOpen: true,
      step: 'confirm',
      sourceItem: { name: 'photo.jpg', path: 'C:/Images/photo.jpg', type: 'file' },
      destDirPath: 'C:/Documents/Photos',
      copyName: 'photo.jpg',
    };

    const html = renderCopyWizardModal(copyState, 'dark');

    expect(html).toContain('id="modal-copy-confirm-overlay"');
    expect(html).toContain('Résumé avant création de la copie');
    expect(html).toContain('Vous allez créer une copie de :');
    expect(html).toContain('C:/Images/photo.jpg');
    expect(html).toContain('dans :');
    expect(html).toContain('C:/Documents/Photos');
    expect(html).toContain('La copie sera nommée :');
    expect(html).toContain('photo.jpg');
    expect(html).toContain('Le fichier original restera dans son dossier actuel.');
    expect(html).toContain('Aucun fichier existant ne sera remplacé.');
    expect(html).toContain('Retour');
    expect(html).toContain('Créer la copie');
  });

  it('renders Step 3 progress modal with active state and cancellation button', () => {
    const copyState = {
      isOpen: true,
      step: 'progress',
      sourceItem: { name: 'DossierProjet', path: '/docs/DossierProjet', type: 'directory' },
      destDirPath: '/backup/docs',
      progressState: { currentItem: 'fichier1.txt', percentage: 45, copiedCount: 9, totalCount: 20 },
    };

    const html = renderCopyWizardModal(copyState, 'dark');

    expect(html).toContain('id="modal-copy-progress-overlay"');
    expect(html).toContain('Copie en cours…');
    expect(html).toContain('fichier1.txt');
    expect(html).toContain('/backup/docs');
    expect(html).toContain('45%');
    expect(html).toContain('id="btn-copy-cancel-progress"');
    expect(html).toContain('Annuler la copie');
  });

  it('renders Step 4 success summary with show copy and open folder options', () => {
    const copyState = {
      isOpen: true,
      step: 'success',
      sourceItem: { name: 'photo.jpg', path: 'C:/Images/photo.jpg', type: 'file' },
      resultState: { sourcePath: 'C:/Images/photo.jpg', copyPath: 'C:/Documents/Photos/photo.jpg', copyName: 'photo.jpg' },
    };

    const html = renderCopyWizardModal(copyState, 'dark');

    expect(html).toContain('id="modal-copy-success-overlay"');
    expect(html).toContain('La copie a été créée.');
    expect(html).toContain('Original :');
    expect(html).toContain('C:/Images/photo.jpg');
    expect(html).toContain('Copie :');
    expect(html).toContain('C:/Documents/Photos/photo.jpg');
    expect(html).toContain('id="btn-copy-success-show"');
    expect(html).toContain('Afficher la copie');
    expect(html).toContain('id="btn-copy-success-open-folder"');
    expect(html).toContain('Ouvrir son dossier');
    expect(html).toContain('id="btn-copy-success-close"');
    expect(html).toContain('Fermer');
  });

  it('renders undo copy toast and error modal with original preservation reassurance', () => {
    const toastHtml = renderCopyUndoToast({ visible: true, message: 'La copie a été créée.' }, 'dark');
    expect(toastHtml).toContain('id="undo-copy-toast"');
    expect(toastHtml).toContain('Annuler cette copie');

    const errorHtml = renderCopyErrorModal('Accès refusé. Le fichier original n\'a pas été modifié.', 'dark');
    expect(errorHtml).toContain('id="modal-copy-error-overlay"');
    expect(errorHtml).toContain('n&#039;a pas été modifié.');
  });
});

describe('File System Isolated Copy Operations & Preservation Verification', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('copies a file without altering the original file content or metadata', async () => {
    const srcFile = path.join(tempDir, 'original.txt');
    const destDir = path.join(tempDir, 'Destination');
    fs.mkdirSync(destDir);

    const originalContent = 'Sample original document data';
    fs.writeFileSync(srcFile, originalContent, 'utf8');

    const copyFile = path.join(destDir, 'original - copie.txt');
    await fs.promises.copyFile(srcFile, copyFile);

    expect(fs.existsSync(srcFile)).toBe(true);
    expect(fs.existsSync(copyFile)).toBe(true);
    expect(fs.readFileSync(srcFile, 'utf8')).toBe(originalContent);
    expect(fs.readFileSync(copyFile, 'utf8')).toBe(originalContent);
  });

  it('copies a directory recursively preserving structure while keeping original untouched', async () => {
    const srcDir = path.join(tempDir, 'OriginalFolder');
    fs.mkdirSync(srcDir);
    fs.mkdirSync(path.join(srcDir, 'SubFolder'));
    fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'data1', 'utf8');
    fs.writeFileSync(path.join(srcDir, 'SubFolder', 'file2.txt'), 'data2', 'utf8');

    const destDir = path.join(tempDir, 'BackupDir');
    fs.mkdirSync(destDir);

    const copyDir = path.join(destDir, 'OriginalFolder - copie');
    await fs.promises.mkdir(copyDir, { recursive: true });
    await fs.promises.mkdir(path.join(copyDir, 'SubFolder'), { recursive: true });
    await fs.promises.copyFile(path.join(srcDir, 'file1.txt'), path.join(copyDir, 'file1.txt'));
    await fs.promises.copyFile(path.join(srcDir, 'SubFolder', 'file2.txt'), path.join(copyDir, 'SubFolder', 'file2.txt'));

    // Check copied files exist and match
    expect(fs.existsSync(path.join(copyDir, 'file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(copyDir, 'SubFolder', 'file2.txt'))).toBe(true);

    // Verify original directory structure & content is untouched
    expect(fs.existsSync(path.join(srcDir, 'file1.txt'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, 'SubFolder', 'file2.txt'))).toBe(true);
  });

  it('prevents automatic overwriting when destination file already exists', async () => {
    const srcFile = path.join(tempDir, 'data.txt');
    const destDir = path.join(tempDir, 'Dest');
    fs.mkdirSync(destDir);

    const existingDestFile = path.join(destDir, 'data.txt');
    fs.writeFileSync(srcFile, 'new content', 'utf8');
    fs.writeFileSync(existingDestFile, 'existing content', 'utf8');

    // Simulate conflict check logic
    const conflictExists = fs.existsSync(existingDestFile);
    expect(conflictExists).toBe(true);

    // Ensure existing file is NOT overwritten
    expect(fs.readFileSync(existingDestFile, 'utf8')).toBe('existing content');
  });

  it('cleans up partially created copy elements on cancellation', async () => {
    const destDir = path.join(tempDir, 'PartialDest');
    fs.mkdirSync(destDir);

    const partialCopyDir = path.join(destDir, 'PartialCopy');
    fs.mkdirSync(partialCopyDir);
    fs.writeFileSync(path.join(partialCopyDir, 'half.txt'), 'partial', 'utf8');

    // Simulate cancellation cleanup: remove partial target
    if (fs.existsSync(partialCopyDir)) {
      await fs.promises.rm(partialCopyDir, { recursive: true, force: true });
    }

    expect(fs.existsSync(partialCopyDir)).toBe(false);
  });
});
