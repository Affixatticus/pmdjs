import { Engine } from '@babylonjs/core';
import { Inventory } from './common/menu/inventory';
import { ItemId } from './data/item/ids';
import { ItemStack } from './data/item/item_stack';
import { DungeonStateData, DungeonState } from './dungeons/dungeon';
import { Controls } from './utils/controls';

enum GameState {
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
        floor: 0,
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
            {
                id: [501, 0, false, 0],
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
            //     id: [135, 0, false, 0],
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
            //     id: [136, 0, false, 0],
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
            //     id: [495, 0, false, 0],
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
    private gameState: GameState;
    private state: DungeonState;
    private onResize = () => this.engine.resize();
    private data: Data;
    private controls: Controls;

    private inventory: Inventory;

    public deltaTime: number = 0;
    public clockSpeed: number = 7;
    public updateLoop!: number;


    constructor() {
        // Engine
        this.canvas = <HTMLCanvasElement>document.getElementById("scene");
        this.engine = new Engine(this.canvas);
        this.controls = new Controls();
        // Global components
        this.inventory = new Inventory();
        this.inventory.addStack(new ItemStack(ItemId.ORAN_BERRY, 1));
        this.inventory.addStack(new ItemStack(ItemId.ORAN_BERRY, 1));
        this.inventory.addStack(new ItemStack(ItemId.ORAN_BERRY, 1));
        this.inventory.addStack(new ItemStack(ItemId.ORAN_BERRY, 1));
        this.inventory.addStack(new ItemStack(ItemId.APPLE, 1));
        this.inventory.addStack(new ItemStack(ItemId.APPLE, 1));
        this.inventory.addStack(new ItemStack(ItemId.APPLE, 1));
        this.inventory.addStack(new ItemStack(ItemId.APPLE, 1));
        // State
        this.data = INITIAL_GAME_DATA;
        this.gameState = GameState.DUNGEONS;
        this.state = this.createState(this.gameState);
        // Resize listener
        window.addEventListener("resize", this.onResize);

        // @ts-ignore
        window.controls = this.controls;

        // Add FPS counter
        this.addFPSCounter();

        // Render loop
        this.engine.runRenderLoop(() => {
            this.updateFPSCounter();
            this.state.render();
        });

        this.createUpdateLoop();
    }

    public createUpdateLoop(clockSpeed: number = this.clockSpeed) {
        if (this.updateLoop) clearInterval(this.updateLoop);

        this.updateLoop = setInterval(() => {
            const now = performance.now();
            this.controls.tickUpdate();
            this.state.update();
            this.deltaTime = performance.now() - now;
        }, clockSpeed);
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
        if (fpsCounter) {
            fpsCounter.innerHTML = this.engine.getFps().toFixed() + " fps";
            fpsCounter.innerHTML += "<br/>" + this.state.scene.getActiveMeshes().length + " active meshes";
            fpsCounter.innerHTML += "<br/>" + this.state.scene.meshes.length + " total meshes";
            fpsCounter.innerHTML += "<br/>" + this.deltaTime.toFixed(4) + "ms (Δ time)";
            fpsCounter.innerHTML += "<br/><span style='font-size: 16pt'>Floor " + (this.state.data.floor + 1) + "</span>";
        }
    }

    private createState(state: GameState = this.gameState) {
        switch (state) {
            case GameState.DUNGEONS:
                return new DungeonState(this.engine, this.data.dungeon);
        }
        throw Error(`No id correlated to that GameState (${state})`);
    }

}

export const app = new App();
// @ts-ignore
window.setClockSpeed = (value) => {
    app.createUpdateLoop(value);
};