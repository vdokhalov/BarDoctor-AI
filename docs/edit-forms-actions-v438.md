# Explicit-save form action inventory (v438)

Checked against the production client artifact before the v438 change. “Visible” means the action remains reachable without relying on browser navigation or an unlabeled close icon.

| Flow | Save model | Visible Save | Visible Cancel / Close | Mobile | Desktop | Issue / result |
| --- | --- | --- | --- | --- | --- | --- |
| Menu item — create | Explicit | Yes | Cancel + X | Persistent safe-area footer | Footer in modal | Uses shared v438 action component; existing v435 behavior retained |
| Menu item — edit | Explicit | Yes | Cancel + X + unsaved confirmation | Persistent safe-area footer; visual viewport aware | Footer in modal | Uses shared v438 action component; regression baseline |
| Tech card — create | Explicit (draft or confirm) | Yes | Cancel + X | Persistent safe-area footer; independent form scroll | Footer outside scroll region | Fixed in v438; draft stays a secondary action |
| Tech card — edit | Explicit (draft or confirm) | Yes | Cancel + X + unsaved confirmation | Persistent safe-area footer; visual viewport aware | Footer outside scroll region | **Confirmed defect fixed in v438** |
| Nomenclature — create/edit | Explicit | Yes | Cancel + X | Existing bounded sheet footer | Existing modal footer | No missing-action issue found |
| Supplier — create/edit | Explicit | Yes | Cancel + X | Existing procurement sheet footer | Existing modal footer | No missing-action issue found |
| Purchase / receipt — create/edit/review | Explicit | Save/confirm action | Cancel/back/close | Step/review actions remain in the sheet footer | Sheet actions visible | No missing-action issue found |
| Warehouse stock position | Explicit | Save action | Cancel + X | Existing stock sheet footer | Existing modal footer | No missing-action issue found |
| Inventory count | Explicit (draft / conduct) | Save/conduct action | Close/delete according to status | Existing full-height count sheet actions | Actions visible | No missing-action issue found |
| Writeoff | Explicit (draft / conduct) | Save/conduct action | Cancel + X | Existing writeoff sheet action area | Actions visible | No missing-action issue found |
| Expense — create/edit | Explicit | Save/add action | Cancel/close | Existing finance modal action area | Actions visible | No missing-action issue found |
| Shift close/edit | Explicit, multi-step | Final Save/Close shift | X + Back between steps | Fixed step footer | Fixed step footer | No missing-action issue found |
| Read-only filters, search and disclosure state | Immediate UI state | Not applicable | Back/close where applicable | Immediate feedback | Immediate feedback | No artificial Save added |

## Shared rule

`bdExplicitFormActionsV438` is the common action contract for menu item and tech-card editors. It provides Cancel, primary Save, optional secondary save, loading state, `aria-busy`, one error region, safe-area padding, and a footer outside the independently scrolling form. `bdUseExplicitFormViewportV438` follows `window.visualViewport` so the sheet and footer stay above reduced mobile viewports while the keyboard is open.

The inventory found no other confirmed missing-action defect. Existing explicit flows keep their current visual design and action implementations; autosave-like local disclosure/search state receives no artificial Save button.
