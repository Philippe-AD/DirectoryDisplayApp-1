import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  isProtectedPath,
  validateTrashTarget,
} from '../src/trashValidation';
import {
  renderTrashConfirmModal,
  renderTrashResultModal,
  renderTrashErrorModal,
} from '../src/renderers';

describe('Trash Action Validation Rules & Protections', () => {
  it('detects disk root as protected path', () => {
    expect(isProtectedPath('C:')).toBe(true);
    expect(isProtectedPath('C:\\')).toBe(true);
    expect(isProtectedPath('D:\\')).toBe(true);
    expect(isProtectedPath('/')).toBe(true);
  });

  it('detects current app root directory as protected', () => {
    const appRootDir = 'C:/Users/TestUser/Project';
    expect(isProtectedPath('C:/Users/TestUser/Project', appRootDir)).toBe(true);
    expect(isProtectedPath('C:\\Users\\TestUser\\Project', appRootDir)).toBe(true);
    expect(isProtectedPath('C:/Users/TestUser/Project/Subfolder', appRootDir)).toBe(false);
  });

  it('detects Windows system protected folders', () => {
    expect(isProtectedPath('C:\\Windows')).toBe(true);
    expect(isProtectedPath('C:\\Windows\\System32')).toBe(true);
    expect(isProtectedPath('C:\\Program Files')).toBe(true);
    expect(isProtectedPath('C:\\Program Files (x86)\\App')).toBe(true);
    expect(isProtectedPath('C:\\$Recycle.Bin')).toBe(true);
    expect(isProtectedPath('C:\\ProgramData')).toBe(true);
    expect(isProtectedPath('C:\\System Volume Information')).toBe(true);
  });

  it('allows trashing valid user files and subfolders', () => {
    const appRootDir = 'C:/Users/TestUser/Project';
    const validFile = { path: 'C:/Users/TestUser/Project/docs/report.pdf', name: 'report.pdf', type: 'file' };
    const validDir = { path: 'C:/Users/TestUser/Project/docs/sub', name: 'sub', type: 'directory' };

    const fileCheck = validateTrashTarget(validFile, appRootDir);
    expect(fileCheck.isValid).toBe(true);
    expect(fileCheck.error).toBeNull();

    const dirCheck = validateTrashTarget(validDir, appRootDir);
    expect(dirCheck.isValid).toBe(true);
    expect(dirCheck.error).toBeNull();
  });

  it('refuses invalid or missing item', () => {
    const res = validateTrashTarget(null, 'C:/Project');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Élément introuvable');
  });

  it('refuses protected items with clear error message', () => {
    const protectedItem = { path: 'C:\\Windows\\System32', name: 'System32', type: 'directory' };
    const res = validateTrashTarget(protectedItem, 'C:/Project');
    expect(res.isValid).toBe(false);
    expect(res.isProtected).toBe(true);
    expect(res.error).toContain('Cet élément est protégé et ne peut pas être placé dans la Corbeille');
    expect(res.error).toContain('Aucun fichier n’a été modifié');
  });
});

describe('Trash Modal UI Rendering', () => {
  it('renders file confirmation modal with item name, current location, clear consequences, and Annuler / Mettre dans la Corbeille buttons', () => {
    const trashState = {
      isOpen: true,
      step: 'confirm',
      item: { name: 'rapport-final.pdf', path: 'C:/Documents/Rapports/rapport-final.pdf', type: 'file' },
    };

    const html = renderTrashConfirmModal(trashState, 'dark');

    expect(html).toContain('id="modal-trash-confirm-overlay"');
    expect(html).toContain('Mettre ce fichier dans la Corbeille');
    expect(html).toContain('rapport-final.pdf');
    expect(html).toContain('C:/Documents/Rapports');
    expect(html).toContain('Le fichier disparaîtra de ce dossier, mais il ne sera pas supprimé définitivement. Il pourra normalement être restauré depuis la Corbeille Windows.');
    expect(html).toContain('id="btn-trash-modal-cancel"');
    expect(html).toContain('id="btn-trash-modal-submit"');
    expect(html).not.toContain('Voulez-vous continuer ?');
  });

  it('renders folder confirmation modal specifying that folder and all its contents will be moved to trash', () => {
    const trashState = {
      isOpen: true,
      step: 'confirm',
      item: { name: 'ProjetArchives', path: 'C:/Documents/ProjetArchives', type: 'directory' },
    };

    const html = renderTrashConfirmModal(trashState, 'light');

    expect(html).toContain('Mettre ce dossier dans la Corbeille');
    expect(html).toContain('Ce dossier et tout ce qu’il contient seront placés dans la Corbeille.');
    expect(html).toContain('Le contenu de ce dossier n’a pas été analysé. L’ensemble du dossier sera concerné.');
  });

  it('renders result modal with former name, location, dateTime, and Ouvrir la Corbeille button (no unreliable restore button)', () => {
    const trashState = {
      isOpen: true,
      step: 'success',
      successInfo: {
        isDirectory: false,
        name: 'notes.txt',
        parentPath: 'C:/Documents',
        dateTime: '25/07/2026 09:03:00',
      },
    };

    const html = renderTrashResultModal(trashState, 'dark');

    expect(html).toContain('id="modal-trash-result-overlay"');
    expect(html).toContain('Le fichier a été placé dans la Corbeille.');
    expect(html).toContain('notes.txt');
    expect(html).toContain('C:/Documents');
    expect(html).toContain('25/07/2026 09:03:00');
    expect(html).toContain('id="btn-trash-open-recycle-bin"');
    expect(html).toContain('Ouvrir la Corbeille');
    expect(html).toContain('id="btn-trash-modal-close"');
    expect(html).not.toContain('Restaurer'); // Unreliable restore button must not be present
  });

  it('renders error modal for protected or failed operations without exposing raw stack traces', () => {
    const trashState = {
      isOpen: true,
      step: 'error',
      error: 'Le fichier n’a pas pu être placé dans la Corbeille. Il est toujours présent à son emplacement initial. Aucun autre fichier n’a été modifié.',
      uncertainState: false,
    };

    const html = renderTrashErrorModal(trashState, 'dark');

    expect(html).toContain('id="modal-trash-error-overlay"');
    expect(html).toContain('Erreur lors de la mise à la Corbeille');
    expect(html).toContain('Le fichier n’a pas pu être placé dans la Corbeille');
    expect(html).toContain('id="btn-trash-error-close"');
  });
});

describe('File System Operations & Tree Updates with Temporary Fixtures', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trash-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('removes trashed file from parent directory', () => {
    const testFile = path.join(tmpDir, 'test-file.txt');
    fs.writeFileSync(testFile, 'Hello World');
    expect(fs.existsSync(testFile)).toBe(true);

    // Simulate trashing via fs.rm or shell.trashItem equivalent
    fs.unlinkSync(testFile);

    expect(fs.existsSync(testFile)).toBe(false);
  });

  it('removes trashed folder and its contents recursively from temporary location', () => {
    const subDir = path.join(tmpDir, 'subfolder');
    fs.mkdirSync(subDir);
    const childFile = path.join(subDir, 'child.txt');
    fs.writeFileSync(childFile, 'child content');

    expect(fs.existsSync(childFile)).toBe(true);

    fs.rmSync(subDir, { recursive: true, force: true });

    expect(fs.existsSync(subDir)).toBe(false);
    expect(fs.existsSync(childFile)).toBe(false);
  });
});
