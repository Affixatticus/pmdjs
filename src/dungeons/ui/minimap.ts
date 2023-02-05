import { LightLevel } from "../../data/dungeons";
import { Tile } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import Canvas, { CropParams } from "../../utils/canvas";
import { Vec2 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";
import { ByteGrid, DungeonGrid } from "../map/grid";
import { DungeonTiling, Tiling, TilingTextureMode } from "../map/tiling";
import { DungeonCarpet } from "../objects/carpet";
import { DungeonItem } from "../objects/item";
import { DungeonTile } from "../objects/tile";

/** Tile Size */
const TSIZE = 16;

export enum MinimapMode {
    DEFAULT,
    OBSCURED,
};

enum MinimapObjectType {
    PLAYER,
    PARTNER,
    ENEMY,
    ITEM,
    STAIRS,
    TRAP,
    CARPET,
    ALLY,
};

const MinimapObjectCropParams: Record<MinimapObjectType, CropParams> = (function (original: Record<MinimapObjectType, number[]>) {
    const new_ = {} as Record<MinimapObjectType, CropParams>;
    for (let keys of Object.keys(original)) {
        let key = parseInt(keys) as MinimapObjectType;
        new_[key] = [
            (original[key][0]) * TSIZE,
            (original[key][1] + 24) * TSIZE,
            TSIZE, TSIZE] as CropParams;
    }
    return new_;
})({
    [MinimapObjectType.PLAYER]: [0, 0],
    [MinimapObjectType.PARTNER]: [1, 0],
    [MinimapObjectType.ENEMY]: [2, 0],
    [MinimapObjectType.ALLY]: [3, 0],
    [MinimapObjectType.STAIRS]: [0, 1],
    [MinimapObjectType.TRAP]: [1, 1],
    [MinimapObjectType.ITEM]: [2, 1],
    [MinimapObjectType.CARPET]: [3, 1],
});

enum MinimapTilesVariants {
    /** Not explored */
    NOT_VISITED = 0,
    /** Visited because of mode */
    CHARTED = 1,
    /** Visited once */
    VISITED = 2,
    /** Currentyl there */
    VISITING = 3,
};


export class Minimap {
    /** The style of the minimap */
    public mode: MinimapMode = MinimapMode.DEFAULT;

    /** The minimap texture image */
    private texture!: HTMLImageElement;
    private floor!: DungeonFloor;
    /** The last position of the visited minimap */
    private lastPosition!: Vec2;

    /** The tilings for the ground tiles */
    private wallTilings!: ByteGrid;
    /** The tilings for the water tiles */
    private waterTilings!: ByteGrid;
    /** The positions that have been visited already */
    private explored!: ByteGrid;

    /** Tiles context */
    private tiles!: CanvasRenderingContext2D;
    /** Objects context */
    private objects!: CanvasRenderingContext2D;

    /** Creates a new minimap */
    constructor() {
        this.tiles = Canvas.create(0, 0);
        this.objects = Canvas.create(0, 0);
    }

    /** Initializes the minimap with data from the loaded floor */
    public async init(floor: DungeonFloor, mode = MinimapMode.DEFAULT) {
        this.mode = mode;
        this.floor = floor;
        // Update the tiles size
        this.tiles.canvas.width = this.floor.grid.width * TSIZE;
        this.tiles.canvas.height = this.floor.grid.height * TSIZE;
        // Update the objects size
        this.objects.canvas.width = this.tiles.canvas.width;
        this.objects.canvas.height = this.tiles.canvas.height;

        this.texture = await AssetsLoader.loadMinimap();
        this.explored = new ByteGrid(...this.floor.grid.size.xy).fill(this.getStartingState());
        this.updateTilings();
    }

    /** Returns the starting state of the minimap */
    private getStartingState() {
        return this.mode === MinimapMode.DEFAULT ? MinimapTilesVariants.CHARTED : MinimapTilesVariants.NOT_VISITED;
    }

    /** Draws the minimap hud */
    public update(position?: Vec2) {
        // Update the tilings if needed
        if (!position) this.updateTilings();
        // If the position is null, then use the last position
        if (!position) position = this.lastPosition;
        // Update the last position
        else this.lastPosition = position;
        // Update the view
        this.updateExplored(position);
        // Draw the tiles
        this.drawTiles();
        // Draw the objects
        this.drawObjects();
    }

    /** Should be run every time the map changes */
    private updateTilings() {
        // Copy the grid
        const ground = this.floor.grid.copy();
        // And change it to a map of not_walls=1 and walls=0
        ground.data = ground.data.map((tile) => DungeonGrid.isObstacle(tile) ? 0 : 1);
        // Save the tilings
        this.wallTilings = ground.binaryMapTilings();

        // Update the water tilings
        const water = this.floor.grid.copy();
        // Change it to a map of water=1 and not_water=0
        water.data = water.data.map((tile) => tile === Tile.WATER ? 1 : 0);
        // Save the tilings
        this.waterTilings = water.binaryMapTilings();
    }

    /** Puts there markers in the correct position
     * based on the given position
     */
    private updateExplored(position: Vec2) {
        // Replace all visiting with visited
        this.explored.replace(MinimapTilesVariants.VISITED, MinimapTilesVariants.VISITING);
        // Get the view area
        const visited = this.floor.getActionArea(position).replace(MinimapTilesVariants.VISITING);
        // Update the explored grid with new data
        this.explored.setIfNotZero(visited);
    }

    /** Draws the tiles on the minimap */
    private drawTiles() {
        // Clear the old stuff
        Canvas.clear(this.tiles);
        // Draw the tilemap
        for (const [pos, tile] of this.wallTilings) {
            if (tile === Tiling.BLANK) continue;
            let visited: MinimapTilesVariants = this.explored.get(pos);
            if (visited === MinimapTilesVariants.NOT_VISITED) continue;
            const x = pos.x * TSIZE;
            const y = pos.y * TSIZE;
            // Visited is either VISITING or VISITED, so -1 gets you 0 or 1, which is the offset in the texture
            const tileParams = DungeonTiling.getCrop(tile, Tile.WALL, visited - 1, TilingTextureMode.TEXTURE, TSIZE);
            this.tiles.drawImage(this.texture, ...tileParams, x, y, TSIZE, TSIZE);
            // Draw the water tiles
            if (this.floor.grid.get(pos) !== Tile.WATER) continue;
            const waterParams = DungeonTiling.getCrop(this.waterTilings.get(pos), Tile.WALL, 3, TilingTextureMode.TEXTURE, TSIZE);
            this.tiles.drawImage(this.texture, ...waterParams, x, y, TSIZE, TSIZE);
        }
    }

    private drawObject(pos: Vec2, type: MinimapObjectType) {
        const [px, py] = pos.xy;
        this.objects.drawImage(this.texture, ...MinimapObjectCropParams[type], px * TSIZE, py * TSIZE, TSIZE, TSIZE);
    }

    /** Draws the objects on the minimap */
    private drawObjects() {
        // Clear the old stuff
        Canvas.clear(this.objects);

        // Draw the carpets if any
        for (const object of this.floor.objects) {
            const objpos = object.position;
            // Draw if the object is on a tile you have visited or is at least charted
            if (this.explored.get(objpos) === MinimapTilesVariants.NOT_VISITED) continue;
            // For carpets
            if (object instanceof DungeonCarpet) {
                this.drawObject(objpos, MinimapObjectType.CARPET);
            }
        }
        // Draw other objects
        for (const object of this.floor.objects) {
            const objpos = object.position;
            // Draw if the object is on a tile you have visited or is at least charted
            if (this.explored.get(objpos) === MinimapTilesVariants.NOT_VISITED) continue;
            // Skip carpets
            if (object instanceof DungeonCarpet) continue;
            // For items
            if (object instanceof DungeonItem)
                this.drawObject(objpos, MinimapObjectType.ITEM);
            // For tiles
            if (object instanceof DungeonTile && !object.isHidden) {
                // For stairs
                if (object.isStairs) this.drawObject(objpos, MinimapObjectType.STAIRS);
                // For traps
                else this.drawObject(objpos, MinimapObjectType.TRAP);
            }
        }
        // Draw the enemies
        for (const enemy of this.floor.pokemon.getEnemies()) {
            const enemypos = enemy.position;
            // Draw if the enemy is on a tile you are visiting
            // if (this.explored.get(enemypos) === MinimapTilesVariants.VISITING) {
                this.drawObject(enemypos, MinimapObjectType.ENEMY);
            // }
        }
        // Draw the player
        this.drawObject(this.floor.pokemon.getLeader().position, MinimapObjectType.PLAYER);
        // Draw the partners
        for (const partner of this.floor.pokemon.getPartners()) {
            this.drawObject(partner.position, MinimapObjectType.PARTNER);
        }
    }

    /** Creates the canvas element and appends it to the ui */
    public getElement(): HTMLElement {
        const minimap = document.createElement("div");
        minimap.classList.add("minimap");
        minimap.appendChild(this.tiles.canvas);
        minimap.appendChild(this.objects.canvas);
        const tilesStyle = this.tiles.canvas.style;
        const objctStyle = this.objects.canvas.style;
        tilesStyle.position = "absolute";
        tilesStyle.top = "0";
        tilesStyle.left = "0";
        objctStyle.position = "absolute";
        objctStyle.top = "0";
        objctStyle.left = "0";
        minimap.style.position = "absolute";
        minimap.style.top = "0";
        minimap.style.left = "0";
        minimap.style.pointerEvents = "none";
        minimap.style.opacity = "0.6";
        return minimap;
    }

    static getStyleFromLightLevel(lightLevel: LightLevel) {
        switch (lightLevel) {
            case LightLevel.NORMAL:
                return MinimapMode.DEFAULT;
            case LightLevel.DARK:
                return MinimapMode.OBSCURED;
            case LightLevel.DARKEST:
                return MinimapMode.OBSCURED;
            case LightLevel.BRIGHT:
                return MinimapMode.DEFAULT;
        }
    }

}