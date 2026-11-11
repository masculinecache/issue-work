# issue-work

GitHub issue triage + automation for agents. AXI-compliant TOON output, confidence-gated implementation.

## Install

```bash
npm install -g issue-work
```

Or via mise:

```toml
"npm:issue-work" = "0.1.0"
```

## Usage

```
issue-work [command] [args] [flags]
commands[4]:
  (none)=triage+implement, triage <number>, list, comment <number>
flags[4]:
  -R/--repo <OWNER/NAME>, --dry-run, --confidence-threshold <N> (default 95), --help, -v/--version
```

### Examples

```bash
# Triage + implement if confidence >= 95
issue-work 42

# Triage only (never implements)
issue-work triage 42

# Dry-run — show plan without mutating anything
issue-work triage 42 --dry-run

# List open issues with classification + confidence
issue-work list --repo owner/name

# List untriaged issues (no labels)
issue-work list --repo owner/name --untriaged

# Custom confidence threshold
issue-work 42 --confidence-threshold 80

# Post a comment
issue-work comment 42 --body "investigating"
```

## How it works

1. **Triage**: classifies the issue (bug/feat/chore/docs/question), estimates confidence (0–100), scope (S/M/L/XL), and suggests labels.
2. **Decision**: if confidence >= threshold (default 95), outputs implementation plan (branch name, steps). If below, outputs triage-only with blockers.
3. **Comment**: posts a structured triage comment on the issue (unless `--dry-run`).
4. **Implementation**: the CLI itself does not write code — it signals the calling agent (via stdout) that implementation is warranted. The agent follows the `issue-automation` skill for the actual implementation flow.

## Confidence estimation

The CLI estimates confidence from issue content using heuristic signals:

| Signal | Contribution |
|---|---|
| Clear reproduction steps | +20 |
| Expected/actual behavior | +10 |
| Acceptance criteria | +15 |
| Single-file fix indicated | +15 |
| Existing test pattern mentioned | +10 |
| Breaking change implied | -20 |
| Security-sensitive area | -25 |
| Ambiguous language | -15 |
| Multi-file change needed | -20 |
| External API dependency | -15 |
| Short/unclear description | -10 |

Base score: 50. Adjusted by signals. Clamped to 0–100.

## Dependencies

- `gh-axi` — all GitHub API access goes through gh-axi (never raw `gh`)
- Node.js >= 18

## License

MIT
