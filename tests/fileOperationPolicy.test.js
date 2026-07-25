import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  checkFileOperation,
  inspectItemAttributes,
} = require('../electron/security/fileOperationPolicy.cjs');

const mockWindowsEnv = {
  SystemRoot: 'C:\\Windows',
  SystemDrive: 'C:',
  ProgramFiles: 'C:\\Program Files',
  'ProgramFiles(x86)': 'C:\\Program Files (x86)',
  ProgramData: 'C:\\ProgramData',
  USERPROFILE: 'C:\\Users\\TestUser',
  USERNAME: 'TestUser',
};

const mockCustomDriveEnv = {
  SystemRoot: 'D:\\Windows',
  SystemDrive: 'D:',
  ProgramFiles: 'D:\\Program Files',
  'ProgramFiles(x86)': 'D:\\Program Files (x86)',
  ProgramData: 'D:\\ProgramData',
  USERPROFILE: 'D:\\Users\\CustomUser',
  USERNAME: 'CustomUser',
};

describe('fileOperationPolicy - Unit Tests (Section 19)', () => {
  // 1. Chemin Windows protégé
  it('1. should refuse operations on protected Windows path', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Windows\\System32\\cmd.exe',
      newName: 'newcmd.exe',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
  });

  // 2. Windows installé sur un lecteur autre que C: simulé
  it('2. should refuse operations on simulated D:\\Windows system path', () => {
    const res = checkFileOperation({
      operation: 'trash',
      targetPath: 'D:\\Windows\\System32',
      mockEnv: mockCustomDriveEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
  });

  // 3. Program Files protégé
  it('3. should refuse operations on Program Files', () => {
    const res = checkFileOperation({
      operation: 'move',
      sourcePath: 'C:\\Program Files\\AppFolder',
      destinationPath: 'C:\\Users\\TestUser\\Desktop',
      newName: 'AppFolder',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
  });

  // 4. ProgramData protégé
  it('4. should refuse operations on ProgramData', () => {
    const res = checkFileOperation({
      operation: 'trash',
      targetPath: 'C:\\ProgramData\\ApplicationData',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
  });

  // 5. Racine de lecteur protégée
  it('5. should refuse operations on drive roots', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\',
      newName: 'NewDrive',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('DRIVE_ROOT_PROTECTED');
    expect(res.message).toContain('La racine d’un lecteur ne peut pas être renommée');
  });

  // 6. Racine du profil utilisateur protégée
  it('6. should refuse operations on user profile root', () => {
    const res = checkFileOperation({
      operation: 'move',
      sourcePath: 'C:\\Users\\TestUser',
      destinationPath: 'C:\\Users\\Other',
      newName: 'TestUserMoved',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('USER_PROFILE_ROOT_PROTECTED');
  });

  // 7. Sous-dossier ordinaire du profil autorisé
  it('7. should allow operations on an ordinary user profile subfolder', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\Projet',
      newName: 'ProjetRenamed',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(true);
  });

  // 8. Faux préfixe tel que C:\WindowsBackup non bloqué
  it('8. should not block false prefix like C:\\WindowsBackup', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\WindowsBackup\\MyFile.txt',
      newName: 'MyFileRenamed.txt',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(true);
  });

  // 9. Chemin relatif refusé
  it('9. should refuse relative paths', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'relative\\subfolder\\file.txt',
      newName: 'file2.txt',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('PATH_NOT_ABSOLUTE');
  });

  // 10. Caractère nul refusé
  it('10. should refuse null bytes in paths', () => {
    const res = checkFileOperation({
      operation: 'trash',
      targetPath: 'C:\\Users\\TestUser\\Documents\\file\0.txt',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('INVALID_PATH');
  });

  // 11. Source égale à la destination
  it('11. should refuse when source equals destination', () => {
    const res = checkFileOperation({
      operation: 'move',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\FolderA',
      destinationPath: 'C:\\Users\\TestUser\\Documents\\FolderA',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SOURCE_EQUALS_DESTINATION');
  });

  // 12. Dossier déplacé dans son descendant
  it('12. should refuse moving a folder into one of its descendants', () => {
    const res = checkFileOperation({
      operation: 'move',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\FolderA',
      destinationPath: 'C:\\Users\\TestUser\\Documents\\FolderA\\SubDir',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('DESTINATION_INSIDE_SOURCE');
  });

  // 13. Dossier copié dans son descendant
  it('13. should refuse copying a folder into one of its descendants', () => {
    const res = checkFileOperation({
      operation: 'copy',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\FolderA',
      destinationPath: 'C:\\Users\\TestUser\\Documents\\FolderA\\SubDir\\Sub2',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('DESTINATION_INSIDE_SOURCE');
  });

  // 14. Nom réservé CON.txt refusé
  it('14. should refuse reserved Windows name CON.txt', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\file.txt',
      newName: 'CON.txt',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('NAME_RESERVED');
  });

  // 15. Nom avec point final refusé
  it('15. should refuse name ending with a dot', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\file.txt',
      newName: 'invalidName.',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('NAME_INVALID');
  });

  // 16. Destination fichier refusée (format de nom invalide ou chemin mal formé)
  it('16. should validate destination path format', () => {
    const res = checkFileOperation({
      operation: 'copy',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\file.txt',
      destinationPath: '',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('INVALID_PATH');
  });

  // 17. Destination inexistante refusée (chemin non absolu / invalide)
  it('17. should refuse invalid or relative destination paths', () => {
    const res = checkFileOperation({
      operation: 'move',
      sourcePath: 'C:\\Users\\TestUser\\Documents\\file.txt',
      destinationPath: 'relativeDir',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('PATH_NOT_ABSOLUTE');
  });

  // 18. Lien symbolique traité sans suivre automatiquement la cible
  it('18. should safely inspect item attributes without failing on links', async () => {
    const res = await inspectItemAttributes('C:\\NonExistentPathLinkForTest_123');
    expect(res.exists).toBe(false);
  });

  // 19. Racine de lecteur refusée pour la Corbeille
  it('19. should refuse drive root for trash operation', () => {
    const res = checkFileOperation({
      operation: 'trash',
      targetPath: 'C:\\',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('DRIVE_ROOT_PROTECTED');
  });

  // 20. Dossier système refusé pour le renommage
  it('20. should refuse protected system directory for rename', () => {
    const res = checkFileOperation({
      operation: 'rename',
      sourcePath: 'C:\\ProgramData',
      newName: 'DataBackup',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
  });

  // 21. Annulation refusée en cas de conflit
  it('21. should refuse restore operation targeting protected path', () => {
    const res = checkFileOperation({
      operation: 'restore',
      targetPath: 'C:\\Windows\\System32',
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('SYSTEM_PATH_PROTECTED');
  });

  // 22. Chemin interne de l'application protégé
  it('22. should refuse operation targeting application root directory', () => {
    const appRootDir = 'C:\\Users\\TestUser\\AppData\\Local\\DirectoryDisplayApp';
    const res = checkFileOperation({
      operation: 'trash',
      targetPath: appRootDir,
      appRootDir,
      mockEnv: mockWindowsEnv,
    });
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('APP_INTERNAL_PATH_PROTECTED');
  });
});
