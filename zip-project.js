import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Liste exacte des fichiers et dossiers nécessaires au projet
const filesToCopy = [
  'src',
  'electron',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.electron.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  'eslint.config.js',
  'README.md',
  '.gitignore'
];

const zipName = 'DirectoryDisplayApp.zip';
const zipPath = path.resolve(zipName);
const tempDir = path.resolve('temp-zip-build');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log(`📦 Création de l'archive ZIP du projet (${zipName})...`);

// 1. Nettoyage des répertoires/fichiers temporaires existants
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// 2. Copie sélective des éléments indispensables
fs.mkdirSync(tempDir, { recursive: true });
for (const file of filesToCopy) {
  const srcPath = path.resolve(file);
  const destPath = path.join(tempDir, file);
  if (fs.existsSync(srcPath)) {
    copyRecursiveSync(srcPath, destPath);
  }
}

// 3. Compression dans un fichier ZIP unique à la racine
try {
  if (process.platform === 'win32') {
    execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${tempDir}" && zip -r "${zipPath}" ./*`, { stdio: 'inherit' });
  }
  console.log(`\n🎉 Succès ! Archive créée à la racine : ${zipName}`);
} catch (error) {
  console.error('❌ Erreur lors de la création du fichier ZIP :', error);
} finally {
  // 4. Nettoyage du dossier temporaire
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
