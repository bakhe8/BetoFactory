# Beto Factory Dashboard — Guide

## Overview
The dashboard provides a visual control center for parsing, building, validating, and monitoring themes.

- Backend: Express + Socket.IO (http://localhost:5174)
- Frontend: React + Vite + Tailwind (http://localhost:5173)
- Live logs: parser.log and errors.log via WebSocket
- Theme builds: trigger full `factory-build` for a selected folder
- Upload: drag-and-drop ZIP (via Upload control) to /input/

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
- Theme list from /input and smart-input/input
- Build button: triggers full build via API
- Live logs: side-by-side parser and errors logs
- Theme details: canonical theme.json, QA + meta, and platform build trees
- Upload ZIP: posts to /api/upload; extracted into /input/<folder>

## API (summary)
- GET /api/themes — list input folders
- GET /api/theme/:name — canonical + build info
- POST /api/build/:name — start a build
- GET /api/logs/:type — returns parser or errors logs
- POST /api/upload — multipart ZIP upload -> /input
- GET /api/metrics — build metrics (totals and recent)

## Notes
- In dev, Vite proxies /api to the server automatically.
- Socket.IO connects to http://localhost:5174 for live logs.
- Build metrics are stored in logs/factory-metrics.json.

