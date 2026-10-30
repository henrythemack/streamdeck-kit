# streamdeck-kit

Everything learned driving an Elgato Stream Deck directly from Node (no Elgato software), packaged so
another Claude Code session can go from zero to a working, custom deck in one sitting. Built from a
production deck at a print shop (Stream Deck MK.2, macOS), tested against the library's model list,
which includes the **Stream Deck Mini** this kit is being handed over for.

What's here:

| Path | What |
|---|---|
| `.claude/skills/streamdeck/SKILL.md` | A Claude Code skill: the API facts, the patterns that worked, the traps. Copy the folder into your project's `.claude/skills/` (or `~/.claude/skills/`) and Claude uses it automatically. |
| `starter/` | A runnable config-driven deck daemon: pages, text keys, hold-to-confirm, shell actions (print commands), reconnect, brightness. `npm install && npm start`. |
| `docs/GOTCHAS.md` | The hard-won list: things that looked like bugs and weren't, and the real bugs. |
| `docs/WINDOWS.md` | Windows notes: drivers (none needed), Elgato app conflict, run at login. |
| `docs/MODELS.md` | Key counts, pixel sizes, layout facts per model, how to read them from the library. |

## Fastest path for the new machines

1. Install Node 22 or newer. Plug the Mini in. Quit the Elgato Stream Deck app if it's installed (it holds the device).
2. `git clone https://github.com/henrythemack/streamdeck-kit && cd streamdeck-kit/starter && npm install && npm start`
   The deck lights up with the example page from `config.example.json`.
3. Open the folder in Claude Code and say what you want each key to do (e.g. "key 1 prints the Zebra test
   page, key 2 pauses the Epson queue"). The skill tells Claude how to wire it.

## Core facts in one breath

Library `@elgato-stream-deck/node` (v7). `listStreamDecks()` then `openStreamDeck(path)`. There is **no
`NUM_KEYS`** in v7: the layout is `deck.CONTROLS` (type `button`, with `index`, `row`, `column`,
`pixelSize`, `bounds`). Draw with a canvas (`@napi-rs/canvas`), push with
`fillKeyBuffer(index, rgba, { format: 'rgba' })`. Events: `deck.on('down'|'up', k => k.index)`. One
process owns the device at a time. The deck keeps its last image until you overwrite it or
`resetToLogo()`.
