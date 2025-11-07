## v2.2.1

- Dashboard: auth token Config panel (sends u0060Authorization: Beareru0060), improved QA budgets trend from history, UI cleanups.
- QA: platform required-files presence checks for Salla/Shopify/Zid added to platform stage.
- Tooling: log cleanup script (u0060npm run logs:cleanu0060), input ZIP extractor (u0060npm run input:extractu0060), convenience stability cycle script.
- Release CI: attach stability summary JSON to release assets.
- Fix: remove UTF-8 BOM from u0060package.jsonu0060 to avoid Jest parse error on Windows.

# Changelog

## v2.2.0

- Phase 8: Multi-platform adapter refactor (SMART_PLATFORMS, AdapterManager)
- Phase 9: Dashboard enhancements (progress bar, toasts, platform toggle, QA summary, downloads)
- Phase 10: QA automation post-build (JSON/HTML reports, visual diffs)
- Unified manifest.json across platforms and added platform field
- Stability tools and ZIP extraction helpers
- CI stabilization (jest config, artifacts upload)


