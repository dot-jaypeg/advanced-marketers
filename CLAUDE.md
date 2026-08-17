# Advanced Marketers site — project notes

## Git

- Git management is automated for this project: stage, commit, and push
  changes to `origin/main` without asking for confirmation each time.
- Use clear, conventional commit messages describing what changed and why.
- Still avoid destructive operations (force-push, reset --hard, history
  rewrites) — those require explicit confirmation as usual.

## Assets

- `assets/` is intentionally excluded from git via `.gitignore`. The brand
  kit + client footage in that folder runs 54GB+, with several files well
  over GitHub's 100MB per-file limit. The site references these files by
  relative path on disk; they are not version-controlled.
- If a genuinely new small asset needs to be tracked (e.g. a favicon), add
  it to git explicitly by path rather than removing the blanket ignore.
