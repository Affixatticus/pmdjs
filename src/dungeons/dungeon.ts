import { AxesViewer, Color3, Color4, DirectionalLight, Engine, HemisphericLight, MeshBuilder, Scene, TargetCamera, Vector3 } from "@babylonjs/core";
import { DungeonFloorInfo, Dungeons, DungeonsInfo } from "../data/dungeons";
import { PokemonData } from "../data/pokemon";
import { Button, Controls, Stick } from "../utils/controls";
import { V2, V3, Vec2, Vec3 } from "../utils/vectors";
import { DungeonFloor, TileRenderingGroupIds } from "./floor";
import { DungeonLogic } from "./logic/logic";
import { DungeonStartup } from "./logic/startup";
import { LightOverlay } from "./map/light_overlay";

const CAMERA_ROTATION = V2(Math.PI / 24, 0);
const CAMERA_OFFSET = V3(0.5, 10, 2);


export interface DungeonStateData {
    // Dungeon information
    id: number;
    floor: number;

    // Party team information
    party: PokemonData[];
};

export class DungeonState {
    // Engine
    private engine: Engine;
    public controls: Controls;
    // Scene
    private scene: Scene;
    public camera: TargetCamera;
    // -> Floor
    public floor!: DungeonFloor;
    private lightOverlay!: LightOverlay;
    // State
    public isLoaded: boolean;
    private data: DungeonStateData;
    private info: DungeonFloorInfo;
    private logic: DungeonLogic;

    constructor(engine: Engine, data: DungeonStateData, controls: Controls) {
        // Definition
        this.engine = engine;
        this.scene = new Scene(this.engine);
        this.controls = controls;
        this.camera = this.createCamera();
        this.moveCamera(V3(0, 0, 0));
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        this.data = data;
        this.info = this.getFloorInfo();
        this.logic = new DungeonLogic(this);

        // Loading
        this.isLoaded = false;
        this.load();

        // Add a keydown listener for the body
        document.body.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                // Loads another chunk of the map
                this.floor.renderToScreen(this.floor.grid.getRandomPosition() as Vec2);
            }
        });
    }

    // Game Logic Methods
    private chooseSpawnPosition(): Vec2 {
        // Choose a position to spawn the party
        return this.floor.getSpawnPosition();
    }

    // Loading methods

    /** Loads in this dungeons' graphics, found enemies, possible items... */
    private getFloorInfo(id: Dungeons = this.data.id, floor: number = this.data.floor): DungeonFloorInfo {
        const dunData = DungeonsInfo[id];

        // Get all the dungeon's floor levels
        const levels = Object.keys(dunData).map(e => parseInt(e));
        // Return the only level
        if (levels.length === 1)
            return dunData[levels[0]];
        else
            for (const level of levels)
                if (floor <= level) return dunData[level];

        // If no dungeon info were found, throw an error
        throw Error(`Invalid dungeon floor or id`);
    }

    private createCamera(): TargetCamera {
        const camera = new TargetCamera("camera", Vec3.Up(), this.scene);
        camera.cameraRotation = CAMERA_ROTATION;

        // Draw the axis
        new AxesViewer(this.scene, 5);

        // const camera = new TargetCamera("camera", CAMERA_OFFSET, this.scene);
        // camera.cameraRotation = CAMERA_ROTATION;
        // camera.attachControl(this.engine.getRenderingCanvas(), true);
        return camera;
    }

    private moveCamera(newPos: Vec3) {
        this.camera.position = newPos.add(CAMERA_OFFSET).gameFormat;
    }

    private createGlobalLighting() {
        const lighting = new DirectionalLight("directional-light", new Vector3(0, -1, Math.PI / 6), this.scene);
        lighting.intensity = 0.4;
        lighting.intensity = 0.02;
        lighting.intensity = 0.8;
        lighting.specular = new Color3(0.1, 0.1, 0.1);

        const global = new HemisphericLight("global-light", new Vector3(0, 1, 0), this.scene);
        // TODO - Find best light intensity
        global.intensity = 0.2;

        this.lightOverlay = new LightOverlay(this.scene);

        return lighting;
    }

    private generateFloor() {
        this.floor = new DungeonFloor(this.scene, this.info);

        // Generate the dungeon
        this.floor.generate();

        // Generate the pokemon
        this.floor.generatePokemon(this.data.party);
    }

    private async buildFloor(spawn: Vec2) {
        const start = performance.now();

        this.createGlobalLighting();
        // Load the assets for the map
        await this.floor.preloadAssets();

        // Render the visible area
        this.floor.build(spawn);

        console.log(`Building the floor takes ${performance.now() - start}ms`);
    }

    /**
     * Loads assets for the scene
     * - sets `isLoaded` to true once everything is done loading
     */
    private async load() {
        this.isLoaded = false;
        this.engine.displayLoadingUI();

        const start = performance.now();

        /** Dungeon Floor Loading */
        // Generate the floor
        this.generateFloor();
        // Get the spawn position
        // const spawn = this.chooseSpawnPosition();
        const spawn = DungeonStartup.getStartingLeaderPosition();
        // Draw the floor
        await this.buildFloor(spawn);
        // Move the camera to the spawn position
        this.moveCamera(spawn.toVec3());
        // Initialize the light overlay
        await this.lightOverlay.init();

        // Place a vertical line at the spawn
        const cylinder = MeshBuilder.CreateCylinder("spawn", { diameter: 0.05, height: 5 }, this.scene);
        cylinder.position = spawn.gameFormat.add(V3(0.5, 2.5, -0.5));
        cylinder.renderingGroupId = TileRenderingGroupIds.WALL;

        await this.scene.whenReadyAsync();

        console.log(`Loading the scene takes ${performance.now() - start}ms`);

        this.engine.hideLoadingUI();
        this.isLoaded = true;
    }

    private controlCamera() {
        // Get the camera's current position
        const pos = this.camera.position;

        // Get the camera's movement
        const move = Stick.RIGHT.position.scale(0.1);

        const yDifference = Button.DPAD_UP.isDown ? 0.1 : Button.DPAD_DOWN.isDown ? -0.1 : 0;

        // Move the camera
        this.camera.position = pos.add(move.toVec3(yDifference));
    }

    private tick = 0;
    /** Renders the scene if the scene is done loading */
    public render() {
        if (this.isLoaded) {
            this.scene.render();
            this.floor.update(this.tick);
            this.controlCamera();
        }
        this.logic.update();
        this.tick++;
    }
}