# BarDoctor Route and Navigation Matrix

`Origin` means a validated same-venue BarDoctor origin, otherwise the listed parent is used. “Yes” for direct/refresh means the route has a deterministic canonical exit after a cold open or reload. Query-owned screens are listed after the registered routes.

| Route | Type | Canonical parent | UI action | Direct/refresh | Mobile | Desktop |
|---|---|---|---|---|---|---|
| `/`, `/login` | Public/auth | — / `/` | Auth-owned | Yes | Fullscreen | Fullscreen |
| `/register` | Create | `/login` | Back/Cancel | Yes | Fullscreen | Fullscreen |
| `/forgot-password`, `/join` | Edit/wizard | `/login` | Back/Cancel | Yes | Fullscreen | Fullscreen |
| `/terms`, `/privacy` | Document | `/settings` | Back | Yes | Compact | Document |
| `/setup` | Wizard | `/home` | Guarded exit | Yes | Fullscreen | Fullscreen |
| `/home` | Root | — | Global nav | Yes | Bottom nav | Global nav |
| `/shifts` | Root | — | Global nav | Yes | Bottom nav | Global nav |
| `/finance` | Root | — | Global nav | Yes | Bottom nav | Global nav |
| `/employees` | Root | — | Global nav | Yes | Bottom nav | Global nav |
| `/more` | Root | — | Global nav | Yes | Bottom nav | Global nav |
| `/analysis` | List | `/home` | Origin/Back | Yes | Compact Back | Header Back |
| `/smart`, `/add` | Create | `/home` | Close + guard | Yes | Fullscreen action | Header action |
| `/events` | List | `/home` | Origin/Back | Yes | Compact Back | Header Back |
| `/events/:id` | Detail | `/events` | Origin/Back | Yes | Compact Back | Header Back |
| `/tasks` | List/create | `/employees` | Origin/Back | Yes | Compact Back | Header Back |
| `/equipment` | List | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/equipment/catalog` | List | `/equipment` | Origin/Back | Yes | Compact Back | Header Back |
| `/equipment/analytics` | Report | `/equipment` | Origin/Back | Yes | Compact Back | Header Back |
| `/equipment/:id` | Detail | `/equipment` | Origin/Back | Yes | Compact Back | Header Back |
| `/equipment/:id/history/new` | Create | `/equipment/:id` | Back/Cancel + guard | Yes | Compact Back | Header Back |
| `/finance/shift/:id/payroll` | Sub-detail | `/finance` | Origin/Back | Yes | Compact Back | Header Back |
| `/market` | Module | `/home` | Origin/Back | Yes | Compact Back | Header Back |
| `/opportunities` | List | `/home` | Origin/Back | Yes | Compact Back | Header Back |
| `/data-control` | List/detail | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/team-access` | Settings | `/employees` | Origin/Back | Yes | Compact Back | Header Back |
| `/integrations` | List/wizard | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/profile` | Edit | `/settings` | Back + guard | Yes | Compact Back | Header Back |
| `/employees/:id` | Detail | `/employees` | Origin/Back | Yes | Compact Back | Header Back |
| `/employees/:id/edit` | Edit | `/employees/:id` | Back/Cancel + guard | Yes | Compact Back | Header Back |
| `/salaries` | List | `/finance` | Origin/Back | Yes | Compact Back | Header Back |
| `/salaries/:id` | Detail | `/salaries` | Origin/Back | Yes | Compact Back | Header Back |
| `/payroll` | Settings | `/salaries` | Origin/Back | Yes | Compact Back | Header Back |
| `/health` | Report | `/home` | Origin/Back | Yes | Compact Back | Header Back |
| `/reviews` | List | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/cases` | List | `/home` | Origin/Back | Yes | Compact Back | Header Back |
| `/cases/add` | Create | `/cases` | Back/Cancel + guard | Yes | Compact Back | Header Back |
| `/cases/:id` | Detail | `/cases` | Origin/Back | Yes | Compact Back | Header Back |
| `/catalog` | List/detail | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/suppliers` | List/detail/create | `/more` | Origin/Back/Close | Yes | Compact Back | Header Back |
| `/nomenclature` | List/detail | `/warehouse` | Origin/Back | Yes | Compact Back | Header Back |
| `/warehouse` | Module | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/reports` | Report/wizard | `/finance` | Origin/Back | Yes | Compact Back | Header Back |
| `/month-closing` | Redirect | `/reports` | Redirect | Yes | Inherited | Inherited |
| `/finance/settings` | Settings | `/finance` | Origin/Back | Yes | Compact Back | Header Back |
| `/notifications` | List/detail | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/sales-import` | Wizard | `/warehouse` | Back/Cancel + guard | Yes | Owned fullscreen | Owned fullscreen |
| `/supplier-alternatives` | List | `/suppliers` | Origin/Back | Yes | Compact Back | Header Back |
| `/venues/new` | Create | `/more` | Back/Cancel + guard | Yes | Owned fullscreen | Owned fullscreen |
| `/settings` | Settings | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/about` | Document | `/more` | Origin/Back | Yes | Compact Back | Header Back |
| `/reset`, `/design-system` | Redirect | `/home` | Redirect | Yes | Inherited | Inherited |
| `/assortment` | Alias | `/catalog` | Redirect | Yes | Inherited | Inherited |
| `/app.html`, `/decisions` | Compatibility | `/home` | Redirect | Yes | Inherited | Inherited |
| `/admin` | Admin root + sheets | `/home` | Exit/Close | Yes | Drawer/sheet | Side nav/sheet |

## Query-owned and document screens

| Screen | Type | Canonical parent / cleanup | UI action | Shell |
|---|---|---|---|---|
| `/warehouse?inventory=:id` | Fullscreen | same URL without `inventory`/`add` | Back/Close + dirty guard | Owned header; no bottom nav |
| `/api/inventory/counts?id=:id&format=print` | Print | `/warehouse?tab=counts&inventory=:id` | Sticky Back + Print/PDF | Document-owned |
| `/warehouse?product=:key` | Detail sheet | same URL without `product` | Close/browser Back | Shell retained |
| `/catalog?itemId=:id` | Detail | same URL without `itemId` | Origin/Back | Shell retained |
| `/notifications?view=…` | Detail/settings | remove `view`,`category` | Origin/Back | Shell retained |
| `/data-control?event=:id` | Detail | remove `event` | Origin/Back | Shell retained |
| `/integrations?view/flow=…` | Wizard | remove flow/connection keys | Origin/Back | Shell retained |
| `/suppliers?documentId=:id` | Detail/edit | preserve list query or `/finance` return | Origin/Back/Close + guard | Shell retained |
| `/suppliers?supplierId=:id` | Detail | remove `supplierId`,`edit` | Origin/Back | Shell retained |
| `/suppliers?compareKey=:key` | Detail | remove `compareKey` | Origin/Back | Shell retained |
| `/suppliers?create=1` | Create | remove `create`,`returnTo` | Cancel/Back + guard | Shell retained |
| `/finance?closeShift/addExpense/repairEquipmentId` | Create | remove flow key | Cancel/Back + guard | Shell retained |
| `/shifts?closeShift=:id` | Create | remove `closeShift` | Cancel/Back + guard | Shell retained |
| `/tasks?new=1` | Create | remove create fields | Cancel/Back + guard | Shell retained |
| `/reports?closeMonth=1` | Wizard | remove `closeMonth` | Cancel/Back + guard | Shell retained |

State-preservation coverage includes venue, tabs, search, filters, date/month, category, pagination and URL-keyed scroll where those controls exist. Static compatibility and redirect routes are included in the inventory but are not treated as independent interactive destinations.
