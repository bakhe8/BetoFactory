# v2.3 Optimization Sprint — Release Plan

## Executive Summary
Stabilize performance across build and QA by caching canonicalization, reusing QA browser sessions, and improving metrics/observability. Reduce time variance and Windows-specific friction for reproducible, faster builds.

## Roadmap (P0 → P1)
- P0
  - Core: Canonical caching & unchanged asset short‑circuit
  - QA: Puppeteer reuse + CSS lint toggle (QA_CSSLINT)
  - DevEx: Enforce LF via .gitattributes + BOM guard
- P1
  - Core: Parallel adapter pool with limited concurrency
  - DevOps: CI caches (npm, Puppeteer, QA baselines)
  - DevOps/QA: Stability CSV export + per‑stage timings

## KPIs / Success
- Build time per theme (p50/p95): −40% / −30%
- QA runtime: −40%
- Stability: 10/10 5‑cycle runs pass
- Windows CRLF/BOM errors: 0

## Owners
- Core: canonical/adapter engine
- QA: QA runner, budgets, diffs
- DevOps: CI, metrics
- Frontend: dashboard
- DevEx: Windows tooling

## Validation & Reporting
- Capture before/after metrics in logs/factory-metrics.json
- Update docs/factory-progress.md after each PR
- Weekly summary with deltas, sample:
  - Build time: 47s → 29s (−38%)
  - QA runtime: 91s → 52s (−43%)
  - Stability: 10/10 success
  - CRLF/BOM errors: 0

