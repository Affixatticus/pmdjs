import { Engine } from '@babylonjs/core';
import { Pokedex } from './data/pokemon';
import { DungeonStateData, DungeonState } from './dungeons/dungeon';
import { Controls } from './utils/controls';

enum GameStates {
    MAIN_MENU,
    OVERWORLD,
    DUNGEONS,
};

interface Data {
    dungeon: DungeonStateData;
};

const INITIAL_GAME_DATA: Data = {
    dungeon: {
        id: 0,
        floor: 6,
        party: [
            {
                id: [495, 0, false, 0],
                stats: {
                    hp: 0,
                    attack: 0,
                    defense: 0,
                    spatk: 0,
                    spdef: 0,
                    speed: 0,
                },
                moves: [
                    {
                        id: 0,
                        ppLost: 0
                    }
                ]
            },
            // {
            //     id: [Pokedex.TORCHIC, 0, false, 0],
            //     stats: {
            //         hp: 0,
            //         attack: 0,
            //         defense: 0,
            //         spatk: 0,
            //         spdef: 0,
            //         speed: 0,
            //     },
            //     moves: [
            //         {
            //             id: 0,
            //             ppLost: 0
            //         }
            //     ]
            // },
            // {
            //     id: [Pokedex.CHARIZARD, 0, false, 0],
            //     stats: {
            //         hp: 0,
            //         attack: 0,
            //         defense: 0,
            //         spatk: 0,
            //         spdef: 0,
            //         speed: 0,
            //     },
            //     moves: [
            //         {
            //             id: 0,
            //             ppLost: 0
            //         }
            //     ]
            // },
        ]
    }
};


class App {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private gameState: GameStates;
    private state: DungeonState;
    private onResize = () => this.engine.resize();
    private data: Data;
    private controls: Controls;


    constructor() {
        // Engine
        this.canvas = <HTMLCanvasElement>document.getElementById("scene");
        this.engine = new Engine(this.canvas);
        this.controls = new Controls();
        // State
        this.data = INITIAL_GAME_DATA;
        this.gameState = GameStates.DUNGEONS;
        this.state = this.createState(this.gameState);

        // Resize listener
        window.addEventListener("resize", this.onResize);

        // Add FPS counter
        this.addFPSCounter();

        // Render loop
        this.engine.runRenderLoop(() => {
            this.state.render();
            this.updateFPSCounter();
        });
    }

    private addFPSCounter() {
        const fpsCounter = document.createElement("div");
        fpsCounter.id = "fps-counter";
        fpsCounter.style.position = "absolute";
        fpsCounter.style.top = "0";
        fpsCounter.style.left = "0";
        fpsCounter.style.color = "white";
        fpsCounter.style.fontFamily = "monospace";
        fpsCounter.style.fontSize = "12px";
        fpsCounter.style.fontWeight = "bold";
        fpsCounter.style.textAlign = "left";
        fpsCounter.style.zIndex = "100";
        fpsCounter.style.pointerEvents = "none";
        fpsCounter.style.userSelect = "none";
        document.body.appendChild(fpsCounter);
        return fpsCounter;
    }

    private updateFPSCounter() {
        const fpsCounter = document.getElementById("fps-counter");
        if (fpsCounter) fpsCounter.innerHTML = this.engine.getFps().toFixed() + " fps";
    }

    private createState(state: GameStates = this.gameState) {
        switch (state) {
            case GameStates.DUNGEONS:
                return new DungeonState(this.engine, this.data.dungeon, this.controls);
        }
        throw Error(`No id correlated to that GameState (${state})`);
    }

}

export const app = new App();