import { expect, test } from '@playwright/test';

test('après le premier chargement, la coquille reste interactive hors ligne', async ({ page, context }) => {
  await page.addInitScript(() => {
    window.__scheduledFrequencies = [];
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      createOscillator() {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => {
          window.__scheduledFrequencies.push(oscillator.frequency.value);
          return start(...args);
        };
        return oscillator;
      }
    };
  });

  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]')).toBeVisible();
  const note = page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]');
  await note.click();

  await expect(note).toHaveAttribute('data-highlight', 'primary');
  await expect(page.locator('#staff .notehead[data-midi="48"]')).toHaveAttribute(
    'data-highlight',
    'primary',
  );
  await expect.poll(() => page.evaluate(() => window.__scheduledFrequencies.length)).toBe(2);
  const frequencies = await page.evaluate(() => window.__scheduledFrequencies);
  for (const frequency of frequencies) expect(frequency).toBeCloseTo(130.8, 1);
});
