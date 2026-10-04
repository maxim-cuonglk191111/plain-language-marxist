# Friction Log

- `plm` CLI command `locate()` fails when run against files in external git worktrees because it assumes target document paths are relative descendants of the current repo root.
- The inline gloss detector in `checkRenderings()` flags any term followed by an em-dash (`—`) as an inline definition unless restructured or punctuated with a colon.
