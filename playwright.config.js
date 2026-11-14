import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Bibliothèques système de Chromium (NSS, ALSA) extraites localement quand la
 * machine ne les installe pas et qu'on n'a pas les droits root — voir README.
 * Inopérante sur une machine qui a déjà ses bibliothèques.
 */
const localLibs = join(homedir(), '.cache', 'playwright-libs', 'usr', 'lib', 'x86_64-linux-gnu');
if (existsSync(localLibs)) {
  process.env.LD_LIBRARY_PATH = [localLibs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
}

/**
 * Harnais E2E de l'app (décisions de test de la spécification).
 *
 * Deux projets Chromium : « desktop » (grand écran, souris) et « mobile »
 * (descripteur de téléphone : tactile + isMobile). Chaque spécification de
 * `tests/` courre sur les deux projets.
 *
 * Le serveur statique sert la racine du dépôt avec le cache désactivé.
 * Le port se règle via TEST_PORT (défaut : 4173) pour que plusieurs worktrees
 * puissent lancer les tests en parallèle sans collision :
 *
 *     TEST_PORT=4210 npm test
 */
const port = Number(process.env.TEST_PORT || 4173);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx http-server . -p ${port} -c-1 --silent`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
