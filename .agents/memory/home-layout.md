---
name: Home phantom-gap pattern
description: Conditional sections inside a flex gap must guard the wrapper element, not just the inner component's return null
---

## Problem

When `ActiveCasesSection` returns null, the wrapping `<motion.div>` still participates in `flex gap-6`, leaving a visible spacing hole equal to one gap unit (~24px).

## Fix

Guard the wrapper element itself:
```tsx
{hasActiveCases && (
  <motion.div ...>
    <ActiveCasesSection ... />
  </motion.div>
)}
```

Compute `hasActiveCases` in the parent `Home()` with `useCases()` + `useMemo`.

**Why:** React renders the motion.div as a real DOM node even when its child is null, so flex gap still fires.

**How to apply:** Any optional/conditional section in the Home flex column must be gated at the wrapper level, not just at the section component's return.
