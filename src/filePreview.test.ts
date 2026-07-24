import { describe, expect, it } from 'vitest';
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

  it('limits large text previews', async () => {
    const file = new File(
      ['a'.repeat(MAX_TEXT_PREVIEW_BYTES + 10)],
      'large.txt',
      { type: 'text/plain' },
    );

    const preview = await readTextPreview(file);

    expect(preview?.indexOf('\n\n')).toBe(MAX_TEXT_PREVIEW_BYTES);
    expect(preview?.slice(0, MAX_TEXT_PREVIEW_BYTES)).toBe(
      'a'.repeat(MAX_TEXT_PREVIEW_BYTES),
    );
    expect(preview).toMatch(/\[Preview truncated after 1\.0 MB\]$/);
  });
});
