Retested local main 8e8be05 with Chromium and the fake database. All 324 repository tests passed. Browser evidence and code checks below.

1. Fixed in the original reproduction. On six fresh phone-sized contexts I used the final Keep me button and reloaded in the same JS turn three times, then at 50 ms three times. All six reloaded with the chosen named rider active.
2. Fixed by inspection: pct floors with a floating-point epsilon, including 94.8 → 94.
3. Fixed in a 390×844 run. Missed F/J repeatedly, finished at 61%, tapped Practice F and J, completed the drill and got the F and J return action. Below 85% practice occupies the primary slot. At 85–89% Try again takes it in the code. A ready hatch can intentionally take priority over either.
4. Fixed in the free-egg selector tests for partial lessons, races nearer than lessons and exhausted rewards. The responsive flow suite also passed the new-egg path. The exact empty-state card at 150% text was not exercised.
5. Fixed in the drill played: both F and J appeared well over three times.
6. Fixed in results action selection by inspection. First place with a newly opened course promotes it; other places retain Race again. The end-to-end suite finished actual races at all three viewports.
7–8. Fixed by inspection in nest.ts: the first-egg message switches at 75%, and the warmth purchase includes the percentage and price.
9. Fixed by inspection in achievementsPage.ts: the incomplete speed medal caps the rounded value below the target and adds WPM.
10. Fixed in a direct local POST: 201, with the submitted JSON present in the fake server’s feedback array.
11. Final ring refresh is present in the lesson finish handler. The UI test completes the lesson; it did not assert the final painted ring before the result overlay.

The browser suite passed 33 flows across 820×1180, 1180×820 and 390×844, including lesson and race results, hatching, naming and egg stacking.