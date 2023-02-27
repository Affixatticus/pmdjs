import { Engine } from '@babylonjs/core';
import { Formation } from './common/menu/formation/formation';
import { Pokemon } from './common/menu/formation/pokemon';
import { GuiManager } from './common/menu/gui/gui_manager';
import { Inventory } from './common/menu/inventory/inventory';
import { DungeonState } from './dungeons/dungeon';
import { Controls } from './utils/controls';

enum GameState {
    MAIN_MENU,
    OVERWORLD,
    DUNGEONS,
};

class App {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private gameState: GameState;
    private state: DungeonState;
    private onResize = () => this.engine.resize();
    private controls: Controls;

    private inventory: Inventory;
    private formation: Formation;

    public deltaTime: number = 0;
    public clockSpeed: number = 7;
    public updateLoop!: number;


    constructor() {
        // Engine
        this.canvas = <HTMLCanvasElement>document.getElementById("scene");
        this.engine = new Engine(this.canvas);
        this.controls = new Controls();
        // Create the gui manager
        new GuiManager();
        // Global components
        this.inventory = new Inventory();
        // this.inventory.addStack(new ItemStack(ItemId.ORAN_BERRY, 1));
        this.formation = new Formation();
        this.formation.newTeam(
            new Pokemon([495, 0, true, 0]),
            new Pokemon([501, 0, true, 0]),
            new Pokemon([6, 0, false, 0]),
        );
        const leader = this.formation.team.leader;
        leader.exp = 1249;
        leader.reload();
        leader.varData.hp = 8;
        leader.belly = 86;
        leader.name = "Snivy the Great";
        const oshawott = this.formation.team.pokemon[1];
        oshawott.exp = 1500;
        oshawott.reload();
        oshawott.varData.hp = 18;
        oshawott.belly = 100;
        oshawott.name = "Not a snivy";
        const charzard = this.formation.team.pokemon[2];
        charzard.exp = 10000;
        charzard.reload();
        charzard.varData.hp = 180;
        charzard.belly = 12;
        charzard.name = "Would you believe me if I said I was a snivy?";
        
        this.formation.overlay.update();
        // State
        this.gameState = GameState.DUNGEONS;
        this.state = this.createState(this.gameState);
        // Resize listener
        window.addEventListener("resize", this.onResize);

        // Add FPS counter
        this.addFPSCounter();

        // Render loop
        this.engine.runRenderLoop(() => {
            this.updateFPSCounter();
        });

        this.createUpdateLoop();
    }

    public createUpdateLoop(clockSpeed: number = this.clockSpeed) {
        if (this.updateLoop) clearInterval(this.updateLoop);

        this.updateLoop = setInterval(() => {
            const now = performance.now();
            this.state.render();
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
            fpsCounter.innerHTML += "<br/><span style='font-size: 16pt'>Floor " + (this.state.floorNumber + 1) + "</span>";
        }
    }

    private createState(state: GameState = this.gameState) {
        switch (state) {
            case GameState.DUNGEONS:
                return new DungeonState(this.engine, 0, 0, this.formation, this.inventory);
        }
        throw Error(`No id correlated to that GameState (${state})`);
    }

}

export const app = new App();
// @ts-ignore
window.setClockSpeed = (value) => {
    app.createUpdateLoop(value);
};