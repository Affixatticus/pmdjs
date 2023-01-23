import { LightLevel } from "../../data/dungeons";
import { Tile } from "../../data/tiles";
import { V2, Vec2 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";
import { ByteGrid } from "../map/grid";
import { DungeonCarpet } from "../objects/carpet";
import { DungeonItem } from "../objects/item";
import { DungeonPokemonType } from "../objects/pokemon";
import { DungeonTile } from "../objects/tile";


export enum MinimapStyle {
    DEFAULT,
    OBSCURED,
};

const MM_TILE_SIZE = 12;
const MM_TILE_THIRD = 4;
const MM_BORDER_SIZE = 4;

const MM_COLORS = {
    PLAYER: "#0f0",
    PARTNER: "#ff0",
    ENEMY: "#f00",
    ITEM: "#00f",
    TRAP: "#800",
    STAIRS: "#fff",
    TILE: "#fff2",
    BORDER_DARK: "#111",
    BORDER_LIGHT: "#eee",
    CARPET: "#f804",
    WATER: "#08f8",
};

export class Minimap {
    /** An ever-changing image with all non-static objects on it */
    private foreground: HTMLCanvasElement;
    private fgCtx: CanvasRenderingContext2D;
    /** The image onto which non-static minimap objects are drawn */
    private background: HTMLCanvasElement;
    private bgCtx: CanvasRenderingContext2D;

    private explorationMap!: ByteGrid;

    /** The style of the minimap */
    public style: MinimapStyle = MinimapStyle.DEFAULT;

    /** Creates a new minimap */
    constructor(style: MinimapStyle) {
        this.foreground = document.createElement("canvas");
        this.fgCtx = this.foreground.getContext("2d")!;
        this.background = document.createElement("canvas");
        this.bgCtx = this.background.getContext("2d")!;
        this.style = style;
    }

    /** Function that is called once the map is generated */
    public init(floor: DungeonFloor) {
        this.foreground.width = this.background.width = floor.grid.width * MM_TILE_SIZE;
        this.foreground.height = this.background.height = floor.grid.height * MM_TILE_SIZE;
        this.explorationMap = new ByteGrid(floor.grid.width, floor.grid.height);
        this.explorationMap.fill(0);
    }


    public isWall(tile: Tile) {
        return tile === Tile.WALL || tile === Tile.UNBREAKABLE_WALL// || tile === Tile.WATER;
    }

    /** Updates the map */
    public update(playerPos: Vec2, floor: DungeonFloor) {
        // Draw the background
        this.updateBackground(playerPos, floor);
        // Update the foreground
        this.updateForeground(playerPos, floor);
    }

    private drawGrid(ctx: CanvasRenderingContext2D, grid: ByteGrid, size: number, color: string) {
        const offset = (size - MM_TILE_SIZE) / 2;
        const isTransparent = color === "transparent";
        if (!isTransparent) ctx.fillStyle = color;
        for (const [pos, tile] of grid) {
            // Draw the tile
            if (tile === 0) continue;
            else ctx.fillStyle = color;
            if (isTransparent)
                ctx.clearRect(pos.x * MM_TILE_SIZE - offset, pos.y * MM_TILE_SIZE - offset, size, size);
            else
                ctx.fillRect(pos.x * MM_TILE_SIZE - offset, pos.y * MM_TILE_SIZE - offset, size, size);
        }
    }

    public getViewGrid(playerPos: Vec2, floor: DungeonFloor) {
        let viewGrid;
        if (this.style === MinimapStyle.DEFAULT) {
            viewGrid = floor.grid.copy();
        } else {
            // Get the offset grid
            viewGrid = floor.grid.getViewArea(playerPos).inflateFromGrid(1, floor.grid);
        }
        viewGrid.data = viewGrid.data.map((tile) => this.isWall(tile) ? 0 : 1);
        return viewGrid;
    }

    /** Updates the wallMap */
    private updateBackground(playerPos: Vec2, floor: DungeonFloor) {
        // Get the offset grid
        const viewGrid = this.getViewGrid(playerPos, floor);
        // Put the data on the exploration map
        this.explorationMap.paste(viewGrid);

        // Draw the offsetMask
        this.bgCtx.fillStyle = "black";
        this.bgCtx.fillRect(0, 0, this.background.width, this.background.height);
        this.bgCtx.clearRect(0, 0, this.background.width, this.background.height);
        this.drawGrid(this.bgCtx, this.explorationMap, MM_TILE_SIZE + MM_BORDER_SIZE, MM_COLORS.BORDER_DARK);
        this.drawGrid(this.bgCtx, this.explorationMap, MM_TILE_SIZE + MM_BORDER_SIZE - 2, MM_COLORS.BORDER_LIGHT);
        this.drawGrid(this.bgCtx, this.explorationMap, MM_TILE_SIZE, "transparent");
        this.drawGrid(this.bgCtx, this.explorationMap, MM_TILE_SIZE, MM_COLORS.TILE);

        // Get the water tiles in the area
        const waterTiles = floor.grid.copy();
        waterTiles.data = waterTiles.data.map((tile) => tile === Tile.WATER ? 1 : 0);
        this.drawGrid(this.bgCtx, waterTiles.applyMask(this.explorationMap), MM_TILE_SIZE, MM_COLORS.WATER);
    }

    private drawTile(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, color: string) {
        const offset = (size - MM_TILE_SIZE) / 2;
        ctx.fillStyle = color;
        ctx.fillRect(pos.x * MM_TILE_SIZE - offset, pos.y * MM_TILE_SIZE - offset, size, size);
    }

    private drawStairs(ctx: CanvasRenderingContext2D, pos: Vec2) {
        const startX = pos.x * MM_TILE_SIZE;
        const startY = pos.y * MM_TILE_SIZE;
        ctx.fillStyle = MM_COLORS.STAIRS;
        ctx.strokeStyle = MM_COLORS.BORDER_DARK;
        const size = MM_TILE_THIRD;
        ctx.beginPath();
        ctx.moveTo(startX + size * 2, startY);
        ctx.lineTo(startX + size * 3, startY);
        ctx.lineTo(startX + size * 3, startY + size * 3);
        ctx.lineTo(startX, startY + size * 3);
        ctx.lineTo(startX, startY + size * 2);
        ctx.lineTo(startX + size, startY + size * 2);
        ctx.lineTo(startX + size, startY + size);
        ctx.lineTo(startX + size * 2, startY + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillRect(startX, startY + size * 2, size, size);
        ctx.fillRect(startX + size, startY + size, size, size * 2);
        ctx.fillRect(startX + size * 2, startY, size, size * 3);
    }

    private drawEntity(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, color: string) {
        ctx.strokeStyle = MM_COLORS.BORDER_DARK;
        // Draw a circle
        const offset = (size - MM_TILE_SIZE) / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x * MM_TILE_SIZE + MM_TILE_SIZE / 2 - offset, pos.y * MM_TILE_SIZE + MM_TILE_SIZE / 2 - offset, size / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    private drawOutlinedTile(ctx: CanvasRenderingContext2D, pos: Vec2, size: number, color: string) {
        this.drawTile(ctx, pos, size, "black");
        this.drawTile(ctx, pos, size - 2, color);
    }

    private updateForeground(playerPos: Vec2, floor: DungeonFloor) {
        this.fgCtx.clearRect(0, 0, this.foreground.width, this.foreground.height);
        // Draw all the carpets
        for (const object of floor.objects) {
            const itemPos = object.position;
            if (this.explorationMap.get(...itemPos.xy) !== 1) continue;
            if (object instanceof DungeonCarpet) {
                this.drawTile(this.fgCtx, object.position, MM_TILE_SIZE, MM_COLORS.CARPET);
            }
        }
        // Draw all the items
        for (const object of floor.objects) {
            const itemPos = object.position;
            if (this.explorationMap.get(...itemPos.xy) !== 1) continue;
            if (object instanceof DungeonItem) {
                this.drawOutlinedTile(this.fgCtx, object.position, MM_TILE_SIZE - 2, MM_COLORS.ITEM);
            } else if (object instanceof DungeonTile) {
                if (!object.isHidden) {
                    if (object.isStairs) {
                        this.drawStairs(this.fgCtx, object.position);
                    } else {
                        this.drawOutlinedTile(this.fgCtx, object.position, MM_TILE_SIZE - 2, MM_COLORS.TRAP);
                    }
                }
            }
        }

        const enemies = floor.pokemon.getEnemies();
        if (enemies.length > 0) {
            const enemyGrid = floor.grid.getViewArea(playerPos).inflateFromGrid(1, floor.grid);
            // Draw all the enemies
            for (const enemy of enemies) {
                const itemPos = enemy.position;
                if (enemyGrid.get(...itemPos.xy) !== 1) continue;

                this.drawEntity(this.fgCtx, enemy.position, MM_TILE_SIZE, MM_COLORS.ENEMY);
            }
        }

        this.drawEntity(this.fgCtx, playerPos, MM_TILE_SIZE, MM_COLORS.PLAYER);
        // Draw all the partners
        for (const partner of floor.pokemon.getPartners()) {
            this.drawEntity(this.fgCtx, partner.position, MM_TILE_SIZE, MM_COLORS.PARTNER);
        }

    }


    /** Creates the canvas element and appends it to the ui */
    public getElement() {
        const div = document.createElement("div");
        div.classList.add("minimap");
        div.style.position = "relative";
        div.style.top = "0px";
        div.style.left = "0px";
        this.background.style.position = "absolute";
        this.foreground.style.position = "absolute";
        this.background.style.top = "0px";
        this.foreground.style.top = "0px";
        this.background.style.left = "0px";
        this.foreground.style.left = "0px";
        this.foreground.style.zIndex = "2";
        this.background.style.zIndex = "1";
        div.style.pointerEvents = "none";
        div.appendChild(this.background);
        div.appendChild(this.foreground);
        return div;
    }

    static getStyleFromLightLevel(lightLevel: LightLevel) {
        switch (lightLevel) {
            case LightLevel.NORMAL:
                return MinimapStyle.DEFAULT;
            case LightLevel.DARK:
                return MinimapStyle.OBSCURED;
            case LightLevel.DARKEST:
                return MinimapStyle.OBSCURED;
            case LightLevel.BRIGHT:
                return MinimapStyle.DEFAULT;
        }
    }

}