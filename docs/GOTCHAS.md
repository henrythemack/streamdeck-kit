# Gotchas, in the order they bit

1. **v7 has no NUM_KEYS.** `deck.CONTROLS` is the layout. First hello-world painted zero keys.
2. **One owner.** Elgato app / Companion / your own second script -> the deck "ignores" you.
3. **Last frame sticks.** Not a crash: the deck shows whatever was painted last until overwritten or `resetToLogo()`.
4. **Sleep.** On macOS the Mac idled to sleep ~1 min after display-off and the deck froze mid-animation; `pmset -c sleep 0` fixed it. `caffeinate -s` only downgraded it to a dark wake, still frozen.
5. **Stalled HID write.** Process alive, deck frozen, no errors: a `fillKeyBuffer` never resolved. Race writes with a timeout and reopen.
6. **"Frozen" that was a logic bug.** Input handler for a page sat inside a branch that excluded that page; every press was dropped. Log `down` with page while debugging.
7. **Search-and-replace collisions.** Identical `} else if (page === ...)` lines in the draw function and the input handler; a patch landed in the wrong one and the daemon crashed on `g is not defined` when a key was pressed.
8. **Overflowing labels.** Wide fonts spill off the key; measure and shrink.
9. **Missing glyphs.** The check mark rendered as a box; draw strokes instead.
10. **Bezel animations.** Sprites that moved between keys were drawn where no LCD exists: "the deck is black".
11. **Flashing.** Hard alternation at ~7 Hz across 15 keys was unpleasant; use slow throbs with fade in/out.
12. **Reconnect logic vs. the OFF page.** "Stay on the current page after a USB hiccup" is right except when the page is OFF; a morning plug-in then came back dark. Special-case it.
13. **Hub power.** A cheap USB-C hub without power passthrough made the deck flicker on cold connect; power the hub first.
