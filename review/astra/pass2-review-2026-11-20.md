# Keyflame pass 2 review

Reviewed all 241 screenshots in [the second-pass set](../2026-11-20-pass2), covering five viewport sizes and 21 classroom states. The findings below are based on the supplied captures and relevant source code. Screen paths are relative to that set.

| Finding | Verdict | Screen evidence |
| --- | --- | --- |
| 1. Rewards under the results bar | Fixed | The last reward clears the sticky controls in `09-race-results-home-nest-race-again.jpg` and `27-race-results-faster-than-usual.jpg` on phone and iPad sideways. See the new placement visibility issue below. |
| 2. First lesson and first race | Fixed | `phone/02-lessons-new-rider.jpg` gives **Start F and J** the primary position and makes the typing check secondary. Courses come before the Wing prompt in `ipad-sideways/07-race-map-with-tab-bar.jpg`. |
| 3. Class join | Partly fixed | The camera instructions are above the form in `classroom/2b-phone-join.jpg`. The wrong-word error still lacks a distinct field highlight in `classroom/9-ipad-wrong-word.jpg`. A joined rider can switch through the Home avatar shown in `phone/27b-whos-playing.jpg`. |
| 4. Class race | Partly fixed | `classroom/3-phone-lobby.jpg` gives riders a clear **I'm ready!** action. In `classroom/4-phone-starting-soon.jpg`, the waiting text is clearer, but **Not ready** reads like a status beside two **Ready** badges. Label that action **Cancel ready**. The compact banner puts more of the roster and board in view in `classroom/6-teacher-watching.jpg` and `classroom/8-teacher-board.jpg`. |
| 5. Teacher progress on phone | Fixed | `classroom/8d-teacher-progress-phone.jpg` fits the sort controls on one row and labels accuracy and last-active status. |
| 6. Next action | Fixed | `phone/12-home.jpg` and `phone/28-home-egg-ready-daily-go.jpg` name the daily activity. `phone/13-nest-tab.jpg` says **Race to hatch**. **Hatch!** in `phone/31-word-challenge-results.jpg` leads straight to the egg in `phone/32-hatch-from-results.jpg`, and `phone/33-hatch-tapping.jpg` counts the remaining taps. |
| 7. Teacher start | Fixed | `phone/27g-grown-ups-classroom-start.jpg` puts both class shortcuts immediately below the heading. |
| 8. Privacy summary | Fixed | Both privacy statements are visible in `phone/19-grown-ups.jpg`. `phone/27h-privacy-page.jpg` and `phone/27i-terms-page.jpg` have a back link at the top. |
| 9. Support | Fixed for Support | `phone/27f-grown-ups-support.jpg` leads with the coming-soon notice and code field. Family and Ideas were intentionally left as they were. |

## New findings, ranked

1. **Automatic reward scrolling hides the race placement.** In `phone/09-race-results-home-nest-race-again.jpg` and `phone/27-race-results-faster-than-usual.jpg` (412 × 740), the view settles on the rewards and controls with the placement banner above the viewport. The same happens in screen 27 on iPad sideways (1080 × 810) and laptop (1366 × 768). Keep a compact placement label such as **1st of 4** visible in a sticky summary while the reward list scrolls.
2. **Tricky Keys can finish without practicing an advertised key.** `phone/25-tricky-keys-drill.jpg` (412 × 740) lists K, D and L. In `phone/26-tricky-keys-results.jpg` (412 × 740), D and L have scores and K shows a dash, which the results code uses for zero attempts. The text builder accepts lines that match any focus key. Guarantee an early prompt for every advertised key, and label a zero-attempt result **Not practiced** if the rider still ends without attempting one.

Finding 10 remains a taste call.
