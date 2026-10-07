# /audit fallback for agents without native skills support

Add this block to your project's root `AGENTS.md` (or `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `.github/copilot-instructions.md`, whichever your agent reads). Agents that support the SKILL.md standard will use the skill folder directly and do not need this block.

---

## /audit command

When the user types `/audit` (optionally followed by `fix`, `report`, `quick`, a category `security|ux|seo|a11y|legal`, a directory path, or `--stack=<name>`), or asks for a website/web-app audit, pre-launch review, SEO/accessibility/legal check:

1. Read `.agents/skills/audit/SKILL.md` and follow it exactly.
2. Load only the files in `.agents/skills/audit/references/` that SKILL.md points to for the requested categories.
   In fix mode, build the Site Brief first (`references/site-brief.md`) and follow `references/seo-production-playbook.md`; with `--url=<origin>`, verify using `scripts/seo-verify.mjs`.
3. Without `fix`, the audit is **read-only**: do not modify any file.
4. With `fix`: apply mechanical fixes automatically, but ask once for confirmation before applying user-visible copy, legal pages, cookie consent, rate limiting, dependency changes or anything that changes existing runtime behaviour. Never commit, delete files, rewrite git history, or invent business data (use `[PLACEHOLDERS]`).
5. Report concisely: top priorities first, then a findings table with file:line, severity (Critical/Important/Nice), brief fix and effort.
6. Hold the quality bar defined in SKILL.md ("Quality bar"): production-grade, expert-level findings and fixes, verified, root-cause, no hacks or low-value noise.
   If the skill folder is not found, tell the user where to install it (see below) instead of improvising the checklist.

## Installing the skill (one source of truth)

```
<project>/.agents/skills/audit/        <- real folder (SKILL.md + references/)
<project>/.claude/skills/audit         <- symlink for Claude Code
```

```bash
mkdir -p .claude/skills && ln -s ../../.agents/skills/audit .claude/skills/audit
```

For all your projects at once, install under your user directory instead (for Claude Code: `~/.claude/skills/audit/`; for other agents see their docs for the user-level skills path). Check your agent's documentation for the exact skills folder it scans, as locations differ between tools.