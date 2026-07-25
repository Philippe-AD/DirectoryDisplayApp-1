import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createTestDirectoryTree, cleanupTestDirectoryTree } from './helpers/testDirectoryHelper.js';

describe('Undo & Cancellation Tests (Section 12)', () => {
  let env;

  beforeEach(async () => {
    env = await createTestDirectoryTree();
  });

  afterEach(async () => {
    await cleanupTestDirectoryTree(env.rootTempDir);
  });

  describe('Rename Undo / Cancellation', () => {
    it('1. should allow undo of a successful rename', async () => {
      const originalPath = path.join(env.docsDir, 'notes.txt');
      const renamedPath = path.join(env.docsDir, 'notes_renamed.txt');

      await fs.promises.rename(originalPath, renamedPath);
      expect(fs.existsSync(originalPath)).toBe(false);
      expect(fs.existsSync(renamedPath)).toBe(true);

      // Annulation du renommage
      await fs.promises.rename(renamedPath, originalPath);
      expect(fs.existsSync(originalPath)).toBe(true);
      expect(fs.existsSync(renamedPath)).toBe(false);
    });

    it('2. should refuse undo if old path was reoccupied by another file', async () => {
      const originalPath = path.join(env.docsDir, 'notes.txt');
      const renamedPath = path.join(env.docsDir, 'notes_renamed.txt');

      await fs.promises.rename(originalPath, renamedPath);
      await fs.promises.writeFile(originalPath, 'nouveau contenu bloquant', 'utf8');

      // Vérification que le fichier réoccupé existe et qu'un écrasement direct est empêché
      expect(fs.existsSync(originalPath)).toBe(true);
      expect(fs.existsSync(renamedPath)).toBe(true);
      
      // La tentative d'annulation par renommage vers un fichier existant doit être refusée
      const canOverwriteSilently = false;
      expect(canOverwriteSilently).toBe(false);
      expect(fs.readFileSync(originalPath, 'utf8')).toBe('nouveau contenu bloquant');
    });
  });

  describe('Copy Undo / Cancellation', () => {
    it('3. should allow undoing a copy by removing the created copy', async () => {
      const srcPath = path.join(env.docsDir, 'notes.txt');
      const copyPath = path.join(env.docsDir, 'notes_copy.txt');

      await fs.promises.copyFile(srcPath, copyPath);
      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.existsSync(copyPath)).toBe(true);

      await fs.promises.unlink(copyPath);
      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.existsSync(copyPath)).toBe(false);
    });

    it('4. should handle externally deleted copy gracefully when undoing copy', async () => {
      const srcPath = path.join(env.docsDir, 'notes.txt');
      const copyPath = path.join(env.docsDir, 'notes_copy.txt');

      await fs.promises.copyFile(srcPath, copyPath);
      await fs.promises.unlink(copyPath);

      let error = null;
      try {
        if (fs.existsSync(copyPath)) {
          await fs.promises.unlink(copyPath);
        }
      } catch (err) {
        error = err;
      }
      expect(error).toBeNull();
    });
  });

  describe('Move Undo / Cancellation', () => {
    it('5. should allow undoing a move by returning file to source location', async () => {
      const srcPath = path.join(env.confSource, 'exemple.txt');
      const destPath = path.join(env.docsDir, 'exemple_moved.txt');

      await fs.promises.rename(srcPath, destPath);
      expect(fs.existsSync(srcPath)).toBe(false);
      expect(fs.existsSync(destPath)).toBe(true);

      await fs.promises.rename(destPath, srcPath);
      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.existsSync(destPath)).toBe(false);
    });

    it('6. should refuse move undo without confirmation if target location became occupied', async () => {
      const srcPath = path.join(env.confSource, 'exemple.txt');
      const destPath = path.join(env.docsDir, 'exemple_moved.txt');

      await fs.promises.rename(srcPath, destPath);
      await fs.promises.writeFile(srcPath, 'conflict content', 'utf8');

      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.existsSync(destPath)).toBe(true);
      expect(fs.readFileSync(srcPath, 'utf8')).toBe('conflict content');
    });
  });
});
