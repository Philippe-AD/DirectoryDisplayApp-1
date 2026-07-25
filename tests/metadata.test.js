import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createTestDirectoryTree, cleanupTestDirectoryTree } from './helpers/testDirectoryHelper.js';
import { formatFileSize, getFileExtension } from '../src/renderers/formatters.js';

describe('Metadata & Size Formatting Tests (Section 6)', () => {
  let env;

  beforeEach(async () => {
    env = await createTestDirectoryTree();
  });

  afterEach(async () => {
    await cleanupTestDirectoryTree(env.rootTempDir);
  });

  describe('File size formatting', () => {
    it('1. should format 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('2. should format small bytes (<1024)', () => {
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('3. should format Kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048575)).toBe('1024.0 KB');
    });

    it('4. should format Megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(15728640)).toBe('15.0 MB');
    });

    it('5. should format Gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1.00 GB');
      expect(formatFileSize(5368709120)).toBe('5.00 GB');
    });

    it('6. should handle undefined or null bytes safely', () => {
      expect(formatFileSize(null)).toBe('');
      expect(formatFileSize(undefined)).toBe('');
    });
  });

  describe('File extension extraction', () => {
    it('7. should extract extensions correctly', () => {
      expect(getFileExtension('document.pdf')).toBe('PDF');
      expect(getFileExtension('archive.tar.gz')).toBe('GZ');
      expect(getFileExtension('fichier-sans-extension')).toBe('FILE');
      expect(getFileExtension('')).toBe('FILE');
      expect(getFileExtension(null)).toBe('FILE');
    });
  });

  describe('FileSystem Item Metadata Verification', () => {
    it('8. should retrieve stats and distinguish file vs folder', async () => {
      const filePath = path.join(env.docsDir, 'notes.txt');
      const folderPath = env.docsDir;

      const fileStats = await fs.promises.stat(filePath);
      const folderStats = await fs.promises.stat(folderPath);

      expect(fileStats.isFile()).toBe(true);
      expect(fileStats.isDirectory()).toBe(false);
      expect(fileStats.size).toBeGreaterThan(0);
      expect(fileStats.mtime).toBeInstanceOf(Date);

      expect(folderStats.isDirectory()).toBe(true);
      expect(folderStats.isFile()).toBe(false);
    });

    it('9. should handle deleted item gracefully when requesting metadata', async () => {
      const tempFile = path.join(env.docsDir, 'temp_to_delete.txt');
      await fs.promises.writeFile(tempFile, 'temp content', 'utf8');
      
      // Verification existence
      expect(fs.existsSync(tempFile)).toBe(true);

      // Suppression externe
      await fs.promises.unlink(tempFile);

      // Stat sur fichier supprimé doit lever une erreur ENOENT
      let statError = null;
      try {
        await fs.promises.stat(tempFile);
      } catch (err) {
        statError = err;
      }
      expect(statError).not.toBeNull();
      expect(statError.code).toBe('ENOENT');
    });
  });
});
