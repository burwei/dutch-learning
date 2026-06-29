# Daily-news agent routine

This repo's **News** tab is fed by one file per day under
[`daily-news/`](../daily-news/). The goal of this page: set up a **scheduled
Claude agent that runs every morning at 7:00**, so a fresh Dutch article — every
word tappable, every sentence translatable — is live and waiting when you open
the app on your commute. No Anthropic API key required, because the agent itself
does the language work.

Below: how it works, how to schedule it for 7:00 every day, and the exact prompt
to give the agent. (Prefer to run it yourself in a terminal with an API key?
Skip all this and run `python3 scripts/fetch_daily_news.py auto` — see
[the main README](../README.md).)

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
   `daily-news/<date>.txt` (article + English-only translations + index), and
   bumps the patch version in `package.json`.

The `.work/` files are scratch and git-ignored. What gets committed each day:
the day's `.txt`, any appended `vocab/*/news.csv` and `vocab/other/other.csv` rows,
and the `package.json` version bump.

## Set up the 7:00 AM schedule

You need a Claude product that can run an agent on this repo on a cron schedule
and push to GitHub. Any of these work — pick whichever you use:

- **Claude Code** — the `/schedule` command (scheduled cloud agents / routines),
  or the scheduling UI in the Claude desktop app.
- A self-hosted cron that invokes the Claude Code CLI / Agent SDK on a checkout
  of this repo.

Configure it like this:

- **Repo:** this repository, with **write access** so the agent can commit and
  push.
- **When:** every day at **07:00 in your local timezone** — cron `0 7 * * *`.
  - Tip: set it **15–30 minutes before you usually leave**. The article is the
    NOS headline *at run time*, and after the push GitHub Pages takes ~1–2 minutes
    to redeploy — so a 06:45 run is reliably live by the time you're on the train.
  - Make sure the schedule's timezone is yours (e.g. `Europe/Amsterdam`), not UTC.
- **Branch:** push **straight to `main`** so each morning's run deploys
  automatically and is live for your commute. (A push to `main` triggers the
  GitHub Pages deploy.) If you'd rather review the first runs before they go
  live, see [Safer rollout](#safer-rollout-review-the-first-runs) below.
- **Prompt:** paste the prompt below.

Once it's running, your morning loop is just: unlock phone → open the app → read.
If the agent runs and there's no new headline yet (rare), it does nothing and
leaves yesterday's article in place.

## The prompt

Paste this as the scheduled agent's instruction. It is safe to run every day —
if today's file already exists it stops cleanly without changing anything.

```text
You maintain the daily Dutch news file for this repo. Run the daily update now:

1. Run:  python3 scripts/fetch_daily_news.py fetch
   - If the output contains "NOTHING_TO_DO", today's file already exists.
     Stop here and report that there is nothing to do. Do NOT bump the version
     or commit anything.
   - Otherwise note the JOB_FILE, WORDS_FILE, and DATE it prints.

2. Read the JOB_FILE (daily-news/.work/<DATE>.job.json). It contains the article
   text under "body", the rules under "instructions", the JSON schema under
   "schema", the sentences to translate under "sentences", and — under
   "vocabulary" — every clickable word from the TITLE and body. Follow the
   instructions exactly: produce one dictionary entry covering EVERY word in
   "vocabulary" (title-only words included), with inflected forms grouped under
   their lemma via "surface_forms". Also produce "translations": one natural
   English translation for each Dutch sentence in the job's "sentences" array, in
   the same order (this powers double-tap-to-translate). Return exactly as many
   translations as there are sentences.

3. Write your result to the WORDS_FILE as JSON shaped exactly like
   {"words": [ ...entries... ], "translations": [ "<english>", ... ]},
   matching the schema in the job file. Every entry must include all required
   fields; use "" for fields that don't apply.

4. Run:  python3 scripts/fetch_daily_news.py build --date <DATE>
   This appends new words to vocab/<type>/news.csv and vocab/other/other.csv, writes
   daily-news/<DATE>.txt, and bumps the version in package.json. If it prints a
   `WARNING: ... won't be clickable` line, add the listed words to the words file
   and re-run `build --date <DATE> --force` until there is no warning.

5. Sanity-check daily-news/<DATE>.txt: it must have a Title/Date/Reporter/Source/
   Category header, an [ARTICLE] section, a [TRANSLATIONS] section (one English
   line per sentence, in document order), and a [WORDDATA] section whose ```json
   block parses. If anything looks wrong, fix the words file and re-run build
   with --force; do not commit a broken file.

6. Commit all changed files (daily-news/<DATE>.txt, any vocab/*/news.csv,
   vocab/other/other.csv, package.json) directly to main and push. Pushing to
   main triggers the GitHub Pages deploy, so the new article goes live within a
   couple of minutes. Do not touch the .work/ files (they are git-ignored).
```

## Safer rollout: review the first runs

While you're still building trust in the output, have the agent open a pull
request each morning instead of pushing to `main` — you skim it over coffee and
merge (which then deploys). Replace **step 6** of the prompt with:

```text
6. Commit the changes on a branch named daily-news/<DATE>, push, and open a pull
   request titled "Daily news: <DATE>". Stage everything git reports as changed:
   daily-news/<DATE>.txt, any vocab/*/news.csv and vocab/other/other.csv, and
   package.json. Do not touch the .work/ files (they are git-ignored).
```

When you're happy with the quality, switch step 6 back to the push-to-`main`
version above so the article is live automatically each morning.

## Trying one run by hand first

You can rehearse the whole flow locally before scheduling it — you act as the
"agent":

```bash
python3 scripts/fetch_daily_news.py fetch
# open daily-news/.work/<date>.job.json, write the entries to
# daily-news/.work/<date>.words.json as {"words":[...],"translations":[...]}, then:
python3 scripts/fetch_daily_news.py build --date <date>
```
