---
name: streamdeck
description: Drive an Elgato Stream Deck (Mini, MK.2, XL, Plus, Neo) directly from Node with @elgato-stream-deck/node — key images, presses, holds, pages, printer/shell actions, run-at-login. Use whenever the user wants to program a Stream Deck, make keys trigger commands, draw on keys, or debug a deck that is dark, frozen, or ignoring presses.
---

# Stream Deck from Node

Read this before touching a Stream Deck. It is distilled from a production deck (MK.2, macOS, ~6 weeks
of daily use) plus the library's own model table. The starter project in `starter/` already does the
plumbing below; extend it rather than starting over.

## Setup
- Node 22+. `npm i @elgato-stream-deck/node @napi-rs/canvas`. No driver on macOS or Windows (HID).
- **Quit the Elgato Stream Deck app** (and any Companion/Bitfocus) first. Exactly one process may hold the device; a second open fails or both misbehave.
- On macOS the first run may ask for Input Monitoring; grant it to the terminal/Node.

## API that is actually there (v7.x)
```js
import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node';
const [info] = await listStreamDecks();          // { path, model, serialNumber }
const deck = await openStreamDeck(info.path);
const keys = deck.CONTROLS.filter(c => c.type === 'button');   // NOT deck.NUM_KEYS (undefined in v7)
// each key: { index, row, column, pixelSize: {width,height}, bounds: {x,y,width,height} }
await deck.setBrightness(80);
deck.on('down', k => console.log('down', k.index));
deck.on('up',   k => console.log('up', k.index));
deck.on('error', e => { /* device vanished: close and reopen */ });
await deck.fillKeyBuffer(index, rgbaBuffer, { format: 'rgba' });   // rgba = width*height*4 bytes
await deck.fillKeyColor(index, 255, 0, 0);
await deck.clearPanel(); await deck.resetToLogo(); await deck.close();
```
- `bounds` lets you render ONE canvas for the whole panel and slice it per key, so art can run across keys (gaps = bezels). For per-key content just render each key's `pixelSize`.
- `getFirmwareVersion()` is a cheap liveness probe (~1 ms when healthy).
- Mini keys are small (see MODELS.md); keep labels to one or two short words, 10-14 px text, high contrast.

## Patterns that worked
- **Render loop, not event-driven redraws.** Loop: draw frame -> `Promise.all(fillKeyBuffer per key)` -> sleep. 250 ms idle, 30 ms while animating. Simple and robust.
- **Reconnect loop.** Wrap open in `ensureDeck()`; on `error` or a failed write, `close()`, null the handle, retry every 2 s. The user unplugs and replugs daily.
- **Write guard.** Race each `fillKeyBuffer` with a 2.5 s timeout; on timeout drop the device and reopen. A stalled USB write otherwise hangs the loop silently and the deck looks frozen while the process is alive.
- **Hold-to-confirm for anything destructive.** On `down` record `{key, start}`; while held draw a progress ring; `armed` after ~900 ms; on `up` run only if armed, otherwise flash "HOLD TO ...". Taps on a dangerous key should never act.
- **Pages.** `page` state + a table of keys per page. Rule from the owner: a page opened from a key puts its X/back on that same key.
- **Jobs.** Long actions set `job = {key, label, state}`; the key shows a spinner/progress, ignores presses while running, then DONE/FAILED for a few seconds.
- **Status rings.** Poll the thing you control (printer queue, app running) every 1-2 s and draw a ring/dot. `lpstat -o` (macOS/Linux), `Get-PrintJob` (Windows PowerShell).
- **Run at login.** macOS: LaunchAgent plist with `KeepAlive`. Windows: Task Scheduler "At log on" running `node daemon.mjs`, or a shortcut in `shell:startup` (see WINDOWS.md).
- Keep the deck's last frame in mind: on exit either `resetToLogo()` or paint a "disconnected" page, or the stale UI stays lit.

## Traps (each cost real time)
- `deck.NUM_KEYS` / `KEY_COLUMNS` are undefined in v7 -> loops draw nothing. Use `CONTROLS`.
- Text wider than the key just runs off it. Measure (`ctx.measureText`) and shrink/wrap. Display/outline fonts are unreadable under ~10 px on a key.
- A frozen-looking deck with a live process: a key write stalled, or your input handler for that page never matched (page-name typo / branch inside the wrong `if`). Log every `down` with the page name while debugging.
- Drawing code pasted into the input handler by a bad search-and-replace: both had `} else if (page === 'x')` lines. Search before replacing.
- Animations that live between keys (bezels) are invisible. Riders/sprites must spawn and move on key faces.
- Fast flashing on 6-15 bright LCDs is physically unpleasant; use slow sine throbs, fade in/out, never hard alternation.
- Some fonts have no glyph for "checkmark"-type characters; draw marks as strokes.
- macOS: display sleep + system sleep stalls USB; `pmset -c sleep 0` (or caffeinate -s) if the deck must animate while the screen is off.
- Don't poll heavy things every frame. Spawning `ps`/`lpstat`/PowerShell per frame will stutter the deck; poll on a timer.

## Printer control recipes
- macOS/Linux (CUPS): `lp -d <printer> file.pdf`, `lpstat -p -o`, `cancel -a <printer>`, `cupsenable|cupsdisable <printer>`.
- Windows: `Start-Process -FilePath file.pdf -Verb Print`, `Get-Printer`, `Get-PrintJob -PrinterName X`, `Remove-PrintJob`, `Suspend-PrintJob`, `Resume-PrintJob`; raw label printers (Zebra/EPL/ZPL): copy the raw file to the shared printer `copy /b label.zpl \\localhost\Zebra`.
- Render a page to PDF for printing with Playwright (`page.pdf`) or just print HTML/PNG.
