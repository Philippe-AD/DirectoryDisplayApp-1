export function describeFile(file) {
  return {
    name: file.name,
    size: file.size,
    extension: file.name.split(".").pop()?.toLowerCase() ?? null
  };
}