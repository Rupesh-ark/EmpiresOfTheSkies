# Empires of the Skies

Empires of the Skies is a multiplayer strategy board game. It was originally built using Create React App and Node 16, and has been migrated to a modern stack using Vite, React, and TypeScript.

The game simulates kingdom building, warfare, and politics. Players manage factions (such as Angland, Castillia, and Constantium), resolve aerial and ground battles, and compete for resources and political influence.

## Technology Stack

* **Frontend:** React with TypeScript
* **Game Engine:** Boardgame.io (handles state management and multiplayer networking)
* **Build Tool:** Vite
* **UI Library:** Material UI (MUI) and Emotion
* **Runtime:** Node.js (v18 or higher recommended)
* **Package Manager:** pnpm

## Getting Started

### Prerequisites

You need Node.js installed (version 18+ is recommended). This project uses pnpm for dependency management.

If you do not have pnpm installed, you can install it globally:

    npm install -g pnpm

### Installation

1.  Clone the repository:

        git clone <repository-url>
        cd empires_of_the_skies

2.  Install the project dependencies:

        pnpm install

## Running the Project

### Development Client
To run the game client in your browser (defaults to single-player/local mode unless connected to a server):

    pnpm dev

Open http://localhost:5173 to view the game.

### Multiplayer Server
To run the Boardgame.io backend server which handles multiplayer moves and state:

    pnpm serve

The server typically runs on port 8000.

## Project Structure

* **src/boards_and_assets/**: Contains static game assets like SVGs for ships, map tiles, and icons.
* **src/components/**: React components for the UI, including:
    * **ActionBoard/**: The main interface for selecting player actions.
    * **AerialBattle/** & **GroundBattle/**: Dialogs and logic for resolving combat.
    * **PlayerBoard/**: Displays individual player stats and resources.
* **src/moves/**: Contains the game logic and state mutations (similar to Redux reducers).
* **src/server/**: The backend server entry point using Boardgame.io's Server module.
* **src/Game.ts**: The main game definition file.

## Migration Notes

This project was migrated from an older Create React App setup.

* **Node Polyfills**: The project uses `vite-plugin-node-polyfills` to support necessary Node.js modules (like crypto and buffer) in the browser environment.
* **SVG Handling**: SVGs are imported directly as URLs for use in image tags.