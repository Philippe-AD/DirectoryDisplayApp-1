export function iconSvg(pathSvg, { size = 20, className = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">${pathSvg}</svg>`;
}

export const icons = {
  search: (opts) =>
    iconSvg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', opts),

  file: (opts) =>
    iconSvg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>', opts),

  fileText: (opts) =>
    iconSvg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>', opts),

  folder: (opts) =>
    iconSvg('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>', opts),

  folderOpen: (opts) =>
    iconSvg('<path d="M3 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 4H5a2 2 0 0 0-2 2"/><path d="M3 10h18l-2 10H5L3 10z"/>', opts),

  folderTree: (opts) =>
    iconSvg('<path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 14h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z"/><path d="M4 3v18"/><path d="M4 9h4"/><path d="M4 17h4"/>', opts),

  chevronRight: (opts) =>
    iconSvg('<path d="m9 18 6-6-6-6"/>', opts),

  chevronUp: (opts) =>
    iconSvg('<path d="m18 15-6-6-6 6"/>', opts),

  chevronDown: (opts) =>
    iconSvg('<path d="m6 9 6 6 6-6"/>', opts),

  x: (opts) =>
    iconSvg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', opts),

  arrowLeft: (opts) =>
    iconSvg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', opts),

  hardDrive: (opts) =>
    iconSvg('<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>', opts),

  upload: (opts) =>
    iconSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>', opts),

  download: (opts) =>
    iconSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>', opts),

  alertCircle: (opts) =>
    iconSvg('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>', opts),

  image: (opts) =>
    iconSvg('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>', opts),

  panelRight: (opts) =>
    iconSvg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>', opts),

  eye: (opts) =>
    iconSvg('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', opts),

  eyeOff: (opts) =>
    iconSvg('<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>', opts),

  loader: (opts) =>
    iconSvg('<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m7.8 16.2-2.9 2.9"/><path d="M2 12h4"/><path d="m7.8 7.8-2.9-2.9"/>', opts),

  gripVertical: (opts) =>
    iconSvg('<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>', opts),

  music: (opts) =>
    iconSvg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', opts),

  video: (opts) =>
    iconSvg('<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>', opts),

  refreshCw: (opts) =>
    iconSvg('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>', opts),

  lock: (opts) =>
    iconSvg('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', opts),

  externalLink: (opts) =>
    iconSvg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', opts),

  grid: (opts) =>
    iconSvg('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>', opts),

  star: (opts) =>
    iconSvg('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', opts),

  bell: (opts) =>
    iconSvg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', opts),

  plus: (opts) =>
    iconSvg('<path d="M5 12h14"/><path d="M12 5v14"/>', opts),

  cloud: (opts) =>
    iconSvg('<path d="M17.5 19x-12A5.5 5.5 0 0 1 2 13.5A5.5 5.5 0 0 1 7.1 8.1A7 7 0 0 1 20.7 12A4.5 4.5 0 0 1 17.5 19z"/>', opts),

  fileSpreadsheet: (opts) =>
    iconSvg('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M12 9v8"/>', opts),

  edit: (opts) =>
    iconSvg('<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-3.683.92 1.009-3.568a2 2 0 0 1 .494-.872z"/>', opts),

  sun: (opts) =>
    iconSvg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/>', opts),

  moon: (opts) =>
    iconSvg('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', opts),

  copy: (opts) =>
    iconSvg('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>', opts),

  move: (opts) =>
    iconSvg('<path d="M5 12h14"/><path d="m13 18 6-6-6-6"/><path d="M5 4v16"/>', opts),

  trash: (opts) =>
    iconSvg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>', opts),
};
