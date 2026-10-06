# Task 055 — Ingest Historical Prefaces for The Communist Manifesto (1872–1893)

|                |                                                                |
| -------------- | -------------------------------------------------------------- |
| **Status**     | Open                                                           |
| **Filed**      | 2026-10-06                                                     |
| **Owner**      | Unassigned                                                     |
| **Severity**   | Low (completeness of primary historical documentation)         |
| **Milestone**  | M3 (archive growth & major works)                              |
| **Depends on** | 009, 028–030 (Manifesto chapters), 054 (front matter handling) |
| **Related**    | 048 (Capital prefaces), 044 (1859 Preface)                     |

## Problem

When *The Communist Manifesto* was originally ingested in M1 (tasks 009, 028, 029, 030), only the four core chapters were imported:
- Chapter I: Bourgeois and Proletarians
- Chapter II: Proletarians and Communists
- Chapter III: Socialist and Communist Literature
- Chapter IV: Position of the Communists in Relation to the Various Existing Opposition Parties

However, Marx and Engels authored several famous historical prefaces to subsequent editions that contain crucial theoretical developments (such as their assessment of the 1871 Paris Commune modifying the state theory in the 1872 German edition, the Russian commune in the 1882 Russian edition, and Engels’s comprehensive historical prefaces of 1888 and 1890). Readers expecting the full canonical editions miss this historical front matter.

## Goal

Ingest the historical prefaces to *The Communist Manifesto* into `content/works/marx/1848/communist-manifesto/`:

1. **1872 German Edition Preface** (Marx & Engels)
2. **1882 Russian Edition Preface** (Marx & Engels)
3. **1883 German Edition Preface** (Engels)
4. **1888 English Edition Preface** (Engels)
5. **1890 German Edition Preface** (Engels)
6. **1892 Polish Edition Preface** (Engels)
7. **1893 Italian Edition Preface** (Engels)

## Scope & Implementation Details

### 1. Ingestion via Wayback Machine

- Source URLs from Marxists Internet Archive (`https://www.marxists.org/archive/marx/works/1848/communist-manifesto/preface.htm`, etc.).
- Snapshot html via `plm import --via wayback`.
- Parse into `source.yml` documents using MIA adapter.

### 2. Work Configuration & Front Matter

- Add documents to `content/works/marx/1848/communist-manifesto/work.yml` as front matter documents (e.g. `pref-1872`, `pref-1882`, `pref-1883`, `pref-1888`, `pref-1890`, `pref-1892`, `pref-1893`).
- Ensure `WorkPage.tsx` groups them under "Prefaces" without pushing Chapter I down as the primary entry point.

### 3. Terminology Annotation

- Run `plm annotate` across the ingested prefaces against the established vocabulary set.
- Check rights (all prefaces are in the Public Domain).

### 4. Verification

- `pnpm plm validate`, `pnpm check`, `pnpm e2e`.
