# Playtest fixes recheck (PR #95) — PARTIAL

Reviewed PR #95 diff and current source excerpts. No local browser or fake Supabase execution in this pass. 'Source matches' means implemented in source, not verified in play. Preserve this checklist for the runtime continuation.

| Item | Source status | Remaining runtime check |
|---|---|---|
| 1 Save | Source matches: synchronous localStorage write first, writtenAt arbitration, persistNow on Keep me, pagehide pending flush. | Multiple 0/50ms reloads; same-ms writes; storage blocked; two tabs. |
| 2 Accuracy floor | Source matches: `pct` floors with epsilon; celebration uses it. | 94.8% display vs star threshold; separate #86 review flags underlying accuracy definition. |
| 3 Missed lesson practice | Source matches for missed alphabetic keys; practice primary below .85 and retry primary otherwise. | Fail a lesson, exercise both threshold paths; punctuation/caps (excluded) and key layout; verify return to same lesson. |
| 4 Free egg | Source matches: nearestFreeEgg before shop. | Test empty nest with 0/3 and near-earned options; phone and touch. |
| 5 Tricky keys | NOT FIXED in all paths, source-confirmed gap below. | Exercise sparse-pool random branch with three keys, punctuation and low-frequency letters. |
| 6 Next course | Source matches: find next unlocked course, primary on win, secondary otherwise. | First/second place, fact book + multiple action buttons, short laptop; hatch-ready primary precedence. |
| 7 Almost ready | Source matches: gate >=.75. | At 74/75/100%; no egg/no dragons. |
| 8 Warm button | Source matches: +25% warmth · 100 in PR #95. | 99/100 embers, warm from 90%, label on mobile. |
| 9 Speed medal | Source matches: capped rounded integer and WPM unit. | Just under and exactly at threshold; all achievement tracks. |
| 10 Feedback | Source matches: fake server captures JSON into in-memory list, returns 201. | Submit both bug and idea; inspect payload and network errors. |
| Ring final key | Source matches: `tick()` called at onFinish. | Observe 20/20 before results transition and challenge/practice variants. |

## Concrete new findings
1. **High:** `buildTrickyText` in `src/content/lessons.ts` guarantees ≥3 appearances only in sentence pool branch and only for alphabetic fallback. When `pool.length < 4`, 16 groups are random choices of keys; a valid deterministic RNG returning 0 can choose only first key forever. Test `buildTrickyText(new Set(['f','j']), ['f','j'], () => 0)` and count j. Seed minimum three occurrences of every named typable key before random fillers, shuffle whole groups safely, handle punctuation without introducing untaught keys; test both branches with adversarial RNG. Also test touch typability. Do not label as fully fixed until coverage proves it.
2. **Medium:** same-ms `Date.now` save stamps can tie, and `loadSave` picks IndexedDB on equal timestamps. If two synchronous writes share a timestamp and IDB has older snapshot, newer localStorage could be lost. Prefer monotonic revision/timestamp and explicit tie policy; validate migrated/unversioned saves. Not reproduced on device. Also when localStorage is unavailable, immediate reload cannot guarantee async IDB completed; test blocked-storage behavior, avoid claiming guaranteed persistence.
3. **Medium:** free egg card computes 95%-accurate count from recent `p.races` (bounded at 50); verify it matches actual accuracy milestone criteria exactly and remains meaningful when a slow beginner chooses lessons. Do not mark runtime result yet.
4. **Low:** `missedKeys` filters alphabetic keys only, so lessons specifically teaching punctuation or capitals can have no practice button despite mistakes on taught keys. Product should decide whether those are supported and implement safe drills for typable symbols if so.

## Continuation
Run main against scripts/fake-supabase.mjs or sim server, never production. Use same four personas as #81 and verify each row at actual input sizes. Record evidence (steps, actual outcomes, screenshots), then update this report and mark complete. The separate #86 and #90 reviews contain related adaptive accuracy and rider identity findings; don't duplicate or silently declare them fixed.