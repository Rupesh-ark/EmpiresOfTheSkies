# Empires of the Skies

Empires of the Skies is a full-stack digital adaptation of a complex multiplayer strategy board game.
The project implements complete rule logic, phase-based gameplay, and real-time multiplayer synchronization using boardgame.io.

Players control competing kingdoms, manage resources, resolve aerial and ground battles, and compete for political dominance across a dynamic world map.

This project was developed as part of research exploring digital board game implementation and multiplayer architecture.

---

## Live Demo

Frontend
[https://empires-of-the-skies-tan.vercel.app](https://empires-of-the-skies-tan.vercel.app)

Backend
[https://empiresoftheskies.onrender.com](https://empiresoftheskies.onrender.com)

---

## Architecture

This project uses a monorepo structure with shared game logic:

```
packages/
  game/                  Shared game rules and core logic
empires_of_the_skies/    React frontend (Vite)
empires_of_the_skies/server/  boardgame.io backend server
```

The shared game package ensures:

* Single source of truth for rules
* Clean separation between UI and game engine
* Server-authoritative multiplayer
* Easier deployment and scaling

---

## Technology Stack

Frontend

* React
* TypeScript
* Vite
* Material UI (MUI)
* Emotion

Backend

* Node.js (v22 recommended)
* boardgame.io
* Koa (via boardgame.io server)

Infrastructure

* Vercel (frontend hosting)
* Render (backend hosting)
* pnpm workspaces

---

## Getting Started

### Prerequisites

* Node.js 22.x recommended
* pnpm

Install pnpm if needed:

```
npm install -g pnpm
```

---

## Installation

Clone the repository:

```
git clone <repository-url>
cd EmpiresOfTheSkies
```

Install dependencies:

```
pnpm install
```

---

## Running Locally

### Run the Backend Server

```
pnpm --filter empires-server dev
```

Server runs on:

```
http://localhost:8000
```

---

### Run the Frontend Client

In another terminal:

```
pnpm --filter empires_of_the_skies dev
```

Open:

```
http://localhost:5173
```

---

## Building for Production

Build shared game logic:

```
pnpm --filter @eots/game build
```

Build frontend:

```
pnpm --filter empires_of_the_skies build
```

Build server:

```
pnpm --filter empires-server build
```

---

## Game Features

* Phase-based gameplay system
* Multiplayer state synchronization
* Aerial and ground battle resolution
* Resource management and economy
* Political election system
* Modular move architecture
* Dynamic map discovery
* Per-turn undo functionality

---

## Key Directories

packages/game/
Contains the core game engine:

* Game definition
* Move logic
* Helper functions
* Shared types
* Rule enforcement

empires_of_the_skies/
Contains:

* React UI components
* Game board rendering
* Battle dialogs
* Client integration with boardgame.io

empires_of_the_skies/server/
Contains:

* boardgame.io server
* Multiplayer synchronization
* CORS configuration
* Production server configuration

---

## Design Principles

* Deterministic rule logic
* Server-authoritative multiplayer
* Strong TypeScript typing
* Clear separation of UI and game state
* Scalable monorepo architecture

---

## License

This project is for academic and research purposes.

