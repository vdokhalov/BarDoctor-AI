---
name: AI Doctor / Anthropic integration
description: Architecture decisions for the AI Doctor feature and Anthropic integration setup
---

## Integration setup

- `setupReplitAIIntegrations({ providerSlug: "anthropic" })` sets AI_INTEGRATIONS_ANTHROPIC_BASE_URL + AI_INTEGRATIONS_ANTHROPIC_API_KEY automatically.
- Template copied from `.local/skills/ai-integrations-anthropic/templates/lib/integrations-anthropic-ai/` → `lib/integrations-anthropic-ai/`.
- Add to api-server package.json + tsconfig references + root tsconfig references.
- Client: `import { anthropic } from "@workspace/integrations-anthropic-ai"`. DO NOT modify client setup.
- Model used: `claude-sonnet-4-6`. Max tokens: 8192. No temperature/top_p (deprecated on Opus 4-7).

## Route: POST /api/ai/diagnosis

- Rate limit: 8 calls / 10 min per IP (in-memory Map, resets on restart — acceptable for single-tenant restaurant app).
- Payload guard: 80KB limit (belt-and-suspenders; express.json global default is ~100KB).
- JSON parse: Claude output is stripped of markdown fences then parsed. Non-JSON returns 422 (not 500).
- Urgency enum normalised server-side to prevent unknown values reaching frontend.
- Prompt is Russian-language; category/status/priority labels translated inline in buildPrompt().

## Frontend (Analysis.tsx)

- State machine: idle → loading → ready | insufficient | error.
- Cache: localStorage key `bd_ai_diagnosis`, TTL 1 hour. Includes { data, generatedAt, cachedAt }.
- **Critical init bug fixed**: screen state initialised from cached data's `insufficientData` field — NOT always 'ready'. Use: `cached.data.insufficientData ? 'insufficient' : 'ready'`.
- fetch URL: `/api/ai/diagnosis` (absolute path, works from /bardoctor/ prefix because Replit proxy routes /api/* to api-server port 8080).
- Data sent to AI: last 30 events (sorted desc by eventDate), active cases only (open/in_progress/waiting), employee stats (totals only, no PII).
- Photos/files/base64 data are NOT included in payload (size).

## Why

**Why:** "AI Doctor" is the heart of BarDoctor — must be grounded in real restaurant data and return structured JSON (not a chatbot). Rate limiting prevents cost amplification; the cache prevents redundant calls within an hour.
