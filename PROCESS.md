# Process overview

A reading-guide to how the work came together --- a map to your process, not an
essay about it. Markers read this file and follow its citations; they don't
trawl the repo for evidence you didn't point at, so if a moment mattered, cite
it.

This file is the shape; the course site's
[assessment page](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#what-you-submit)
is the requirement, and its
[word counts](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#word-counts)
cover every deliverable.

## What I built

Sky Duel, a classic vertical-scrolling shooter (a "plane battle" in the
1945/Raiden mold): the plane sits at the bottom, enemies descend from the
top, and the plane auto-fires while the player steers by moving the mouse or
the arrow keys. There's no instruction text anywhere — the plane is already
mid-fight the moment the page loads, so moving and dodging is the whole
tutorial. Three lives, a difficulty ramp, a ranged "gunner" enemy alongside
the diving kind, and an occasional spread-shot pickup give it enough depth to
hold up for a few minutes of play.

## The moments that mattered

Three or four for an assignment; fewer is fine for a weekly prototype. Keep the
list short so each moment has room to do all four jobs:

1. **what happened** --- When adding the pause screen, I asked Claude to show
   "paused" while paused. The ideal would have capitalized it, but Claude
   copied my lowercase example verbatim instead of applying its own judgment.
   A small thing, but it made me curious why.
2. **what you did instead of the obvious thing** --- Instead of just telling it
   to capitalize the word, I asked why it had used lowercase. Claude pointed to
   a rule in the top-level `CLAUDE.md` that made it default to literal,
   conservative execution of any unconfirmed instruction. So I rewrote that
   rule to separate genuine scope changes (which still need confirmation) from
   small in-scope judgment calls like wording and capitalization (which don't).
3. **how you knew it was right** --- I probably have no way to know for sure.
   This issue only surfaced because it happened to expose the old
   `CLAUDE.md` rule; a similar gap in the new rule might only turn up by
   accident, later on.
4. **the citation** ---
   [`a5e8bce...b57045a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-BlendSpitfire/compare/a5e8bce...b57045a)
   spans the pause feature that surfaced the issue, the reflection entry, and
   the `CLAUDE.md` rewrite that fixed it.

> 那我想改一下Claude.md，我的初衷是不要未经讨论就做过大的改动，但现在看它似乎干扰到了正常的优化，导致执行非常刻板。

Jobs 2 and 3 are the ones the repo can't tell a reader on its own, so they're
where the marks are. The strongest moments are the ones where a correction
landed in the **harness** --- the standards and checks your work has to satisfy
--- rather than in a retry: a rule added to `CLAUDE.md`, a check wired up, an
attempt thrown away. Retrying until it passes is the routine case, and changing
what the work runs against is the skilled one.

Cite each moment as a link whose text is the commit hash or range and whose
target is this repo's commit or compare URL, so a reader clicks straight to
the evidence (as in the citation above).

To pair a prompt with the commit it produced, quote the prompt (curated, not a
full transcript) next to the citation:

> the prompt, verbatim

Screenshots are welcome where one carries the verification better than a
sentence does. Commit the file to this repo and link it with a **relative**
path, which is what makes it render on GitHub: `![alt text](docs/before.png)`.
Images don't count towards the word count and don't replace the citation.

## Before you ship

`pnpm check:evidence` verifies your citations resolve to real commits, that a
reflection entry the marker reads is in `reflections/`, and that your
`CLAUDE.md` is there --- before a marker ever opens the file. It checks that
your map is traceable, not that it is good: the marker judges whether your
small, deliberately chosen set of moments shows real judgement and reflection. A
green check is not a substitute for that curation.

Images aren't checked: unlike a citation whose SHA doesn't resolve, a broken
image is visible the moment this file is rendered on GitHub.
