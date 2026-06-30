# Dutch Learning — Feature Specification

This document describes **everything the app does**, in enough detail to rebuild
it from scratch — on any platform (web, iOS, Android, desktop) — **without
reading the source code**. It is written for a human or an LLM who has the
**data** (the `vocab/` CSVs and the `daily-news/` files) and wants to reproduce
the **product**.

The philosophy of this repo: *the features and the data are the valuable parts;
the code is just one implementation and can be regenerated.* So this file is the
source of truth for behavior, and it is deliberately exhaustive about **UX** —
the feel of the interactions is the heart of the app and has been tuned many
times.

Conventions used below:
- **"tap/click"** — a primary pointer action (touch tap, or mouse click).
- **"the deck"** — the ordered list of cards currently being drilled.
- Keyboard shortcuts apply to desktop; touch gestures apply to mobile; most
  features offer both.

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Architecture & platform constraints](#2-architecture--platform-constraints)
3. [Global shell (shared by both tabs)](#3-global-shell-shared-by-both-tabs)
4. [Tab 1 — Vocab](#4-tab-1--vocab)
5. [Tab 2 — News](#5-tab-2--news)
6. [Data model](#6-data-model)
7. [Daily-news generation pipeline](#7-daily-news-generation-pipeline)
8. [Visual design system](#8-visual-design-system)
9. [State & persistence](#9-state--persistence)
10. [Acceptance checklist](#10-acceptance-checklist)

---

## 1. Product overview

A study aid for learners of Dutch (aimed at NT2 / CEFR levels A0–C2). It has
**two tabs**:

- **Vocab** — spaced flashcards and typing drills over leveled word lists
  (verbs, nouns, adjectives, adverbs). The learner picks levels, a word type, a
  "topic" (what to test), and a mode (flashcard or typing), then drills.
- **News** — a daily reader showing the top headline from NOS (Dutch public
  broadcaster). **Every word is tappable** for an instant definition, every
  sentence can be translated, and any text can be selected and copied. New words
  found in the news flow back into the Vocab lists.

Core principles:
- **Zero friction.** No login, no onboarding, opens straight into a drill.
- **Offline-first reading.** All definitions and translations are baked into the
  data; nothing is fetched at read time.
- **Progress is private.** Saved only in the browser/device (local storage).
- **Touch-first, keyboard-friendly.** Works one-thumbed on a phone and fully by
  keyboard on a desktop.

---

## 2. Architecture & platform constraints

The reference implementation is a static single-page web app (no server, no
database, no API at runtime). If you rebuild it as a native mobile app, keep these
properties:

- **No backend / no accounts.** Everything ships as static assets + data files.
- **All content is bundled.** Vocab CSVs and daily-news files are read at build
  time (or shipped as bundled assets), parsed on the client.
- **Routing is hash-based and shareable.** The current tab and open article live
  in the URL so a refresh restores them and an article is shareable:
  - `#/vocab` — the Vocab tab.
  - `#/news/YYYY-MM-DD` — the News tab on a specific day.
  - Changing the hash (back/forward, pasted link) navigates; navigating updates
    the hash.
- **Full-screen, no page scroll.** The app fills the viewport; the page itself
  never scrolls. Scrolling happens *inside* a content area when needed (the news
  article). On mobile the layout must not bounce/scroll the whole page.
- **The viewport is non-zoomable** (`maximum-scale=1`, `user-scalable=no` in the
  web build). This is required so a **double-tap** can be used as a gesture
  without the OS hijacking it for zoom. A native app must likewise reserve
  double-tap.

---

## 3. Global shell (shared by both tabs)

### 3.1 Top bar

A slim top bar always shows:
- **Menu button** (`☰`) on the left — opens the Settings drawer.
- **Context label** (center/left): two lines describing what you're looking at.
  - In Vocab: line 1 = `"{Word type} · {Topic}"` (e.g. "Verbs · English");
    line 2 = `"Flashcard"` or `"Typing"`, with `" · only unknown"` appended when
    the unknown-only filter is on.
  - In News: line 1 = `"Daily news"`; line 2 = `"NOS headline · tap a word"`.

### 3.2 Settings drawer

A panel that slides in **from the left** over a dimmed backdrop. Closes by:
tapping the backdrop, tapping its `✕`, or pressing **Escape**. Contents, top to
bottom:

1. **View** toggle — `Vocab` / `News` (switches the tab). **News is the default
   landing tab** when the app opens at its root (no/unknown route).
2. *(Vocab only — hidden in News)*:
   - **Vocab** — word type: `Verbs` / `Nouns` / `Adjectives` / `Adverbs`.
     Switching type resets the Topic to that type's first topic.
   - **Level** — a set of **checkboxes**, one per available level (see §6.1),
     multi-select. The list is generated from the data, sorted CEFR-first.
   - **Topic** — what to test, options depend on the word type (see §4.4).
   - **Mode** — `Flashcard` / `Typing`.
   - **Filter** — `All` / `Only unknown`.
   - **Order** — `By order` / `Random`.
3. **Theme** — a button toggling `Light` / `Dark` (label shows the *other*
   theme, i.e. the action).
4. **Font size** — a stepper: `A−` / current percentage / `A+`. Scales the card
   and article text from **70 % to 180 %** in **10 %** steps. Buttons disable at
   the limits.
5. **Progress** — two buttons, `Export` / `Import` (§3.6).
6. **Reset progress** — opens the reset confirmation dialog (§3.5).
7. **Footer** — a link to the GitHub repo and the app **version** (`vX.Y.Z`).

All toggles are rendered as a labeled row of "pill" buttons; the active option is
highlighted in the accent color. Selections apply **immediately** (no Save
button) and persist (see §9).

### 3.3 Theme

- Light and dark themes, switchable any time, **persisted**.
- On first visit (no saved choice), follow the OS `prefers-color-scheme`.
- Dark mode uses **neutral dark grays** (near-black `#121212` background, no blue
  tint) for low-strain reading — not pure black, not a colored slate.
- Accent color is **Dutch orange** (`#e0590b` light / `#f2761c` dark) — used for
  active pills, primary buttons, links, the news reading-progress bar, and tap
  highlights on news words.
- Theme changes animate the background/text color briefly.

### 3.4 Font scaling

A single multiplier (default 1.0) applied to flashcard text, typing prompt text,
and news body/title text. Persisted. Lets low-vision users or phone readers size
text comfortably without affecting chrome.

### 3.5 Reset-progress confirmation

A modal dialog (centered, dimmed backdrop, dismiss by tapping outside or
Cancel). Text warns that it **permanently clears every known/unknown mark across
all word types and topics, plus the current session score, and cannot be undone**.
Two buttons: `Cancel` and a red `Reset progress`. Only this dialog ever clears
progress — no other path does.

### 3.6 Export / import progress

Because progress (and especially the per-reader **News** level, §5.7) is purely
local, the learner can move it between devices:

- **Export** downloads the current progress as a single compact JSON text file
  (`dutch-learning-progress-YYYY-MM-DD.json`). It contains the known/unknown
  marks, the list of finished news articles, and the selected levels — but **not**
  device preferences (theme, font, scroll/resume position).
- **Import** opens a file picker. After a file is chosen, a **confirmation dialog**
  warns that importing **overwrites all current progress** (marks, finished-news
  list, and levels) with the file's contents and **cannot be undone**, naming the
  chosen file. Only on confirming `Overwrite & import` is anything written.
  Invalid/garbled files are rejected with a toast and leave progress untouched.

---

## 4. Tab 1 — Vocab

The Vocab tab drills word lists. You choose **levels** (which files), a **word
type** (verb/noun/adj/adv), a **topic** (what aspect to test), a **mode**
(flashcard/typing), a **filter**, and an **order**. From those, the app builds a
**deck** and steps through it one card at a time.

### 4.1 The counter

Above the card, a row shows:
- `"{position} / {total}"` — 1-based index in the deck.
- `"{n} known"` — how many cards in the current deck are marked known.
- In Typing mode only: `"score {correct}/{attempted}"` — the running session
  score.

### 4.2 Flashcard mode

A large card centered on screen.

**Front (question):** a small label `"Dutch"` and the Dutch headword (large).
**Back (answer):** a label naming the topic (e.g. "English", "Simple past"), the
answer (large), and — if present — the **example sentence** in Dutch underneath.

**Flip:** tap the card or press **Space** to flip between front and back.

**Marking (the core gesture):**
- **Swipe right** = "I remember it" → mark **known**.
- **Swipe left** = "I don't remember" → mark **unknown**.
- Either way, the card **flies off** in that direction (slides ~120 % off-screen
  with a slight rotation and fade), then the deck **advances to the next card**.
- Desktop equivalent: **→** marks known, **←** marks unknown (same fly-off).

**Drag feel (tuned):**
- While dragging, the card follows the finger horizontally and **tilts**
  proportionally to the drag distance (subtle, ~0.04°/px).
- Past a small threshold (~24 px) the card shows a **color hint** of the pending
  decision (a green-ish tint dragging right, red-ish dragging left).
- Release **past ~70 px** commits the swipe (fly-off + mark). Release **before**
  that **snaps the card back** to center with a spring-like ease.
- A drag must **not** also flip the card: if the pointer moved more than a few
  pixels, the release is treated as a swipe, not a tap.

**A mark badge** appears on the card showing its current state (`known` /
`unknown`) if it has been marked before.

**Navigation without marking:**
- **Previous** / **Next** buttons under the card move through the deck **without**
  changing any mark.
- Desktop: **↓** = next, **↑** = previous.
- The deck is **circular** (advancing past the end wraps to the start).

**On-card hints (pinned to the bottom of the card):**
- Desktop: `"← don't remember · → remember · space to flip"`.
- Mobile: `"swipe ← / → to mark · tap to flip"`.

### 4.3 Typing mode

Tests recall by making the learner **type** the answer.

Layout:
- **Prompt** block: label `"Prompt"` + the prompt text (large). Note the typing
  prompt is often the **reverse** of the flashcard (e.g. show English, type the
  Dutch).
- **Hint line:** a masked version of the answer — **first and last letters
  shown, middle letters as `_`, spaces preserved**. Example: `liep af` →
  `l _ _ _   _ f`.
- **Input field:** autofocused on each new card. Autocomplete, autocapitalize,
  autocorrect, and spellcheck are all **off**; the mobile keyboard's action key
  says "go".
- **Actions:** `Don't know` (secondary) and `Check` (primary; disabled until the
  field is non-empty). Submitting the form (Enter / keyboard "go") triggers Check.

**Answer checking rules (important; see §6.3):**
- Case-insensitive, **accent-insensitive** (the learner never needs to type
  diacritics: `ë`→`e`, `é`→`e`, etc.), trims whitespace, collapses internal
  spaces.
- A CSV cell may list **alternatives with `/`** per word; **any** combination is
  accepted. E.g. `heb/is aangeboden` accepts "heb aangeboden" and "is
  aangeboden"; `woei/waaide` accepts either.
- For **present perfect** answers, the participle is accepted **with or without**
  its leading auxiliary (so `heb gelopen` also accepts `gelopen`).

**Result state (after Check or Don't know):**
- The input becomes read-only and is styled green (correct) or red (incorrect).
- A result block shows: `✅ Correct` / `❌ Incorrect` (or `Answer` if the learner
  pressed Don't know), the **correct answer** in bold, and the **example
  sentence** if present.
- A `Next` button appears and is **focused**, so Enter advances. Desktop:
  **Enter / → / ↓** all advance.
- Each answer updates the session **score** and sets the card's **known/unknown**
  mark (correct → known, incorrect or gave up → unknown).

### 4.4 Topics (what each word type can test)

The Topic options depend on the selected word type. Each topic defines a
flashcard front/back and a typing prompt/answer:

**Verbs:**
- **English** — flashcard: Dutch infinitive → English meaning. Typing is
  reversed: prompt = English, type the **infinitive**.
- **Simple past** — flashcard: infinitive → simple past. Typing: prompt =
  infinitive, type the **simple past**.
- **Present perfect** — flashcard: infinitive → present perfect (with auxiliary).
  Typing: prompt = infinitive, type the **present perfect**; auxiliary optional.

**Nouns:**
- **English** — Dutch noun → English. Typing reversed (type the Dutch noun).
- **Article (de/het)** — noun → `"{article} {noun}"` (e.g. "de hond"). Typing:
  prompt = noun, type the **article**.
- **Plural** — noun → plural form. Typing: prompt = noun, type the **plural**.

**Adjectives / Adverbs:**
- **English** — Dutch word → English. Typing reversed.

### 4.5 Levels, filter, order, deck building

- **Levels** (multi-select): each selected level's CSV (for the current word
  type) is merged into one pool. Default selection on first run is the beginner
  band (`a0-a2_core`).
- **Relevant entries only:** a row is skipped for a topic if **its answer cell is
  empty** (e.g. a verb with no recorded simple past won't appear in the
  Simple-past topic).
- **Filter:**
  - `All` — every relevant entry.
  - `Only unknown` — entries **not** marked known for the current
    mode+type+topic. Useful for a final pass.
  - The deck does **not** silently reshuffle as you mark cards — re-toggling the
    filter rebuilds it. (This keeps the order stable while you drill.)
- **Order:** `By order` (file/level order) or `Random` (a shuffle). Changing
  order rebuilds the deck.
- **Resume position:** when the deck context (mode + type + topic + filter)
  matches what you last drilled, the app **resumes at the last card you viewed**
  (matched by headword) after a reload or tab switch.

### 4.6 Progress model (Vocab)

- A card's mark (`known` / `unknown`) is stored **per mode + word type + topic**.
  So flashcard progress and typing progress are independent, and a noun's
  "English" progress is separate from its "Article" progress.
- The mark is keyed by the **Dutch headword**, so it follows the word across
  levels/files.
- "Known count" in the counter reflects the **current deck** only.
- Session **score** (typing) is ephemeral and reset by Reset progress.

### 4.7 Empty states

If the current selection yields no cards, show a friendly message. When the
unknown-only filter empties the deck, the message suggests switching the filter
back to "All".

---

## 5. Tab 2 — News

A daily reader. Each day has one short article (NOS's headline of the day) where
the learner can **define any word, translate any sentence, and copy any text**.
This is the most heavily-tuned part of the app — the gesture model below is the
product.

### 5.1 Layout

Top to bottom:
- **Reading-progress bar** pinned to the very top — a thin accent-colored bar
  that fills left→right as you scroll the article (it replaces a visible
  scrollbar).
- **Article card:**
  - **Title** (large) — its words are tappable too (see §5.6).
  - **Meta line:** date · reporter · a **`link`** to the original NOS article
    (opens in a new tab).
  - **Tip line** (muted, italic):
    `"Tap a word for its meaning · double-tap a sentence to translate · long-press to select & copy."`
  - **Body** — paragraphs of the article, rendered with the break-safe word
    layout described in §5.5.
- **Day navigation** at the bottom: `← Previous · {older date}` and
  `Next · {newer date} →` buttons. They are disabled at the ends. Switching days
  resets the scroll to the top.

The article shown defaults to the **newest** day; the chosen day is reflected in
the URL (`#/news/YYYY-MM-DD`).

### 5.2 Gesture model (the core of the News tab)

Three gestures share the article text. They were chosen so each is natural and
non-conflicting:

| Gesture | Result |
| --- | --- |
| **Single tap on a word** | Show that word's **definition** (popover). |
| **Double-tap a sentence** | **Select** the whole sentence and show its **English translation** (popover). |
| **Long-press / click-drag** | Native OS **text selection + copy** (handles, "Copy" menu). |

Implementation notes that matter for the feel:
- **Single vs double tap is time-based, not OS-based.** A tap starts a short
  timer (~250 ms). If a second tap lands before it fires, it's a **double-tap**
  (translate) and the pending definition is cancelled; otherwise the definition
  shows when the timer fires. (Don't rely on the platform's native double-click
  event — mobile browsers report it inconsistently.)
- **Long-press copy is the native selection.** The words are rendered as
  **selectable text**, not buttons, so a long-press triggers the operating
  system's own selection handles and Copy menu — including dragging the
  start/end carets. The app must **not** intercept this; if the user already has
  a non-collapsed selection, a tap must not pop a definition.
- **Double-tap selects the sentence visually**, using the native selection
  highlight, then shows the translation. Closing the translation clears that
  selection.

### 5.3 Definition popover

Opened by a single tap on a definable word. Contents:
- **Header:** the **lemma** (dictionary form), the **part of speech** (verb /
  noun / adj / adv / other), and a close `✕`.
- **English** gloss.
- **Word forms**, depending on type:
  - **Verb:** Present (ik-form), Simple past, Present perfect (with auxiliary) —
    whichever are present.
  - **Noun:** Article shown as `"{article} {lemma}"` (e.g. "de hond"), and Plural.
- **Example sentence** (Dutch), if present.

Placement: on desktop it's a small popover **anchored under the tapped word**,
clamped to the viewport. On phones it becomes a **bottom sheet** (full-width,
pinned to the bottom, respecting the safe-area inset). A transparent backdrop
closes it; so does `✕`.

Only words that exist in **the day's word index** are tappable/definable; others
render as plain (non-interactive) text. This includes **title words** — the data
pipeline guarantees title-only words are covered (see §7).

### 5.4 Translation popover

Opened by a double-tap anywhere in a sentence. Contents:
- Header label `"Translation"` + close `✕`.
- The **Dutch sentence** (as selected).
- The **English translation** (accent on it). If the day's file has no
  translation for that sentence, show `"No translation available for this article
  yet."`
- Same placement rules as the definition popover (anchored on desktop, bottom
  sheet on mobile). Closing it also clears the sentence highlight.

### 5.5 Break-safe, readable typography (tuned)

The body must read like a real article, so **punctuation never lands in the wrong
place at a line wrap** (a question mark must not start a line; an opening quote
must not be stranded at the end of one). Rendering rule:

- A line may break **only at real spaces between words.**
- Each "chunk" = a word **plus the punctuation glued to it** (e.g. `"Meer`,
  `uitgeven?`, `bereikt",`, `'Niet`, `telt'`). A chunk is an **unbreakable
  unit** — its punctuation can never separate from its word across a line break.
- Within a chunk, the **letter core** of each word is the tappable target; the
  surrounding punctuation rides along inside the same unbreakable unit.
- Titles balance their wrapping; paragraphs use "pretty" wrapping and may hang
  punctuation into the margin where the platform supports it.
- The text renders **verbatim** — every character of the source is preserved.

### 5.6 Sentence segmentation (shared rule)

Both the renderer (to wrap and to translate sentences) and the data pipeline (to
store translations) split text into sentences the **same way**, so a tapped
sentence lines up with its stored translation:

- A sentence boundary is **sentence-ending punctuation** (`.`, `!`, `?`) plus any
  closing quote/bracket, **followed by whitespace**, where the **next** sentence
  starts with a capital letter, an opening quote, or a paren. The split happens
  **after** that whitespace (so an opening quote leads the next sentence).
- This deliberately does **not** split inside numbers like `50.000` (no space
  after the dot).
- A document's sentence order is: **title first, then each body paragraph in
  order.** Translations are stored in exactly this order.

### 5.7 Words from the news feed back into Vocab

The vocab lists carry a special **"News" level** so the learner can drill the
vocabulary they actually encountered in real articles. Crucially this level is
**dynamic and per-reader**, not a fixed file:

- An article counts as **finished** when its reading-progress reaches the end
  (≥99 % scrolled; a short article that fits without scrolling counts the moment
  it's shown). The set of finished article dates is persisted locally (§9).
- The first time a given day is finished, a **toast** confirms: *"Article finished
  — its words were added to the 'News' vocab level."*
- The **News** level (selectable like any other level, per word type) then
  contains the **new** words from the articles **this reader has finished** — the
  union of those articles' words, **excluding any word already taught by a core
  CEFR level** (A0-A2/B1/B2/C1/C2). In practice these are exactly the words the
  pipeline added to `vocab/<type>/news.csv`. A reader who has finished nothing
  sees an empty News level.

The pipeline still maintains `vocab/<type>/news.csv` as the **catalog** of word
data behind news words (§6, §7); the News *level* is just the per-reader subset of
it. Function words and proper names go to a dictionary-only store (not a studyable
level).

---

## 6. Data model

The data is the heart of the repo. Two kinds: **vocabulary CSVs** and
**daily-news files**.

### 6.1 Vocabulary CSVs

- Location: `vocab/<type>/<level>.csv` where `<type>` ∈ {`verb`, `noun`, `adj`,
  `adv`} and there is also a dictionary-only `vocab/other/`.
- **Each file is a "Level."** The level **id** is the filename without `.csv`;
  the **display name** is derived from it: split on `_`, title-case words, but
  uppercase CEFR-ish tokens — `a0-a2_core` → "A0-A2 Core", `b1_core` → "B1 Core",
  `my_words` → "My Words".
- Levels are **discovered dynamically** from whatever files exist (drop in a new
  CSV → new level after reload). They sort CEFR-first
  (`a0-a2, a0, a1, a2, b1, b2, c1, c2`, then anything else; `core` before `full`).
- Headers (first row) per type:
  - **verb:** `infinitive,english,present,simple_past,present_perfect,example`
  - **noun:** `dutch,english,article,plural,example`
  - **adj / adv:** `dutch,english,example`
  - **other** (dictionary only): `dutch,english,pos,example,category`
- Semantics:
  - The **headword** (identity used for progress) is the `infinitive` (verbs) or
    `dutch` (others).
  - `example` is a short Dutch example sentence shown on the answer/result side.
  - A cell may contain `/`-separated **alternatives**, all accepted in typing.
  - Rows with an empty answer cell for a given topic are skipped for that topic.
  - Extra trailing columns are ignored (the news pipeline adds a `category`
    column to `news.csv` files; they still behave like any other level).
- The included lists are study aids (~250 words per level per type across A0–C2),
  generated/curated with an LLM against CEFR/NT2 references — **not** an official
  exam list.

### 6.2 The shared click-to-define dictionary

The News reader's definitions come from a single in-memory dictionary built by
merging **all** vocab CSVs:
- Every `verb`/`noun`/`adj`/`adv` row (across all levels, **including** the daily
  `news.csv`) contributes an entry keyed by its lowercased lemma, carrying its
  english, example, and type-specific forms (article/plural or the three verb
  forms).
- Every `vocab/other/*.csv` row contributes a lightweight entry (function words,
  names) with just english/example and a part of speech.
- **First definition wins**, so a curated core entry takes precedence over a
  later news/other one.

### 6.3 Answer normalization (typing)

Canonicalize both the typed input and each acceptable answer before comparing:
lowercase → strip diacritics → trim → collapse runs of whitespace to one space.
Acceptable answers are the cartesian product over each word's `/`-alternatives,
plus (for present perfect) the variant with the leading auxiliary dropped.

### 6.4 Daily-news file format

One file per day: `daily-news/YYYY-MM-DD.txt`, plain text with three marked
sections. It is intentionally **slim** — definitions are *not* stored per day;
they're looked up from the shared dictionary, so words are stored once and reused
across years of files. Format:

```
Title: <headline>
Date: <YYYY-MM-DD>
Reporter: <reporter / desk>
Source: <original article URL>
Category: <section, e.g. Politiek>

[ARTICLE]
<full article text, paragraphs separated by blank lines>

[TRANSLATIONS]
<english translation of sentence 1>
<english translation of sentence 2>
...

[WORDDATA]
```​json
{ "index": { "<surface form as it appears, lowercased>": "<lemma>", ... } }
```​
```

- `[ARTICLE]`, `[TRANSLATIONS]`, `[WORDDATA]` are fixed section markers.
- **`[TRANSLATIONS]` is English-only** — one line per article sentence, in
  document order (title first, then body). The Dutch is **not** repeated here (it
  already lives in `[ARTICLE]`); the reader re-derives each Dutch sentence by
  splitting the article with the §5.6 rule and lines translations up **by
  index**. This avoids storing the article twice.
- **`[WORDDATA]`** holds only a `surface-form → lemma` **index** (every word as
  it literally appears, lowercased, mapped to its dictionary lemma). The
  definition for that lemma is looked up from the shared dictionary (§6.2). This
  keeps each day's file tiny.
- A word is **tappable iff** its (stripped, lowercased) form is a key in this
  index. Coverage of **title** words is required.

---

## 7. Daily-news generation pipeline

How a day's data is produced (so the data can be reproduced). The reference is a
Python script with three steps; the language work can be done by a scheduled
Claude agent (no API key) or via the Anthropic API.

1. **Fetch.** Download NOS's headline-of-the-day article; parse out title, date,
   reporter, source URL, section/category, and the body (paragraphs). Compute two
   deterministic lists from title+body:
   - the **sentence list** (using the §5.6 split), in document order;
   - the **vocabulary list** — every distinct clickable word (a letter followed
     by letters/apostrophes/hyphens; no digits), lowercased — **including
     title-only words.**
   Write a "job" describing the article + these lists + the instructions/schema.
2. **Language work (model).** Produce:
   - one **dictionary entry per distinct word** — lemma, part of speech, English
     gloss, a short example sentence, and **all surface forms** as they appear
     (so inflected forms map back to the lemma); plus verb forms / noun
     article+plural where applicable. **Every word in the vocabulary list (title
     included) must be covered** — a word with no entry would not be tappable.
   - a **translations array** — one natural English translation per sentence in
     the job's sentence list, **same order, same count** (1:1).
3. **Build.** Persist any **new** words into the vocab lists — verbs/nouns/adj/adv
   into `vocab/<type>/news.csv` (a studyable **"News"** level), function words and
   names into `vocab/other/other.csv` (dictionary-only). Write the slim daily file
   (article + English-only translations + the surface→lemma index). Bump the app's
   patch version so the version advances at least once a day.

**Coverage safety net:** the build re-derives the full title+body word list and
**warns** about any word that won't be clickable (no index entry), so gaps —
especially title-only words — are caught before publishing.

**Cost:** one model run per day (one article in, word data + translations out).
On a Claude subscription's scheduled agent it's included; via API it's ~a few
cents/day.

---

## 8. Visual design system

- **Accent:** Dutch orange (`#e0590b` light, `#f2761c` dark). Used for active
  toggles, primary buttons, links, the news progress bar, and the tap highlight
  on news words.
- **Light theme:** near-white background, white cards, dark ink text, soft gray
  lines, green/red for correct/incorrect.
- **Dark theme:** neutral dark-gray background (`#121212`) and slightly lighter
  gray cards (no blue tint), light ink, the same accent family lightened.
- **Surfaces:** cards have generous rounding (~18 px), a soft drop shadow, and a
  1px hairline border.
- **Controls:** toggles are pill rows; the active pill is filled with the accent.
  Primary buttons are accent-filled; secondary are outlined; the destructive
  reset is red.
- **Cards** (flashcard) are large, centered, with a faint side label, big main
  text, optional example sentence, a state badge, and bottom hint text.
- **Motion:** flashcard drag/flip/fly-off transitions are quick (~0.25 s ease);
  drag tracks the finger with no transition; theme transitions are subtle.
- **Mobile adaptations:** popovers become bottom sheets; tap-highlight flashes
  are suppressed; the layout never scrolls the page; scrollbars are themed/thin.
- **Typography:** a system UI font stack; article text at a comfortable reading
  size and line-height; everything scales with the font-size setting.

---

## 9. State & persistence

All persisted locally (browser `localStorage` in the web build; use the platform
equivalent in a native app). Keys and meaning:

| What | Stored value | Notes |
| --- | --- | --- |
| **Progress** | map of `"{mode}:{type}:{topic}:{headword}" → "known"\|"unknown"` | Per mode+type+topic+word. Cleared only by Reset. |
| **Theme** | `"light"` / `"dark"` | Falls back to OS preference if unset. |
| **Font scale** | number `0.7`–`1.8` | Default `1.0`. |
| **Card position** | `{ signature, headword }` | Resume point; `signature` = `mode:type:topic:filter`. Restored only when the signature matches. |
| **Selected levels** | array of level ids | Default `["a0-a2_core"]`. |
| **Finished news** | array of `YYYY-MM-DD` | Articles read to the end; builds the dynamic News level (§5.7). |
| **Route** | URL hash | `#/news/YYYY-MM-DD` (default landing) or `#/vocab`. |

The **export/import** bundle (§3.6) is a versioned JSON snapshot of exactly three
of these — **Progress**, **Finished news**, and **Selected levels**; import
overwrites all three. Theme, font, and position are device-local and excluded.

Session-only (not persisted): the typing **score** (correct/attempted) and which
deck/card is currently in view (beyond the saved resume point).

Storage is best-effort: if it's unavailable (private mode, quota), the app still
works for the session; progress just won't persist.

---

## 10. Acceptance checklist

A rebuild is faithful if all of these hold:

**Shell**
- [ ] Two tabs (Vocab/News) switchable from a left drawer; Escape/backdrop close
      the drawer.
- [ ] **News is the default landing tab** at the root; it opens the newest article.
- [ ] Tab + open article are in the URL and survive reload / are shareable.
- [ ] Light/dark theme persists and defaults to OS preference; orange accent;
      dark mode is neutral dark gray (`#121212`), not blue/black.
- [ ] Font-size stepper scales card & article text 70–180 %, persisted.
- [ ] Reset asks for confirmation and clears all marks + score.
- [ ] Export downloads a JSON progress snapshot; Import warns before overwriting
      and only applies on confirm; bad files are rejected without data loss.

**Vocab**
- [ ] Multi-select levels (dynamic from data); default A0–A2 Core.
- [ ] Word types verb/noun/adj/adv, each with its topics (§4.4).
- [ ] Flashcard: tap/Space to flip; swipe/←→ to mark known/unknown with fly-off;
      drag tilt + intent tint + 70 px threshold + snap-back; Prev/Next & ↑/↓
      don't change marks; circular deck; on-card hints; mark badge.
- [ ] Typing: reversed prompt where applicable; masked hint (first+last letter);
      accent-insensitive, `/`-alternatives, present-perfect auxiliary optional;
      Don't-know reveals; result shows correct answer + example; Enter/→/↓ advance.
- [ ] Counter shows position/total, known count, and (typing) score.
- [ ] Only-unknown filter; by-order/random; deck doesn't reshuffle mid-drill;
      resume last card when context matches.
- [ ] Progress separated per mode+type+topic, keyed by headword.

**News**
- [ ] One article per day; newest by default; Prev/Next day; reading-progress bar.
- [ ] Single tap → definition popover (lemma, pos, english, forms, example);
      bottom sheet on mobile.
- [ ] Double-tap → sentence selected + translation popover.
- [ ] Long-press/drag → native selection + copy; a tap during a selection does
      not pop a definition.
- [ ] Title words are tappable; only indexed words are interactive.
- [ ] Punctuation stays glued to its word at line wraps; text renders verbatim.
- [ ] Finishing an article toasts the reader and adds its words to a per-reader
      **News** vocab level (empty until something is finished); persisted.

**Data**
- [ ] Vocab CSVs per §6.1; daily files per §6.4 (slim: article + English-only
      translations + surface→lemma index).
- [ ] Definitions come from the merged dictionary; translations align to
      sentences by index.
- [ ] New news words are cataloged in `vocab/<type>/news.csv` and surface in the
      dynamic per-reader "News" level (§5.7); pipeline guarantees title-word
      coverage.
