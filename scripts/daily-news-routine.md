# Daily-news agent routine

This repo's **News** tab is fed by one file per day under
[`daily-news/`](../daily-news/). You can generate those files automatically with
a **scheduled Claude agent** — no Anthropic API key required, because the agent
itself does the language work.

This page is the setup guide + the exact prompt to give the agent. (If you'd
rather run it yourself in a terminal with an API key, skip all this and just run
`python3 scripts/fetch_daily_news.py auto` — see [the main README](../README.md).)

## How it works

The script splits the job into two steps so an agent can sit in the middle:

1. `fetch` — downloads NOS's headline of the day, parses it, and writes
   `daily-news/.work/<date>.job.json`. The job file contains the article **and**
   the exact instructions + JSON schema for the word data.
2. The **agent** reads the job, builds a dictionary entry for every word (with a
   full-sentence example) and translates each sentence in the job's `sentences`
   list 1:1, writing `daily-news/.work/<date>.words.json` as
   `{"words": [ ... ], "translations": [ "<english>", ... ]}` — one English
   string per job sentence, in the same order.
3. `build` — reads the job + words, appends words **new** to your lists
   (`vocab/<type>/news.csv` and `vocab/other/other.csv`), writes the slim
   `daily-news/<date>.txt` (article + index only), and bumps the patch version
   in `package.json`.

The `.work/` files are scratch and git-ignored. What gets committed each day:
the day's `.txt`, any appended `vocab/*/news.csv` and `vocab/other/other.csv` rows,
and the `package.json` version bump.

## Set up the schedule

You need a Claude product that can run an agent on this repo on a cron schedule
and push to GitHub. Any of these work — pick whichever you use:

- **Claude Code** — `/schedule` (scheduled cloud agents / routines), or the
  scheduling UI in the Claude desktop app.
- A self-hosted cron that invokes the Claude Code CLI / Agent SDK on a checkout
  of this repo.

Configure it with:

- **Repo:** this repository, with **write access** so it can commit and push.
- **Cadence:** once a day (e.g. `0 7 * * *` in your timezone).
- **Prompt:** paste the prompt below.
- **Branch:** start with `develop` + open a PR while you build trust; switch the
  prompt to push straight to `main` once you're happy (a push to `main` triggers
  the GitHub Pages deploy).

## The prompt

Paste this as the agent's instruction:

```text
You maintain the daily Dutch news file for this repo. Do this once now:

1. Run:  python3 scripts/fetch_daily_news.py fetch
   - If the output contains "NOTHING_TO_DO", today's file already exists.
     Stop here and report that there is nothing to do. Do NOT bump the version.
   - Otherwise note the JOB_FILE, WORDS_FILE, and DATE it prints.

2. Read the JOB_FILE (daily-news/.work/<DATE>.job.json). It contains the article
   text under "body", the rules under "instructions", and the JSON schema under
   "schema". Follow the instructions exactly: produce one dictionary entry for
   EVERY distinct word in the article (content words and function words), with
   inflected forms grouped under their lemma via "surface_forms". Also produce
   "translations": one natural English translation for each Dutch sentence in the
   job's "sentences" array, in the same order (this powers double-tap-to-
   translate). Return exactly as many translations as there are sentences.

3. Write your result to the WORDS_FILE as JSON shaped exactly like
   {"words": [ ...entries... ], "translations": [ "<english>", ... ]},
   matching the schema in the job file. Every entry must include all required
   fields; use "" for fields that don't apply.

4. Run:  python3 scripts/fetch_daily_news.py build --date <DATE>
   This appends new words to vocab/<type>/news.csv and vocab/other/other.csv, writes
   daily-news/<DATE>.txt, and bumps the version in package.json.

5. Sanity-check daily-news/<DATE>.txt: it must have a Title/Date/Reporter/Source/
   Category header, an [ARTICLE] section, a [TRANSLATIONS] section (one
   `dutch | english` line per sentence), and a [WORDDATA] section whose ```json
   block parses. If anything looks wrong, fix the words file and re-run build
   with --force; do not commit a broken file.

6. Commit the changes on a branch named daily-news/<DATE>, push, and open a pull
   request titled "Daily news: <DATE>". Stage everything git reports as changed:
   daily-news/<DATE>.txt, any vocab/*/news.csv and vocab/other/other.csv, and
   package.json. Do not touch the .work/ files (they are git-ignored).
```

### Want it to deploy without review?

Replace step 6 with:

```text
6. Commit all changed files (daily-news/<DATE>.txt, vocab/*/news.csv,
   vocab/other/other.csv, package.json) directly to main and push.
   (Pushing to main triggers the GitHub Pages deploy.)
```

## Trying one run by hand first

You can rehearse the whole flow locally before scheduling it — you act as the
"agent":

```bash
python3 scripts/fetch_daily_news.py fetch
# open daily-news/.work/<date>.job.json, write the entries to
# daily-news/.work/<date>.words.json as {"words":[...],"translations":[...]}, then:
python3 scripts/fetch_daily_news.py build --date <date>
```
