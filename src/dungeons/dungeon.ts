import { AxesViewer, Color3, Color4, DirectionalLight, Engine, Scene, TargetCamera, Vector3 } from "@babylonjs/core";
import { DungeonFloorInfo, Dungeons, DungeonsInfo } from "../data/dungeons";
import { PokemonData } from "../data/pokemon";
import { Controls } from "../utils/controls";
import { V2, V3, Vec2, Vec3 } from "../utils/vectors";
import { DungeonFloor } from "./floor";

const CAMERA_ROTATION = V2(Math.PI / 24, 0);
const CAMERA_OFFSET = V3(0, 11, 4);


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
    private controls: Controls;
    // Scene
    private scene: Scene;
    public camera: TargetCamera;
    // -> Floor
    private floor!: DungeonFloor;
    // State
    private isLoaded: boolean;
    private data: DungeonStateData;
    private info: DungeonFloorInfo;

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

        // Loading
        this.isLoaded = false;
        this.load();

        // Add a keydown listener for the body
        document.body.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                // Loads another chunk of the map
                this.floor.renderToScreen(this.floor.grid.getFreePosition() as Vec2);
            }
        });
    }

    // Game Logic Methods
    private chooseSpawnPosition(): Vec2 {
        // Choose a position to spawn the party
        const spawn = this.floor.getSpawnPosition();
        // Assert spawn
        if (!spawn) throw Error(`No spawn position found`);

        return spawn;
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
        lighting.intensity = 0.8;
        lighting.specular = new Color3(0.1, 0.1, 0.1);

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
        this.createGlobalLighting();
        // Load the assets for the map
        await this.floor.preloadAssets();

        // Render the visible area
        this.floor.build(spawn);
    }

    /**
     * Loads assets for the scene
     * - sets `isLoaded` to true once everything is done loading
     */
    private async load() {
        this.isLoaded = false;
        this.engine.displayLoadingUI();

        // LOADING CODE

        /** Dungeon Floor Loading */
        // Generate the floor
        this.generateFloor();
        // Get the spawn position
        const spawn = this.chooseSpawnPosition();
        // Draw the floor
        await this.buildFloor(spawn);
        // Move the camera to the spawn position
        this.moveCamera(spawn.toVec3());


        await this.scene.whenReadyAsync();

        this.engine.hideLoadingUI();
        this.isLoaded = true;
    }

    private controlCamera() {
        // Get the camera's current position
        const pos = this.camera.position;
        // Get the camera's current rotation
        const rot = this.camera.cameraRotation;

        // Get the camera's movement
        const move = this.controls.LS.scale(0.1);
        // Get the camera's rotation
        const rotation = this.controls.RS.scale(0.01);

        // Move the camera
        this.camera.position = pos.add(move.toVec3(this.controls.RS.y));
        // Rotate the camera
        this.camera.cameraRotation = rot.add(V2(rotation.x, 0));
    }

    private tick = 0;
    /** Renders the scene if the scene is done loading */
    public render() {
        if (this.isLoaded) {
            this.scene.render();
            this.floor.update(this.tick);
            this.controlCamera();
        }
        this.tick++;
    }
}