# system-monitor

A DeepSeek Harness web UI plugin that shows live **CPU / GPU / memory** usage as three small rings in the bottom-left corner. The panel is **draggable** and **snaps to the nearest window edge**.

![rings](icon.svg)

## Features

- Three donut-style rings: 🔵 CPU · 🟢 GPU · 🟠 MEM
- Real-time sampling (updates every 1 second)
- Draggable with the mouse
- Auto-snaps to the nearest viewport edge (left / right / top / bottom) when released close to it
- Theme-aware dark panel that sits above every column (`shell.overlay`)

## Requirements

- DeepSeek Harness with the Web UI and `@deepseek-ai/dsh-client-ui-slots` (bundled with the web shell)
- GPU percentage requires `nvidia-smi` on the host; on non-NVIDIA machines the GPU ring shows `N/A` (CPU / memory still work).

## Install

Install the bundle from this directory:

```
plugin_manager install_bundle D:\path\to\system-monitor
```

The bundle is installed as a link, so edits to `client.js` / `index.js` are picked up on the next page reload without reinstalling.

## How it works

- **`index.js`** (host, Node): samples CPU via `os.cpus()` deltas, memory via `os.totalmem()`/`os.freemem()`, and GPU via `nvidia-smi`. Serves `GET /api/system-monitor` -> `{ cpu, gpu, mem }`.
- **`client.js`** (browser): registers a `shell.overlay` occupant that polls the stats endpoint every second and renders the rings; handles drag + edge snapping.

## Layout

```
system-monitor/
├─ client.js          # browser widget (drag + snap + rings)
├─ index.js           # host stats sampling + /api/system-monitor route
├─ package.json
├─ cordis.patch.yml   # bundle patch (insert id: system-monitor)
├─ locale/            # en / zh meta
├─ icon.svg
└─ README.md
```

## License

MIT
