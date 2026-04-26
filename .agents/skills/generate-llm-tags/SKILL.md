---
name: generate-llm-tags
description: Generate topic tags for Hugo posts and write them to frontmatter when posts are untagged or related-post quality is weak.
---

# Generate LLM Tags

## Overview

Related posts on a Hugo site are computed from two complementary signals
that this skill sets up in tandem:

1. **LLM-generated topic tags** — Claude Sonnet reads each post's
   sanitized prose and emits 5-8 tags at mixed granularity. Captures
   what the post is *about*.
2. **Bidirectional reference graph** — `build_references.py` scans
   post bodies for internal `/blog/<slug>` Markdown links and
   `{{< relref >}}` shortcodes, then writes an auto-generated
   `references:` frontmatter field to each post. Captures what the
   author has *explicitly linked*.

Hugo's built-in `.Related` blends the two via weighted indices
(`references` weight 100, `tags` weight 40, `title` weight 30, threshold
85 on kau.sh). References dominate when present; tags fill in for
posts the author hasn't cross-linked. No custom similarity engine, no
extra data files — just standard frontmatter and Hugo config.

**Why LLM tags:** LLM-generated tags capture the post's actual theme,
not its surface vocabulary — producing a tag corpus that Hugo's
`.Related` can score cleanly.

**Why an explicit reference graph on top of tags:** topical similarity
is fuzzy, but an author-curated `[other post](/blog/other)` link is a
near-deterministic "these are related" signal. Without the references
index, Hugo ranks posts purely on tag/title overlap and can miss
obvious connections the author has already drawn in prose.

**Why no SDK / no `claude -p`:** the skill runs inside a Claude Code
session that already has the Agent tool. Dispatching Sonnet subagents
directly is simpler than any external client — no API key, no subprocess
overhead, no rate-limit plumbing.

## When to Use

- User says "generate tags", "tag my posts", "update tags", "regenerate related"
- New posts have been added without tags and related sections are empty
- Related post quality feels stale or noisy
- Migrating a site from manual tagging to LLM-assisted tagging

## Prerequisites

- Python 3.11+ (for `tomllib`)
- `pyyaml` installed: `pip3 install pyyaml --break-system-packages`
- Helper scripts at `~/dev/oss/kindred/scripts/`:
  - `prep_batches.py` — sanitizes post bodies, splits into batches
  - `write_frontmatter.py` — merges tag results back into frontmatter
  - `build_references.py` — builds the bidirectional reference graph

## Workflow

### Step 1 — Prep batches

```bash
python3 ~/dev/oss/kindred/scripts/prep_batches.py \
    --content-dir <CONTENT_DIR> \
    --output-dir /tmp \
    --batches 6
```

Writes `/tmp/tag-batch-{0..N}.json` plus `/tmp/tag-batch-manifest.json`.
The manifest tells you how many batches were produced (depends on post
count and `--batches`). Read it before Step 2 so you dispatch the right
number of subagents.

### Step 2 — Dispatch one Sonnet subagent per batch

Read the manifest to get the batch list, then dispatch **all subagents
in parallel** (single message with multiple Agent tool calls). Each
subagent uses the model `sonnet` and the prompt template below.

For batch `N` with file `/tmp/tag-batch-N.json`:

- Result file: `/tmp/sonnet-results-N.json`
- Model: `sonnet`
- Prompt: see **Tagging Prompt** section below, substituting the batch
  number

### Step 3 — Merge + preview

```bash
python3 ~/dev/oss/kindred/scripts/write_frontmatter.py \
    --content-dir <CONTENT_DIR> \
    --results '/tmp/sonnet-results-*.json' \
    --preview
```

Show the diff to the user. Ask which mode they want:

- `--mode replace` (default) — replaces existing tags with LLM tags.
  Cleaner result, loses bespoke human-curated connector tags like
  `my-new-programming-font` or `steve-jobs`.
- `--mode merge` — unions LLM tags with existing tags. Preserves human
  wisdom at the cost of possibly verbose tag lists.

**Recommend `--mode replace` for first-time migrations on mostly-tagged
sites. Recommend `--mode merge` when the user values existing bespoke
connector tags.**

### Step 4 — Write

```bash
python3 ~/dev/oss/kindred/scripts/write_frontmatter.py \
    --content-dir <CONTENT_DIR> \
    --results '/tmp/sonnet-results-*.json' \
    --write \
    --mode <replace|merge>
```

### Step 5 — Build the reference graph

After tags are written, populate the bidirectional `references:`
frontmatter field by scanning internal links and relref shortcodes.

```bash
# Preview first — prints graph stats and sample edges, no writes
python3 ~/dev/oss/kindred/scripts/build_references.py \
    --content-dir <CONTENT_DIR> \
    --section <SECTION> \
    --preview

# Apply
python3 ~/dev/oss/kindred/scripts/build_references.py \
    --content-dir <CONTENT_DIR> \
    --section <SECTION> \
    --write
```

`--section` is the URL path segment for internal links. Use `blog` for
kau.sh (the default) and `episodes` for the fragmented podcast site.
Pass `--skip-section <name>` for each top-level content dir that should
not be scanned (e.g. `--skip-section log` on kau.sh; the default already
covers that).

**Expected coverage:** essay-style blog corpora tend to land around
30% linked / 70% isolated (kau.sh: 58/201). Podcast-episode corpora
tend to be much sparser (fragmented: 20/273 ≈ 7%) because episodes
cross-reference each other less often. Sparse coverage is fine — the
references index is an *additive* signal, not a replacement for tag
matching.

**Idempotent:** the script replaces any previous auto-generated
`references:` block (identified by the inline auto-gen comment). Safe
to re-run after new posts are added or links are edited.

### Step 6 — Configure Hugo's related.indices

Ensure the site's Hugo config exposes a `references` index pointing at
the new frontmatter field. On kau.sh (`hugo.yaml`):

```yaml
related:
  includeNewer: true
  threshold: 85
  indices:
    - name: "references"
      weight: 100
    - name: "tags"
      weight: 40
    - name: "title"
      weight: 30
      toLower: true
```

For TOML configs (e.g. fragmented's `hugo.toml`), the equivalent is:

```toml
[related]
includeNewer = true
threshold = 85
[[related.indices]]
name = "references"
weight = 100
[[related.indices]]
name = "tags"
weight = 40
[[related.indices]]
name = "title"
weight = 30
toLower = true
```

### Step 7 — Verify in Hugo

Build the site and spot-check related sections on 3-5 posts spanning
different topics. If quality is good, commit; if not, iterate the prompt
(return to Step 2), switch modes, or revisit the `threshold` value.

If explicit references aren't surfacing despite weight=100, the
threshold may be filtering them out — Hugo blends weighted indices
into a normalized score, so a references-only match can fall below a
high threshold. Try 70 or 75 before revisiting the weights.

## Tagging Prompt

Use this prompt template for each Sonnet subagent, substituting `{N}`
with the batch index:

```
Read /tmp/tag-batch-{N}.json. It contains blog posts with fields: path,
title, body, existing_tags.

For EACH post, generate 5-8 topic tags. Your tags will be used by Hugo's
.Related system to find similar posts across the corpus, so precision
matters — tags on 40%+ of posts are useless; tags used once are useless.

Tag selection strategy:
- SPECIFIC tags are most valuable. Prefer "coroutines", "vim", "font",
  "css" over broad ones like "programming" or "life".
- Only use broad category tags ("programming", "life", "productivity")
  when the post is genuinely ABOUT that topic as a discipline or
  philosophy — not just because the post involves code or is written by
  a developer.
- A how-to on building a font is about "font" and "design", NOT
  "programming" — even though it may involve running commands.
- An opinion piece about AI in consumer phones is about "ai" and
  "android" (the platform), NOT "androiddev" or "testing" or
  "programming".
- AVOID these noise tags unless the post is genuinely about that topic:
  "how-to-x" (only if post primarily teaches), "tip" (only if post IS a
  tip), "design" (only if about visual/UX design), "writing" (only if
  post teaches writing or is about blogging).

Rules:
- Use lowercase, hyphenated tags.
- Tag technologies the post TEACHES, DEMONSTRATES, or DEEPLY ANALYZES —
  not ones merely in its broader ecosystem.
- Generate exactly 5-8 tags per post.
- Keep new tag names short (1-3 words).

For each post, first briefly think through WHAT the post is truly about,
THEN list your tags. Output JSON to /tmp/sonnet-results-{N}.json:

{
  "blog/path.md": {
    "reasoning": "one sentence about what the post is truly about",
    "tags": ["tag1", "tag2", ...]
  },
  ...
}

Process ALL posts in the batch file.
```

## Tag Vocabulary (optional)

If the site already has a tag corpus, extract the top tags and pass them
as a preferred vocabulary. For kau.sh the vocabulary was derived from
existing frontmatter; the LLM still invents new tags when nothing fits.

For a new site without existing tags, skip the vocabulary — the LLM
will generate consistent tags from the corpus naturally.

## Architecture Notes

```
┌────────────────────┐
│ prep_batches.py    │  Read content dir, strip code/noise, write
│                    │  /tmp/tag-batch-*.json + manifest
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ SKILL dispatches N │  One Sonnet subagent per batch, in parallel
│ Agent(model:sonnet)│  Each writes /tmp/sonnet-results-{N}.json
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ write_frontmatter  │  Merge results, rewrite tag: lines in
│     .py            │  frontmatter (preserves comments/ordering)
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ build_references   │  Scan bodies for /<section>/<slug> links and
│     .py            │  relref shortcodes, write bidirectional
│                    │  references: frontmatter (weight-100 index)
└────────────────────┘
```

The LLM-call layer is the skill itself. Scripts handle only the
deterministic work (frontmatter parsing, noise stripping, batching,
link extraction, graph construction) — the parts a model is bad at
and a script is reliable at.

## Cost & Runtime

| Corpus | Sonnet calls | Runtime (parallel) | Cost-via-API |
|--------|--------------|--------------------|--------------|
| 50 posts | 6 subagents | ~1-2 min | ~$0.70 |
| 200 posts | 6 subagents | ~2-4 min | ~$2.50 |
| 500 posts | 10 subagents | ~3-5 min | ~$6 |

When run via the skill (subagent-dispatched) the cost is absorbed by
the host session's subscription.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `SKIP (not found)` during write | Sonnet hallucinated a path | Ignore — rare, only affects that post |
| `SKIP (no frontmatter)` | Post has no `---` or `+++` block | Expected for some link-only posts |
| Tag on >30% of posts | Prompt too permissive, Sonnet overusing a term | Add that tag to the "AVOID unless" list in the prompt |
| Related section empty for a post | Fewer than 2 other posts share ≥1 tag and no inbound references | Normal for very niche posts — references graph will still lift it if another post links to it |
| `references:` field present but posts not surfacing as related | Hugo config missing `references` index, or threshold too high | Add the index to `hugo.yaml`/`hugo.toml` (see Step 6), or lower threshold to 70-75 |
| `build_references.py` reports 0 linked posts | `--section` flag mismatched against site's actual URL section | Check the site's Hugo `permalinks` config — fragmented uses `episodes`, kau.sh uses `blog` |
| Graph sparsely populated despite many relref shortcodes | Slug mismatch — some sites write `slug: /300/` with slashes | Script normalizes these to `300`; verify by running `--preview` and checking the sample output |

## Related

- Hugo `.Related` docs: https://gohugo.io/content-management/related/
