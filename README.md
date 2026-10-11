# FindARescue.ie

Source for [FindARescue.ie](https://findarescue.ie), a directory of animal rescues, shelters and welfare organisations across Ireland, and for its companion translation tool, [translate.findarescue.ie](https://translate.findarescue.ie).

This repository holds two things:

| Part | What it is | Location |
|---|---|---|
| **Main site** | The public directory, available in English and Irish (Gaeilge) | `public_html/` |
| **Translation tool** | A separate web app where volunteers review and vote on Irish translations | `public_html/translate/` |

---

## The main site

A static, framework-free site: plain HTML, CSS and JavaScript. Visitors can browse and search rescues by animal type (dogs, cats, birds, small animals, equines, wildlife) and by province or county, and each entry links to the rescue's website, donation page and social media. There is also a map page and an About page.

### Structure

```
public_html/
├── index.html         Directory page
├── map.html           Map page
├── about.html         About page
├── resources.js       The data: one entry per rescue
├── translations.js    Every interface string, in English (en) and Irish (ga)
├── app.js             Directory logic: filtering, search, rendering
├── style.css          All styles
├── icons.svg          Icon sprite
├── images/            Site images and rescue logos (images/RescueLogos/)
├── robots.txt
├── sitemap.xml
└── translate/         The translation tool (see below)
```

### How it fits together

- **`resources.js`** defines a global `resources` array. Each entry has a title, description, animal category, location tags (province and county), logo, and links for website, donation, location, Instagram and Facebook, plus a charity number where there is one. **To add or edit a rescue, edit this file** and add its logo to `images/RescueLogos/`.
- **`translations.js`** holds each interface string once under `en` and once under `ga`, with the same keys in both. HTML elements opt in with `data-i18n` attributes. Irish values that are still English placeholders are marked `// TODO (ga)`. A rescue's Irish description is stored in an optional `description_ga` field in `resources.js`, and English is shown when it is missing.
- **`app.js`** reads both of those files to build the page. The script order in `index.html` matters: `resources.js`, then `translations.js`, then `app.js`, loaded synchronously with no `defer` or `async`.
- **Adding an animal category:** add it to `CATEGORY_CONFIG` in `app.js`, add its label key to both `en` and `ga` in `translations.js`, and add its icon to `icons.svg`.

### Hosting

The site runs on Hostinger shared hosting (PHP and MySQL, no Node or Python). Changes are deployed by uploading files to `public_html/`.

---

## The translation tool

`translate/` is a small PHP and MySQL web app served at **translate.findarescue.ie**. It lets several volunteers work together on the Irish version of the site's interface text. Some of that text starts as AI-generated Irish, and people review it, propose better versions and vote.

### What it does

- **Reads the site's strings.** It loads `translations.js` from a location set in its config file and syncs the keys into its own database. New keys are added, and when a key's English changes the old English is kept and affected translations are tagged "Older English". Keys removed from the file are hidden, but their history stays.
- **Shows AI translations as a starting point.** Where `translations.js` already has Irish, that is imported as an AI entry credited to "Claude (AI)". Where the Irish is still an English placeholder, an AI suggestion comes from a seed table.
- **Lets anyone add translations and notes.** Each string can have several translations and discussion notes from different contributors.
- **Uses voting to pick the best one.** Each translator gets one vote per translation: Accept or Reject. The accepted translation is the one with the most accepts minus rejects, as long as that is above zero, and the newest wins a tie.
- **Has two views.** "To translate" shows strings without an accepted translation, and "All text" shows everything. There is also search and a section filter.
- **Exports the result.** It builds a ready-to-paste `ga: { ... }` block containing each key's accepted translation, which is then copied into `translations.js` on the main site.
- **Lets people undo mistakes.** Deleting is a soft delete with a short Undo window, and the database records who deleted what and when.

### Files

| File | Purpose |
|---|---|
| `index.html` | The page translators use |
| `api.php` | JSON API: list, add translation, add note, vote, delete, export, health check |
| `config.php` | Database login and the location of `translations.js` (**not in this repo**, see below) |
| `schema.sql` | Creates the database tables and seeds AI translations for placeholder strings. Safe to run again |
| `.htaccess` | Blocks direct web access to `config.php`, `schema.sql` and the README, and adds `noindex` |
| `README.md` | Detailed setup and behaviour notes |

### Setup

1. Create a MySQL database in hPanel and import `schema.sql` through phpMyAdmin.
2. Create `translate/config.php` on the server. It defines the database host, name, user and password, the location of `translations.js` (`TRANSLATIONS_SOURCE`), the sync interval, a debug switch and the per-IP write limit. See `translate/README.md` for the details.
3. Upload the other files in `translate/` to the subdomain's folder.
4. Open the tool. The first load reads `translations.js` and fills the database.

### Safeguards

- Prepared statements for all queries, and escaped output.
- Length limits and control-character stripping on input.
- A custom request header is required for writes, and cross-origin requests are rejected.
- A limit on writes per IP address per minute.
- Search engines are told not to index it. Anyone with the link can still contribute.

---

## Notes for working on this repo

- **`translate/config.php` is deliberately not committed.** It contains database credentials, and `.gitignore` excludes it. Keep a copy of the settings somewhere safe, as the repo won't recover it.
- **The database is not in git.** Translations, votes and notes live in MySQL on Hostinger. Export a dump from phpMyAdmin to back them up.
