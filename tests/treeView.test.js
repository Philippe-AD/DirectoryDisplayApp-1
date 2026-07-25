import { describe, expect, it } from 'vitest';
import { getVisibleTreeNodes, sortNodePaths } from './main';
import { renderTreeNode, renderTreeView, renderPreviewPanel, renderMainLayout } from './renderers';

describe('TreeView Progressive Lazy Loading & Caching', () => {
  it('loads initial root contents only and does not recursively load subfolder children', () => {
    const nodes = new Map();

    const rootNode = {
      path: '/Project',
      name: 'Project',
      type: 'directory',
      level: 0,
      isExpanded: true,
      isLoaded: true,
      childrenPaths: ['/Project/src', '/Project/README.md'],
    };

    const srcNode = {
      path: '/Project/src',
      name: 'src',
      type: 'directory',
      level: 1,
      isExpanded: false, // Closed, not expanded
      isLoaded: false,   // Children not loaded yet
      childrenPaths: [],
    };

    const readmeNode = {
      path: '/Project/README.md',
      name: 'README.md',
      type: 'file',
      level: 1,
      isExpanded: false,
      isLoaded: true,
      childrenPaths: [],
    };

    nodes.set(rootNode.path, rootNode);
    nodes.set(srcNode.path, srcNode);
    nodes.set(readmeNode.path, readmeNode);

    const visibleNodes = getVisibleTreeNodes('/Project', nodes, '');

    expect(visibleNodes.map(n => n.name)).toEqual(['Project', 'src', 'README.md']);
    expect(nodes.get('/Project/src').isLoaded).toBe(false);
  });

  it('inserts children under parent node when subfolder is expanded', () => {
    const nodes = new Map();

    nodes.set('/Project', {
      path: '/Project',
      name: 'Project',
      type: 'directory',
      level: 0,
      isExpanded: true,
      isLoaded: true,
      childrenPaths: ['/Project/src', '/Project/README.md'],
    });

    nodes.set('/Project/src', {
      path: '/Project/src',
      name: 'src',
      type: 'directory',
      level: 1,
      isExpanded: true,
      isLoaded: true,
      childrenPaths: ['/Project/src/app.js', '/Project/src/components'],
    });

    nodes.set('/Project/src/app.js', {
      path: '/Project/src/app.js',
      name: 'app.js',
      type: 'file',
      level: 2,
      isExpanded: false,
      isLoaded: true,
      childrenPaths: [],
    });

    nodes.set('/Project/src/components', {
      path: '/Project/src/components',
      name: 'components',
      type: 'directory',
      level: 2,
      isExpanded: false,
      isLoaded: false,
      childrenPaths: [],
    });

    nodes.set('/Project/README.md', {
      path: '/Project/README.md',
      name: 'README.md',
      type: 'file',
      level: 1,
      isExpanded: false,
      isLoaded: true,
      childrenPaths: [],
    });

    const visibleNodes = getVisibleTreeNodes('/Project', nodes, '');

    expect(visibleNodes.map(n => n.name)).toEqual([
      'Project',
      'src',
      'components',
      'app.js',
      'README.md',
    ]);
  });

  it('retains loaded subfolders in memory cache when collapsed and re-expanded without discarding data', () => {
    const nodes = new Map();

    nodes.set('/Project', {
      path: '/Project',
      name: 'Project',
      type: 'directory',
      level: 0,
      isExpanded: true,
      isLoaded: true,
      childrenPaths: ['/Project/src'],
    });

    const srcNode = {
      path: '/Project/src',
      name: 'src',
      type: 'directory',
      level: 1,
      isExpanded: false, // Collapsed
      isLoaded: true,    // Loaded in memory
      childrenPaths: ['/Project/src/main.js'],
    };

    nodes.set('/Project/src', srcNode);
    nodes.set('/Project/src/main.js', {
      path: '/Project/src/main.js',
      name: 'main.js',
      type: 'file',
      level: 2,
    });

    let visibleCollapsed = getVisibleTreeNodes('/Project', nodes, '');
    expect(visibleCollapsed.map(n => n.name)).toEqual(['Project', 'src']);

    // Re-expand from cache
    srcNode.isExpanded = true;
    let visibleExpanded = getVisibleTreeNodes('/Project', nodes, '');
    expect(visibleExpanded.map(n => n.name)).toEqual(['Project', 'src', 'main.js']);
  });

  it('sorts directories before files using natural alphabetical order', () => {
    const nodes = new Map();
    nodes.set('/Project/b.txt', { path: '/Project/b.txt', name: 'b.txt', type: 'file' });
    nodes.set('/Project/docs', { path: '/Project/docs', name: 'docs', type: 'directory' });
    nodes.set('/Project/a.txt', { path: '/Project/a.txt', name: 'a.txt', type: 'file' });
    nodes.set('/Project/src', { path: '/Project/src', name: 'src', type: 'directory' });

    const sortedPaths = sortNodePaths(['/Project/b.txt', '/Project/docs', '/Project/a.txt', '/Project/src'], nodes);

    expect(sortedPaths).toEqual([
      '/Project/docs',
      '/Project/src',
      '/Project/a.txt',
      '/Project/b.txt',
    ]);
  });
});

describe('TreeView UI & Accessibility Semantics', () => {
  it('renders correct ARIA accessibility attributes for tree items', () => {
    const dirNode = {
      path: '/Project/src',
      name: 'src',
      type: 'directory',
      level: 1,
      isExpanded: true,
      isLoaded: true,
      childrenPaths: [],
    };

    const fileNode = {
      path: '/Project/README.md',
      name: 'README.md',
      type: 'file',
      level: 1,
    };

    const dirHtml = renderTreeNode(dirNode, false);
    const fileHtml = renderTreeNode(fileNode, true);

    expect(dirHtml).toContain('role="treeitem"');
    expect(dirHtml).toContain('aria-level="2"');
    expect(dirHtml).toContain('aria-expanded="true"');
    expect(dirHtml).toContain('aria-selected="false"');
    expect(dirHtml).toContain('btn-toggle-folder');

    expect(fileHtml).toContain('role="treeitem"');
    expect(fileHtml).toContain('aria-level="2"');
    expect(fileHtml).not.toContain('aria-expanded');
    expect(fileHtml).toContain('aria-selected="true"');
    expect(fileHtml).toContain('tabindex="0"');
  });

  it('renders folder loading spinner icon when folder content is loading', () => {
    const loadingNode = {
      path: '/Project/docs',
      name: 'docs',
      type: 'directory',
      level: 1,
      isLoading: true,
    };

    const html = renderTreeNode(loadingNode, false);

    expect(html).toContain('aria-label="Chargement du dossier"');
    expect(html).toContain('animate-spin');
  });

  it('renders inline folder error message and retry button on read failure', () => {
    const errorNode = {
      path: '/Project/restricted',
      name: 'restricted',
      type: 'directory',
      level: 1,
      error: 'Permission de lecture refusée.',
    };

    const html = renderTreeNode(errorNode, false);

    expect(html).toContain('Permission de lecture refusée.');
    expect(html).toContain('data-node-retry="/Project/restricted"');
    expect(html).toContain('Réessayer');
  });

  it('renders tree container with role="tree"', () => {
    const nodes = [
      { path: '/Project', name: 'Project', type: 'directory', level: 0 },
    ];

    const treeHtml = renderTreeView(nodes, '/Project');

    expect(treeHtml).toContain('role="tree"');
    expect(treeHtml).toContain('id="tree-root"');
  });
});

describe('Preview Panel Explicit States', () => {
  it('renders empty selection state when no file is selected', () => {
    const html = renderPreviewPanel(null, { status: 'idle' }, null);

    expect(html).toContain('Aucun fichier sélectionné');
    expect(html).toContain('Sélectionnez un fichier dans l\'arborescence');
  });

  it('renders folder info state when a folder node is selected', () => {
    const folderItem = { path: '/Project/src', name: 'src', type: 'directory' };
    const html = renderPreviewPanel(folderItem, { status: 'folder' }, null);

    expect(html).toContain('Dossier de fichiers');
    expect(html).toContain('/Project/src');
  });

  it('renders text preview truncated notice when file exceeds 1 MB', () => {
    const textItem = { path: '/Project/large.log', name: 'large.log', type: 'file', size: 2000000 };
    const html = renderPreviewPanel(
      textItem,
      { status: 'text', preview: { kind: 'text', content: 'Log data', truncated: true, totalSize: 2000000 } },
      null
    );

    expect(html).toContain('preview-truncated-warning');
    expect(html).toContain('Aperçu limité au premier mégaoctet');
  });

  it('renders empty file notice when preview text is empty', () => {
    const emptyFile = { path: '/Project/empty.txt', name: 'empty.txt', type: 'file', size: 0 };
    const html = renderPreviewPanel(
      emptyFile,
      { status: 'text', preview: { kind: 'text', content: '', truncated: false, totalSize: 0 } },
      null
    );

    expect(html).toContain('Ce fichier est vide.');
  });
});

describe('Main Layout Resizing & Structure', () => {
  it('renders 2-zone resizable layout with min-width bounds', () => {
    const nodes = [{ path: '/Project', name: 'Project', type: 'directory', level: 0 }];

    const html = renderMainLayout(
      'Project',
      '/Project',
      nodes,
      false,
      '',
      false,
      null,
      null,
      { status: 'idle' },
      null,
      true,
      380
    );

    expect(html).toContain('id="file-list-container"');
    expect(html).toContain('id="resizer"');
    expect(html).toContain('id="preview-panel-container"');
    expect(html).toContain('min-w-[240px]');
    expect(html).toContain('min-w-[300px]');
  });
});
