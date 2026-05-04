# Tirai Project Skills

Skills consumed by [Claude Code](https://docs.claude.com/claude-code) when working in this repo. Each subfolder is one skill with a `SKILL.md`.

## Available skills

| Skill | When it triggers | What it loads |
|---|---|---|
| [`cloak`](./cloak/SKILL.md) | Imports from `@cloak.dev/sdk`, work in `backend/`, mentions of Cloak/shielded pool/viewing key/UTXO/`transact`/`fullWithdraw`/`scanTx` | Cloak SDK surface (verified from docs), Tirai public API contract, wire formats, error mapping, privacy invariants, project structure, code patterns, common tasks cookbook, open questions |

## How to use these skills

### Project-local (recommended for this repo)

Drop into `~/.claude/skills/` so Claude Code picks them up across all projects, or symlink:

```bash
ln -s "$(pwd)/skills/cloak" ~/.claude/skills/tirai-cloak
```

Or copy:

```bash
cp -r skills/cloak ~/.claude/skills/tirai-cloak
```

### Skill format

Each `SKILL.md` is a markdown file with YAML frontmatter:

```yaml
---
name: skill-name
description: When this skill should trigger (concrete keywords + file paths)
---

# Body — instructions, code patterns, references
```

The `description` field is what Claude Code matches against to decide when to load the skill. Be specific about triggers (filenames, imports, terminology) so it doesn't fire spuriously.

## Adding a new skill

1. Create `skills/<name>/SKILL.md`.
2. Write a concrete `description` listing trigger keywords / file paths.
3. Body should be **reference material** Claude can apply, not a tutorial. Favor: tables, code snippets, contracts, patterns to favor / avoid.
4. List the skill in this README's table.
