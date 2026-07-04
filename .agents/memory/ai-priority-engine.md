---
name: AI Priority Engine
description: How the AI Priority Engine works — endpoint, modal flow, type locations, and hardening decisions
---

# AI Priority Engine

## What it does
After every new event or case is saved, a full-screen `PriorityModal` slides in automatically. Claude (via `POST /api/priority/assess`) acts as an Operations Director and assigns priority. Users never select priority manually.

## Flow
1. Form submits → item saved with `priority: 'low'` placeholder
2. Parent component sets `screen = 'assess'` and passes saved item data to `PriorityModal`
3. Modal auto-calls API → `analyzing → questions (optional) → assessed`
4. On confirm: `updateEvent(id, { priority, aiAssessment })` or `updateCase(id, { priority, aiAssessment })`
5. Parent navigates forward (events: success screen → /events; cases: direct to /cases/:id)

## Key files
- `artifacts/api-server/src/routes/priority.ts` — `POST /assess` endpoint; 20 req/min rate limiter
- `artifacts/bardoctor/src/components/ai/PriorityModal.tsx` — 3-phase full-screen component
- `artifacts/bardoctor/src/store/events.ts` — `AIAssessment` interface defined here
- `artifacts/bardoctor/src/store/cases.ts` — re-exports `AIAssessment` from events.ts; `Case.aiAssessment?: AIAssessment`

## AIAssessment type
```typescript
interface AIAssessment {
  priority: Priority;
  explanation: string;
  businessImpact: string;
  recommendedAction: string[];
  recommendedDeadline: string;
  analyzedAt: string;
}
```

## Hardening decisions
**Why:** Code review found that Claude occasionally returns partial JSON (missing fields or empty arrays). Both server and client now defensively guard against this.
- Server (`priority.ts`): after parsing JSON, coerces all required assessed fields to safe defaults; if `needsMoreInfo=true` with no questions → falls back to medium priority assessment
- Client (`PriorityModal.tsx`): validates all required fields before entering `assessed` phase; routes to `error` phase on invalid shape

## Screen type pattern
Both `Add.tsx` and `AddCase.tsx` use `type Screen = 'pick' | 'form' | 'assess' | 'success'`. The `assess` screen always comes after form submission and before success/navigation.

**Why:** Saving first (before AI) ensures data is never lost if the AI call fails or the user closes the modal.
