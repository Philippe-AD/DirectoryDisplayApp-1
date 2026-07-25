import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDirectoryTree, cleanupTestDirectoryTree } from './helpers/testDirectoryHelper.js';
import { getVisibleTreeNodes } from '../src/treeLogic.js';

describe('Search Functionality Tests (Section 5)', () => {
  let env;

  beforeEach(async () => {
    env = await createTestDirectoryTree();
  });

  afterEach(async () => {
    await cleanupTestDirectoryTree(env.rootTempDir);
  });

  const treeRootPath = '/test';
  const nodeMap = new Map([
    ['/test', { path: '/test', name: 'Root', type: 'directory', isExpanded: true, childrenPaths: ['/test/notes.txt', '/test/rapport.md', '/test/Projets', '/test/Fichiers spéciaux'] }],
    ['/test/notes.txt', { path: '/test/notes.txt', name: 'notes.txt', type: 'file' }],
    ['/test/rapport.md', { path: '/test/rapport.md', name: 'rapport.md', type: 'file' }],
    ['/test/Projets', { path: '/test/Projets', name: 'Projets', type: 'directory', isExpanded: true, childrenPaths: ['/test/Projets/Projet-A'] }],
    ['/test/Projets/Projet-A', { path: '/test/Projets/Projet-A', name: 'Projet-A', type: 'directory' }],
    ['/test/Fichiers spéciaux', { path: '/test/Fichiers spéciaux', name: 'Fichiers spéciaux', type: 'directory', isExpanded: true, childrenPaths: ['/test/Fichiers spéciaux/éàü-unicode.txt', '/test/Fichiers spéciaux/nom avec espaces.txt'] }],
    ['/test/Fichiers spéciaux/éàü-unicode.txt', { path: '/test/Fichiers spéciaux/éàü-unicode.txt', name: 'éàü-unicode.txt', type: 'file' }],
    ['/test/Fichiers spéciaux/nom avec espaces.txt', { path: '/test/Fichiers spéciaux/nom avec espaces.txt', name: 'nom avec espaces.txt', type: 'file' }],
  ]);

  it('1. should match by full name', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'notes.txt');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('notes.txt');
  });

  it('2. should match by partial name', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'rapport');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('rapport.md');
  });

  it('3. should be case-insensitive', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'RAPPORT');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('rapport.md');
  });

  it('4. should match names with accents', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'éàü');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('éàü-unicode.txt');
  });

  it('5. should return empty list when no matches are found', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'nonexistent_file_xyz');
    expect(results).toHaveLength(0);
  });

  it('6. should return visible expanded tree hierarchy when search query is empty or whitespace', () => {
    const resultsEmpty = getVisibleTreeNodes(treeRootPath, nodeMap, '');
    expect(resultsEmpty.length).toBeGreaterThan(1);

    const resultsSpaces = getVisibleTreeNodes(treeRootPath, nodeMap, '   ');
    expect(resultsSpaces.length).toBeGreaterThan(1);
  });

  it('7. should match a file result correctly', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'nom avec espaces.txt');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('file');
  });

  it('8. should match a folder result correctly', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'Projet-A');
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('directory');
  });

  it('9. should only search within loaded nodeMap (no global disk indexing)', () => {
    const results = getVisibleTreeNodes(treeRootPath, nodeMap, 'fichier-sans-extension');
    expect(results).toHaveLength(0);
  });

  it('10. should preserve active item reference in nodeMap when clearing search query', () => {
    let currentSelection = nodeMap.get('/test/notes.txt');
    const filtered = getVisibleTreeNodes(treeRootPath, nodeMap, 'notes');
    expect(filtered).toContain(currentSelection);

    const restored = getVisibleTreeNodes(treeRootPath, nodeMap, '');
    expect(restored).toContain(currentSelection);
    expect(currentSelection.name).toBe('notes.txt');
  });

  it('11. should not modify the file system or mutate nodeMap structure', () => {
    const originalSize = nodeMap.size;
    getVisibleTreeNodes(treeRootPath, nodeMap, 'test');
    expect(nodeMap.size).toBe(originalSize);
  });
});
