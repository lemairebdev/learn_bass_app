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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TITLE = 'Apprendre la basse';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Fichiers « livrés » par l'application (servis tels quels par un hébergeur
 * statique) : coquille, styles, manifeste, modules JS, et sw.js quand il
 * existera (ticket 14). Les dépendances de dev, tests et artefacts Playwright
 * n'en font pas partie.
 */
function shippedTextFiles() {
  const files = [];
  for (const name of ['index.html', 'styles.css', 'manifest.webmanifest', 'sw.js']) {
    const file = join(ROOT, name);
    if (existsSync(file)) files.push(file);
  }
  const jsDir = join(ROOT, 'js');
  if (existsSync(jsDir)) {
    for (const entry of readdirSync(jsDir, { recursive: true })) {
      if (entry.endsWith('.js')) files.push(join(jsDir, entry));
    }
  }
  return files;
}

/** Une URL est relative si elle ne commence ni par « / » ni par un schéma. */
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:)?\//i;

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
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('header, main > section')].map((el) => el.id || el.tagName.toLowerCase()),
  );
  expect(order).toEqual(['header', 'fretboard-section', 'staff-section', 'table-section']);

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

test('portée et tableau côte à côte sur grand écran, empilées sur mobile (décision 10)', async ({ page }) => {
  await page.goto('/');

  const fretboardBox = await page.locator('#fretboard-section').boundingBox();
  const staffBox = await page.locator('#staff-section').boundingBox();
  const tableBox = await page.locator('#table-section').boundingBox();
  expect(staffBox, 'la section portée est visible').not.toBeNull();
  expect(tableBox, 'la section tableau est visible').not.toBeNull();

  // Le manche occupe toujours toute la largeur, au-dessus des deux autres vues.
  expect(fretboardBox.y + fretboardBox.height).toBeLessThanOrEqual(staffBox.y + 1);

  if (test.info().project.name === 'desktop') {
    // Grand écran : portée et tableau sur la même ligne, portée à gauche.
    expect(Math.abs(staffBox.y - tableBox.y), 'même ligne de départ').toBeLessThan(1);
    expect(staffBox.x).toBeLessThan(tableBox.x);
    expect(staffBox.x + staffBox.width).toBeLessThanOrEqual(tableBox.x + 1);
  } else {
    // Écran étroit : les trois vues empilées dans l'ordre de la décision 10.
    expect(staffBox.y + staffBox.height).toBeLessThanOrEqual(tableBox.y + 1);
  }
});

test('aucun fichier livré ne référence d’URL absolue ni de dépendance externe', () => {
  const files = shippedTextFiles();
  expect(files.length, 'la coquille est présente dans la liste').toBeGreaterThan(0);

  for (const file of files) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, 'utf8');

    // Aucune ressource externe, nulle part, même dans un commentaire :
    // l'app embarque tout ce qu'elle sert (décision 1).
    expect(content, `${rel} : aucune URL http(s)`).not.toMatch(/https?:\/\//i);

    // HTML/CSS : toutes les URL portées par les attributs sont relatives.
    if (file.endsWith('.html')) {
      for (const [, url] of content.matchAll(/(?:src|href|action|poster)\s*=\s*["']([^"']+)["']/gi)) {
        expect(url, `${rel} : « ${url} » doit être une URL relative`).not.toMatch(ABSOLUTE_URL);
      }
    }
    if (file.endsWith('.css')) {
      for (const [, url] of content.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
        expect(url, `${rel} : « ${url} » doit être une URL relative`).not.toMatch(ABSOLUTE_URL);
      }
    }

    // JS : imports de modules relatifs uniquement (./… ou ../…), donc aucune
    // dépendance d'exécution nue.
    if (file.endsWith('.js')) {
      for (const [, specifier] of content.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g)) {
        expect(specifier, `${rel} : « ${specifier} » doit être un chemin relatif`).toMatch(/^\.\.?\//);
      }
    }
  }
});
