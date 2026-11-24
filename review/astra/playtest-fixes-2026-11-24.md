## Partial verification of PR #95
No gameplay completed. I built main with the local fake Supabase and ran the repository tests. Chromium failed during startup with socket() EPERM and the separate browser could not reach the local preview. No production traffic was used for gameplay.

| Requested fix | Evidence from this run | Still to verify |
|---|---|---|
| Keep me and immediate reload | Save tests passed for synchronous localStorage and save timestamps. | Repeat actual Keep me and reload at 0 and 50 ms with progress, including IndexedDB. |
| 94.8% display | pct floors the percentage to 94. | Render a borderline lesson result. |
| Failed lesson practice | Code creates a drill from missed lesson keys and routes back to that lesson. | Exercise both sides of 85%, including phone layout. |
| Free egg card | Tests passed for lesson progress, race progress and exhaustion of free eggs. | Reach empty nest and use the card on a phone. |
| Named drill keys | Learning test for repeated appearances passed. | Complete the offered drill using touch. |
| Next race course | Solo results search for the next unlocked course after the current one. | Win with a harder course available and follow the primary button. |
| Almost ready | Nest copy checks progress >= 0.75. | Inspect either side of the boundary. |
| Warm button | Button text includes warmth percent and ember cost. | Purchase in the UI and check feedback. |
| Speed medal | Progress UI uses progressShown and appends WPM for speed. | Inspect the display just below a goal. |
| Fake feedback | Posted a test message to the running local fake endpoint. Received 201 and verified the exact message in its in-memory array. | Form-to-endpoint submission remains unplayed. |
| Final ring | Lesson code explicitly refreshes stats on completion. | Observe the final key before the result transition. |

The fake-feedback endpoint is independently verified. The other rows retain their browser acceptance checks.