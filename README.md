# Dutch Vocabulary Flashcards

A local, keyboard-driven flashcard app for memorizing Dutch vocabulary —
verbs, nouns, adjectives, and adverbs. Runs entirely in the browser: no backend,
no database, no network calls. Progress is saved in `localStorage`.

## Live app

**https://burwei.github.io/dutch-learning/**

Hosted on GitHub Pages. Every push to `main` rebuilds and redeploys automatically
(see `.github/workflows/deploy.yml`).

## Run locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL (default http://localhost:5173).

## Vocabulary files

All word lists live under `vocab/`, grouped by type:

```
vocab/
  verb/   dutch_verbs_a0_to_a2.csv
  noun/   dutch_nouns_a0_to_a2.csv
  adj/    dutch_adjectives_a0_to_a2.csv
  adv/    dutch_adverbs_a0_to_a2.csv
```

To expand a list, drop another CSV into the matching folder (e.g.
`vocab/verb/dutch_verbs_b1.csv`). Every CSV in a folder is merged automatically;
just reload the dev server. Pick the type with the **Vocab** toggle in the app.

### CSV schemas (first row is the header)

| Type | Columns |
| ---- | ------- |
| verb | `infinitive,english,present,simple_past,present_perfect` |
| noun | `dutch,english,article,plural` |
| adj  | `dutch,english` |
| adv  | `dutch,english` |

Notes:
- Cells may list alternatives with `/` (e.g. `woei/waaide`, `heb/is aangeboden`).
- Rows with an empty answer cell are skipped for that topic.

## Topics & modes

Pick a **Topic** (what you drill) and a **Mode** (how you drill):

- **Verbs:** NL → English · Simple past · Present perfect
- **Nouns:** NL → English · Article (de/het) · Plural
- **Adjectives / Adverbs:** NL → English

**Flashcard mode** — see the prompt, flip to reveal, mark known/unknown.
**Typing mode** — type the answer and check it. For "NL → English" topics the
direction flips (you see English and type the Dutch word), with a
first/last-letter hint.

### Answer checking (typing mode)

- Case-insensitive, whitespace trimmed and collapsed.
- Accents are ignored (`ë`=`e`, `ï`=`i`, …) — you never need to type diacritics.
- Any `/`-separated alternative is accepted.
- Present perfect accepts the participle with or without its auxiliary
  (`heb gelopen`, `ben gelopen`, and `gelopen` all match `heb/ben gelopen`).

## Keyboard map

**Flashcard mode**

| Key | Action |
| --- | ------ |
| `Space` | flip card |
| `→` | I remember → next |
| `←` | I don't remember → next |
| `↓` | next card |
| `↑` | previous card |

Mouse/touch: click the card to flip, click the side zones or swipe left/right to mark.

**Typing mode**

| Key | Action |
| --- | ------ |
| `Enter` | check answer |
| `Enter` / `→` / `↓` | next card (after checking) |

## Other controls

- **Filter:** All cards vs. Only unknown (drill what you keep missing).
- **Shuffle:** randomize the current deck.
- **Reset progress:** clear all known/unknown marks and the session score.

## Build

```bash
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
```
