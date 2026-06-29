#!/usr/bin/env python3
"""Turn NOS's headline of the day into a Dutch study file.

Words are stored once and reused. New vocabulary discovered in an article is
appended to the shared vocab lists, and the daily file keeps only a tiny
surface-form -> lemma index so it stays small even after years of daily files.

  - Known/new vocab words (verb/noun/adj/adv) -> vocab/<type>/news.csv
    (each CSV is a selectable "level", so these become studyable flashcards).
  - Function words / proper nouns (everything else) -> vocab/other/other.csv
    (used for click-to-define in the app, not a flashcard level).
  - daily-news/YYYY-MM-DD.txt -> the article + the index only.

The work splits into three commands so a Claude agent can do the language part
without an API key (see scripts/daily-news-routine.md):

  fetch   Fetch NOS's headline, parse it, write a job JSON (article + the rules
          and schema for the word data).
  build   Read the job + a words JSON, persist new words to the lists, and write
          the slim daily file. Bumps the patch version in package.json.
  auto    fetch + enrich-via-Anthropic-API + build (needs ANTHROPIC_API_KEY).

Self-contained run:  python3 scripts/fetch_daily_news.py auto
Only third-party dep is the Anthropic SDK, and only for `auto`.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import html
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

# --- Layout ------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "vocab"
NEWS_DIR = REPO_ROOT / "daily-news"
WORK_DIR = NEWS_DIR / ".work"  # transient job/words files (git-ignored)
LEXICON_FILE = VOCAB_DIR / "other" / "other.csv"
PACKAGE_JSON = REPO_ROOT / "package.json"

DEFAULT_FEED = "https://feeds.nos.nl/nosnieuwsalgemeen"
DEFAULT_MODEL = "claude-opus-4-8"
USER_AGENT = "Mozilla/5.0 (dutch-learning daily-news bot)"

# Section markers in the generated .txt — keep in sync with src/lib/news.ts.
ARTICLE_MARKER = "[ARTICLE]"
TRANSLATIONS_MARKER = "[TRANSLATIONS]"
WORDDATA_MARKER = "[WORDDATA]"

# New words from a day land in the "news" level of each vocab type.
NEWS_LEVEL = "news"
# Columns per destination (match the existing vocab schema + a category column).
COLUMNS = {
    "verb": ["infinitive", "english", "present", "simple_past", "present_perfect", "example", "category"],
    "noun": ["dutch", "english", "article", "plural", "example", "category"],
    "adj": ["dutch", "english", "example", "category"],
    "adv": ["dutch", "english", "example", "category"],
    "other": ["dutch", "english", "pos", "example", "category"],
}


# --- HTTP --------------------------------------------------------------------


def fetch(url: str) -> tuple[str, str]:
    """GET a URL as text, following redirects (urllib does this by default)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace"), resp.geturl()


# --- NOS parsing -------------------------------------------------------------


def top_article_url(feed_url: str) -> str:
    rss, _ = fetch(feed_url)
    item = re.search(r"<item>(.*?)</item>", rss, re.S)
    if not item:
        raise SystemExit("Could not find any <item> in the RSS feed.")
    link = re.search(r"<link>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</link>", item.group(1), re.S)
    if not link:
        raise SystemExit("Could not find a <link> for the headline article.")
    return link.group(1).strip()


def strip_tags(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def parse_article(article_url: str) -> dict:
    """Pull the article fields out of NOS's embedded __NEXT_DATA__ JSON."""
    page, final_url = fetch(article_url)
    blob = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', page, re.S
    )
    if not blob:
        raise SystemExit("Could not find __NEXT_DATA__ on the NOS page.")
    data = json.loads(blob.group(1))["props"]["pageProps"]["data"]

    paragraphs = [strip_tags(item["text"]) for item in data.get("items", []) if item.get("text")]
    body = "\n\n".join(p for p in paragraphs if p)

    published = data.get("publishedAt", "")
    date = published[:10] if published else dt.date.today().isoformat()

    reporter = "NOS Nieuws"
    bios = data.get("bios") or []
    if bios and isinstance(bios[0], dict) and bios[0].get("name"):
        reporter = bios[0]["name"]

    category = ""
    cats = data.get("categories") or []
    if cats and isinstance(cats[0], dict):
        category = cats[0].get("label") or cats[0].get("name") or ""

    return {
        "title": strip_tags(data.get("title", "")),
        "date": date,
        "reporter": reporter,
        "url": data.get("url") or final_url,
        "category": category,
        "body": body,
    }


# --- Stored vocabulary -------------------------------------------------------


def stored_lemmas() -> set[str]:
    """Every Dutch headword already stored under vocab/ (incl. other/), lowercased."""
    lemmas: set[str] = set()
    for path in VOCAB_DIR.rglob("*.csv"):
        with path.open(encoding="utf-8", newline="") as fh:
            for row in csv.DictReader(fh):
                head = (row.get("infinitive") or row.get("dutch") or "").strip().lower()
                if head:
                    lemmas.add(head)
    return lemmas


def sentence_for(body: str, forms: list[str]) -> str:
    """The first full article sentence that contains one of the surface forms."""
    flat = re.sub(r"\s+", " ", body)
    sentences = re.split(r"(?<=[.!?])\s+(?=[\"“„(A-ZÀ-Þ])", flat)
    lowered = [(s, s.lower()) for s in sentences]
    for form in forms:
        f = form.lower().strip()
        if not f:
            continue
        pat = re.compile(rf"(?<!\w){re.escape(f)}(?!\w)")
        for s, sl in lowered:
            if pat.search(sl):
                return s.strip()
    return ""


def append_rows(path: Path, cols: list[str], rows: list[dict]) -> None:
    if not rows:
        return
    new = not path.exists()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, quoting=csv.QUOTE_ALL)
        if new:
            w.writerow(cols)
        for r in rows:
            w.writerow([r.get(c, "") for c in cols])


def persist_new_words(words: list[dict], article: dict) -> dict:
    """Append words not already stored to the vocab lists / lexicon. Dedup by lemma.

    The example sentence is taken from the producer when present, else derived
    from the article so every stored word gets a full-sentence example.
    """
    known = stored_lemmas()
    category = article.get("category", "")
    buckets: dict[str, list[dict]] = {k: [] for k in COLUMNS}

    for w in words:
        lemma = w["lemma"].strip()
        if not lemma:
            continue
        key = lemma.lower()
        if key in known:
            continue
        known.add(key)  # avoid duplicates within the same article

        pos = w["pos"]
        forms = w.get("surface_forms", []) + [lemma]
        example = (w.get("example") or "").strip() or sentence_for(article["body"], forms)

        if pos == "verb":
            buckets["verb"].append({
                "infinitive": lemma, "english": w["english"], "present": w.get("present", ""),
                "simple_past": w.get("simple_past", ""), "present_perfect": w.get("present_perfect", ""),
                "example": example, "category": category,
            })
        elif pos == "noun":
            buckets["noun"].append({
                "dutch": lemma, "english": w["english"], "article": w.get("article", ""),
                "plural": w.get("plural", ""), "example": example, "category": category,
            })
        elif pos in ("adj", "adv"):
            buckets[pos].append({
                "dutch": lemma, "english": w["english"], "example": example, "category": category,
            })
        else:
            buckets["other"].append({
                "dutch": lemma, "english": w["english"], "pos": "other",
                "example": example, "category": category,
            })

    for pos in ("verb", "noun", "adj", "adv"):
        rows = sorted(buckets[pos], key=lambda r: r.get("infinitive", r.get("dutch", "")).lower())
        append_rows(VOCAB_DIR / pos / f"{NEWS_LEVEL}.csv", COLUMNS[pos], rows)
    other = sorted(buckets["other"], key=lambda r: r["dutch"].lower())
    append_rows(LEXICON_FILE, COLUMNS["other"], other)

    return {k: len(v) for k, v in buckets.items()}


# --- The word-data contract (shared by the API path and the agent) -----------

WORD_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "words": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "lemma": {"type": "string"},
                    "pos": {"type": "string", "enum": ["verb", "noun", "adj", "adv", "other"]},
                    "english": {"type": "string"},
                    "example": {"type": "string"},
                    "surface_forms": {"type": "array", "items": {"type": "string"}},
                    "article": {"type": "string"},
                    "plural": {"type": "string"},
                    "present": {"type": "string"},
                    "simple_past": {"type": "string"},
                    "present_perfect": {"type": "string"},
                },
                "required": [
                    "lemma", "pos", "english", "example", "surface_forms",
                    "article", "plural", "present", "simple_past", "present_perfect",
                ],
            },
        },
        "sentences": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "dutch": {"type": "string"},
                    "english": {"type": "string"},
                },
                "required": ["dutch", "english"],
            },
        },
    },
    "required": ["words", "sentences"],
}

INSTRUCTIONS = """\
You are a Dutch (NT2) language teacher building "click-to-define" data for a \
news article aimed at learners. A learner can tap ANY word in the article and \
see its details, so produce one dictionary entry for every distinct word that \
appears — content words and common function words alike. Skip pure numbers and \
punctuation.

For each entry:
- lemma: the dictionary form (verb -> infinitive, noun -> singular, \
adjective -> base form). Group every inflected form under its lemma.
- pos: one of verb, noun, adj, adv, other (use "other" for function words, \
names, and anything that is not a verb/noun/adjective/adverb).
- english: a concise English gloss that fits how the word is used here.
- example: a SHORT, simple Dutch example sentence — one line, a handful of \
words, ending in punctuation (like a dictionary example such as "Ik koop een \
brood."). Do NOT copy a long sentence from the article.
- surface_forms: every distinct form of this word as it literally appears in \
the article, lowercased (include the lemma if it appears). This is how the app \
maps a tapped word back to your entry, so be exhaustive and exact.
- For verbs: present (the 'ik' form, including any separable prefix, e.g. \
'loop af'), simple_past (singular), present_perfect (with auxiliary, e.g. \
'heb gewerkt'). Leave empty for non-verbs.
- For nouns: article ('de' or 'het') and plural. Leave empty for non-nouns.
- Leave any field that does not apply as an empty string "" (never null).

Also produce "sentences": a full English translation of the article for the \
"double-tap a sentence to translate" feature. Include the title as the first \
entry, then every sentence of the body in order. For each:
- dutch: the sentence exactly as it appears in the article (verbatim, including \
its punctuation), as ONE line with single spaces between words.
- english: a natural, faithful English translation of that whole sentence.
Split on sentence boundaries (. ! ?); keep quoted speech together with the \
sentence it belongs to.

Output JSON shaped as {"words": [ ...entries... ], "sentences": [ ...pairs... ]} \
and nothing else.
"""


# --- Anthropic API path (used only by `auto`) --------------------------------


def enrich_with_claude(article: dict, model: str) -> tuple[list[dict], list[dict]]:
    import anthropic  # imported lazily so the agent flow needs no SDK

    client = anthropic.Anthropic()
    user = (
        f"Article title: {article['title']}\n\n"
        f"Article text:\n{article['body']}\n\n"
        "Produce click-to-define entries for every distinct word, plus a "
        "sentence-by-sentence English translation."
    )
    message = client.messages.create(
        model=model,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        output_config={
            "effort": "high",
            "format": {"type": "json_schema", "name": "word_data", "schema": WORD_SCHEMA},
        },
        system=INSTRUCTIONS,
        messages=[{"role": "user", "content": user}],
    )
    text = "".join(block.text for block in message.content if block.type == "text")
    payload = json.loads(text)
    return payload["words"], payload.get("sentences", [])


# --- Assemble the daily file -------------------------------------------------


def build_index(words: list[dict]) -> dict:
    """Map every surface form (lowercased) to its lemma. Definitions are looked
    up by the app from the vocab lists / lexicon, so the file stays tiny."""
    index: dict[str, str] = {}
    for w in words:
        lemma = w["lemma"].strip()
        if not lemma:
            continue
        forms = {f.strip().lower() for f in w.get("surface_forms", []) if f.strip()}
        forms.add(lemma.lower())
        for form in forms:
            index.setdefault(form, lemma)
    return index


def translation_lines(sentences: list[dict]) -> list[str]:
    """`dutch | english` per line. Whitespace in the Dutch side is collapsed so
    keys match how the app normalises a tapped sentence (see src/lib/news.ts)."""
    zero_width = "[\u200b-\u200d\ufeff]"
    lines: list[str] = []
    for s in sentences:
        nl = re.sub(r"\s+", " ", re.sub(zero_width, "", s.get("dutch") or "")).strip()
        en = re.sub(r"\s+", " ", (s.get("english") or "")).strip()
        if nl and en:
            lines.append(f"{nl} | {en}")
    return lines


def render_file(article: dict, index: dict, sentences: list[dict]) -> str:
    data = json.dumps({"index": index}, ensure_ascii=False, indent=2, sort_keys=True)
    return "\n".join([
        f"Title: {article['title']}",
        f"Date: {article['date']}",
        f"Reporter: {article['reporter']}",
        f"Source: {article['url']}",
        f"Category: {article.get('category', '')}",
        "",
        ARTICLE_MARKER,
        article["body"],
        "",
        TRANSLATIONS_MARKER,
        *translation_lines(sentences),
        "",
        WORDDATA_MARKER,
        "```json",
        data,
        "```",
        "",
    ])


def write_news_file(article: dict, words: list[dict], sentences: list[dict], bump: bool) -> Path:
    summary = persist_new_words(words, article)
    added = sum(summary.values())
    index = build_index(words)
    NEWS_DIR.mkdir(exist_ok=True)
    out_path = NEWS_DIR / f"{article['date']}.txt"
    out_path.write_text(render_file(article, index, sentences), encoding="utf-8")
    bits = ", ".join(f"{k}:{v}" for k, v in summary.items() if v)
    print(f"Wrote {out_path.relative_to(REPO_ROOT)} "
          f"({len(index)} clickable forms; {added} new words stored"
          f"{' — ' + bits if bits else ''})", file=sys.stderr)
    if bump:
        print(f"Bumped version to {bump_patch()}", file=sys.stderr)
    return out_path


# --- Version bump ------------------------------------------------------------


def bump_patch() -> str:
    pkg = json.loads(PACKAGE_JSON.read_text(encoding="utf-8"))
    major, minor, patch = (int(x) for x in pkg["version"].split("."))
    pkg["version"] = f"{major}.{minor}.{patch + 1}"
    PACKAGE_JSON.write_text(json.dumps(pkg, indent=2) + "\n", encoding="utf-8")
    return pkg["version"]


# --- Commands ----------------------------------------------------------------


def job_path(date: str) -> Path:
    return WORK_DIR / f"{date}.job.json"


def words_path(date: str) -> Path:
    return WORK_DIR / f"{date}.words.json"


def resolve_article(args) -> dict:
    url = args.url or top_article_url(args.feed)
    print(f"Article: {url}", file=sys.stderr)
    article = parse_article(url)
    print(f"  title:    {article['title']}", file=sys.stderr)
    print(f"  date:     {article['date']}", file=sys.stderr)
    print(f"  reporter: {article['reporter']}", file=sys.stderr)
    print(f"  category: {article['category']}", file=sys.stderr)
    print(f"  length:   {len(article['body'])} chars", file=sys.stderr)
    return article


def cmd_fetch(args) -> None:
    article = resolve_article(args)
    out = NEWS_DIR / f"{article['date']}.txt"
    if out.exists() and not args.force:
        print(f"NOTHING_TO_DO: {out.relative_to(REPO_ROOT)} already exists "
              f"(use --force to regenerate).", file=sys.stderr)
        return
    if args.dry_run:
        print("\n--- DRY RUN: article body ---\n")
        print(article["body"])
        return
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    job = {**article, "instructions": INSTRUCTIONS, "schema": WORD_SCHEMA}
    jp = job_path(article["date"])
    jp.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"JOB_FILE: {jp.relative_to(REPO_ROOT)}", file=sys.stderr)
    print(f"WORDS_FILE: {words_path(article['date']).relative_to(REPO_ROOT)}", file=sys.stderr)
    print(f"DATE: {article['date']}", file=sys.stderr)


def cmd_build(args) -> None:
    jp = Path(args.job) if args.job else job_path(args.date)
    wp = Path(args.words) if args.words else words_path(args.date or "")
    if not jp.exists():
        raise SystemExit(f"Job file not found: {jp}. Run `fetch` first.")
    if not wp.exists():
        raise SystemExit(f"Words file not found: {wp}. The agent must write it.")
    job = json.loads(jp.read_text(encoding="utf-8"))
    article = {k: job[k] for k in ("title", "date", "reporter", "url", "category", "body")}
    payload = json.loads(wp.read_text(encoding="utf-8"))
    words = payload["words"]
    sentences = payload.get("sentences", [])
    out = NEWS_DIR / f"{article['date']}.txt"
    if out.exists() and not args.force:
        print(f"NOTHING_TO_DO: {out.relative_to(REPO_ROOT)} already exists "
              f"(use --force to regenerate).", file=sys.stderr)
        return
    write_news_file(article, words, sentences, bump=not args.no_version_bump)


def cmd_auto(args) -> None:
    article = resolve_article(args)
    out = NEWS_DIR / f"{article['date']}.txt"
    if out.exists() and not args.force:
        print(f"NOTHING_TO_DO: {out.relative_to(REPO_ROOT)} already exists "
              f"(use --force to regenerate).", file=sys.stderr)
        return
    if args.dry_run:
        print("\n--- DRY RUN: article body ---\n")
        print(article["body"])
        return
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise SystemExit("ANTHROPIC_API_KEY is not set; cannot enrich the article.")
    print("Enriching with Claude...", file=sys.stderr)
    words, sentences = enrich_with_claude(article, args.model)
    write_news_file(article, words, sentences, bump=not args.no_version_bump)


def main() -> None:
    ap = argparse.ArgumentParser(description="Fetch & process NOS's daily headline.")
    sub = ap.add_subparsers(dest="cmd")

    def add_source(p):
        p.add_argument("--url", help="Article URL (default: today's NOS headline).")
        p.add_argument("--feed", default=DEFAULT_FEED, help="RSS feed URL.")
        p.add_argument("--force", action="store_true",
                       help="Regenerate even if today's file already exists.")

    pf = sub.add_parser("fetch", help="Fetch the article and write a job file for the agent.")
    add_source(pf)
    pf.add_argument("--dry-run", action="store_true", help="Print the article only.")

    pb = sub.add_parser("build", help="Persist words + render the slim daily file.")
    pb.add_argument("--date", help="Date (YYYY-MM-DD) of the job/words files.")
    pb.add_argument("--job", help="Explicit job JSON path.")
    pb.add_argument("--words", help="Explicit words JSON path.")
    pb.add_argument("--force", action="store_true", help="Overwrite an existing day's file.")
    pb.add_argument("--no-version-bump", action="store_true")

    pa = sub.add_parser("auto", help="fetch + enrich via the Anthropic API + build.")
    add_source(pa)
    pa.add_argument("--model", default=DEFAULT_MODEL, help="Claude model id.")
    pa.add_argument("--dry-run", action="store_true", help="Print the article only.")
    pa.add_argument("--no-version-bump", action="store_true")

    args = ap.parse_args()
    {"fetch": cmd_fetch, "build": cmd_build, "auto": cmd_auto}.get(args.cmd or "auto")(args)


if __name__ == "__main__":
    main()
