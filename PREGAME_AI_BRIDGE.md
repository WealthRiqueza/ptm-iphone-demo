# PREGAME AI bridge — experimental, NOT deployed

This branch adds `api/pregame.js`, a server-only OpenAI API research endpoint. It deliberately **does not** claim Setka ingestion, a calibrated PTM probability, or Safari end-to-end readiness.

## Deploy prerequisite
Deploy this repository to a serverless provider supporting `api/*.js` (e.g. Vercel). Configure **server-side** `OPENAI_API_KEY` and `PTM_ACCESS_TOKEN`; optionally `PTM_OPENAI_MODEL`. Never put secrets in GitHub Pages, HTML, URLs or browser localStorage. GitHub Pages cannot execute this endpoint.

## Request
`POST /api/pregame` with `Authorization: Bearer <PTM_ACCESS_TOKEN>`, JSON:
`{"player_a":"NAME A","player_b":"NAME B","observations":"source observations, not yet authenticated"}`.

Returns an AI research summary, always `source_verified:false`, `independent_probability:"SIN VERIFICAR"`, `decision:"DESCARTAR"`, `amount_usd:0`. No scraping or market orders.

## Blocking gates
1. A permitted, authentic Setka per-match source with timestamps and provenance.
2. Independently tested and calibrated probabilities with leakage-free out-of-sample validation.
3. Authenticated browser-to-backend session (do **not** paste a permanent access token into Safari) and deployed iPhone Safari test.
4. Green CI and a reproducible end-to-end match report.

No production switch or Safari test invitation until all gates are evidenced.
