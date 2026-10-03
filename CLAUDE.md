# Plain Language Marxist — repo conventions

These conventions extend `../CLAUDE.md`. Where the two overlap, this file wins.

## Commands

No toolchain yet. Task 002 adds the commands here.

## Ceremony

- **Until task 017 (deploy) is done:** nothing deploys, so direct commits to `main` are fine. Still run the code and review your own diff before committing.
- **After task 017:** a push to `main` deploys. Use feature branches and the full flow from `../CLAUDE.md`.

## Design reference

`docs/architecture/SDD.md` (v1.2) is frozen. If something new comes up:
- content problems (translation, terminology, context) go in explanations or `docs/editorial/`;
- technical problems become a new task in `docs/tasks/`.

Change the SDD only when the design actually fails, and say so in the commit.

## Repo-specific review points

- **Never edit `source.yml` by hand.** Only `plm import` or an approved source update writes it. The original text is immutable (SDD §17, rule 1).
- **Content schemas are persisted shapes.** Any change to a schema bumps `schema_version` and ships with its `plm migrate` step in the same commit.
- **Keep the layers separate.** No commentary or definitions inside Plain English (SDD §8.6). No interpretation inside the original.
- **Copyright.** Never commit copyrighted modern versions of texts (e.g. commercial "plain English" editions), and never use them as fixtures or prompt examples.
- **No attribution trailers** in commits or PRs.
