import { describe, expect, it } from 'vitest';
import { getElectronFile, listDirectory, openDirectory } from '../src/fileSystem';

describe('listDirectory (Electron)', () => {
  it('calls electronAPI.readDirectory and returns files', async () => {
    globalThis.window = globalThis;
    globalThis.window.electronAPI = {
      isElectron: true,
      readDirectory: async (targetPath) => ({
        files: [
          { name: 'alpha', type: 'directory', path: `${targetPath}/alpha` },
          { name: 'beta.txt', type: 'file', size: 10, path: `${targetPath}/beta.txt` },
        ],
      }),
    };

    const result = await listDirectory({ kind: 'electron-directory', path: '/root' });
    expect(result.files).toEqual([
      { name: 'alpha', type: 'directory', path: '/root/alpha' },
      { name: 'beta.txt', type: 'file', size: 10, path: '/root/beta.txt' },
    ]);

    delete globalThis.window.electronAPI;
  });

  it('handles error from readDirectory IPC', async () => {
    globalThis.window = globalThis;
    globalThis.window.electronAPI = {
      isElectron: true,
      readDirectory: async () => ({ error: 'Access denied' }),
    };

    await expect(listDirectory({ kind: 'electron-directory', path: '/restricted' })).rejects.toThrow('Access denied');

    delete globalThis.window.electronAPI;
  });
});

describe('openDirectory (Electron)', () => {
  it('returns electron-directory object on folder pick', async () => {
    globalThis.window = globalThis;
    globalThis.window.electronAPI = {
      isElectron: true,
      selectDirectory: async () => 'C:\\Users\\Test\\Documents',
    };

    const handle = await openDirectory();
    expect(handle).toEqual({
      kind: 'electron-directory',
      name: 'Documents',
      path: 'C:\\Users\\Test\\Documents',
    });

    delete globalThis.window.electronAPI;
  });
});

describe('getElectronFile', () => {
  it('constructs File with proper MIME type from electronAPI buffer', async () => {
    globalThis.window = globalThis;
    globalThis.window.electronAPI = {
      isElectron: true,
      readFileBuffer: async () => ({
        buffer: new ArrayBuffer(8),
        totalSize: 8,
      }),
    };

    const file = await getElectronFile('/docs/paper.pdf', 'paper.pdf');
    expect(file).not.toBeNull();
    expect(file?.name).toBe('paper.pdf');
    expect(file?.type).toBe('application/pdf');
    expect(file?.totalSize).toBe(8);

    delete globalThis.window.electronAPI;
  });
});
