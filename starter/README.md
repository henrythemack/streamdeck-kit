# starter

```
npm install
npm run probe     # shows model/keys, paints colours, logs presses for 15 s
cp config.example.json config.json   # edit your keys and commands
npm start
```
Keys are defined per page in `config.json`; see the comment block at the top of `deck.mjs` for the schema.
`windowsCmd` is used on Windows, `cmd` elsewhere. `hold: true` makes a key hold-to-run (ring fills, release
to fire). `status` keys show a command's output, polled on a timer. Run at login: see `../docs/WINDOWS.md`
(Task Scheduler) or a macOS LaunchAgent with KeepAlive.
