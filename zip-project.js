import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 0. Lecture de la version du projet dans package.json
const pkgPath = path.resolve('package.json');
let version = '1.0.0-rc.1';
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.version) version = pkg.version;
  } catch {
    console.warn('⚠️ Impossible de lire la version depuis package.json, utilisation de la version par défaut.');
  }
}

const zipName = `DirectoryDisplayApp-v${version}.zip`;
const zipPath = path.resolve(zipName);

// Liste explicite des dossiers et fichiers de source, tests et configuration à inclure dans l'archive
const itemsToInclude = [
  'src',
  'electron',
  'tests',
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.js',
  'eslint.config.js',
  'README.md',
  '.gitignore',
  'zip-project.js'
];

if (fs.existsSync('Create-DirectoryDisplayTest.ps1')) {
  itemsToInclude.push('Create-DirectoryDisplayTest.ps1');
}

console.log(`📦 Création de l'archive ZIP du projet : ${zipName}...`);

// 1. Nettoyage des anciennes archives ZIP de release
fs.readdirSync('.').forEach((file) => {
  if (file.startsWith('DirectoryDisplayApp') && file.endsWith('.zip')) {
    try {
      fs.unlinkSync(file);
      console.log(`🗑️ Ancienne archive supprimée : ${file}`);
    } catch (err) {
      console.warn(`⚠️ Impossible de supprimer l'ancienne archive ${file}:`, err.message);
    }
  }
});

// Filter only items that exist on disk
const existingItems = itemsToInclude.filter((item) => fs.existsSync(path.resolve(item)));

// 2. Compression directe dans une archive ZIP unique
try {
  if (process.platform === 'win32') {
    const pathsArg = existingItems.map((item) => `'${item}'`).join(', ');
    const psCommand = `powershell -Command "Compress-Archive -Path ${pathsArg} -DestinationPath '${zipPath}' -Force"`;
    execSync(psCommand, { stdio: 'inherit' });
  } else {
    const filesArg = existingItems.join(' ');
    execSync(`zip -r "${zipPath}" ${filesArg}`, { stdio: 'inherit' });
  }
  console.log(`\n🎉 Succès ! Archive créée à la racine : ${zipName}`);
} catch (error) {
  console.error('❌ Erreur lors de la création du fichier ZIP :', error.message);
  process.exitCode = 1;
}
