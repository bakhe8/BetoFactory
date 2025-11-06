# Beto Factory Dashboard — Guide

## Overview
The dashboard provides a visual control center for parsing, building, validating, and monitoring themes.

- Backend: Express + Socket.IO (http://localhost:5174)
- Frontend: React + Vite + Tailwind (http://localhost:5173)
- Live logs: parser.log and errors.log via WebSocket; build logs streamed as events
- Theme builds: trigger full `factory-build` for a selected folder
- Upload: upload ZIP to Input (server extracts to smart-input/input/<name>)

## Installation

```
npm install
```

## Start Dashboard

```
# Run server and Vite together
npm run dashboard

# Or run separately
npm run server
npm run dashboard:dev
```

Then open http://localhost:5173.

## Features
- Theme list from smart-input/input and input
- Build button: triggers full build via API (select platforms)
- Live logs: side-by-side parser and errors logs
- Theme details: canonical theme.json (download), QA summary + report, and per‑platform build trees with ZIP/manifest links
- Upload ZIP: posts to /api/upload; extracted into /input/<folder>

## API (summary)
- GET /api/themes — list input folders
- GET /api/theme/:name — canonical + build info
- POST /api/build/:name — start a build (JSON body: { "platforms": "salla,zid,shopify" })
- GET /api/logs/:type — returns parser or errors logs
- POST /api/upload-input — multipart ZIP upload -> smart-input/input/<name>
- GET /api/metrics — build metrics (totals and recent)

## Notes
- In dev, Vite proxies /api to the server automatically.
- Socket.IO connects to http://localhost:5174 for live logs.
- Build metrics are stored in logs/factory-metrics.json.


### Auth Token (optional)
Set localStorage.factoryToken in the browser; dashboard includes it as Authorization: Bearer for protected endpoints.

### Promote Baseline
Use the Promote baseline button in QA Summary or call POST /api/qa/promote/:name to set current screenshots as visual baselines.

