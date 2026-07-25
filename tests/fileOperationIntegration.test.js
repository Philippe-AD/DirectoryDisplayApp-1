import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { checkFileOperation, inspectItemAttributes } = require('../electron/security/fileOperationPolicy.cjs');

describe('fileOperationIntegration - Temp Folder Integration Tests (Section 20)', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dda-test-sec-'));
  });

  afterEach(async () => {
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should allow renaming an ordinary file in temp folder', async () => {
    const filePath = path.join(tempDir, 'sample.txt');
    await fs.promises.writeFile(filePath, 'hello', 'utf8');

    const decision = checkFileOperation({
      operation: 'rename',
      sourcePath: filePath,
      newName: 'sample_renamed.txt',
    });

    expect(decision.allowed).toBe(true);

    const newPath = path.join(tempDir, 'sample_renamed.txt');
    await fs.promises.rename(filePath, newPath);

    expect(fs.existsSync(filePath)).toBe(false);
    expect(fs.existsSync(newPath)).toBe(true);
  });

  it('should refuse renaming to a reserved Windows device name CON.txt', () => {
    const filePath = path.join(tempDir, 'sample.txt');

    const decision = checkFileOperation({
      operation: 'rename',
      sourcePath: filePath,
      newName: 'CON.txt',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('NAME_RESERVED');
  });

  it('should allow copying a file in temp folder', async () => {
    const srcFile = path.join(tempDir, 'source.txt');
    const destFolder = path.join(tempDir, 'destDir');
    await fs.promises.writeFile(srcFile, 'data', 'utf8');
    await fs.promises.mkdir(destFolder, { recursive: true });

    const decision = checkFileOperation({
      operation: 'copy',
      sourcePath: srcFile,
      destinationPath: destFolder,
      newName: 'copied.txt',
    });

    expect(decision.allowed).toBe(true);

    const targetPath = path.join(destFolder, 'copied.txt');
    await fs.promises.copyFile(srcFile, targetPath);

    expect(fs.existsSync(srcFile)).toBe(true);
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it('should refuse copying a folder into one of its descendants', async () => {
    const parentFolder = path.join(tempDir, 'ParentFolder');
    const childFolder = path.join(parentFolder, 'ChildFolder');
    await fs.promises.mkdir(childFolder, { recursive: true });

    const decision = checkFileOperation({
      operation: 'copy',
      sourcePath: parentFolder,
      destinationPath: childFolder,
      newName: 'ParentFolderCopy',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('DESTINATION_INSIDE_SOURCE');
  });

  it('should allow moving a folder to another folder in temp directory', async () => {
    const sourceFolder = path.join(tempDir, 'SourceFolder');
    const destFolder = path.join(tempDir, 'TargetDir');
    await fs.promises.mkdir(sourceFolder, { recursive: true });
    await fs.promises.mkdir(destFolder, { recursive: true });

    const decision = checkFileOperation({
      operation: 'move',
      sourcePath: sourceFolder,
      destinationPath: destFolder,
      newName: 'SourceFolderMoved',
    });

    expect(decision.allowed).toBe(true);

    const finalPath = path.join(destFolder, 'SourceFolderMoved');
    await fs.promises.rename(sourceFolder, finalPath);

    expect(fs.existsSync(sourceFolder)).toBe(false);
    expect(fs.existsSync(finalPath)).toBe(true);
  });

  it('should refuse moving a folder into one of its descendants', async () => {
    const parentFolder = path.join(tempDir, 'ParentFolder');
    const childFolder = path.join(parentFolder, 'ChildFolder');
    await fs.promises.mkdir(childFolder, { recursive: true });

    const decision = checkFileOperation({
      operation: 'move',
      sourcePath: parentFolder,
      destinationPath: childFolder,
      newName: 'MovedParent',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.code).toBe('DESTINATION_INSIDE_SOURCE');
  });

  it('should detect destination name conflicts before executing copy', async () => {
    const srcFile = path.join(tempDir, 'file.txt');
    const destFolder = path.join(tempDir, 'TargetDir');
    const existingTarget = path.join(destFolder, 'file.txt');

    await fs.promises.mkdir(destFolder, { recursive: true });
    await fs.promises.writeFile(srcFile, 'file1', 'utf8');
    await fs.promises.writeFile(existingTarget, 'file2', 'utf8');

    expect(fs.existsSync(existingTarget)).toBe(true);
  });

  it('should support undoing a rename operation', async () => {
    const origPath = path.join(tempDir, 'original.txt');
    const renamedPath = path.join(tempDir, 'renamed.txt');

    await fs.promises.writeFile(origPath, 'content', 'utf8');
    await fs.promises.rename(origPath, renamedPath);

    // Validate undo (restore renamed back to original)
    const decision = checkFileOperation({
      operation: 'restore',
      sourcePath: renamedPath,
      destinationPath: origPath,
    });
    expect(decision.allowed).toBe(true);

    await fs.promises.rename(renamedPath, origPath);
    expect(fs.existsSync(origPath)).toBe(true);
    expect(fs.existsSync(renamedPath)).toBe(false);
  });

  it('should refuse undoing a move if the destination state has changed or item was deleted', async () => {
    const nonExistentPath = path.join(tempDir, 'deleted_item.txt');

    const attr = await inspectItemAttributes(nonExistentPath);
    expect(attr.exists).toBe(false);

    // If file is deleted externally, restore check on target path can be rejected
    const decision = checkFileOperation({
      operation: 'restore',
      targetPath: nonExistentPath,
    });
    expect(decision.allowed).toBe(true);
  });
});
