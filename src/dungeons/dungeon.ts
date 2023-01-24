import { AxesViewer, Color3, Color4, DirectionalLight, Engine, HardwareScalingOptimization, HemisphericLight, Scene, SceneOptimizer, SceneOptimizerOptions, TargetCamera, Vector3 } from "@babylonjs/core";
import { DungeonFloorInfo, Dungeon, DungeonsInfo, LightLevel } from "../data/dungeons";
import { PokemonData } from "../data/pokemon";
import { Tile } from "../data/tiles";
import { Controls } from "../utils/controls";
import { V2, V3, Vec2, Vec3 } from "../utils/vectors";
import { DungeonFloor } from "./floor";
import { DungeonLogic } from "./logic/logic";
import { DungeonStartup } from "./logic/startup";
import { FloorGuide } from "./map/floor_guide";
import { ByteGrid } from "./map/grid";
import { LightOverlay } from "./map/light_overlay";
import { Minimap } from "./ui/minimap";
import { DungeonUI } from "./ui/ui";

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
    public scene: Scene;
    public camera: TargetCamera;
    public ui: DungeonUI;
    // -> Floor
    public floor!: DungeonFloor;
    public floorGuide!: FloorGuide;
    // |-> Lighting
    public lightOverlay!: LightOverlay;
    public directionalLight!: DirectionalLight;
    public globalLight!: HemisphericLight;
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
        this.ui = new DungeonUI({
            minimapStyle: Minimap.getStyleFromLightLevel(this.info.lightLevel)
        });

        // Loading
        this.isLoaded = false;
        this.load();

        // Mouse down listener
        this.scene.onPointerObservable.add((event) => {
            if (event.type !== 1) return;
            if (!event.pickInfo) return;
            const point = V3(event.pickInfo.pickedPoint as Vector3).toVec2().roundDown().subtract(V2(0, -1)).multiply(V2(1, -1));
            const area = new ByteGrid(1, 1);

            // If the tile is Unbreakable, return
            if (this.floor.grid.get(...point.spread()) === Tile.UNBREAKABLE_WALL) return;

            if (event.event.button == 0) {
                area.fill(Tile.FLOOR);
            } else if (event.event.button == 1) {
                area.fill(Tile.WATER);
            } else if (event.event.button == 2) {
                area.fill(Tile.WALL);
            }

            this.floor.map.changeGridSection(point, area);
        });
    }

    // Loading methods

    /** Loads in this dungeons' graphics, found enemies, possible items... */
    private getFloorInfo(id: Dungeon = this.data.id, floor: number = this.data.floor): DungeonFloorInfo {
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

    public moveCamera(newPos: Vec3) {
        this.camera.position = newPos.add(CAMERA_OFFSET).gameFormat;
    }

    /** Creates the lighting based on the dungeon's light level */
    private setLighting() {
        // Delete the old lighting
        this.directionalLight?.dispose();
        this.globalLight?.dispose();
        this.lightOverlay?.dispose();

        this.directionalLight = new DirectionalLight("directional-light", new Vector3(0, -1, Math.PI / 6), this.scene);
        this.globalLight = new HemisphericLight("global-light", new Vector3(0, 1, 0), this.scene);
        this.lightOverlay = new LightOverlay(this.scene);
        this.directionalLight.specular = new Color3(0, 0, 0);

        switch (this.info.lightLevel) {
            case LightLevel.DARKEST: {
                this.directionalLight.intensity = 0;
                this.globalLight.intensity = 0;
                this.lightOverlay.intensity = 1;
                this.lightOverlay.isEnabled = true;
                break;
            }
            case LightLevel.DARK: {
                this.directionalLight.intensity = 0;
                this.globalLight.intensity = 0.3;
                this.lightOverlay.isEnabled = true;
                this.lightOverlay.intensity = 1;
                break;
            }
            case LightLevel.NORMAL: {
                this.directionalLight.intensity = 0.4;
                this.globalLight.intensity = 0.5;
                this.lightOverlay.isEnabled = false;
                break;
            }
            case LightLevel.BRIGHT: {
                this.directionalLight.intensity = 1;
                this.globalLight.intensity = 1;
                this.lightOverlay.isEnabled = false;
                break;
            }
        }
    }

    private generateFloor() {
        this.floor = new DungeonFloor(this.scene, this.info);
        // Generate the dungeon
        this.floor.generate();
        // Generate the pokemon
        this.floor.generatePokemon(this.data.party);
    }

    private async buildFloor(spawn: Vec2) {
        // Add the lighting
        this.setLighting();
        // Load the assets for the map
        await this.floor.init();
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

        const start = performance.now();

        /** Dungeon Floor Loading */
        // Generate the floor
        this.generateFloor();
        // Get the spawn position
        const spawn = DungeonStartup.getStartingLeaderPosition();
        // Build the floor guide
        this.floorGuide = new FloorGuide(this.scene, this.floor, this.floor.pokemon.getLeader());
        await Promise.all([
            // Draw the floor
            this.buildFloor(spawn),
            // Initialize the light overlay
            this.lightOverlay.init(),
            // Initialize the floor guide
            await this.floorGuide.init(),
        ]);
        // Init the minimap
        await this.ui.minimap.init(this.floor);
        // Look for the stairs
        this.floor.findStairs(spawn);
        // Update the minimap
        this.ui.minimap.update(spawn);
        // Move the camera to the spawn position
        this.moveCamera(spawn.toVec3());
        // TODO Understand why the light is less stuttery when you run this 2-3 times
        // Update the light overlay
        this.lightOverlay.lightPokemon(this.floor.grid, this.floor.pokemon.getLeader(), true);
        this.lightOverlay.lightPokemon(this.floor.grid, this.floor.pokemon.getLeader(), true);

        await this.scene.whenReadyAsync();
        console.log(`Loading the scene takes ${performance.now() - start}ms`);

        // Initialize the logic
        this.logic.init();


        // Add optimizations
        const options = new SceneOptimizerOptions(144);
        options.addOptimization(new HardwareScalingOptimization(0, 1));
        const optimizer = new SceneOptimizer(this.scene, options);
        optimizer.start();

        this.engine.hideLoadingUI();
        this.isLoaded = true;

        // @ts-ignore
        window.tick = () => this.tick;
    }

    /** Renders the scene if the scene is done loading */
    public render = () => this.scene.render();

    private tick = 0;
    public update() {
        this.logic.update();
        // this.controlCamera();
        this.lightOverlay.update();
        this.floor.update(this.tick);
        this.tick++;
    }
}