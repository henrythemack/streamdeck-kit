# Windows notes

- Node 22+ from nodejs.org. `npm install` in `starter/` pulls prebuilt HID binaries; no driver, no Zadig.
- The Elgato Stream Deck app auto-starts and grabs the device. Quit it from the tray and disable its
  autostart (Settings > Apps > Startup) or your daemon will see the deck but writes/events will be flaky.
- Run at login: Task Scheduler > Create Task > Trigger "At log on" > Action `node.exe` with argument
  `C:\path\to\starter\deck.mjs`, "Run only when user is logged on" (needs the desktop session for the USB
  device). Simpler: a `.cmd` shortcut in `shell:startup`.
- Printing: PowerShell cmdlets `Get-Printer`, `Get-PrintJob`, `Suspend-PrintJob`, `Resume-PrintJob`,
  `Remove-PrintJob`. Print a file: `Start-Process file.pdf -Verb Print`. Raw ZPL/EPL to a shared label
  printer: `copy /b label.zpl \\%COMPUTERNAME%\<ShareName>`.
- `execFile('powershell', ['-NoProfile', '-Command', '...'])` from Node; set `windowsHide: true`.
