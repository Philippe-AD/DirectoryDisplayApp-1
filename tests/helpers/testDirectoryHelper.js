import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Crée une arborescence temporaire représentative pour les tests.
 * Structure générée :
 * DirectoryDisplayApp-Test/
 * ├── Documents/
 * │   ├── notes.txt
 * │   ├── rapport.md
 * │   ├── document.pdf
 * │   └── rapport.docx
 * ├── Images/
 * │   ├── petite-image.png
 * │   └── image-volumineuse.png
 * ├── Médias/
 * │   ├── audio.mp3
 * │   └── video.mp4
 * ├── Projets/
 * │   ├── Projet-A/
 * │   │   ├── src/
 * │   │   │   └── index.js
 * │   │   └── README.md
 * │   └── Projet-B/
 * ├── Dossier vide/
 * ├── Fichiers spéciaux/
 * │   ├── fichier-sans-extension
 * │   ├── nom avec espaces.txt
 * │   ├── éàü-unicode.txt
 * │   └── fichier.très.long.nom.txt
 * └── Conflits/
 *     ├── source/
 *     │   └── exemple.txt
 *     └── destination/
 *         └── exemple.txt
 */
export async function createTestDirectoryTree() {
  const rootTempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dda-test-suite-'));
  const baseDir = path.join(rootTempDir, 'DirectoryDisplayApp-Test');

  await fs.promises.mkdir(baseDir, { recursive: true });

  // 1. Documents
  const docsDir = path.join(baseDir, 'Documents');
  await fs.promises.mkdir(docsDir, { recursive: true });
  await fs.promises.writeFile(path.join(docsDir, 'notes.txt'), 'Notes de test synthétiques', 'utf8');
  await fs.promises.writeFile(path.join(docsDir, 'rapport.md'), '# Rapport\n\nContenu markdown.', 'utf8');
  await fs.promises.writeFile(path.join(docsDir, 'document.pdf'), '%PDF-1.4 synthétique pour test', 'utf8');
  await fs.promises.writeFile(path.join(docsDir, 'rapport.docx'), 'PK\x03\x04synthétique docx test', 'utf8');

  // 2. Images
  const imgDir = path.join(baseDir, 'Images');
  await fs.promises.mkdir(imgDir, { recursive: true });
  const pngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d0b0000000049454e44ae426082', 'hex');
  await fs.promises.writeFile(path.join(imgDir, 'petite-image.png'), pngHeader);
  await fs.promises.writeFile(path.join(imgDir, 'image-volumineuse.png'), Buffer.alloc(12 * 1024 * 1024, 'X'));

  // 3. Médias
  const mediaDir = path.join(baseDir, 'Médias');
  await fs.promises.mkdir(mediaDir, { recursive: true });
  await fs.promises.writeFile(path.join(mediaDir, 'audio.mp3'), 'ID3 synthétique audio test', 'utf8');
  await fs.promises.writeFile(path.join(mediaDir, 'video.mp4'), '\x00\x00\x00\x1cftypisom synthétique video test', 'utf8');

  // 4. Projets
  const projDir = path.join(baseDir, 'Projets');
  const projASrc = path.join(projDir, 'Projet-A', 'src');
  const projB = path.join(projDir, 'Projet-B');
  await fs.promises.mkdir(projASrc, { recursive: true });
  await fs.promises.mkdir(projB, { recursive: true });
  await fs.promises.writeFile(path.join(projASrc, 'index.js'), 'console.log("Projet A");', 'utf8');
  await fs.promises.writeFile(path.join(projDir, 'Projet-A', 'README.md'), '# Projet A', 'utf8');

  // 5. Dossier vide
  await fs.promises.mkdir(path.join(baseDir, 'Dossier vide'), { recursive: true });

  // 6. Fichiers spéciaux
  const specDir = path.join(baseDir, 'Fichiers spéciaux');
  await fs.promises.mkdir(specDir, { recursive: true });
  await fs.promises.writeFile(path.join(specDir, 'fichier-sans-extension'), 'contenu sans ext', 'utf8');
  await fs.promises.writeFile(path.join(specDir, 'nom avec espaces.txt'), 'contenu espaces', 'utf8');
  await fs.promises.writeFile(path.join(specDir, 'éàü-unicode.txt'), 'contenu unicode', 'utf8');
  await fs.promises.writeFile(path.join(specDir, 'fichier.très.long.nom.txt'), 'contenu nom long', 'utf8');

  // 7. Conflits
  const confSource = path.join(baseDir, 'Conflits', 'source');
  const confDest = path.join(baseDir, 'Conflits', 'destination');
  await fs.promises.mkdir(confSource, { recursive: true });
  await fs.promises.mkdir(confDest, { recursive: true });
  await fs.promises.writeFile(path.join(confSource, 'exemple.txt'), 'source content', 'utf8');
  await fs.promises.writeFile(path.join(confDest, 'exemple.txt'), 'dest content', 'utf8');

  return {
    rootTempDir,
    baseDir,
    docsDir,
    imgDir,
    mediaDir,
    projDir,
    specDir,
    confSource,
    confDest,
  };
}

export async function cleanupTestDirectoryTree(tempDir) {
  if (tempDir && fs.existsSync(tempDir)) {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignorer
    }
  }
}
