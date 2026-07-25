import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { checkFileOperation } = require('../electron/security/fileOperationPolicy.cjs');

describe('User Messages & Error Code Tests (Section 13)', () => {
  it('1. should return explicit code and user-oriented error message for protected system path', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Windows\\System32\\notepad.exe',
      newName: 'test.exe',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
    expect(res.message).toBeDefined();
    expect(typeof res.message).toBe('string');
    expect(res.message).not.toContain('Error: at ');
    expect(res.message).not.toContain('TypeError');
    expect(res.message).toContain('système');
  });

  it('2. should return clear error message for drive root operation refusal', () => {
    const res = checkFileOperation({
      operation: 'trash',
      targetPath: 'C:\\',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('DRIVE_ROOT_PROTECTED');
    expect(res.message).toContain('racine');
  });

  it('3. should return clear message for reserved Windows name conflict', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\Test\\file.txt',
      newName: 'CON.txt',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('NAME_RESERVED');
    expect(res.message).toContain('réservé');
  });

  it('4. should return clear message for illegal filename characters', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\Test\\file.txt',
      newName: 'invalid/name?.txt',
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe('NAME_INVALID');
    expect(res.message).toContain('caractères interdits');
  });

  it('5. should ensure error messages contain explanatory and actionable feedback', () => {
    const codes = ['SYSTEM_PATH_PROTECTED', 'DRIVE_ROOT_PROTECTED', 'USER_PROFILE_ROOT_PROTECTED', 'NAME_RESERVED'];
    
    codes.forEach((code) => {
      let res;
      if (code === 'DRIVE_ROOT_PROTECTED') {
        res = checkFileOperation({ operation: 'trash', targetPath: 'C:\\' });
      } else if (code === 'USER_PROFILE_ROOT_PROTECTED') {
        res = checkFileOperation({ operation: 'rename', sourcePath: 'C:\\Users\\TestUser', newName: 'NewUser', mockEnv: { USERPROFILE: 'C:\\Users\\TestUser' } });
      } else if (code === 'NAME_RESERVED') {
        res = checkFileOperation({ operation: 'rename', sourcePath: 'C:\\Users\\Test\\file.txt', newName: 'AUX.txt' });
      } else {
        res = checkFileOperation({ operation: 'rename', sourcePath: 'C:\\Windows\\System32', newName: 'NewSys' });
      }
      expect(res.message).toBeDefined();
      expect(res.message.length).toBeGreaterThan(10);
    });
  });
});
