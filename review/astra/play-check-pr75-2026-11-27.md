# PR #75 browser play-check — 2026-11-27

Build tested: branch `claude/project-thread-ols2j9`, commit `944e938`, built locally against the repository fake Supabase. Chromium was used at 390×844 Android-phone emulation, 412×860 phone, 820×1180 iPad, and 1280×800 laptop. All observations below came from browser interaction unless marked source review.

## 1. Wing lobby and results — Works

I created a three-student class, joined three separate browser contexts, toggled ready/cancel, started a two-rider race, and opened the third rider while it was running.

- The ready state displayed “✓ You’re ready!”, “1 of 3 ready,” and “Cancel ready.”
- Cancel returned the rider to the available state.
- The third rider saw both active riders as “In a wing race.”
- The two finishers saw “1st of 2 in this race” and “2nd of 2 in this race.”
- The teacher saw the live race, final places, and both board entries.

The wording and state changes were clear at phone and iPad sizes.

## 2. Lesson thresholds and near-miss hint — Works

At 390×844 I played the typing lessons through the real typing view while injecting controlled mistakes.

- Lesson 1 passed at 86%.
- Lesson 1 failed at 82% and said “82%, so close! 85% passes. Slow and steady.”
- Lesson 2 did not pass at 85% and said “85%, so close! 90% passes. Slow and steady.”
- The short “Practice F and J” drill remained after a miss.

This matches the 85% first-lesson and 90% later-lesson rules.

## 3. Slow-rider rivals — Works

I completed a phone-sized race at about 3 WPM. The rider finished 2nd of 4, beating two computer rivals. The result named the remaining story rival’s approximate speed. This satisfies the requested “can beat at least one” check.

## 4. Daily flight completion — Works

After both a passed lesson and a failed lesson, Home displayed “Practice done! See you tomorrow.” A failed attempt therefore counts for the day as intended.

## 5. Hatch reveal and Duneskimmer goal — Works

I completed the hatch interaction at 390×844. The first reveal showed “Look: Striped Deep Sea.” The naming card followed and introduced “Jadeflare.” The Duneskimmer goal is produced from the stored starting speed and reads “Race at [target] WPM (5 faster than your start)” when that personal target is below the fixed cap. The hatch order was browser-played; the goal wording was verified in the branch source.

## 6. Teacher dashboard — Works

I exercised the dashboard after the live class race at laptop and phone widths.

- “May need a hand” appeared above the table after I made one rider inactive for nine days. Tapping the name opened that rider’s sheet.
- The speed key showed ▲, ▼, and ●.
- The class-board key showed 📱, ⌨️, and 🏆.
- The column read “Lessons passed.”
- “Last active” and “9 days ago” remained readable on the phone layout.

## 7. New-class form — Works

I pasted four names on one line with commas. The live count detected one entry, offered “Split at commas,” then converted the field to four lines and updated the count to “4 students.”

## Verdict

Safe to go live. I found no release blocker or confusing failure in the seven requested changes.

One limitation: this pass used Chromium. The layouts used iPad dimensions and touch input, but I did not run WebKit/Safari in this environment.
