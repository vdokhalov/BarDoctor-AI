# Editor standard

Status: Stage 1 implemented for Menu and Tech Cards only.

## Standard

- Full-screen mobile editors with explicit persistence use one compact top action bar: Cancel | editor name | Save. The bar respects the top safe area and remains available while the form scrolls or the visual viewport shrinks.
- The title, entity name, version, guidance, statuses, and fields belong to the scroll region. Mobile editors do not reserve space for a bottom action footer.
- Short dialogs may retain compact bottom actions when they remain reachable and do not interfere with input.
- Desktop keeps the established layout. Do not move actions only to mimic the mobile arrangement.
- True autosave exposes saving, saved, and error states. Do not add a synthetic Save button.
- Save draft, Save, Post, Confirm, and similar operations retain their business meaning, authorization, and validation. Secondary operations may move into an overflow menu on mobile.
- Each editor owns its fields, handlers, permissions, and validation. The shared shell supplies only the top bar, scroll region, visual-viewport response, and adaptive action placement.
- Do not use a global form-builder or global modal CSS to enforce this standard.

## Editor inventory and rollout plan

| Editor | Component / source | Form type | Persistence | Current actions | Standard status | Required follow-up |
|---|---|---|---|---|---|---|
| Menu item | bdCatMenuEditor; scripts/fragments/menu-consumption-sot-v418.fragment.txt; patch-editor-standard-v439.mjs | Long full-screen mobile editor | Explicit save | Cancel, Save | Stage 1 compliant | Maintain targeted Menu regression and four consumption-mode coverage |
| Tech Card | bdCatRecipeEditor; production bundle patched by patch-edit-form-actions-v438.mjs and patch-editor-standard-v439.mjs | Long full-screen mobile editor | Explicit save plus draft | Cancel, Save draft, Save/confirm | Stage 1 compliant | Keep Save draft in mobile overflow and preserve its existing handler |
| Nomenclature | bdNomenclatureSheetV237 and bdNomenclatureQuickCreateV336 | Long sheet and nested quick-create | Explicit save | Close/Cancel, Save/Create | Planned | Classify quick-create as a short dialog; migrate the full editor in a later stage |
| Suppliers | bdProcSupplierEditorV168 and bdSupplierEditor | Medium/long sheet | Explicit save | Cancel/Close, Save | Planned | Reuse the shell after supplier-specific search and validation regression |
| Purchases | bdProcSheetV168 and purchase review/detail flows | Long transactional editor | Explicit save and separate posting/payment operations | Cancel, Save, Post/Pay where applicable | Planned | Preserve operation semantics; migrate only the editable draft surface |
| Inventory counts | bdInventoryCountSheet | Long transactional editor | Explicit save/confirm | Close, Save/Confirm | Planned | Keep count confirmation distinct from draft persistence |
| Write-offs | bdWriteoffSheet | Long transactional editor | Explicit save | Close, Save/Confirm | Planned | Preserve movement creation and unsaved-change lifecycle |
| Expenses | Finance expense editor in the production bundle and finance patches | Medium/long editor | Explicit save | Cancel/Close, Save | Planned | Identify the stable named boundary before adopting the shell |
| Internal consumables | bdCatInternalEditor | Medium sheet | Explicit save | Cancel, Save | Planned | Treat as a short dialog unless content growth requires full-screen mobile mode |
| Warehouse product | bdWarehouseProductSheet | Long warehouse item sheet | Explicit save | Close, Save | Planned | Preserve canonical stock units and warehouse reconciliation while adopting the shell |
| Task | bdTaskEditSheet | Medium task editor | Explicit save | Close, Save | Planned | Verify task status transitions and assignee permissions before layout migration |
| Supplier payment | bdProcPaymentEditorV186 | Transactional dialog | Explicit operation | Cancel, Record payment | Planned | Keep payment recording distinct from document save and posting |
| Catalog URL import | bdCatUrlSheet | Short import dialog | Explicit import | Cancel/Close, Import | Review only | Retain compact dialog actions; do not convert import into generic Save |
| Equipment and work orders | bdEquipmentEditorV167; bdEquipmentWorkOrderEditorV167 | Medium/long sheets | Explicit save | Cancel/Close, Save | Planned | Migrate as a separate equipment stage with permission coverage |
| Payroll entries | bdPayrollEntrySheet | Short/medium dialog | Explicit save | Cancel, Save | Review only | Bottom actions remain acceptable if keyboard reachability passes |
| Recurring settings | bdRecurringSettingsEditor | Settings editor | Explicit save | Close, Save | Review only | Keep desktop arrangement and classify mobile length before changing |
| Profile | bdProfileEditorLifecycleV281 and profile route editors | Route/sheet mix | Explicit save | Back/Close, Save | Review only | Do not infer autosave; verify each route separately in a later stage |

## Stage 1 implementation boundary

The shared v439 shell is connected only to Menu and Tech Cards. It does not change API contracts, save handlers, permissions, validation, consumption calculations, historical recipes, sales, inventory movements, venue isolation, database schema, or production data.

## Verification contract

Targeted browser checks cover 390x844, 412x915, and desktop. A reduced visual viewport is keyboard emulation, not proof of a physical iPhone. Physical-device and real on-screen-keyboard coverage must be reported separately when available.
