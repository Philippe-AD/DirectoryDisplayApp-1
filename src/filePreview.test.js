import { describe, expect, it, vi } from 'vitest';
import {
  MAX_TEXT_PREVIEW_BYTES,
  getFileExtension,
  getSyntaxLanguage,
  isImageFile,
  isPdfFile,
  isTextFile,
  isWordFile,
  readFilePreview,
  readTextPreview,
} from './filePreview';
import { renderPreviewPanel } from './renderers';

describe('file previews', () => {
  it('recognizes image files by MIME type or extension', () => {
    expect(isImageFile(new File(['data'], 'photo.png', { type: 'image/png' }))).toBe(true);
    expect(isImageFile(new File(['data'], 'picture.JPG'))).toBe(true);
    expect(isImageFile(new File(['data'], 'graphic.svg'))).toBe(true);
    expect(isImageFile(new File(['data'], 'anim.webp'))).toBe(true);
    expect(isImageFile(new File(['data'], 'document.pdf'))).toBe(false);
  });

  it('recognizes text MIME types and supported text extensions', () => {
    expect(isTextFile(new File(['hello'], 'notes.bin', { type: 'text/plain' }))).toBe(true);
    expect(isTextFile(new File(['{}'], 'settings.json'))).toBe(true);
    expect(isTextFile(new File(['print("hello")'], 'main.py'))).toBe(true);
    expect(isTextFile(new File(['SELECT 1'], 'query.sql'))).toBe(true);
    expect(isTextFile(new File(['image'], 'photo.png', { type: 'image/png' }))).toBe(false);
  });

  it('maps source file extensions to Prism languages', () => {
    expect(getSyntaxLanguage('main.py')).toBe('python');
    expect(getSyntaxLanguage('Program.cs')).toBe('csharp');
    expect(getSyntaxLanguage('Application.JAVA')).toBe('java');
    expect(getSyntaxLanguage('query.sql')).toBe('sql');
    expect(getSyntaxLanguage('README.txt')).toBeNull();
  });

  it('recognizes PDF and Word files by extension or MIME type', () => {
    expect(isPdfFile(new File(['pdf'], 'report.PDF'))).toBe(true);
    expect(isPdfFile(new File(['pdf'], 'report', { type: 'application/pdf' }))).toBe(true);
    expect(isWordFile(new File(['docx'], 'letter.docx'))).toBe(true);
    expect(isWordFile(new File(['doc'], 'letter', { type: 'application/msword' }))).toBe(true);
    expect(getFileExtension('archive.tar.GZ')).toBe('gz');
  });

  it('returns dedicated previews for image, PDF, legacy Word documents, and handles corrupted docx files', async () => {
    await expect(readFilePreview(new File(['img'], 'photo.png', { type: 'image/png' }))).resolves.toEqual({
      kind: 'image',
    });
    await expect(readFilePreview(new File(['pdf'], 'report.pdf'))).resolves.toEqual({
      kind: 'pdf',
    });
    await expect(readFilePreview(new File(['doc'], 'letter.doc'))).resolves.toEqual({
      kind: 'unsupported-word',
    });
    await expect(readFilePreview(new File(['not a real zip/docx content'], 'corrupted.docx'))).resolves.toEqual({
      kind: 'word-error',
    });
  });

  it('returns null for binary files', async () => {
    const file = new File(['binary'], 'photo.png', { type: 'image/png' });
    await expect(readTextPreview(file)).resolves.toBeNull();
  });

  it('reads small text file completely without truncation', async () => {
    const content = 'Hello world, this is a small text file.';
    const file = new File([content], 'small.txt', { type: 'text/plain' });

    const preview = await readTextPreview(file);
    expect(preview).toEqual({
      content,
      truncated: false,
      totalSize: content.length,
    });

    const fullPreview = await readFilePreview(file);
    expect(fullPreview).toEqual({
      kind: 'text',
      content,
      truncated: false,
      totalSize: content.length,
    });
  });

  it('limits text preview for files > 1 MB and reads only the first megabyte slice', async () => {
    const mockFile = {
      name: 'large.txt',
      type: 'text/plain',
      size: MAX_TEXT_PREVIEW_BYTES + 500,
      slice: (start, end) => {
        return new File(['a'.repeat(end - start)], 'large.txt');
      },
    };

    const spySlice = vi.spyOn(mockFile, 'slice');

    const preview = await readTextPreview(mockFile);

    expect(spySlice).toHaveBeenCalledWith(0, MAX_TEXT_PREVIEW_BYTES);
    expect(preview?.truncated).toBe(true);
    expect(preview?.totalSize).toBe(MAX_TEXT_PREVIEW_BYTES + 500);
    expect(preview?.content.length).toBe(MAX_TEXT_PREVIEW_BYTES);
  });

  it('respects attached file.totalSize property from IPC metadata', async () => {
    const file = new File(['a'.repeat(100)], 'large.log', { type: 'text/plain' });
    Object.defineProperty(file, 'totalSize', { value: 10 * 1024 * 1024 });

    const preview = await readTextPreview(file);
    expect(preview?.truncated).toBe(true);
    expect(preview?.totalSize).toBe(10 * 1024 * 1024);
  });

  it('renders truncation notice with total file size in preview panel', () => {
    const item = { path: '/logs/app.log', name: 'app.log', type: 'file', size: 49073356 };
    const preview = {
      kind: 'text',
      content: 'log data',
      truncated: true,
      totalSize: 49073356,
    };

    const html = renderPreviewPanel(item, { status: 'text', preview }, null);

    expect(html).toContain('Aperçu limité au premier mégaoctet');
    expect(html).toContain('taille totale : 46.8 MB');
    expect(html).toContain('id="preview-truncated-warning"');
  });

  it('renders empty selection state, loading state, folder state, and error states explicitly in panel', () => {
    expect(renderPreviewPanel(null)).toContain('Aucun fichier sélectionné');

    const folderItem = { path: '/docs', name: 'docs', type: 'directory' };
    expect(renderPreviewPanel(folderItem, { status: 'folder' })).toContain('Dossier de fichiers');

    const fileItem = { path: '/file.txt', name: 'file.txt', type: 'file' };
    expect(renderPreviewPanel(fileItem, { status: 'loading' })).toContain('Chargement de la prévisualisation...');

    expect(renderPreviewPanel(fileItem, { status: 'error' })).toContain('Erreur de lecture');
    expect(renderPreviewPanel(fileItem, { status: 'unsupported' })).toContain('Format non pris en charge');
  });

  it('handles read errors gracefully without throwing', async () => {
    const faultyFile = {
      name: 'broken.txt',
      type: 'text/plain',
      size: 100,
      slice() {
        return {
          async text() {
            throw new Error('Disk read error');
          },
        };
      },
    };

    const preview = await readTextPreview(faultyFile);
    expect(preview).toBeNull();

    const fullPreview = await readFilePreview(faultyFile);
    expect(fullPreview).toEqual({ kind: 'unsupported' });
  });
});
