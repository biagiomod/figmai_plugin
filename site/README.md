# Design AI Toolkit — Landing Site

Standalone React/Vite site for the Design AI Toolkit. Deployable to localhost or AWS S3.

## Prerequisites

- Node 20+
- ffmpeg (for generating FPO video placeholders)
- Font files at `../admin-editor/public/fonts/`

## One-time setup

### Copy fonts

Run from `figmai_plugin/`:
```bash
cp -r admin-editor/public/fonts/Carbon site/public/fonts/Carbon
cp -r admin-editor/public/fonts/Industry site/public/fonts/Industry
cp -r admin-editor/public/fonts/Protipo site/public/fonts/Protipo
```

### Generate FPO video placeholders

Run from `figmai_plugin/site/`:
```bash
for slug in general evergreens accessibility design-workshop analytics-tagging; do
  ffmpeg -f lavfi -i color=c=black:size=1280x720:rate=1 \
    -t 5 -c:v libx264 -pix_fmt yuv420p \
    public/videos/${slug}.mp4 -y
done
```

Replace these with final Remotion-rendered MP4s before launch.

## Local development

```bash
cd site
npm install
npm run dev
# → http://localhost:5173
```

The ACE admin editor runs on a separate port and is not related to this site.

## Tests

```bash
npm run test:run
```

## S3 build

```bash
VITE_BASE_PATH=/design-ai-toolkit/ npm run build
# Output: site/dist/
# Upload dist/ to your S3 bucket or CloudFront prefix
```

Configure a CloudFront/S3 404 rule to redirect all paths to `index.html` for client-side routing.

## Updating assistant data

`src/data/assistants.ts` is the site's internal data file. It mirrors the 5 live assistants from `custom/assistants.manifest.json`.

**Sync rule:** If you change `assistants.manifest.json` in a way that affects a live assistant's name, status, or description, update `src/data/assistants.ts` in the same PR.

## Adding real videos

Replace the FPO placeholders in `public/videos/` with final Remotion-rendered MP4s. Filename must match the `video` field in `src/data/assistants.ts`.
