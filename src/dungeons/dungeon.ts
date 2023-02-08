import { Color3, Color4, DirectionalLight, Engine, HardwareScalingOptimization, HemisphericLight, MotionBlurPostProcess, Scene, SceneOptimizer, SceneOptimizerOptions, TargetCamera, Vector3 } from "@babylonjs/core";
import { DungeonFloorInfo, Dungeon, DungeonsInfo, LightLevel } from "../data/dungeons";
import { PokemonData } from "../data/pokemon";
import { Tile } from "../data/tiles";
import { V2, V3, Vec3 } from "../utils/vectors";
import { DungeonFloor } from "./floor";
import { DungeonLogic } from "./logic/logic";
import { DungeonStartup } from "./logic/startup";
import { FloorGuide } from "./map/floor_guide";
import { ByteGrid } from "./map/grid";
import { LightOverlay } from "./map/light_overlay";
import { Minimap } from "./ui/minimap";
import { DungeonUI } from "./ui/ui";

const CAMERA_ROTATION = V2(Math.PI / 24, 0);
const CAMERA_OFFSET = V3(0.5, 8, 1);


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
    // Scene
    public scene: Scene;
    public camera: TargetCamera;
    public ui: DungeonUI;
    // -> Floor
    public floor!: DungeonFloor;
    // |-> Lighting
    public lightOverlay!: LightOverlay;
    public directionalLight!: DirectionalLight;
    public globalLight!: HemisphericLight;
    // |-> Unrelated Graphics
    public floorGuide: FloorGuide;
    // State
    public isLoaded: boolean;
    public data: DungeonStateData;
    public info: DungeonFloorInfo;
    private logic: DungeonLogic;
    private motionBlur: MotionBlurPostProcess;

    // Pokemon Movement
    public static readonly WALKING_TICKS: number = 40;
    public static readonly _walkingAnimationSpeed: number = 1;
    public static readonly _runningAnimationSpeed: number = 40;
    public _animationSpeed = DungeonState._walkingAnimationSpeed;

    public get animationSpeed() {
        return this._animationSpeed;
    }
    public get isRunning() {
        return this._animationSpeed === DungeonState._runningAnimationSpeed;
    }
    public get isWalking() {
        return this._animationSpeed === DungeonState._walkingAnimationSpeed;
    }
    public setRunning(running: boolean) {
        this.motionBlur.motionStrength = running ? 400000 : 0;
        this._animationSpeed = running ? DungeonState._runningAnimationSpeed : DungeonState._walkingAnimationSpeed;
    }

    constructor(engine: Engine, data: DungeonStateData) {
        // Definition
        this.engine = engine;
        this.scene = new Scene(this.engine);
        this.camera = this.createCamera();
        this.moveCamera(V3(0, 0, 0));
        this.scene.clearColor = new Color4(0, 0, 0, 1);
        this.data = data;
        this.info = this.getFloorInfo();

        // Instantiate the logic
        this.logic = new DungeonLogic(this);
        // Instantiate the UI
        this.ui = new DungeonUI({});
        // Build the floor guide
        this.floorGuide = new FloorGuide(this.scene);

        // Add the post-processing
        this.motionBlur = new MotionBlurPostProcess("motionBlur", this.scene, 1.0, this.camera);

        // Add optimizations
        const options = new SceneOptimizerOptions(144);
        options.addOptimization(new HardwareScalingOptimization(0, 1));
        const optimizer = new SceneOptimizer(this.scene, options);
        optimizer.start();

        // Loading
        this.isLoaded = false;
        this.load();

        // Mouse down listener
        this.scene.onPointerObservable.add((event) => {
            if (event.type !== 1) return;
            if (!event.pickInfo) return;
            const point = V3(event.pickInfo.pickedPoint as Vector3).toVec2().roundDown().subtract(V2(0, -1)).multiply(V2(1, -1));
            const area = new ByteGrid(1, 1);

            // const v = V2(1, 1);
            // const time = performance.now();
            // for (let i = 0; i < 100000; i++) {
            //     Direction.fromVector(v);
            // }
            // console.log(performance.now() - time);



            // If the tile is Unbreakable, return
            if (this.floor.grid.get(point) === Tile.UNBREAKABLE_WALL) return;

            if (event.event.button == 0) {
                area.fill(Tile.FLOOR);
            } else if (event.event.button == 1) {
                area.fill(Tile.WATER);
            } else if (event.event.button == 2) {
                area.fill(Tile.WALL);
            }

            this.floor.map.changeGridSection(point, area);
            this.updateFloor();
        });
    }

    // Loading methods
    /** Loads in this dungeons' graphics, found enemies, possible items... */
    public getFloorInfo(id: Dungeon = this.data.id, floor: number = this.data.floor): DungeonFloorInfo {
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

    public goUpAFloor() {
        this.info = this.getFloorInfo(this.data.id, ++this.data.floor);
    }

    private createCamera(): TargetCamera {
        const camera = new TargetCamera("camera", Vec3.Up(), this.scene);
        camera.cameraRotation = CAMERA_ROTATION;

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

    /** Updates all the components when the grid changes */
    public async updateFloor() {
        // Update the floor
        this.floor.onMapUpdate();
        // Update the minimap
        this.ui.minimap.update();
        // Update the lighting
        this.lightOverlay.lightPokemon(this.floor, this.floor.pokemon.getLeader());
    }

    public async changeFloor() {
        /** Dungeon Floor Loading */
        this.isLoaded = false;
        this.engine.displayLoadingUI();

        /** Generate the floor */

        // Delete the old floor
        this.floor?.dispose();
        // Create a new floor
        this.floor = new DungeonFloor(this.scene, this.info);
        // Generate the dungeon
        this.floor.generate();
        // Generate the pokemon
        this.floor.generatePokemon(this.data.party);
        // Add the lighting
        this.setLighting();
        // Load the assets for the map
        await this.floor.init();
        // Get the spawn position
        const spawn = DungeonStartup.getStartingLeaderPosition();
        // Render the visible area
        await this.floor.build(spawn);

        // Move the camera to the spawn position
        this.moveCamera(spawn.toVec3());

        /** Load some assets */

        // Load the assets for the light overlay
        await this.lightOverlay.init();
        // Initialize the floor guide
        await this.floorGuide.init(this.floor, this.floor.pokemon.getLeader());
        // Init the minimap
        await this.ui.minimap.init(this.floor, Minimap.getStyleFromLightLevel(this.info.lightLevel));

        /** Update the graphics */
        // Update the light overlay
        this.lightOverlay.lightPokemon(this.floor, this.floor.pokemon.getLeader())


        /** Dungeon Floor done loading */
        await this.scene.whenReadyAsync();

        this.engine.hideLoadingUI();
        this.isLoaded = true;

        /** Update the state */

        // Look for the stairs
        this.floor.findStairs(spawn);
        // Update the minimap
        this.ui.minimap.update(spawn);
        // Initialize the logic
        this.logic.init();
    }

    /**
     * Loads assets for the scene
     * - sets `isLoaded` to true once everything is done loading
     */
    private async load() {
        await this.changeFloor();
    }

    /** Renders the scene if the scene is done loading */
    public render = () => this.scene.render();

    private tick = 0;
    public update() {
        this.floor.animate(this.tick, this.isRunning);
        this.logic.update();
        // this.controlCamera();
        this.lightOverlay.update(this.animationSpeed);
        this.tick++;
    }
}