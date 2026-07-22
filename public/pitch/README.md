# /pitch deck assets

Shipped assets for the operator deck. Adult media renders behind an 18+
click-to-reveal gate in the deck.

| File            | Used by                  | Notes |
|-----------------|--------------------------|-------|
| `logo-dark.png` | Cover, close, footer     | Brand wordmark on dark. Now the footer mark on every content slide. |
| `ui-strip.png`  | Cover + close            | Product UI strip, masked bleed at slide bottom. |
| `screen-full.jpg` | Showcase (gated)       | Full table view. Adult content. |
| `ui-betmenu.png` | Showcase side crop      | Crisp bet menu + chip rail (recut from the video frame, 1232x408). |
| `ui-hands.png`  | Showcase side crop       | Crisp live Player/Banker scoreboard with dealt cards (from the video frame, 892x404). |
| `demo.mp4`      | Gameplay slide (gated)   | 1600x786, ~2.4 MB, clean Playroom UI capture WITH audio (AAC). No autoplay; the 18+ tap-to-play gate is a user gesture, so it plays with sound. |

To recut the crops or re-crop the video, the source frame math lives in the
git history for this commit. The video crop was `crop=2920:1334:0:156` then
`scale=1600:-2` from the original 2920x1652 capture.
