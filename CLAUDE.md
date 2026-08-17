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
  via GitHub Pages and needs those files physically present in the repo.
- When adding a NEW referenced asset: `git add -f "assets/path/to/file"`
  explicitly (plain `git add .` won't pick it up, by design).
- Two videos referenced by the Case Studies section exceed GitHub's 100MB
  hard limit and are NOT in the repo, so they currently 404 on the deployed
  site: `Lincoln Plumbing 3/VIDEOS/Lincolns plumbing Landing page.mp4`
  (123MB) and `am-client-content/misc/AM EXPORTS/Rosewood Promo Reel 02.mp4`
  (183MB). These need to be compressed to under 100MB (ideally much smaller
  — 10-20MB is plenty for web delivery) before they can be tracked, or
  hosted externally (e.g. a CDN) with the site pointing at that URL instead.
- The hero video (`PLUMBERS.mp4`, 54.6MB) is under the hard limit but over
  GitHub's soft 50MB warning threshold — works fine, just flagged on push.
