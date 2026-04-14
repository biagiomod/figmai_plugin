# Site Videos — Manual Drop-In

Video `.mp4` files for the site are **not tracked in git**. They are
delivered out-of-band (e.g., emailed, copied from an internal share)
and dropped into this directory before building or deploying the site.

Poster `.jpg` files ARE committed alongside this README — they're small
and the site needs them for fallback thumbnails.

## Why

The `.mp4` files are large (combined ~75 MB), regenerate deterministically
from `site/remotion/`, and don't need to live in version control. Keeping
them out of git avoids LFS dependencies in firewalled environments.

## How to install (the only step)

1. Obtain the `.mp4` bundle from an approved internal channel.
2. Copy all `.mp4` files into this directory (`site/public/videos/`).
3. Build the site normally. The files are served as static assets.

Expected filenames (must match exactly):

| File                       | Approx. size |
| -------------------------- | -----------: |
| `accessibility.mp4`        |       2.6 MB |
| `analytics-tagging.mp4`    |       2.6 MB |
| `core-team.mp4`            |        37 MB |
| `design-workshop.mp4`      |       2.6 MB |
| `evergreens.mp4`           |       2.5 MB |
| `general.mp4`              |       2.4 MB |
| `overview.mp4`             |       4.6 MB |
| `strike-team.mp4`          |        20 MB |

Poster images (already in this directory, do not need to be provided):
`accessibility-poster.jpg`, `analytics-tagging-poster.jpg`,
`core-team-poster.jpg`, `design-workshop-poster.jpg`,
`evergreens-poster.jpg`, `general-poster.jpg`,
`overview-poster.jpg`, `strike-team-poster.jpg`.

## Regenerating from source

If you have network access to render them yourself:

```bash
cd site/remotion
npm install
node render.mjs
```

Rendered output lands here automatically.

## Notes

- `.mp4` files are listed in `.gitignore` — git will not track or show them.
- Do **not** commit `.mp4` files. If the gitignore ever lets one through,
  remove it with `git rm --cached site/public/videos/<file>.mp4`.
