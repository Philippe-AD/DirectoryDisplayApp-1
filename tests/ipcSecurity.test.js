import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { checkFileOperation } = require('../electron/security/fileOperationPolicy.cjs');

describe('IPC Security & Electron Isolation Tests (Section 17)', () => {
  it('1. should reject paths containing null byte (\\0) injection', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\Test\\file.txt\0.exe',
      newName: 'renamed.txt',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('INVALID_PATH');
    expect(res.message).toContain('caractères nuls');
  });

  it('2. should reject non-string or undefined source paths', () => {
    const resNull = checkFileOperation({
      operation: 'rename',
      sourcePath: null,
      newName: 'test.txt',
    });
    expect(resNull.allowed).toBe(false);
    expect(resNull.code).toBe('INVALID_PATH');

    const resNumber = checkFileOperation({
      operation: 'rename',
      sourcePath: 12345,
      newName: 'test.txt',
    });
    expect(resNumber.allowed).toBe(false);
    expect(resNumber.code).toBe('INVALID_PATH');
  });

  it('3. should reject unknown operations', () => {
    const res = checkFileOperation({
      operation: 'unknown_dangerous_op',
      sourcePath: 'C:\\Users\\Test\\file.txt',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('INVALID_OPERATION');
  });

  it('4. should ensure system drive root operations are blocked', () => {
    const res = checkFileOperation({
      operation: 'move',
      sourcePath: 'C:\\',
      destinationPath: 'D:\\',
      newName: 'C_Drive',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('DRIVE_ROOT_PROTECTED');
  });

  it('5. should ensure User Profile Root operations are blocked', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\TestUser',
      newName: 'RenamedUser',
      mockEnv: { USERPROFILE: 'C:\\Users\\TestUser' },
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('USER_PROFILE_ROOT_PROTECTED');
  });

  it('6. should confirm preload.cjs is configured safely without exposing raw fs or electron', () => {
    const preloadPath = path.join(__dirname, '../electron/preload.cjs');
    const content = fs.readFileSync(preloadPath, 'utf8');

    expect(content).toContain('contextBridge.exposeInMainWorld');
    expect(content).toContain("'electronAPI'");
    expect(content).not.toContain('require("fs")');
    expect(content).not.toContain('require(\'fs\')');
    expect(content).not.toContain('ipcRenderer.sendSync');
  });
});
