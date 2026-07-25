export const COLOR_PALETTE = [
  { bg: 'bg-blue-600',    light: 'bg-blue-50',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
  { bg: 'bg-teal-600',    light: 'bg-teal-50',    text: 'text-teal-600',    badge: 'bg-teal-100 text-teal-700' },
  { bg: 'bg-amber-600',   light: 'bg-amber-50',   text: 'text-amber-600',   badge: 'bg-amber-100 text-amber-700' },
  { bg: 'bg-rose-600',    light: 'bg-rose-50',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700' },
];

export function getColorForPath(path) {
  const hash = (path || '/').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

export function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileExtension(name) {
  if (!name) return 'FILE';
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
