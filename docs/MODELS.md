# Models (from @elgato-stream-deck/core v7 model table)

Supported ids: MINI, ORIGINAL, ORIGINALV2, ORIGINALMK2, ORIGINALMK2SCISSOR, XL, PLUS, PLUS_XL, NEO,
PEDAL, STUDIO, MODULE6/15/32, GALLEON_K100, NETWORK_DOCK.

Don't hardcode layout. Read it:
```js
const keys = deck.CONTROLS.filter(c => c.type === 'button');
console.log(deck.MODEL, keys.length, keys[0].pixelSize, keys.map(k => k.bounds));
```
Typical: Mini = 6 keys (3x2), small square LCDs (~80 px); MK.2 = 15 keys (5x3) at 72x72 with bounds in a
482x276 panel; XL = 32 keys (8x4). The Mini's keys are rotated internally on some revisions; the library
handles orientation, you always draw upright.

Encoders/LCD strip (Plus) appear as `type: 'encoder'` / `'lcd-segment'` controls with their own events
(`rotate`, `lcdSwipe`...). Pedal has no screens: buttons only.
