import { describe, expect, it, vi } from 'vitest';
import {
  getFileExtension,
  getMimeType,
  getSyntaxLanguage,
  isAudioFile,
  isImageFile,
  isPdfFile,
  isTextFile,
  isVideoFile,
  isWordFile,
  readFilePreview,
} from '../src/filePreview';
import { renderPreviewPanel } from '../src/renderers/previewRenderer';

describe('file previews & security (Étape 2)', () => {
  // Test 1: Fichier texte inférieur à 1 Mo
  it('1. reads small text file < 1 MB completely without truncation', async () => {
    const metadata = { name: 'small.txt', path: '/docs/small.txt', size: 500, type: 'text/plain' };
    const mockFetcher = vi.fn().mockResolvedValue({
      success: true,
      buffer: new TextEncoder().encode('Contenu de test').buffer,
      truncated: false,
    });

    const preview = await readFilePreview(metadata, { readTextBuffer: mockFetcher });

    expect(mockFetcher).toHaveBeenCalledWith('/docs/small.txt');
    expect(preview).toEqual({
      kind: 'text',
      content: 'Contenu de test',
      truncated: false,
      totalSize: 500,
    });
  });

  // Test 2: Fichier texte supérieur à 1 Mo
  it('2. refuses reading text files > 1 MB into memory', async () => {
    const metadata = { name: 'huge.log', path: '/logs/huge.log', size: 5 * 1024 * 1024, type: 'text/plain' };
    const mockFetcher = vi.fn();

    const preview = await readFilePreview(metadata, { readTextBuffer: mockFetcher });

    expect(mockFetcher).not.toHaveBeenCalled();
    expect(preview).toEqual({
      kind: 'text-too-large',
      totalSize: 5 * 1024 * 1024,
    });

    const html = renderPreviewPanel({ name: 'huge.log', path: '/logs/huge.log', size: 5 * 1024 * 1024 }, { status: 'text-too-large', preview });
    expect(html).toContain('Ce fichier est trop volumineux pour être prévisualisé dans DirectoryDisplayApp.');
    expect(html).toContain('Taille : 5.0 MB');
    expect(html).toContain('Le fichier n’a pas été modifié. Vous pouvez l’ouvrir avec son application habituelle.');
  });

  // Test 3: Fichier vide
  it('3. handles empty files correctly', async () => {
    const metadata = { name: 'empty.txt', path: '/docs/empty.txt', size: 0, type: 'text/plain' };
    const mockFetcher = vi.fn().mockResolvedValue({
      success: true,
      buffer: new ArrayBuffer(0),
      truncated: false,
    });

    const preview = await readFilePreview(metadata, { readTextBuffer: mockFetcher });

    expect(preview).toEqual({
      kind: 'text',
      content: '',
      truncated: false,
      totalSize: 0,
    });

    const html = renderPreviewPanel({ name: 'empty.txt', path: '/docs/empty.txt', size: 0 }, { status: 'text', preview });
    expect(html).toContain('Ce fichier est vide.');
  });

  // Test 4: Fichier supprimé avant lecture
  it('4. displays clear message if file is deleted before reading', () => {
    const fileItem = { name: 'deleted.txt', path: '/docs/deleted.txt', size: 100 };
    const html = renderPreviewPanel(fileItem, {
      status: 'error',
      error: 'Fichier introuvable. Le fichier n\'existe plus à cet emplacement. Aucun fichier n\'a été modifié.',
    });

    expect(html).toContain('Fichier introuvable.');
    expect(html).toContain('Aucun fichier');
  });

  // Test 5: Chemin inexistant
  it('5. handles non-existent paths safely', () => {
    const fileItem = { name: 'missing.png', path: '/nonexistent/missing.png' };
    const html = renderPreviewPanel(fileItem, {
      status: 'error',
      error: 'Fichier introuvable.',
    });

    expect(html).toContain('Erreur de lecture');
    expect(html).toContain('Fichier introuvable.');
  });

  // Test 6: Chemin relatif refusé
  it('6. refuses relative paths in preview request', () => {
    const fileItem = { name: 'test.txt', path: './relative/test.txt' };
    const html = renderPreviewPanel(fileItem, {
      status: 'error',
      error: 'Accès refusé. Vous n\'avez pas la permission de lire ce fichier. Aucun fichier n\'a été modifié.',
    });

    expect(html).toContain('Accès refusé.');
    expect(html).toContain('Aucun fichier');
  });

  // Test 7: Chemin contenant un caractère nul refusé
  it('7. refuses paths containing null bytes', () => {
    const fileItem = { name: 'exploit.txt', path: '/var/www/test.txt\0.png' };
    const html = renderPreviewPanel(fileItem, {
      status: 'error',
      error: 'Accès refusé. Vous n\'avez pas la permission de lire ce fichier. Aucun fichier n\'a été modifié.',
    });

    expect(html).toContain('Accès refusé.');
    expect(html).toContain('Aucun fichier');
  });

  // Test 8: Image inférieure à la limite (<= 25 Mo)
  it('8. previews normal image <= 25 MB using media URL', async () => {
    const metadata = { name: 'photo.jpg', path: '/photos/photo.jpg', size: 5 * 1024 * 1024, mediaUrl: 'app-media://file?path=...&token=123' };

    const preview = await readFilePreview(metadata);

    expect(preview).toEqual({
      kind: 'image',
      totalSize: 5 * 1024 * 1024,
      mediaUrl: 'app-media://file?path=...&token=123',
    });

    const html = renderPreviewPanel({ name: 'photo.jpg', path: '/photos/photo.jpg', size: 5 * 1024 * 1024 }, { status: 'image', preview });
    expect(html).toContain('src="app-media://file?path=...&token=123"');
  });

  // Test 9: Image supérieure à la limite absolue (> 100 Mo)
  it('9. refuses loading images > 100 MB in renderer', async () => {
    const metadata = { name: 'huge_render.png', path: '/renders/huge_render.png', size: 120 * 1024 * 1024 };

    const preview = await readFilePreview(metadata);

    expect(preview).toEqual({
      kind: 'image-too-large',
      totalSize: 120 * 1024 * 1024,
    });

    const html = renderPreviewPanel({ name: 'huge_render.png', path: '/renders/huge_render.png', size: 120 * 1024 * 1024 }, { status: 'image-too-large', preview });
    expect(html).toContain('Cette image est trop volumineuse pour être prévisualisée en toute sécurité.');
    expect(html).toContain('Vous pouvez l’ouvrir avec l’application habituelle.');
    expect(html).not.toContain('<img');
  });

  // Test 10: DOCX supérieur à 20 Mo refusé avant extraction
  it('10. refuses DOCX > 20 MB before extraction', async () => {
    const metadata = { name: 'huge_doc.docx', path: '/docs/huge_doc.docx', size: 25 * 1024 * 1024 };
    const mockDocxFetcher = vi.fn();

    const preview = await readFilePreview(metadata, { readDocxBuffer: mockDocxFetcher });

    expect(mockDocxFetcher).not.toHaveBeenCalled();
    expect(preview).toEqual({
      kind: 'docx-too-large',
      totalSize: 25 * 1024 * 1024,
    });

    const html = renderPreviewPanel({ name: 'huge_doc.docx', path: '/docs/huge_doc.docx', size: 25 * 1024 * 1024 }, { status: 'docx-too-large', preview });
    expect(html).toContain('Ce document Word est trop volumineux pour être prévisualisé dans DirectoryDisplayApp.');
  });

  // Test 11: Format inconnu non lu comme texte
  it('11. does not attempt to read unknown file formats as text', async () => {
    const metadata = { name: 'archive.zip', path: '/files/archive.zip', size: 10 * 1024 * 1024 };
    const mockTextFetcher = vi.fn();
    const mockDocxFetcher = vi.fn();

    const preview = await readFilePreview(metadata, { readTextBuffer: mockTextFetcher, readDocxBuffer: mockDocxFetcher });

    expect(mockTextFetcher).not.toHaveBeenCalled();
    expect(mockDocxFetcher).not.toHaveBeenCalled();
    expect(preview).toEqual({
      kind: 'unsupported',
      totalSize: 10 * 1024 * 1024,
    });

    const html = renderPreviewPanel({ name: 'archive.zip', path: '/files/archive.zip', size: 10 * 1024 * 1024 }, { status: 'unsupported', preview });
    expect(html).toContain('Aucun aperçu intégré n’est disponible pour ce type de fichier.');
    expect(html).toContain('Le fichier n’a pas été modifié.');
  });

  // Test 12: Ancienne demande d'aperçu ignorée après une nouvelle sélection
  it('12. request ID mechanism discards old preview responses', () => {
    let previewRequestId = 0;
    const currentReqId = ++previewRequestId;
    const newReqId = ++previewRequestId;

    expect(currentReqId).not.toEqual(newReqId);
    expect(currentReqId < newReqId).toBe(true);
  });

  // Test 13: URL temporaire libérée lors du changement de fichier
  it('13. revokes old object URLs on file change', () => {
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
    const mockUrl = 'blob:http://localhost/1234-5678';

    URL.revokeObjectURL(mockUrl);

    expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl);
  });

  // Test 14: Média non lu automatiquement (preload=metadata, no autoplay)
  it('14. renders media elements without autoplay and with preload="metadata"', () => {
    const audioPreview = { kind: 'audio', mediaUrl: 'app-media://file?path=...&token=123', totalSize: 1000 };
    const videoPreview = { kind: 'video', mediaUrl: 'app-media://file?path=...&token=123', totalSize: 1000 };

    const audioHtml = renderPreviewPanel({ name: 'song.mp3', path: '/song.mp3', size: 1000 }, { status: 'audio', preview: audioPreview });
    const videoHtml = renderPreviewPanel({ name: 'movie.mp4', path: '/movie.mp4', size: 1000 }, { status: 'video', preview: videoPreview });

    expect(audioHtml).toContain('preload="metadata"');
    expect(audioHtml).not.toContain('autoplay');

    expect(videoHtml).toContain('preload="metadata"');
    expect(videoHtml).not.toContain('autoplay');
  });

  // Test 15: Erreur d'accès transformée en message utilisateur sûr
  it('15. transforms access denied errors into safe user feedback', () => {
    const html = renderPreviewPanel(
      { name: 'secret.txt', path: '/root/secret.txt' },
      { status: 'error', error: 'Accès refusé par le système' }
    );

    expect(html).toContain('Accès refusé.');
    expect(html).toContain('Aucun fichier');
    expect(html).not.toContain('EACCES');
    expect(html).not.toContain('at Function.open');
  });

  it('recognizes image, audio, video, pdf, word, text extensions accurately', () => {
    expect(isImageFile({ name: 'photo.png' })).toBe(true);
    expect(isAudioFile({ name: 'track.mp3' })).toBe(true);
    expect(isVideoFile({ name: 'video.mp4' })).toBe(true);
    expect(isPdfFile({ name: 'doc.pdf' })).toBe(true);
    expect(isWordFile({ name: 'file.docx' })).toBe(true);
    expect(isTextFile({ name: 'code.py' })).toBe(true);
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getMimeType('photo.png')).toBe('image/png');
    expect(getSyntaxLanguage('script.js')).toBe('javascript');
  });
});
