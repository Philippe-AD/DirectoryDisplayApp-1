import { describe, expect, it } from 'vitest';
import {
  renderMainLayout,
  renderPreviewPanel,
  renderFileCard,
  formatFileSize,
} from './renderers';

describe('renderers & UI layout', () => {
  it('formats file sizes accurately', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5242880)).toBe('5.0 MB');
    expect(formatFileSize(2147483648)).toBe('2.00 GB');
  });

  it('renders selected file card with active highlight and aria-selected="true"', () => {
    const item = { path: '/src/main.js', name: 'main.js', type: 'file', size: 1200 };
    const htmlUnselected = renderFileCard(item, false);
    const htmlSelected = renderFileCard(item, true);

    expect(htmlUnselected).toContain('aria-selected="false"');
    expect(htmlSelected).toContain('aria-selected="true"');
    expect(htmlSelected).toContain('ring-2 ring-blue-500');
  });

  it('renders main layout with list, resizer, and side preview panel', () => {
    const crumbs = [{ name: 'Project', path: '/Project' }];
    const items = [
      { name: 'src', type: 'directory', path: '/Project/src' },
      { name: 'README.md', type: 'file', path: '/Project/README.md', size: 450 },
    ];
    const selectedItem = items[1];

    const html = renderMainLayout(
      'Project',
      '/Project',
      crumbs,
      items,
      false,
      '',
      false,
      null,
      selectedItem,
      { status: 'text', preview: { kind: 'text', content: '# Hello' } },
      null,
      true,
      380
    );

    expect(html).toContain('id="file-list-container"');
    expect(html).toContain('id="resizer"');
    expect(html).toContain('id="preview-panel-container"');
    expect(html).toContain('width: 380px;');
    expect(html).toContain('README.md');
    expect(html).toContain('Aperçu contenu');
  });

  it('allows hiding the preview panel and expanding file list', () => {
    const crumbs = [{ name: 'Project', path: '/Project' }];
    const items = [{ name: 'index.js', type: 'file', path: '/Project/index.js' }];

    const htmlHidden = renderMainLayout(
      'Project',
      '/Project',
      crumbs,
      items,
      false,
      '',
      false,
      null,
      items[0],
      { status: 'idle' },
      null,
      false, // panel hidden
      380
    );

    expect(htmlHidden).toContain('hidden');
    expect(htmlHidden).not.toContain('id="resizer"');
    expect(htmlHidden).toContain('Afficher panneau');
  });

  it('displays folder info when a directory is selected', () => {
    const folderItem = { path: '/Project/components', name: 'components', type: 'directory' };
    const html = renderPreviewPanel(folderItem, { status: 'folder' }, null);

    expect(html).toContain('components');
    expect(html).toContain('Dossier de fichiers');
    expect(html).toContain('Double-cliquez sur ce dossier dans la liste pour y naviguer');
  });

  it('displays error notice when preview loading fails', () => {
    const fileItem = { path: '/Project/corrupted.bin', name: 'corrupted.bin', type: 'file' };
    const html = renderPreviewPanel(fileItem, { status: 'error' }, null);

    expect(html).toContain('Erreur de lecture');
    expect(html).toContain('Impossible de lire le contenu de ce fichier');
  });

  it('supports collapsing and expanding header bar to maximize screen space', () => {
    const crumbs = [{ name: 'Project', path: '/Project' }];
    const items = [{ name: 'index.js', type: 'file', path: '/Project/index.js' }];

    const htmlExpanded = renderMainLayout(
      'Project',
      '/Project',
      crumbs,
      items,
      false,
      '',
      false,
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380,
      false // expanded header
    );

    const htmlCollapsed = renderMainLayout(
      'Project',
      '/Project',
      crumbs,
      items,
      false,
      '',
      false,
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380,
      true // collapsed header
    );

    expect(htmlExpanded).toContain('id="app-header"');
    expect(htmlExpanded).toContain('id="btn-toggle-header"');
    expect(htmlExpanded).toContain('Réduire');

    expect(htmlCollapsed).toContain('id="app-header"');
    expect(htmlCollapsed).toContain('id="btn-toggle-header"');
    expect(htmlCollapsed).toContain('Agrandir');
    expect(htmlCollapsed).toContain('py-2.5');
  });
});
