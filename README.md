# The Long Road: 1929–1945

An APUSH choice-and-consequence endless runner adapted from the original open-source Endless Runner project by 3akrot.

The player travels chronologically from the 1929 Stock Market Crash through the Great Depression, New Deal reforms and work relief, World War II entry, wartime mobilization, and the end of the war in 1945.

## Play Locally

Open `index.html` directly in a browser, or run a small local server:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls

- Press `Arrow Up` or `Space` to jump.
- Tap the screen on touch devices.
- Use the on-screen buttons for start, choices, ending, and restart.

## APUSH Systems

- Chronological year-by-year 1929-1945 timeline
- Money, Food, and Hope meters, with War Readiness tracked internally for ending nuance
- Historical event boxes that open mini-game cards
- Choice and mini-game cards with tradeoffs and resource consequences
- Narrative milestone popups
- News messenger for the gradual arrival of World War II
- Hardship ending and 1945 completion ending
- Historical Facts Encountered list on the ending screen

## Historical Focus

The game includes 45 trackable APUSH facts, events, policies, and developments, including bank failures, buying on margin, breadlines, Hoovervilles, New Deal programs, farm migration, neutrality debates, Lend-Lease, Pearl Harbor, wartime production, rationing, war bonds, women in industry, Japanese American incarceration, wartime employment, and the end of World War II.

The game intentionally does not imply that the New Deal alone ended the Great Depression. New Deal programs offered relief, reform, and some recovery, while wartime mobilization and federal spending dramatically expanded employment and production.

## Attribution

This project was adapted from:

- Original repository: https://github.com/3akrot/Endless-Runner
- Original concept: a browser-based HTML, CSS, and JavaScript endless runner inspired by the Chrome Dino game

Sprite and background assets remain from the original repository's Craftpix asset folders. The included license files point to:

- https://craftpix.net/file-licenses/

Historical choice-card images are stored in `assets/historical/` and were selected from public historical sources available through Wikimedia Commons, including National Archives and related public-domain or freely licensed classroom-appropriate materials.

The original README described the project as MIT licensed, but the cloned repository did not include a top-level `LICENSE` file. This adaptation preserves the existing attribution and bundled asset license references.
