# /pitch deck assets

Drop the product visuals here. The deck loads them by filename; if a file is
missing, the slide shows a styled placeholder frame instead (so the build never
breaks). All of these sit behind an "18+ · click to reveal" gate on the slide,
so nothing adult renders until the presenter clicks.

## Files the deck looks for

| Filename                 | Slide            | Notes |
|--------------------------|------------------|-------|
| `screen-1.jpg`           | Product showcase | Main product screenshot. Prefer a UI-forward crop. |
| `screen-2.jpg` (optional)| Product showcase | Second screenshot (e.g. mobile view). |
| `demo.mp4`               | Live demo        | Short, compressed gameplay clip (~15-25s). |
| `demo-poster.jpg`        | Live demo        | Still shown before play (behind the 18+ gate). |

## Make `demo.mp4` + poster from your source clip

The raw `prg.mov` is 205 MB / 60fps — far too heavy for web. Compress it, and
crop/frame it however suits the audience (external vs private-demo variant).
From your Downloads folder:

```bash
# 20s clip, 1280px wide, ~2-3 MB, web-optimised:
ffmpeg -ss 00:00:04 -t 20 -i prg.mov \
  -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset slow \
  -movflags +faststart -an \
  "/Users/admin/Claude Code/Projects/playroom-web/public/pitch/demo.mp4"

# poster frame:
ffmpeg -ss 00:00:06 -i prg.mov -frames:v 1 -vf "scale=1280:-2" \
  "/Users/admin/Claude Code/Projects/playroom-web/public/pitch/demo-poster.jpg"
```

Tip (from your own deck brief): crop tastefully, keep the product UI in frame,
and avoid over-indexing on the dealer. For the external sales variant, use a
tighter/UI-forward crop; keep fuller footage for the private demo variant only.

## Screenshots

Export the crop you want and save as `screen-1.jpg` (and optionally
`screen-2.jpg`). JPG or PNG both work.
