// Prints what the connected deck is: model, keys, pixel sizes, bounds. Paints each key a colour, logs presses for 15 s.
import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node';
const devs = await listStreamDecks(); console.log('decks:', devs);
if (!devs.length) process.exit(1);
const deck = await openStreamDeck(devs[0].path);
const keys = deck.CONTROLS.filter(c => c.type === 'button');
console.log('model:', deck.MODEL, 'firmware:', await deck.getFirmwareVersion(), 'keys:', keys.length, 'pixelSize:', keys[0]?.pixelSize);
for (const k of keys) await deck.fillKeyColor(k.index, (k.index * 40) % 255, 120, 255 - (k.index * 40) % 255);
deck.on('down', k => console.log('down', k.index)); deck.on('up', k => console.log('up', k.index));
console.log('press keys... (15s)'); setTimeout(async () => { await deck.resetToLogo(); await deck.close(); process.exit(0); }, 15000);
