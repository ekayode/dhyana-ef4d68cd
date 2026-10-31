# Dhyana

A daily meditation app, installable from the home screen. (It began as "Seven Pools", which is why the repository and URL keep that name.) Practices: the seven chakras (one pool per weekday, from Aang's seven chakras with Guru Pathik), Yoga Nidra, Kriya (following Isha Kriya), Metta, a Vipassana-style body scan, So Hum and Trataka. Each practice has its own cycle (for example 90 days of Kriya) and tracks the days you've sat.

## Files

- `content/days.json`: the seven chakras (days, breaths, questions, seals).
- `content/daily.json`: the Today tab's quotes and intentions, one per day in a fixed rotation. Add or edit entries freely.
- `content/practices.json` and `content/practices/<id>.json`: every other practice. Each file holds its facts, cycles, the steps for Guided and No guidance, and every spoken line. Steps marked `flex` stretch or shrink when someone picks a different time (5 min to 2 hours); the rest keep their length. A new practice is a new file plus its id in `practices.json` and in `PRACTICES` in `sw.js`.
- `app.js`: screens, session timing, bells, breath tones, voice cues.
- `styles.css`, `index.html`: layout.
- `manifest.webmanifest`, `sw.js`, `icons/`: what makes it installable and work offline. `tools/icon.py` draws the icon (needs Pillow).
- `audio/`: the voice recordings (ElevenLabs, designed voice "Guru Pathik", model Eleven v4), listed in `audio/clips.json`.
- `tools/voice.mjs`: records the spoken lines. Run it with no arguments for help.

## Changing what the voice says

Edit the `say` and `common` lines in `content/days.json`, or the `say` (and `days[].say`) lines in a practice file, then re-record. Only changed lines are re-recorded:

```bash
node tools/voice.mjs record DJEpQQM0TKKRXElYuZUn
```

The full script is about 16,500 characters (chakras about 3,900, the other practices about 12,500). Lines without a recording fall back to the device's own voice.

After changing any file, bump `VERSION` in `sw.js` so phones pick up the update.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://127.0.0.1:8765.

## Install on iPhone

Host the folder on any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages). Open the URL in Safari, tap Share, then Add to Home Screen.

## Moving to native later

`content/days.json` is the source of truth and can be bundled straight into a SwiftUI app. Port these pieces:

- `SEGS` in `app.js`: the six-step template (durations, spoken lines).
- `tick()` / `phaseIdx()`: the pacing loop for breath patterns.
- `bell()` / `tone()`: synthesized sine tones (AVAudioEngine), and `say()` (AVSpeechSynthesizer).

What native adds: audio and timing that keep running with the phone locked (background audio mode).
