# Dutch Learning

A keyboard- and touch-friendly app for learning Dutch, with two modes:

- **Vocab** — flashcards and typing drills over CEFR-leveled word lists.
- **News** — NOS's headline of the day, where you can tap **any** word to see
  its translation, an example sentence, and (for verbs) conjugations or (for
  nouns) the article and plural.

Runs entirely in the browser — no backend, no accounts. Progress is saved in
your browser's `localStorage`.

> **This is a free educational project.** Anyone may use it for any purpose,
> including commercial use, under the [MIT License](LICENSE). It is a study aid,
> not affiliated with NOS or any exam body. Contributions and corrections via
> pull request are welcome.

## Live app

**https://burwei.github.io/dutch-learning/**

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173/ (Vite's default; it prints the URL on start).

## Daily news

The **News** tab reads files from [`daily-news/`](daily-news/) — one small
plain-text file per day (`YYYY-MM-DD.txt`) with the article and a
surface-form → lemma index. Tap any word to see its definition. See
[`daily-news/README.md`](daily-news/README.md) for the exact format.

Words are stored once and reused, so the repo stays lean over years of daily
files. [`scripts/fetch_daily_news.py`](scripts/fetch_daily_news.py) fetches
NOS's headline of the day, builds a dictionary entry for every word, and:

- appends words **new** to your lists into `vocab/<type>/news.csv` (which shows
  up as a studyable **"News"** level) — verbs, nouns, adjectives, adverbs;
- appends function words and names into `lexicon/other.csv` (used for
  click-to-define only, not a flashcard level);
- writes the day's file with just the article + the index (definitions are
  looked up from the lists above, never duplicated per day).

Each run bumps the patch version in `package.json`, so the app's version (shown
in the menu, `x.y.z`) advances at least once a day with the news.

There are two ways to run it:

**Scheduled Claude agent (recommended — no API key).** A daily Claude agent does
the language work itself. See
[`scripts/daily-news-routine.md`](scripts/daily-news-routine.md) for the setup
guide and the exact prompt to give the agent.

**Yourself, in a terminal (uses the Anthropic API).**

```bash
pip install -r scripts/requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
python3 scripts/fetch_daily_news.py auto                 # today's NOS headline
python3 scripts/fetch_daily_news.py auto --url <nos-link>  # a specific article
```

Useful flags: `--url <nos-link>`, `--dry-run` (print the article without calling
the API), `--force` (regenerate an existing day), `--no-version-bump`.

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
- The daily-news script appends discovered words to `vocab/<type>/news.csv` with
  one extra `category` column (the NOS section). Extra columns are ignored by the
  app, so `news.csv` works like any other level. Function words and proper nouns
  go to `lexicon/other.csv` (`dutch,english,pos,example,category`), which powers
  click-to-define in the News reader but is not a flashcard level.

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

## Development workflow

- `develop` — build and test changes here (`npm run dev`, run the news script).
- `main` — merge into `main` to release; it deploys automatically.

## Deploying your own copy

Push to `main` — GitHub Pages rebuilds automatically (see
`.github/workflows/deploy.yml`; set `base` in `vite.config.ts` to your repo name).

## License

[MIT](LICENSE) — free for everyone, including commercial use. This is an
educational project; the bundled word lists and generated news vocabulary are
study aids, not official material.
