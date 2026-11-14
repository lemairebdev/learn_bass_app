/**
 * Spécifications de la coquille applicative (ticket 08).
 *
 * Couvre : chargement propre (aucune erreur console, aucune requête échouée ou
 * inter-origine), titre français, ordre des sections (décision 10), manifeste
 * PWA et ses icônes, comportement responsive desktop/mobile, et garde-fous sur
 * les fichiers livrés (URL relatives, imports relatifs).
 *
 * Conventions du projet : intitulés et valeurs attendues en français,
 * identifiants de code en anglais ; on n'observe que le comportement externe
 * (DOM, réseau, console), jamais les modules internes.
 */
import { expect, test } from '@playwright/test';

const TITLE = 'Apprendre la basse';

test("l'application se charge sans erreur console et sans requête échouée ou inter-origine", async ({ page }) => {
  const problems = [];
  const requestedUrls = [];

  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error : ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror : ${error.message}`));
  page.on('requestfailed', (request) =>
    problems.push(`requête échouée : ${request.url()} (${request.failure()?.errorText ?? 'raison inconnue'})`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()} : ${response.url()}`);
  });
  page.on('request', (request) => requestedUrls.push(request.url()));

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page).toHaveTitle(TITLE);
  await expect(page.locator('h1')).toHaveText(TITLE);
  await page.waitForLoadState('networkidle');

  const origin = new URL(page.url()).origin;
  for (const url of requestedUrls) {
    if (/^https?:/i.test(url) && new URL(url).origin !== origin) {
      problems.push(`requête inter-origine : ${url}`);
    }
  }
  expect(problems, 'problèmes observés pendant le chargement').toEqual([]);
});
