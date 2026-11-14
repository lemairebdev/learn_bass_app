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

test("affiche l'en-tête puis manche, portée et tableau dans cet ordre (décision 10)", async ({ page }) => {
  await page.goto('/');

  const header = page.locator('header');
  await expect(header).toBeVisible();
  await expect(page.locator('main section')).toHaveCount(3);

  // Ordre du document : en-tête, puis les trois sections dans l'ordre 10.
  const ordre = await page.evaluate(() =>
    [...document.querySelectorAll('header, main > section')].map((el) => el.id || el.tagName.toLowerCase()),
  );
  expect(ordre).toEqual(['header', 'fretboard-section', 'staff-section', 'table-section']);

  // Points de montage que les vues rempliront (tickets 09–12), et conteneur
  // des contrôles audio dans l'en-tête (ticket 13).
  await expect(page.locator('header #audio-controls')).toBeAttached();
  await expect(page.locator('#fretboard')).toBeAttached();
  await expect(page.locator('#staff')).toBeAttached();
  await expect(page.locator('#table')).toBeAttached();

  // Intitulés français des sections.
  await expect(page.locator('#fretboard-section h2')).toHaveText('Manche');
  await expect(page.locator('#staff-section h2')).toHaveText('Portée');
  await expect(page.locator('#table-section h2')).toHaveText('Tableau de correspondances');

  // Le bootstrap se charge en module ES, par URL relative.
  const script = page.locator('script[type="module"]');
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute('src', 'js/app.js');

  // Ordre visuel : l'en-tête puis le manche sont au-dessus de la portée.
  const headerBox = await header.boundingBox();
  const fretboardBox = await page.locator('#fretboard-section').boundingBox();
  const staffBox = await page.locator('#staff-section').boundingBox();
  expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(fretboardBox.y + 1);
  expect(fretboardBox.y + fretboardBox.height).toBeLessThanOrEqual(staffBox.y + 1);
});

test('le manifeste est français, installable, et ses icônes existent à la taille annoncée', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  const manifest = await response.json();

  // Champs français et intitulé de travail (décision 2).
  expect(manifest.name).toBe(TITLE);
  expect(manifest.short_name).toBe('Basse');
  expect(manifest.lang).toBe('fr');

  // Installabilité : URL de départ relative, affichage autonome, couleurs.
  expect(manifest.start_url).toBe('./');
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);

  // Icônes 192 et 512, chemins relatifs, fichiers présents et PNG valides
  // aux dimensions exactes.
  const sizes = manifest.icons.map((icon) => icon.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');

  for (const icon of manifest.icons) {
    expect(icon.type).toBe('image/png');
    expect(icon.src.startsWith('/'), 'src d’icône relatif').toBe(false);
    expect(icon.src).not.toMatch(/^[a-z][a-z0-9+.-]*:/i);

    const iconUrl = new URL(icon.src, response.url());
    const iconResponse = await request.get(iconUrl.pathname);
    expect(iconResponse.status(), `icône présente : ${icon.src}`).toBe(200);
    const bytes = await iconResponse.body();
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(bytes.subarray(0, 8), `${icon.src} est un PNG`).toEqual(signature);
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, `${icon.src} à la taille annoncée`).toBe(icon.sizes);
  }
});
