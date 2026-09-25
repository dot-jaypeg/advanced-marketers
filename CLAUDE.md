# Advanced Marketers site — project notes

## Git

- Git management is automated for this project: stage, commit, and push
  changes to `origin/main` without asking for confirmation each time.
- Use clear, conventional commit messages describing what changed and why.
- Still avoid destructive operations (force-push, reset --hard, history
  rewrites) — those require explicit confirmation as usual.

## Assets

- `assets/` is blanket-ignored via `.gitignore` (54GB+ of raw client
  footage/brand kit — nowhere near appropriate for git), but the ~20 specific
  files the live site actually references (fonts, logos, hero video, a
  couple of case-study photos/videos) are force-added individually with
  `git add -f "path"` and ARE tracked and pushed, since this site deploys
  via Railway (watching `main` on `dot-jaypeg/advanced-marketers`, live at
  https://advanced-marketers-production.up.railway.app/) and needs those
  files physically present in the repo.
- When adding a NEW referenced asset: `git add -f "assets/path/to/file"`
  explicitly (plain `git add .` won't pick it up, by design).
- The hero video (`PLUMBERS.mp4`, 54.6MB) is under the hard limit but over
  GitHub's soft 50MB warning threshold — works fine, just flagged on push.
