/**
 * Spécifications d'ergonomie mobile (ticket 15).
 *
 * Valide l'expérience tactile sur le viewport mobile (décisions 6, 7 et 10 ;
 * histoires 26 à 30) :
 * - cases du manche et têtes de portée sont des cibles d'au moins 44 px ;
 * - une tape au centre d'une case ou d'une tête sélectionne la note prévue,
 *   sans erreur de cible (aucune cible ne déborde ni ne se recoupe) ;
 * - la sélection défile chaque vue vers la note : case haute, tête au sommet
 *   de la portée, ligne du tableau filtré, et retour à gauche pour une case
 *   basse ;
 * - la colonne à vide reste épinglée quand le manche défile vers les cases
 *   hautes.
 *
 * Un test desktop vérifie que la disposition « d'un seul coup d'œil » reste
 * intacte, et un test de parité confirme que la tape sur mobile et le clic sur
 * desktop produisent exactement la même sélection.
 *
 * On n'observe que le comportement externe et le contrat DOM (décision 11) ;
 * les valeurs attendues sont des données de référence indépendantes —
 * l'accordage standard (décision 3) et la table des correspondances — jamais
 * recalculées comme le code le fait.
 */
import { expect, test } from '@playwright/test';

/** Cible tactile minimale (décision 6). */
const MIN_TAP = 44;

/** Accordage standard de la basse (décision 3), en numéros MIDI. */
const OPEN_MIDI = { Mi: 28, La: 33, Ré: 38, Sol: 43 };

/** Les quatre cordes, de la plus grave à la plus aiguë. */
const STRING_NAMES = ['Mi', 'La', 'Ré', 'Sol'];

/** Case la plus haute de l'instrument. */
const FRET_MAX = 20;

/** Note sonore attendue pour une case : accordage standard + case. */
function expectedMidi(string, fret) {
  return OPEN_MIDI[string] + fret;
}

/** Toutes les positions d'une note, dérivées de l'accordage de référence. */
function expectedPositions(midi) {
  return STRING_NAMES
    .map((name) => ({ name, fret: midi - OPEN_MIDI[name] }))
    .filter(({ fret }) => fret >= 0 && fret <= FRET_MAX)
    .map(({ name, fret }) => `${name}·${fret}`)
    .sort();
}

/**
 * Lit, dans les trois vues, les éléments en surbrillance primaire (la note
 * exacte). C'est le niveau qui identifie la note sélectionnée.
 */
async function readHighlights(page) {
  return page.evaluate(() => {
    const tier = (element) => element.getAttribute('data-highlight');
    const cells = [...document.querySelectorAll('#fretboard .fret-cell')].map((element) => ({
      key: `${element.dataset.string}·${element.dataset.fret}`,
      midi: Number(element.dataset.midi),
      tier: tier(element),
    }));
    const heads = [...document.querySelectorAll('#staff .notehead')].map((element) => ({
      midi: Number(element.getAttribute('data-midi')),
      tier: tier(element),
    }));
    const rows = [...document.querySelectorAll('#table tbody tr')].map((element) => ({
      midi: Number(element.dataset.pitch),
      tier: tier(element),
    }));
    const primaryMidis = (items) =>
      items
        .filter((item) => item.tier === 'primary')
        .map((item) => item.midi)
        .sort((a, b) => a - b);

    return {
      primaryCellKeys: cells
        .filter((item) => item.tier === 'primary')
        .map((item) => item.key)
        .sort(),
      primaryHeadMidis: primaryMidis(heads),
      primaryRowMidis: primaryMidis(rows),
    };
  });
}

/**
 * Mesures du manche : défilement, case demandée (relativement à la colonne
 * épinglée) et position de la colonne à vide.
 */
async function readFretboardScroll(page, string = 'Sol', fret = 20) {
  return page.evaluate(
    ({ string, fret }) => {
      const scroller = document.querySelector('#fretboard .fretboard-scroll');
      const pinned = document.querySelector('#fretboard .fretboard-pinned');
      const cell = document.querySelector(
        `#fretboard .fret-cell[data-string="${string}"][data-fret="${fret}"]`,
      );
      const open = document.querySelector('#fretboard .fret-cell[data-string="Mi"][data-fret="0"]');
      const scrollerRect = scroller.getBoundingClientRect();
      const pinnedRect = pinned.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const openRect = open.getBoundingClientRect();
      return {
        scrollLeft: scroller.scrollLeft,
        pinnedX: pinnedRect.x,
        scrollerX: scrollerRect.x,
        pinnedWidth: pinnedRect.width,
        cellLeft: cellRect.left,
        cellRight: cellRect.right,
        visibleLeft: scrollerRect.left + pinnedRect.width,
        visibleRight: scrollerRect.right,
        openLeft: openRect.left,
        openRight: openRect.right,
      };
    },
    { string, fret },
  );
}

/** Mesures de la portée : défilement et position de la tête demandée. */
async function readStaffScroll(page, midi) {
  return page.evaluate((midi) => {
    const scroller = document.querySelector('#staff .staff-scroll');
    const head = document.querySelector(`#staff .notehead[data-midi="${midi}"]`);
    const scrollerRect = scroller.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    return {
      scrollLeft: scroller.scrollLeft,
      headLeft: headRect.left,
      headRight: headRect.right,
      visibleLeft: scrollerRect.left,
      visibleRight: scrollerRect.right,
    };
  }, midi);
}

test('sur mobile, cases du manche et têtes de portée sont des cibles d’au moins 44 px (décisions 6, 7 et 26)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'mesure des cibles sur le viewport mobile');

  await page.goto('/');

  const sizes = await page.evaluate(() => {
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };
    return {
      cells: [...document.querySelectorAll('#fretboard .fret-cell')].map(box),
      hits: [...document.querySelectorAll('#staff .notehead-hit')].map(box),
      heads: [...document.querySelectorAll('#staff .notehead')].map(box),
    };
  });

  expect(sizes.cells).toHaveLength(84);
  expect(sizes.hits).toHaveLength(36);
  expect(sizes.heads).toHaveLength(36);

  // La case entière est la cible ; la tête porte une zone tactile élargie.
  expect(
    sizes.cells.every(({ width, height }) => width >= MIN_TAP && height >= MIN_TAP),
    'toutes les cases font au moins 44 px',
  ).toBe(true);
  expect(
    sizes.hits.every(({ width, height }) => width >= MIN_TAP && height >= MIN_TAP),
    'toutes les zones tactiles des têtes font au moins 44 px',
  ).toBe(true);
  expect(
    sizes.heads.every(({ width, height }) => width >= MIN_TAP && height >= MIN_TAP),
    'toutes les têtes font au moins 44 px',
  ).toBe(true);
});

test('sur mobile, une tape au centre de chaque case sélectionne la note prévue (décisions 6 et 26)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'tapes sur le viewport mobile');

  await page.goto('/');
  const viewport = page.viewportSize();

  const cells = page.locator('#fretboard .fret-cell');
  const count = await cells.count();
  expect(count).toBe(84);

  for (let index = 0; index < count; index += 1) {
    const cell = cells.nth(index);
    const info = await cell.evaluate((element) => ({
      string: element.dataset.string,
      fret: Number(element.dataset.fret),
    }));

    // La case doit être visible. Une case frettée est centrée horizontalement :
    // elle dégage la colonne épinglée, dont l'overlay ne doit pas masquer son
    // centre. Sans cela, la tape tomberait sur la colonne à vide.
    await cell.evaluate((element, fret) => {
      element.scrollIntoView({ inline: fret > 0 ? 'center' : 'nearest', block: 'center' });
    }, info.fret);
    const box = await cell.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    expect(centerY, `case ${info.string}·${info.fret} visible verticalement`).toBeGreaterThanOrEqual(0);
    expect(centerY).toBeLessThanOrEqual(viewport.height);

    await page.touchscreen.tap(centerX, centerY);

    const midi = expectedMidi(info.string, info.fret);
    const state = await readHighlights(page);
    expect(state.primaryCellKeys, `cases primaires de ${info.string}·${info.fret}`).toEqual(
      expectedPositions(midi),
    );
    expect(state.primaryHeadMidis, `tête primaire de ${info.string}·${info.fret}`).toEqual([midi]);
    expect(state.primaryRowMidis, `ligne primaire de ${info.string}·${info.fret}`).toEqual([midi]);
  }
});

test('sur mobile, une tape au centre de chaque tête de portée sélectionne la note prévue (décisions 7 et 26)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'tapes sur le viewport mobile');

  await page.goto('/');
  const viewport = page.viewportSize();

  const heads = page.locator('#staff .notehead');
  const count = await heads.count();
  expect(count).toBe(36);

  for (let index = 0; index < count; index += 1) {
    const head = heads.nth(index);
    await head.evaluate((element) => {
      element.scrollIntoView({ inline: 'center', block: 'center' });
    });
    const box = await head.boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    expect(centerY, `tête ${index} visible verticalement`).toBeGreaterThanOrEqual(0);
    expect(centerY).toBeLessThanOrEqual(viewport.height);

    await page.touchscreen.tap(centerX, centerY);

    // La portée est chromatique de Mi1 (28) à Ré♯4 (63).
    const midi = 28 + index;
    const state = await readHighlights(page);
    expect(state.primaryHeadMidis, `tête primaire ${index}`).toEqual([midi]);
    expect(state.primaryCellKeys, `cases primaires de la tête ${index}`).toEqual(
      expectedPositions(midi),
    );
    expect(state.primaryRowMidis, `ligne primaire de la tête ${index}`).toEqual([midi]);
  }
});

test('sur mobile, une case haute défile le manche et la tête reste épinglée (décisions 6, 27 et 28)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'défilement horizontal sur écran étroit');

  await page.goto('/');

  const scroller = page.locator('#fretboard .fretboard-scroll');
  expect(await scroller.evaluate((element) => element.scrollLeft)).toBe(0);

  // Sélection depuis le tableau : Ré♯4 (Sol·20), la borne haute, une case
  // hors de la zone visible au repos.
  await page.locator('#table tbody tr[data-pitch="63"]').click();

  const metrics = await readFretboardScroll(page, 'Sol', 20);
  expect(metrics.scrollLeft, 'le manche a défilé vers Sol·20').toBeGreaterThan(0);
  expect(metrics.cellLeft, 'Sol·20 nette de la colonne épinglée').toBeGreaterThanOrEqual(
    metrics.visibleLeft - 1,
  );
  expect(metrics.cellRight, 'Sol·20 dans la zone visible').toBeLessThanOrEqual(
    metrics.visibleRight + 1,
  );

  // La colonne à vide reste épinglée au bord gauche pendant le défilement.
  expect(Math.abs(metrics.pinnedX - metrics.scrollerX), 'colonne à vide épinglée').toBeLessThan(2);
  expect(metrics.openLeft, 'corde Mi à vide visible').toBeGreaterThanOrEqual(metrics.scrollerX - 1);
  expect(metrics.openRight).toBeLessThanOrEqual(metrics.scrollerX + metrics.pinnedWidth + 1);
});

test('sur mobile, la note la plus haute défile la portée (décisions 7 et 28)', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'défilement horizontal sur écran étroit');

  await page.goto('/');

  const scroller = page.locator('#staff .staff-scroll');
  expect(await scroller.evaluate((element) => element.scrollLeft)).toBe(0);

  // Ré♯4 (MIDI 63) est la borne haute : sa tête écrite Ré♯5 est le sommet de
  // la portée, à l'extrémité droite du ruban.
  await page.locator('#table tbody tr[data-pitch="63"]').click();

  const metrics = await readStaffScroll(page, 63);
  expect(metrics.scrollLeft, 'la portée a défilé vers Ré♯5').toBeGreaterThan(0);
  expect(metrics.headLeft, 'Ré♯5 dans la zone visible').toBeGreaterThanOrEqual(
    metrics.visibleLeft - 1,
  );
  expect(metrics.headRight).toBeLessThanOrEqual(metrics.visibleRight + 1);
});

test('sur mobile, une case basse sélectionnée ramène le manche à gauche (décision 28)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'défilement horizontal sur écran étroit');

  await page.goto('/');

  // Sol·20 pousse le manche à droite, puis Mi2 (Mi·1) doit le ramener à gauche.
  await page.locator('#table tbody tr[data-pitch="63"]').click();
  const high = await readFretboardScroll(page, 'Sol', 20);
  expect(high.scrollLeft).toBeGreaterThan(0);

  await page.locator('#table tbody tr[data-pitch="29"]').click();
  const low = await readFretboardScroll(page, 'Mi', 1);
  expect(low.scrollLeft, 'le manche est revenu à gauche').toBeLessThan(high.scrollLeft);
  expect(low.cellLeft, 'Mi·1 nette de la colonne épinglée').toBeGreaterThanOrEqual(
    low.visibleLeft - 1,
  );
  expect(low.cellRight, 'Mi·1 dans la zone visible').toBeLessThanOrEqual(low.visibleRight + 1);
});

test('sur mobile, la sélection révèle la ligne du tableau dans une vue filtrée (décision 8)', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'mobile', 'défilement vertical de la page sur écran étroit');

  await page.goto('/');

  // Filtre sur la corde Sol : la ligne de Ré♯4 reste, mais elle est loin sous
  // la ligne de flottaison.
  await page.locator('input[name="string-filter"][value="Sol"]').check();
  const row = page.locator('#table tbody tr[data-pitch="63"]');
  await expect(row).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  const viewport = page.viewportSize();
  const before = await row.boundingBox();
  expect(before, 'la ligne de Ré♯4 est présente dans la vue filtrée').not.toBeNull();
  expect(before.y + before.height, 'la ligne est d’abord hors de la fenêtre').toBeGreaterThan(
    viewport.height,
  );

  // Sélection depuis le manche : la ligne du tableau doit venir dans la fenêtre.
  await page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]').click();
  await expect(row).toBeVisible();
  const after = await row.boundingBox();
  expect(after.y, 'la ligne sélectionnée est ramenée dans la fenêtre').toBeGreaterThanOrEqual(-1);
  expect(after.y + after.height).toBeLessThanOrEqual(viewport.height + 1);
});

test("sur grand écran, les trois vues restent alignées d'un seul coup d'œil (décision 10)", async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'desktop', 'disposition « d’un seul coup d’œil » sur grand écran');

  await page.goto('/');

  const layout = await page.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const scroller = document.querySelector('#fretboard .fretboard-scroll');
    const lastCell = document.querySelector('#fretboard .fret-cell[data-string="Sol"][data-fret="20"]');
    const scrollerRect = scroller.getBoundingClientRect();
    const lastRect = lastCell.getBoundingClientRect();
    return {
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      fretboard: box('#fretboard-section'),
      staff: box('#staff-section'),
      table: box('#table-section'),
      scroller: { clientWidth: scroller.clientWidth, scrollWidth: scroller.scrollWidth },
      scrollerRight: scrollerRect.right,
      lastCellRight: lastRect.right,
    };
  });

  // Pas de défilement horizontal de la page : les trois vues tiennent en largeur.
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

  // Le manche occupe toute la largeur, au-dessus des deux autres vues.
  expect(layout.fretboard.x).toBeLessThanOrEqual(layout.staff.x + 1);
  expect(layout.fretboard.right).toBeGreaterThanOrEqual(layout.table.right - 1);
  expect(layout.fretboard.bottom).toBeLessThanOrEqual(layout.staff.y + 1);

  // Portée et tableau côte à côte, dans la largeur de la fenêtre. Le ruban de
  // la portée défile intérieurement — un compromis accepté, pas un débordement
  // de page.
  expect(Math.abs(layout.staff.y - layout.table.y), 'portée et tableau sur la même ligne').toBeLessThan(1);
  expect(layout.staff.x).toBeLessThan(layout.table.x);
  expect(layout.staff.right).toBeLessThanOrEqual(layout.table.x + 1);
  expect(layout.staff.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.table.right).toBeLessThanOrEqual(layout.viewportWidth + 1);

  // Le manche entier est visible sans défilement interne.
  expect(layout.scroller.scrollWidth).toBeLessThanOrEqual(layout.scroller.clientWidth + 1);
  expect(layout.lastCellRight).toBeLessThanOrEqual(layout.scrollerRight + 1);
});

test('parité du pointeur : la tape sur mobile et le clic sur desktop donnent la même sélection (décision 30)', async ({
  page,
}) => {
  await page.goto('/');
  const isMobile = test.info().project.name === 'mobile';

  // Une case du manche : Sol·5 → Do3 (quatre positions, décision 3).
  const cell = page.locator('#fretboard .fret-cell[data-string="Sol"][data-fret="5"]');
  await cell.evaluate((element) => element.scrollIntoView({ inline: 'center', block: 'center' }));
  const cellBox = await cell.boundingBox();
  if (isMobile) {
    await page.touchscreen.tap(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
  } else {
    await page.mouse.click(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
  }
  const fromCell = await readHighlights(page);
  expect(fromCell.primaryCellKeys).toEqual(expectedPositions(48));
  expect(fromCell.primaryHeadMidis).toEqual([48]);
  expect(fromCell.primaryRowMidis).toEqual([48]);

  // La tête écrite correspondante, au centre : exactement le même résultat.
  const head = page.locator('#staff .notehead[data-midi="48"]');
  await head.evaluate((element) => element.scrollIntoView({ inline: 'center', block: 'center' }));
  const headBox = await head.boundingBox();
  if (isMobile) {
    await page.touchscreen.tap(headBox.x + headBox.width / 2, headBox.y + headBox.height / 2);
  } else {
    await page.mouse.click(headBox.x + headBox.width / 2, headBox.y + headBox.height / 2);
  }
  const fromHead = await readHighlights(page);
  expect(fromHead).toEqual(fromCell);
});
