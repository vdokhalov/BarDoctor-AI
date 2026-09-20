# BarDoctor repository instructions

- Follow the [editor standard](docs/editor-standard.md) when creating or changing an editor.
- Classify persistence first: explicit save, true autosave, or a distinct operation such as Save draft, Post, or Confirm. Preserve each operation's handler, permissions, and validation.
- Stage 1 applies the shared mobile editor shell only to Menu and Tech Cards. Do not migrate another editor without an explicitly approved stage.
- Keep business logic, venue isolation, API contracts, database schema, secrets, and production data outside presentation-only editor work.
