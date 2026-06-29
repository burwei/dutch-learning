# Dutch Vocabulary Flashcards

A keyboard- and touch-friendly flashcard app for memorizing Dutch vocabulary.
Runs entirely in the browser — no backend, no accounts. Progress is saved in
your browser's `localStorage`.

## Live app

**https://burwei.github.io/dutch-learning/**

## Run locally

```bash
npm install
npm run dev
```

Then open the printed `localhost` URL.

## Use your own vocab files

Vocabulary lives in CSV files under `vocab/`, grouped by word type:

```
vocab/
  verb/   a0-a2_core.csv  b1_core.csv  ...
  noun/   a0-a2_core.csv  ...
  adj/    a0-a2_core.csv  ...
  adv/    a0-a2_core.csv  ...
```

- **Each CSV file is a selectable "Level".** The level name shown in the app
  comes from the filename, e.g. `b1_core.csv` → "B1 Core", `my_words.csv` →
  "My Words". Drop in a new file and it appears in the Level menu after a reload.
- All files in a word type's folder are merged for the levels you tick.

The first row of every file is the header. Columns per type:

| Type | Columns |
| ---- | ------- |
| verb | `infinitive,english,present,simple_past,present_perfect,example` |
| noun | `dutch,english,article,plural,example` |
| adj  | `dutch,english,example` |
| adv  | `dutch,english,example` |

Notes:
- `example` is a Dutch example sentence shown on the answer side.
- Cells may list alternatives with `/` (e.g. `woei/waaide`, `heb/is aangeboden`);
  in typing mode any alternative is accepted, accents are ignored, and present
  perfect is accepted with or without its auxiliary.
- Rows with an empty answer cell are skipped for that topic.

## Vocabulary sources

The included word lists are study aids, **not** official exam lists — there is no
single official, downloadable, per-level Dutch (NT2) vocabulary list. Levels and
word selection were guided by:

- **CEFR / Dutch NT2 (Staatsexamen) level descriptors** — the College voor Toetsen
  en Examens documents word *scope* by reference rather than a closed list, and
  notes learners are assumed to know roughly 4,000–5,000 words at B1 and
  11,000–12,000 at B2 ([staatsexamensnt2.nl](https://www.staatsexamensnt2.nl/)).
- **NT2Lex (CEFRLex)** — an open, CEFR-graded Dutch lexicon (~15k entries, A1–C1),
  used as a leveling reference ([cental.uclouvain.be/cefrlex/nt2lex](https://cental.uclouvain.be/cefrlex/nt2lex/), CC BY-NC-SA).
- **A Frequency Dictionary of Dutch** (Tiberius & Schoonheim) — used only as a
  template for the field shape (word + article + translation + example), not copied.

The actual word entries, translations, conjugations, articles/plurals, and example
sentences were generated and curated with an LLM against the references above.
Corrections via pull request are welcome.

## Deploying your own copy

Push to `main` — GitHub Pages rebuilds automatically (see
`.github/workflows/deploy.yml`; set `base` in `vite.config.ts` to your repo name).
