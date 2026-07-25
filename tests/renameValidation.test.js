import { describe, expect, it } from 'vitest';
import {
  validateRename,
  splitFileName,
  isExtensionModified,
} from '../src/renameValidation';

describe('renameValidation module', () => {
  describe('splitFileName', () => {
    it('correctly splits regular file names with extension', () => {
      expect(splitFileName('rapport-2025.pdf')).toEqual({
        baseName: 'rapport-2025',
        ext: '.pdf',
        hasExtension: true,
      });
    });

    it('handles files without extension or dotfiles', () => {
      expect(splitFileName('README')).toEqual({
        baseName: 'README',
        ext: '',
        hasExtension: false,
      });

      expect(splitFileName('.gitignore')).toEqual({
        baseName: '.gitignore',
        ext: '',
        hasExtension: false,
      });
    });
  });

  describe('isExtensionModified', () => {
    it('returns false when extension is unchanged', () => {
      const res = isExtensionModified('report.pdf', 'report-final.pdf', false);
      expect(res.isModified).toBe(false);
    });

    it('returns true when extension is changed or removed', () => {
      const res1 = isExtensionModified('report.pdf', 'report.txt', false);
      expect(res1.isModified).toBe(true);
      expect(res1.oldExt).toBe('.pdf');
      expect(res1.newExt).toBe('.txt');

      const res2 = isExtensionModified('report.pdf', 'report', false);
      expect(res2.isModified).toBe(true);
      expect(res2.oldExt).toBe('.pdf');
      expect(res2.newExt).toBe('');
    });

    it('always returns false for directories', () => {
      const res = isExtensionModified('folder.pdf', 'folder.txt', true);
      expect(res.isModified).toBe(false);
    });
  });

  describe('validateRename', () => {
    it('rejects empty or whitespace-only names', () => {
      const res = validateRename({ currentName: 'a.txt', newName: '   ', isDirectory: false });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('vide');
    });

    it('rejects forbidden Windows characters', () => {
      const forbidden = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
      for (const char of forbidden) {
        const res = validateRename({
          currentName: 'a.txt',
          newName: `file${char}.txt`,
          isDirectory: false,
        });
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('caractères interdits');
      }
    });

    it('rejects names ending with a period or space', () => {
      const resPeriod = validateRename({ currentName: 'a.txt', newName: 'file.', isDirectory: false });
      expect(resPeriod.isValid).toBe(false);
      expect(resPeriod.error).toContain('point ou un espace');

      const resSpace = validateRename({ currentName: 'a.txt', newName: 'file ', isDirectory: false });
      expect(resSpace.isValid).toBe(false);
      expect(resSpace.error).toContain('point ou un espace');
    });

    it('rejects Windows reserved names', () => {
      const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
      for (const name of reserved) {
        const res1 = validateRename({ currentName: 'a.txt', newName: name, isDirectory: false });
        expect(res1.isValid).toBe(false);
        expect(res1.error).toContain('réservé');

        const res2 = validateRename({ currentName: 'a.txt', newName: `${name}.txt`, isDirectory: false });
        expect(res2.isValid).toBe(false);
        expect(res2.error).toContain('réservé');
      }
    });

    it('rejects unchanged names', () => {
      const res = validateRename({ currentName: 'report.pdf', newName: 'report.pdf', isDirectory: false });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('identique');
    });

    it('rejects duplicate names in the same directory (case-insensitive)', () => {
      const parentChildren = ['file1.txt', 'file2.txt', 'FolderA'];

      const res = validateRename({
        currentName: 'file1.txt',
        newName: 'FILE2.TXT',
        isDirectory: false,
        parentChildrenNames: parentChildren,
      });

      expect(res.isValid).toBe(false);
      expect(res.error).toContain('existe déjà');
    });

    it('rejects path length exceeding maxPathLength limit', () => {
      const longParent = 'C:/' + 'a'.repeat(250);
      const res = validateRename({
        currentName: 'old.txt',
        newName: 'new-very-long-name.txt',
        isDirectory: false,
        parentPath: longParent,
        maxPathLength: 260,
      });

      expect(res.isValid).toBe(false);
      expect(res.error).toContain('dépasse la limite');
    });

    it('accepts valid new names', () => {
      const res = validateRename({
        currentName: 'rapport-2025.pdf',
        newName: 'rapport-final.pdf',
        isDirectory: false,
        parentChildrenNames: ['rapport-2025.pdf', 'notes.txt'],
        parentPath: 'C:/Users/Test/Documents',
      });

      expect(res.isValid).toBe(true);
      expect(res.error).toBeNull();
    });
  });
});
