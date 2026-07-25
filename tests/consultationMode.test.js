import { describe, expect, it } from 'vitest';
import {
  renderMainLayout,
  renderPreviewPanel,
  renderTreeNode,
  renderExternalOpenModal,
} from '../src/renderers';
import {
  getVisibleTreeNodes,
} from '../src/main';

describe('1. Permanent Protected Mode Indicator', () => {
  it('renders permanent protected mode indicator with lock icon and exact reassuring text', () => {
    const html = renderMainLayout(
      'Project',
      '/Project',
      [],
      false,
      '',
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380,
      false,
      true
    );

    expect(html).toContain('id="consultation-mode-indicator"');
    expect(html).toContain('Mode protégé — aucune modification sans confirmation');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Mode protégé — aucune modification sans confirmation"');
  });

  it('remains visible when header is collapsed, preview active, or tree hidden', () => {
    const htmlHiddenTree = renderMainLayout(
      'Project',
      '/Project',
      [],
      false,
      '',
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380,
      true,  // collapsed header
      false  // hidden tree
    );

    expect(htmlHiddenTree).toContain('id="consultation-mode-indicator"');
    expect(htmlHiddenTree).toContain('Mode protégé — aucune modification sans confirmation');
  });
});

describe('2. Technical Protection Against Unintended File Modifications', () => {
  it('does not include any delete, copy, or move actions in the interface', () => {
    const item = { path: '/Project/file.txt', name: 'file.txt', type: 'file', size: 100 };
    const treeHtml = renderTreeNode(item, true);
    const panelHtml = renderPreviewPanel(item, { status: 'text', preview: { kind: 'text', content: 'hello' } }, 'blob:abc');

    expect(treeHtml.toLowerCase()).not.toContain('supprimer');
    expect(treeHtml.toLowerCase()).not.toContain('déplacer');
    expect(treeHtml.toLowerCase()).not.toContain('copier');

    expect(panelHtml.toLowerCase()).not.toContain('supprimer');
    expect(panelHtml.toLowerCase()).not.toContain('déplacer');
    expect(panelHtml.toLowerCase()).not.toContain('copier');
  });

  it('disables drag-and-drop on treeview items with draggable="false"', () => {
    const item = { path: '/Project/doc.pdf', name: 'doc.pdf', type: 'file', size: 500 };
    const html = renderTreeNode(item, false);

    expect(html).toContain('draggable="false"');
  });
});

describe('3. Clarified Action Labels', () => {
  it('uses "Enregistrer une copie…" instead of "Télécharger"', () => {
    const item = { path: '/Project/photo.png', name: 'photo.png', type: 'file', size: 2000 };
    const panelHtml = renderPreviewPanel(
      item,
      { status: 'image', preview: { kind: 'image' } },
      'blob:http://localhost/image'
    );

    expect(panelHtml).not.toContain('Télécharger');
    expect(panelHtml).toContain('Enregistrer une copie…');
    expect(panelHtml).toContain('title="Enregistrer une copie du fichier"');
  });

  it('uses "Ouvrir avec…" for opening files externally', () => {
    const item = { path: '/Project/report.pdf', name: 'report.pdf', type: 'file', size: 5000 };
    const panelHtml = renderPreviewPanel(
      item,
      { status: 'pdf', preview: { kind: 'pdf' } },
      'blob:http://localhost/pdf'
    );

    expect(panelHtml).toContain('Ouvrir avec…');
    expect(panelHtml).toContain('id="btn-open-external"');
    expect(panelHtml).toContain('title="Ouvrir avec une application externe"');
  });

  it('renames vague header commands to "Agrandir l’aperçu" and toggles "Masquer l’arborescence" / "Afficher l’arborescence"', () => {
    const htmlTreeVisible = renderMainLayout(
      'Project',
      '/Project',
      [],
      false,
      '',
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380,
      false,
      true // Tree visible
    );

    const htmlTreeHidden = renderMainLayout(
      'Project',
      '/Project',
      [],
      false,
      '',
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380,
      false,
      false // Tree hidden
    );

    expect(htmlTreeVisible).toContain('Agrandir l’aperçu');
    expect(htmlTreeVisible).toContain('Masquer l’arborescence');

    expect(htmlTreeHidden).toContain('Afficher l’arborescence');
  });
});

describe('4. External Application Warning Modal', () => {
  it('renders external open warning modal with exact required text and actions', () => {
    const modalHtml = renderExternalOpenModal();

    expect(modalHtml).toContain('id="modal-external-open-overlay"');
    expect(modalHtml).toContain('Ouverture dans une application externe');
    expect(modalHtml).toContain('Ce fichier va être ouvert dans une autre application. Cette application pourra éventuellement le modifier.');
    expect(modalHtml).toContain('Ne plus afficher cet avertissement pendant cette session');
    expect(modalHtml).toContain('id="btn-modal-cancel"');
    expect(modalHtml).toContain('Annuler');
    expect(modalHtml).toContain('id="btn-modal-confirm"');
    expect(modalHtml).toContain('Ouvrir quand même');
  });
});

describe('5. Reassuring Error Messages', () => {
  it('includes "Aucun fichier n’a été modifié" in all read error states', () => {
    const item = { path: '/Project/file.xyz', name: 'file.xyz', type: 'file' };

    const unsupportedHtml = renderPreviewPanel(item, { status: 'unsupported' }, null);
    const readErrorHtml = renderPreviewPanel(item, { status: 'error', error: 'Permission denied' }, null);

    expect(unsupportedHtml).toContain('Aucun fichier');
    expect(unsupportedHtml).toContain('été modifié');
    expect(readErrorHtml).toContain('Aucun fichier');
    expect(readErrorHtml).toContain('été modifié');
  });
});

describe('6. TreeView Navigation & Core Behavior Preservation', () => {
  it('preserves progressive lazy loading tree structure', () => {
    const nodes = new Map();
    nodes.set('/Root', { path: '/Root', name: 'Root', type: 'directory', level: 0, isExpanded: true, childrenPaths: ['/Root/sub'] });
    nodes.set('/Root/sub', { path: '/Root/sub', name: 'sub', type: 'directory', level: 1, isExpanded: false, isLoaded: false, childrenPaths: [] });

    const visible = getVisibleTreeNodes('/Root', nodes, '');
    expect(visible.map((n) => n.name)).toEqual(['Root', 'sub']);
  });
});
