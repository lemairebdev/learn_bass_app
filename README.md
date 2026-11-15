# Apprendre la basse

PWA pédagogique en français pour l'étudiant en basse : une seule page montre,
en trois vues synchronisées — le **manche** (4 cordes, cases 0 à 20), la
**portée** en clé de fa et le **tableau de correspondances** — où vit chaque
note, la joue, et fonctionne entièrement hors ligne. Le titre « Apprendre la
basse » est un intitulé de travail ; l'identité finale reste à définir.

L'app est livrée en **fichiers statiques purs** : aucun framework, aucune étape
de construction, aucune dépendance d'exécution, aucune ressource externe, et
des URL exclusivement relatives — elle fonctionne donc sur n'importe quel
hébergement statique HTTPS et sous n'importe quel chemin de base.

## Lancer l'app en local

```bash
npm install        # installe les outils de dev (http-server, Playwright)
npm run serve      # sert le dépôt sur http://localhost:4173/ (cache désactivé)
```

Autre port : `npm run serve -- -p 4180`.

## Lancer les tests

```bash
npm install
npx playwright install chromium
npm test
```

Les tests E2E Playwright démarrent eux-mêmes le serveur statique (`http-server`,
cache désactivé) via le `webServer` de `playwright.config.js`. Chaque
spécification de `tests/` courre sur les deux projets :

- **desktop** — Chromium, 1440×900, souris ;
- **mobile** — Chromium, descripteur Pixel 7 : 412×915, tactile, `isMobile`.

### Port des tests : `TEST_PORT`

Le serveur de test écoute par défaut sur **4173**. Quand plusieurs worktrees
ou agents lancent les tests en parallèle sur la même machine, chacun fixe son
propre port :

```bash
TEST_PORT=4210 npm test
```

`reuseExistingServer` vaut `false` : si le port est déjà pris, la suite échoue
immédiatement au lieu de parler au serveur d'un autre worktree.

### Bibliothèques système de Chromium

Si Chromium refuse de démarrer (`libnspr4.so` / `libnss3.so` / `libasound.so.2`
introuvables) et que vous n'avez pas les droits root, extrayez les paquets dans
un cache utilisateur — `playwright.config.js` les ajoute automatiquement via
`LD_LIBRARY_PATH` quand ce répertoire existe :

```bash
mkdir -p /tmp/debs && cd /tmp/debs
apt-get download libnspr4 libnss3 libasound2t64
mkdir -p ~/.cache/playwright-libs
for f in *.deb; do dpkg -x "$f" ~/.cache/playwright-libs; done
```

## Navigateurs pris en charge (décision 13 de la spécification)

| Navigateur | Installation | Hors ligne | Remarques |
| --- | --- | --- | --- |
| Chrome (bureau) | Oui | Oui | |
| Edge (bureau) | Oui | Oui | |
| Chrome (Android) | Oui (WebAPK) | Oui | |
| Firefox (bureau) | Non | Oui, dans un onglet | Limitation de la plateforme, pas de l'app |
| Safari (bureau) | « Ajouter au Dock » | Oui | |

Le hors ligne repose sur le service worker (ticket 14) ; l'audio démarre au
premier geste utilisateur (politique d'autodémarrage des navigateurs).

## Vérification manuelle avant acceptation

- [ ] Sur Chrome Android, installer depuis le menu du navigateur (« Ajouter à
  l'écran d'accueil » / WebAPK), puis vérifier le lancement autonome et l'usage
  hors ligne après un premier chargement.
- [ ] Sur Chrome de bureau, installer l'application et vérifier son ouverture
  dans une fenêtre dédiée ainsi que son entrée dans le lanceur ou la barre des
  tâches.
- [ ] Répéter l'installation et le lancement autonome sur Microsoft Edge de
  bureau.
- [ ] Sur Firefox de bureau, vérifier qu'aucune installation n'est proposée,
  puis confirmer que l'app reste fonctionnelle hors ligne dans un onglet après
  un premier chargement.

## Organisation du dépôt

| Chemin | Rôle |
| --- | --- |
| `index.html` | Coquille française : en-tête (titre + `#audio-controls`), puis les sections `#fretboard-section`, `#staff-section`, `#table-section` avec leurs points de montage |
| `styles.css` | Mise en page responsive (décision 10), pile de polices système |
| `manifest.webmanifest` | Installabilité PWA (français, `start_url` relative, standalone) |
| `icons/icon-192.png`, `icons/icon-512.png` | Icônes provisoires, générées localement |
| `js/` | Modules ES ; `js/app.js` est le bootstrap que les tickets suivants étendent |
| `sw.js` | Service worker : précache complet, lecture cache-first et mise à jour acceptée par l'utilisateur |
| `tests/` | Spécifications E2E Playwright, un fichier par ticket |
| `package.json` | Dépendances **de développement uniquement** (`@playwright/test`, `http-server`) |

Les artefacts Playwright (`test-results/`, `playwright-report/`) ne sont jamais
livrés ni référencés par l'app.

## Conventions pour les tickets suivants

- **Points de montage** : les vues se rendent dans `#fretboard`, `#staff`,
  `#table` ; les contrôles audio dans `#audio-controls` (en-tête).
- **Langues** : code en anglais (identifiants, noms de fichiers), surface en
  français (textes, aria-labels, intitulés de tests, valeurs attendues).
- **URL et imports** : toujours relatifs dans les fichiers livrés ; les
  imports ES restent relatifs (`./…`) — `tests/app-shell.spec.js` vérifie
  les deux à chaque exécution.
- **Tests** : un fichier de spécification par ticket dans `tests/`, couru sur
  les deux projets (desktop, mobile) sauf besoin contraire ; on n'observe que
  le comportement externe (DOM, réseau, console), jamais les modules internes.
- **App livrée** : fichiers statiques purs — jamais de dépendance
  d'exécution, d'étape de construction, ni de ressource externe.
