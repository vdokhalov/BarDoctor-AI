# BarDoctor

AI-платформа для владельцев и управляющих ресторанов — мобильное premium SaaS-приложение на React + TypeScript + Tailwind CSS.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend app: `artifacts/bardoctor/src/`
- Pages: `artifacts/bardoctor/src/pages/` (10 pages)
- Layout components: `artifacts/bardoctor/src/components/layout/` (AppShell, BottomNav, PageHeader, SafeArea)
- Shared UI: `artifacts/bardoctor/src/components/shared/` (MetricCard, ListRow, StatusBadge, SectionTitle, EmptyState)
- Design tokens (CSS vars): `artifacts/bardoctor/src/index.css`
- Router: `artifacts/bardoctor/src/App.tsx` (wouter)

## Architecture decisions

- Mobile-first: max-width 430px container, fixed bottom nav 80px, content padded above nav
- No backend wired yet — pure frontend architecture/shell, no API calls
- Routing via wouter; all 10 pages scaffolded as empty shells with realistic Russian placeholder content
- Bottom nav: 5 tabs (Главная, Анализ, FAB Add, Задачи, Профиль); Equipment accessible from Profile
- Design system: indigo accent (#4F46E5), near-black primary (#1A1A2E), SF Pro Display font stack, CSS variables in index.css
- Splash auto-redirects to /home after 2s via framer-motion fade + setTimeout

## Product

BarDoctor — premium command center for restaurant owners. Screens: Splash, Login, Register, Create Restaurant (onboarding), Home (dashboard), Analysis, Add (action menu), Tasks, Equipment, Profile.

## User preferences

- Language: Russian throughout the UI
- Style: Apple / Linear / Notion — Premium SaaS
- Rounded cards (rounded-2xl), soft shadows, large spacing, minimalistic
- No business logic, no charts — architecture/shell only
- No emojis in UI text

## Gotchas

- Do not add charts until user explicitly requests them
- All new pages must use AppShell + PageHeader layout wrappers
- Bottom nav only shows on authenticated pages (/home, /analysis, /add, /tasks, /profile)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
