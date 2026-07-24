import { describe, expect, it } from 'vitest';
import {
  listDirectory,
  type DirectoryHandle,
  type FileSystemEntryHandle,
} from './fileSystem';

function directoryWith(entries: FileSystemEntryHandle[]): DirectoryHandle {
  return {
    kind: 'directory',
    name: 'root',
    async *values() {
      yield* entries;
    },
  };
}

describe('listDirectory', () => {
  it('puts directories first and sorts entries by name', async () => {
    const nested = directoryWith([]);
    const result = await listDirectory(directoryWith([
      {
        kind: 'file',
        name: 'zeta.txt',
        getFile: async () => new File(['hello'], 'zeta.txt'),
      },
      { ...nested, name: 'alpha' },
      {
        kind: 'file',
        name: 'beta.txt',
        getFile: async () => new File(['1234'], 'beta.txt'),
      },
    ]), '/root');

    expect(result.files).toEqual([
      { name: 'alpha', type: 'directory', path: '/root/alpha' },
      { name: 'beta.txt', type: 'file', size: 4, path: '/root/beta.txt' },
      { name: 'zeta.txt', type: 'file', size: 5, path: '/root/zeta.txt' },
    ]);
    expect(result.handles).toHaveLength(3);
  });

  it('keeps a file entry when its metadata cannot be read', async () => {
    const result = await listDirectory(directoryWith([{
      kind: 'file',
      name: 'locked.txt',
      getFile: async () => {
        throw new DOMException('Denied', 'NotAllowedError');
      },
    }]));

    expect(result.files).toEqual([
      { name: 'locked.txt', type: 'file', path: '/locked.txt' },
    ]);
  });

  it('continues listing readable entries when a system entry iterator throws an error', async () => {
    const dir: DirectoryHandle = {
      kind: 'directory',
      name: 'root',
      values() {
        let step = 0;
        return {
          [Symbol.asyncIterator]() {
            return this;
          },
          async next() {
            step++;
            if (step === 1) {
              return {
                done: false,
                value: {
                  kind: 'file',
                  name: 'normal.txt',
                  getFile: async () => new File(['ok'], 'normal.txt'),
                },
              };
            }
            if (step === 2) {
              throw new DOMException('System volume access denied', 'SecurityError');
            }
            return { done: true, value: undefined as any };
          },
        } as any;
      },
    };

    const result = await listDirectory(dir);
    expect(result.files).toEqual([
      { name: 'normal.txt', type: 'file', size: 2, path: '/normal.txt' },
    ]);
  });
});
