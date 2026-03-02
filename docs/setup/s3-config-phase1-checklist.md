# S3 Config Phase 1 Checklist

- [ ] `npm run seed-s3` uploads `draft/*`, `snapshots/<id>/*`, and `published.json`
- [ ] `npm run sync-config` with `S3_BUCKET` set downloads `custom/*` + `docs/content-models.md`
- [ ] `npm run sync-config` with no `S3_BUCKET` and local config present exits 0
- [ ] `npm run sync-config` with no `S3_BUCKET` and no local config exits 1
- [ ] `custom/branding.local.json` remains untouched after sync
- [ ] `npm run push-config` creates a new snapshot and updates `published.json`
- [ ] `npm run build` succeeds after sync
