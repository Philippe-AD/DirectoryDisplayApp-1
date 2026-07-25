export function sortNodePaths(childrenPaths, nodeMap) {
  return [...childrenPaths].sort((pathA, pathB) => {
    const a = nodeMap.get(pathA);
    const b = nodeMap.get(pathB);
    if (!a || !b) return 0;
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
  });
}

export function getVisibleTreeNodes(treeRootPath, nodeMap, search = '') {
  if (!treeRootPath || !nodeMap.has(treeRootPath)) return [];

  if (search && search.trim()) {
    const query = search.trim().toLowerCase();
    const matches = [];
    nodeMap.forEach((node) => {
      if (node.name.toLowerCase().includes(query)) {
        matches.push(node);
      }
    });

    matches.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    });

    return matches;
  }

  const visible = [];

  function traverse(path) {
    const node = nodeMap.get(path);
    if (!node) return;
    visible.push(node);

    if (node.type === 'directory' && node.isExpanded && Array.isArray(node.childrenPaths)) {
      const sorted = sortNodePaths(node.childrenPaths, nodeMap);
      sorted.forEach((childPath) => traverse(childPath));
    }
  }

  traverse(treeRootPath);
  return visible;
}
