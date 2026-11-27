# Keyflame 30-kid simulated class: findings and fix plan (2026-11-20)

**What ran:** 1 AI teacher (laptop) + 30 AI kids aged 7-13 (20 iPad, 6 laptop, 4 phone; 2-31 WPM; 15 personality types:
impatient, anxious, English learner, dyslexic, prankster, perfectionist, collector, never used a keyboard, ...).
Real game build on a local fake server. Typing was scripted at each kid's speed and slip rate (3-15%); AI picked what to tap.
Profiles: `roster30.json`. Each kid's own report: `kid-reports/`. Screenshots: `shots/`.

**Headline:** 30/30 joined first try; 0 page errors in ~16,700 keys; most kids hatched an egg.
20/30 failed the first lesson (90% pass mark) at least once; about half never got a class race to start.

## Top issues and proposed fixes (count = kids who hit it)

| # | Issue | Kids | Proposed fix |
|---|---|---|---|
| 1 | Class lobby: after "I'm ready!" the big button reads **Not ready** while the kid's own card says **Ready!** (shots 01, 02) | 26 | Status "✓ You're ready!", button becomes a small "Cancel"; show "2 of 5 ready" |
| 2 | First lesson needs 90%; many kids scored 84-89% repeatedly; "Go slow!" didn't help (shot 05) | 20 | Design call A |
| 3 | Classmates on solo courses show as **Racing** in the lobby, kids wait for them, race never starts | 18 | Label "On a course"; after a solo race, offer "Class race waiting" when others are ready |
| 4 | Races end on a dash boost with 1-17 letters still on screen; kids feel cut off | 17 | Design call B |
| 5 | Slow kids (2-5 WPM) last in every solo race: slowest ghost floor is 4 WPM (`ghostSpeeds`: max(5, form) x 0.8) | 13 | Floor ~2.5 WPM; seed first race from lesson speed |
| 6 | Nest shows "133 keys to hatch" and "Use 100 embers / Need 80 more" side by side (shot 06) | 11 | Keys line under egg bar; embers on its own line "Or use 🔥 100 embers" |
| 7 | "1st of 2 racers" right after a lobby showing 10 kids; class board ranks differ from race result (shot 03) | 10 | "1st of 2 in this race"; board title "Best speeds this week" |
| 8 | Class races run on courses still locked for the kid | 7 | Keep, add "Sneak peek!" tag |
| 9 | Hatch shows a look name ("Striped Coal") then a dragon name ("Valespark") | 7 | "Striped Coal Emberback" vs "Name your dragon: Valespark" |
| 10 | **Duplicate rider names in one class** (Sunny Comet, Lucky Comet, Clever Falcon each twice): only 144 preset names (shot 08) | 5 | On joining a class, assign a name unused in that class |
| 11 | "Daily flight: Done!" after a failed lesson (shot 07) | 5 | Keep counting, say "Done! Practice counts" |
| 12 | Duneskimmer goal text changes "25 WPM" -> "9 WPM" | 3 | Always "5 WPM faster than when you started (now 9)" |

## Design calls (recommendation first)

- **A. First-unit pass mark:** pass the first unit at 85%, keep 90% later; replace "Go slow!" with "88%, so close! 2 more right keys"; after 2 misses offer Relaxed mode.
- **B. Dash-boost early finish:** keep it; on crossing early, fade leftover words and show "💨 Dash boost! You flew past the finish".
- **C. Teacher "Lessons 1/20":** rename "Lessons passed".
- **D. Class race start:** make the teacher's "Start a race for everyone" the main path with a 20 s countdown that pulls in kids in the lobby or on Home; kid-started races stay.

## Teacher findings (shots 09, 10)

| # | Issue | Fix |
|---|---|---|
| T1 | Live board + class board show rider names only; teacher can't tell who is who | On the teacher's device show "Dev (Sunny Comet)" from the local unlocked roster; nothing new to server |
| T2 | ▼ ● ⌨️ 📱 markers have no legend | One-line key under each table |
| T3 | No "needs a hand" list; "Accuracy under 85%" flag sits in the name column | Small "Needs a hand" box; flags in own column |
| T4 | Secret words repeat in a class (POND 2 & 12, BENCH 13 & 15) | Unique words per class |
| T5 | Student list only splits on new lines; a one-line list becomes one student; no count check | Split on commas too; show "30 students" before Make the class |
| T6 | Mistaken class can't be deleted | "Delete this class" behind teacher password |
| T7 | "Last active" cut off ("Toda") | Column width |
| T8 | Escape doesn't close student pop-up | Close on Escape |

## Build order (after review)
1. Class race lobby: 1, 3, 7, D. 2. Lessons and races: A, B, 5, 12. 3. Names and nest: 10, T4, 6, 9, 11. 4. Teacher dashboard: T1-T8, C.

## Known test-tool artifacts (ignore)
Badge-card print preview unreadable to the text reader; "Ava\nBen" student (AI typed backslash-n); keyboard layout switching (fallback to real keys); "Quiet Flyer shown as You" (two race lanes).
