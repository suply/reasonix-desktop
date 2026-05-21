# Reasonix Desktop (Electron + Vue 3)

> [中文版](./README.zh-CN.md)

An **Electron** desktop client for [Reasonix](https://github.com/esengine/DeepSeek-Reasonix) — the DeepSeek-native agentic coding framework. This is a port of the original [Tauri + React desktop app](https://github.com/esengine/DeepSeek-Reasonix/tree/main/desktop) to **Electron + Vue 3 + Element Plus**.

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 38 |
| UI  | Vue 3 + TypeScript + Pinia |
| UI Toolkit | Element Plus 2.x |
| i18n | vue-i18n (zh-CN / en) |
| Markdown | markdown-it |
| Build | electron-vite + tsup |
| Lint | ESLint + Prettier |
| Runtime | Node ≥ 22 |

## Features

- **AI Chat** — Streaming conversation with text / reasoning / tool-call segments
- **RPC Subprocess** — Spawns the Reasonix CLI as a managed child process with stdin/stdout JSON-line protocol
- **Workspace Management** — Set and switch working directories; file-system commands scoped to the workspace
- **Session History** — Browse, load, rename and delete past conversations
- **Command Palette** (`Ctrl+K`) — Quick access to all actions
- **Background Jobs** (`Ctrl+J`) — Monitor running and completed subprocesses
- **MCP Server Config** — Add, remove and inspect MCP server specs
- **Skills Panel** — Browse and invoke installed skills
- **Model Presets** — Quick-switch between auto / flash / pro presets
- **Edit Modes** — Review / Auto / Yolo for file-change approval
- **Theme System** — Dark / Light with 4 style variants (Graphite, Sandstone, Porcelain, Midnight) + font/scale customization
- **@-mention Files** — Autocomplete file paths with directory traversal
- **Slash Commands** — Inline commands like `/new`, `/clear`, `/abort`, `/retry`

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Renderer Process  (Vue 3 + Element Plus)        │
│  ┌──────────┬──────────────────┬──────────────┐  │
│  │ Sidebar  │   Thread (chat)  │  Settings    │  │
│  │          │   + Composer     │  /Jobs /Cmd  │  │
│  └──────────┴──────────────────┴──────────────┘  │
│         ↕ contextBridge (window.api)              │
├──────────────────────────────────────────────────┤
│  Main Process  (Electron)                        │
│  ┌──────────┬──────────┬──────────────────────┐  │
│  │ Window   │ IPC      │ RPC Subprocess       │  │
│  │ Manager  │ Handlers │ Manager (spawn/send/ │  │
│  │          │          │ kill reasonix CLI)   │  │
│  └──────────┴──────────┴──────────────────────┘  │
│         ↕ stdin/stdout JSON lines                 │
├──────────────────────────────────────────────────┤
│  CLI Subprocess  (Reasonix)                      │
│  ┌──────────────────────────────────────────────┐│
│  │  LLM calls · Tool execution · File system   ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10

### Install

```bash
git clone <repo-url>
cd test-app
npm install
```

### Development

```bash
npm run dev
```

Launches the Electron app with hot-reload for the renderer.

### Build

```bash
# Windows installer
npm run build:win

# macOS (signing required)
npm run build:mac

# Linux AppImage
npm run build:linux

# Unpacked directory (for testing)
npm run build:unpack
```

### Type Checking

```bash
npm run typecheck        # node + web
npm run typecheck:node   # main process only
npm run typecheck:web    # renderer only
```

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── index.ts       # Window creation + IPC handlers
│   ├── rpc.ts         # Reasonix CLI subprocess management
│   ├── commands.ts    # File system commands (tree, git, editor, write)
│   └── protocol.ts    # Event / Command type definitions
├── preload/
│   └── index.ts       # contextBridge exposing api to renderer
└── renderer/src/
    ├── App.vue        # Root layout
    ├── main.ts        # Vue app bootstrap (Pinia, i18n, Element Plus)
    ├── stores/
    │   ├── session.ts # Chat state machine + RPC event handling
    │   ├── settings.ts# Settings state
    │   ├── theme.ts   # Theme / font / scale with localStorage persistence
    │   └── app.ts     # Global state (sessions, jobs, MCP specs, skills)
    └── components/
        ├── Thread.vue       # Message thread with segment rendering
        ├── Composer.vue     # Input area with /commands, @mentions, model switch
        ├── Sidebar.vue      # Session list + navigation
        ├── StatusBar.vue    # Bottom status bar
        ├── TopBar.vue       # Workspace directory bar
        ├── Markdown.vue     # Markdown renderer (markdown-it)
        ├── CommandPalette.vue # Ctrl+K command palette
        ├── JobsPop.vue       # Ctrl+J background jobs popup
        ├── Settings.vue      # Settings dialog (general/models/MCP/skills)
        ├── WorkdirPop.vue    # Workspace directory picker
        ├── Splash.vue        # Startup welcome screen
        ├── AboutModal.vue    # About dialog
        └── cards/
            ├── ToolCard.vue       # Tool call cards
            ├── ShellCard.vue      # Shell command cards
            ├── ReasoningCard.vue  # Reasoning process cards
            └── ApprovalCards.vue  # Approval / plan / choice / checkpoint cards

scripts/
└── init.mjs           # Post-install script (downloads Node + verifies reasonix)
```

## Relation to the Original

This project is a **feature-port** of the [Reasonix Desktop (Tauri + React)](https://github.com/esengine/DeepSeek-Reasonix/tree/main/desktop) to the Electron + Vue 3 ecosystem. It shares the same RPC protocol and Reasonix CLI backend but replaces the frontend stack entirely:

| Original | This Port |
|---|---|
| Tauri 2 (Rust) | Electron 38 |
| React + TypeScript | Vue 3 + TypeScript + Pinia |
| CSS custom properties (oklch) | Element Plus Design Tokens |
| prism-react-renderer | markdown-it |
| lucide-react icons | Inline SVG icons + Element Plus icons |

## License

[MIT](./LICENSE)
