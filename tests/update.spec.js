import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

async function startControlledServer() {
  let version = 1;
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = resolve(root, relativePath);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(404).end();
      return;
    }

    try {
      let body = await readFile(file);
      if (relativePath === 'sw.js' && version === 2) {
        body = Buffer.from(body.toString('utf8').replaceAll('learn-bass-app-v2', 'learn-bass-app-v3'));
      }
      response.writeHead(200, { 'content-type': contentTypes[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/`,
    bump() {
      version = 2;
    },
    close() {
      return new Promise((resolveClose) => server.close(resolveClose));
    },
  };
}

test('propose le rechargement après installation et active la nouvelle version après acceptation', async ({
  page,
}) => {
  const server = await startControlledServer();
  try {
    await page.goto(server.url);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    await expect(page.locator('#update-notice')).toBeHidden();

    server.bump();
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    });

    const notice = page.locator('#update-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Une nouvelle version est disponible.');
    await notice.getByRole('button', { name: 'Recharger' }).click();

    await expect(page.locator('#table tbody tr')).toHaveCount(36);
    await expect.poll(() =>
      page.evaluate(async () => {
        const names = await caches.keys();
        return {
          current: names.includes('learn-bass-app-v3'),
          previous: names.includes('learn-bass-app-v2'),
        };
      }),
    ).toEqual({ current: true, previous: false });
  } finally {
    await server.close();
  }
});
