# Dutch Learning

A free, open-source web app for learning Dutch: flashcards and typing drills over
CEFR-leveled word lists, plus a daily news reader where you can tap any word in a
real NOS article to see what it means. Made for anyone studying Dutch — it runs
entirely in your browser, with no account and no backend.

> A full, code-free description of everything the app does lives in
> [`features.md`](features.md).

## Live app

**https://burwei.github.io/dutch-learning/**

## Run it locally

```bash
npm install
npm run dev
```

Then open the URL it prints (Vite's default is http://localhost:5173/).

## Add your own vocab

Vocabulary is plain CSV under `vocab/`, grouped by word type (`verb/`, `noun/`,
`adj/`, `adv/`).

- **Each CSV file is a selectable "Level."** Its name comes from the filename:
  `b1_core.csv` → "B1 Core", `my_words.csv` → "My Words". Drop a file in and it
  shows up in the Level menu after a reload. All ticked levels are merged.
- The first row is the header. Columns per type:

  | Type        | Columns                                                          |
  | ----------- | --------------------------------------------------------------- |
  | verb        | `infinitive,english,present,simple_past,present_perfect,example` |
  | noun        | `dutch,english,article,plural,example`                          |
  | adj / adv   | `dutch,english,example`                                         |

- `example` is a Dutch sentence shown on the answer side. A cell may list
  alternatives with `/` (e.g. `woei/waaide`); typing mode accepts any of them and
  ignores accents.

## Daily news

The **News** tab reads one small file per day from [`daily-news/`](daily-news/).
A **scheduled Claude agent** fetches NOS's headline of the day, writes a
definition for every word and a translation for every sentence, stores any new
words into the vocab lists, and commits the day's file — which deploys
automatically. The setup guide and exact prompt are in
[`scripts/daily-news-routine.md`](scripts/daily-news-routine.md).

**Cost:** one Claude run per day. On a Claude subscription's scheduled agent it's
included (no extra cost); run through the Anthropic API instead and it's roughly a
few cents a day. You can also run it by hand: `python3 scripts/fetch_daily_news.py auto`.

## License

[MIT](LICENSE) — free and open for everyone. Use it, copy it, change it, ship it,
even sell it; do whatever you like. It's an educational study aid and is not
affiliated with NOS or any exam body.
