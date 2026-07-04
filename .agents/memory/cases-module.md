---
name: Cases module architecture
description: Core feature patterns — state management, route ordering, compound mutations
---

## Compound mutation pattern (CasesContext)

Use functional `setCases(prev => ...)` for ALL operations that read-then-write a case (changeStatus, changePriority, addComment, addPhoto, addFile). The `deriveNext(prev, id, produce)` helper encapsulates this.

**Why:** `_get(id)` + `_patch(id, ...)` using a ref snapshot is not atomic. If two updates land before the ref is refreshed by useEffect, the second write overwrites the first (lost timeline entries, comments).

**How to apply:** Any new compound mutation in CasesContext must derive its next state entirely from `prev`, never from a ref snapshot.

## Route ordering (App.tsx)

`/cases/add` must be registered BEFORE `/cases/:id` in wouter Switch, otherwise navigating to `/cases/add` resolves `id='add'` on the detail page.

## Toast variant

All `toast({...})` calls must include `variant: 'success' | 'error' | 'warning' | 'info' | 'default'` — the field is required, TypeScript will catch missing variants.
