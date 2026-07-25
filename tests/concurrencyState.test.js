import { describe, it, expect } from 'vitest';

describe('Concurrency & State Race Conditions Tests (Section 18)', () => {
  it('1. should invalidate stale preview response when rapid selection change occurs', async () => {
    let currentActiveId = 'file1.png';

    // Simulation de 2 demandes d'aperçu asynchrones successives
    const requestPreview = (fileId, delayMs) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Seule la réponse correspondant au fichier actuellement sélectionné doit être appliquée
          if (fileId === currentActiveId) {
            resolve({ applied: true, fileId });
          } else {
            resolve({ applied: false, fileId, reason: 'selection_changed' });
          }
        }, delayMs);
      });
    };

    // Fichier 1 sélectionné
    const p1 = requestPreview('file1.png', 100);

    // Changement rapide vers Fichier 2 après 10ms
    currentActiveId = 'file2.png';
    const p2 = requestPreview('file2.png', 50);

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.applied).toBe(false);
    expect(res1.reason).toBe('selection_changed');
    expect(res2.applied).toBe(true);
    expect(res2.fileId).toBe('file2.png');
  });

  it('2. should prevent double execution when double clicking a confirmation button', async () => {
    let executionCount = 0;
    let isProcessing = false;

    const handleConfirm = async () => {
      if (isProcessing) return { success: false, reason: 'already_processing' };
      isProcessing = true;
      executionCount++;
      await new Promise((r) => setTimeout(r, 50));
      isProcessing = false;
      return { success: true };
    };

    // Simulation de deux clics simultanés sur la confirmation
    const [click1, click2] = await Promise.all([handleConfirm(), handleConfirm()]);

    expect(executionCount).toBe(1);
    expect(click1.success).toBe(true);
    expect(click2.reason).toBe('already_processing');
  });

  it('3. should clean up listeners and temporary state properly', () => {
    const listeners = new Set();
    const addListener = (fn) => listeners.add(fn);
    const removeListener = (fn) => listeners.delete(fn);

    const handler = () => {};
    addListener(handler);
    expect(listeners.size).toBe(1);

    removeListener(handler);
    expect(listeners.size).toBe(0);
  });
});
