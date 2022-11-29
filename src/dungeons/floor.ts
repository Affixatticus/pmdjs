import { Scene } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { Vec2 } from "../utils/vectors";
import { DungeonGenerator } from "./generator";
import { DungeonGrid } from "./grid";
import { DungeonScene } from "./scene";

/** Class that builds the structure of the dungeon */
export class DungeonFloor {
    private scene: Scene;
    private info: DungeonFloorInfo;

    public grid!: DungeonGrid;
    public map!: DungeonScene;


    constructor(scene: Scene, info: DungeonFloorInfo) {
        this.scene = scene;
        this.info = info;
    }

    public generate() {
        // Generate the dungeon
        const generator = new DungeonGenerator(this.info);

        // Generate the map and time it
        const start = Date.now();
        this.grid = generator.generate();
        const end = Date.now();
        console.log(`Generated the map in ${end - start}ms`);

        // Log the map
        console.log(generator.toString());
    }

    /** Loads the tiles */
    public async preloadAssets() {
        // Load the assets
        this.map = new DungeonScene(this.scene, this.info.path, this.grid);
        await this.map.preload();
    }

    // Rendering

    public render(position: Vec2) {
        this.map.build(position);
    }

    /** Renders the first view of the map */
    public renderToScreen(position: Vec2) {
        this.map.buildView(position);
    }
    
    public update(tick: number) {
        this.map.animateTiles(tick);
    }

    // Utility
    public getSpawnPosition(): Vec2 | undefined {
        return this.grid.getOpenPosition() ?? this.grid.getFreePosition();
    }
}