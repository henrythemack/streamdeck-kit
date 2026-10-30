// Config-driven Stream Deck daemon. Edit config.json (copy config.example.json). Works for any model:
// layout comes from deck.CONTROLS. Keys: { label, color?, hold?, action: 'shell'|'page'|'status', cmd, windowsCmd?, page?, every? }
//  - shell: runs cmd (windowsCmd on Windows). hold:true = hold ~0.9s with a progress ring, release to run. Shows spinner, DONE/FAILED.
//  - page: switches page. Rule: the key that opened a page is where its BACK lives.
//  - status: runs cmd every `every` ms and shows its trimmed stdout on the key (e.g. a job count).
import { listStreamDecks, openStreamDeck } from '@elgato-stream-deck/node';
import { createCanvas } from '@napi-rs/canvas';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = fs.existsSync(path.join(here, 'config.json')) ? path.join(here, 'config.json') : path.join(here, 'config.example.json');
const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const IS_WIN = process.platform === 'win32';
const log = (...a) => console.log(new Date().toISOString(), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOLD_MS = 900, WRITE_TIMEOUT_MS = 2500;

let deck = null, keys = [], page = config.startPage || Object.keys(config.pages)[0];
let hold = null;                 // { key, start, armed }
const jobs = new Map();          // key -> { label, state: 'running'|'done'|'failed', since }
const flash = new Map();         // key -> { label, until }
const status = new Map();        // key -> last stdout
const keyDef = i => (config.pages[page]?.keys || {})[String(i)];

// ---------- device ----------
async function ensureDeck() {
  if (deck) return deck;
  const devs = await listStreamDecks().catch(() => []);
  if (!devs.length) return null;
  const d = await openStreamDeck(devs[0].path);
  keys = d.CONTROLS.filter(c => c.type === 'button');
  d.on('error', e => { log('deck error:', e?.message); drop(); });
  d.on('down', k => onDown(k.index));
  d.on('up', k => onUp(k.index));
  await d.setBrightness(config.brightness ?? 80).catch(() => {});
  deck = d; log(`connected: ${d.MODEL} with ${keys.length} keys, ${keys[0].pixelSize.width}x${keys[0].pixelSize.height}px`);
  return deck;
}
function drop() { try { deck?.close(); } catch {} deck = null; }

// ---------- input ----------
function onDown(i) {
  const k = keyDef(i); if (!k || jobs.get(i)?.state === 'running') return;
  if (k.hold) hold = { key: i, start: Date.now(), armed: false };
  else act(i, k);
}
function onUp(i) {
  if (!hold || hold.key !== i) return;
  const armed = hold.armed; hold = null;
  if (armed) act(i, keyDef(i)); else flash.set(i, { label: 'HOLD TO RUN', until: Date.now() + 1500 });
}
function act(i, k) {
  if (k.action === 'page' && config.pages[k.page]) { page = k.page; hold = null; log('page:', page); return; }
  if (k.action === 'shell') runShell(i, k);
}
function runShell(i, k) {
  const cmd = IS_WIN && k.windowsCmd ? k.windowsCmd : k.cmd; if (!cmd) return;
  jobs.set(i, { label: 'RUNNING', state: 'running', since: Date.now() }); log('run:', cmd);
  execFile(IS_WIN ? 'cmd.exe' : '/bin/sh', IS_WIN ? ['/d', '/s', '/c', cmd] : ['-c', cmd], { timeout: 120000, windowsHide: true }, (err, out, serr) => {
    log(err ? `FAILED: ${(serr || err.message).trim().slice(0, 200)}` : `ok: ${(out || '').trim().slice(0, 120)}`);
    jobs.set(i, { label: err ? 'FAILED' : 'DONE', state: err ? 'failed' : 'done', since: Date.now() });
    setTimeout(() => jobs.delete(i), 3000);
  });
}
// status keys: poll on their own timers
for (const [pg, def] of Object.entries(config.pages)) for (const [i, k] of Object.entries(def.keys || {})) if (k.action === 'status') {
  const cmd = IS_WIN && k.windowsCmd ? k.windowsCmd : k.cmd;
  const poll = () => { if (page !== pg) return; execFile(IS_WIN ? 'cmd.exe' : '/bin/sh', IS_WIN ? ['/d', '/s', '/c', cmd] : ['-c', cmd], { timeout: 10000, windowsHide: true }, (err, out) => status.set(`${pg}:${i}`, err ? '?' : (out || '').trim().slice(0, 12))); };
  setInterval(poll, k.every || 3000); poll();
}

// ---------- drawing ----------
function text(g, w, h, label, { size = 14, color = '#fff', dy = 0 } = {}) {
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = String(label).split('\n');
  lines.forEach((line, n) => {
    let s = size; g.font = `bold ${s}px sans-serif`;
    while (s > 7 && g.measureText(line).width > w - 6) { s--; g.font = `bold ${s}px sans-serif`; }   // shrink to fit
    g.fillText(line, w / 2, h / 2 + dy + (n - (lines.length - 1) / 2) * (s + 3));
  });
}
function ring(g, w, h, p, color) {   // progress ring around the key edge
  g.strokeStyle = color; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.arc(w / 2, h / 2, Math.min(w, h) / 2 - 5, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); g.stroke();
}
function drawKey(k, t) {
  const { width: w, height: h } = k.pixelSize; const c = createCanvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const def = keyDef(k.index), job = jobs.get(k.index), f = flash.get(k.index), st = status.get(`${page}:${k.index}`);
  if (f && Date.now() > f.until) flash.delete(k.index);
  if (def) {
    if (job?.state === 'running') { ring(g, w, h, ((t / 900) % 1), '#fff'); text(g, w, h, job.label, { size: 11 }); }
    else if (job) text(g, w, h, job.label, { size: 13, color: job.state === 'done' ? '#30d158' : '#ff3b30' });
    else if (f && Date.now() <= f.until) text(g, w, h, f.label, { size: 10, color: '#ff3b30' });
    else if (def.action === 'status') { text(g, w, h, def.label, { size: 10, color: '#888', dy: -h / 4 }); text(g, w, h, st ?? '…', { size: 22, dy: h / 8 }); }
    else text(g, w, h, def.label, { size: 14, color: def.color || '#fff' });
    if (hold && hold.key === k.index) { const p = Math.min(1, (Date.now() - hold.start) / HOLD_MS); if (p >= 1) hold.armed = true; ring(g, w, h, p, hold.armed ? '#30d158' : '#ff3b30'); }
  }
  return Buffer.from(g.getImageData(0, 0, w, h).data);
}
async function paint(t) {
  await Promise.all(keys.map(k => {
    const write = deck.fillKeyBuffer(k.index, drawKey(k, t), { format: 'rgba' });
    const guard = new Promise((_, rej) => setTimeout(() => rej(new Error(`key ${k.index} write timed out`)), WRITE_TIMEOUT_MS));
    return Promise.race([write, guard]);
  }));
}

// ---------- main loop ----------
const t0 = Date.now();
for (;;) {
  const d = await ensureDeck();
  if (!d) { await sleep(2000); continue; }
  try { await paint(Date.now() - t0); }
  catch (e) { log('paint failed, reconnecting:', e.message); drop(); await sleep(1500); continue; }
  await sleep(hold || [...jobs.values()].some(j => j.state === 'running') || flash.size ? 30 : 250);
}
