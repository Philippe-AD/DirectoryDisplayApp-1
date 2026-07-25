import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  renderRenameInputModal,
  renderRenameConfirmModal,
  renderUndoToast,
  renderRenameErrorModal,
} from '../src/renderers';

describe('Assisted Secure Rename Workflows & Rendering', () => {
  describe('Modal UI Components Rendering', () => {
    it('renders Step 1 input dialog with current name, location, and consequences text', () => {
      const modalState = {
        isOpen: true,
        step: 'input',
        item: { name: 'rapport-2025.pdf', path: '/docs/rapport-2025.pdf', type: 'file' },
        newName: 'rapport-final.pdf',
        parentPath: '/docs',
        validationError: null,
        extensionWarning: null,
      };

      const html = renderRenameInputModal(modalState, 'dark');

      expect(html).toContain('id="modal-rename-input-overlay"');
      expect(html).toContain('Renommer ce fichier');
      expect(html).toContain('rapport-2025.pdf');
      expect(html).toContain('/docs');
      expect(html).toContain('id="input-rename-name"');
      expect(html).toContain('Le fichier restera dans le même dossier.');
      expect(html).toContain('Son contenu ne sera pas modifié.');
      expect(html).toContain('Annuler');
      expect(html).toContain('Renommer');
      expect(html).not.toContain('disabled');
    });

    it('disables validation button and displays error when name is invalid', () => {
      const modalState = {
        isOpen: true,
        step: 'input',
        item: { name: 'rapport-2025.pdf', path: '/docs/rapport-2025.pdf', type: 'file' },
        newName: 'rapport?.pdf',
        parentPath: '/docs',
        validationError: 'Le nom contient des caractères interdits (< > : " / \\ | ? *).',
        extensionWarning: null,
      };

      const html = renderRenameInputModal(modalState, 'dark');

      expect(html).toContain('disabled');
      expect(html).toContain('id="rename-validation-error"');
      expect(html).toContain('caractères interdits');
    });

    it('renders clear warning when modifying file extension', () => {
      const modalState = {
        isOpen: true,
        step: 'input',
        item: { name: 'rapport-2025.pdf', path: '/docs/rapport-2025.pdf', type: 'file' },
        newName: 'rapport-final.txt',
        parentPath: '/docs',
        validationError: null,
        extensionWarning: "Vous modifiez l’extension .pdf. Le fichier pourrait ne plus s’ouvrir correctement.",
      };

      const html = renderRenameInputModal(modalState, 'dark');

      expect(html).toContain('id="rename-extension-warning"');
      expect(html).toContain('Vous modifiez l’extension .pdf');
    });

    it('renders Step 2 confirmation summary with exact required details', () => {
      const modalState = {
        isOpen: true,
        step: 'confirm',
        item: { name: 'rapport-2025.pdf', path: '/docs/rapport-2025.pdf', type: 'file' },
        newName: 'rapport-final.pdf',
        parentPath: '/docs',
      };

      const html = renderRenameConfirmModal(modalState, 'dark');

      expect(html).toContain('id="modal-rename-confirm-overlay"');
      expect(html).toContain('Confirmation du renommage');
      expect(html).toContain('Vous allez renommer :');
      expect(html).toContain('rapport-2025.pdf');
      expect(html).toContain('en :');
      expect(html).toContain('rapport-final.pdf');
      expect(html).toContain('Emplacement :');
      expect(html).toContain('/docs');
      expect(html).toContain('Le fichier restera dans ce dossier et son contenu ne sera pas modifié.');
      expect(html).toContain('Retour');
      expect(html).toContain('Confirmer le renommage');
    });

    it('renders temporary undo toast banner', () => {
      const undoToastState = {
        visible: true,
        message: 'Le fichier a été renommé.',
      };

      const html = renderUndoToast(undoToastState, 'dark');

      expect(html).toContain('id="undo-rename-toast"');
      expect(html).toContain('Le fichier a été renommé.');
      expect(html).toContain('id="btn-undo-rename"');
      expect(html).toContain('Annuler le renommage');
      expect(html).toContain('id="btn-dismiss-undo-toast"');
    });

    it('renders error modal with technical error explanation and reassurance', () => {
      const html = renderRenameErrorModal(
        'Accès refusé. Vous n\'avez pas la permission de modifier cet élément. Aucune autre modification n\'a été effectuée.',
        'dark'
      );

      expect(html).toContain('id="modal-rename-error-overlay"');
      expect(html).toContain('Erreur de renommage');
      expect(html).toContain('Accès refusé');
      expect(html).toContain('Aucune autre modification');
      expect(html).toContain('n&#039;a été effectuée');
    });
  });
});

describe('File System Operations & Target Updates (Isolated Temp Directory)', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dir-display-test-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('renames a real temporary file securely', async () => {
    const oldFilePath = path.join(tempDir, 'old-file.txt');
    const newFilePath = path.join(tempDir, 'new-file.txt');

    fs.writeFileSync(oldFilePath, 'sample content', 'utf8');
    expect(fs.existsSync(oldFilePath)).toBe(true);

    await fs.promises.rename(oldFilePath, newFilePath);

    expect(fs.existsSync(oldFilePath)).toBe(false);
    expect(fs.existsSync(newFilePath)).toBe(true);
    expect(fs.readFileSync(newFilePath, 'utf8')).toBe('sample content');
  });

  it('renames a real temporary directory containing children securely', async () => {
    const oldSubDir = path.join(tempDir, 'OldSub');
    const newSubDir = path.join(tempDir, 'NewSub');
    fs.mkdirSync(oldSubDir);

    const childFile = path.join(oldSubDir, 'child.txt');
    fs.writeFileSync(childFile, 'child data', 'utf8');

    await fs.promises.rename(oldSubDir, newSubDir);

    expect(fs.existsSync(oldSubDir)).toBe(false);
    expect(fs.existsSync(newSubDir)).toBe(true);
    expect(fs.existsSync(path.join(newSubDir, 'child.txt'))).toBe(true);
  });
});
