import { DungeonFloorInfo } from "../../data/dungeons";
import { ItemChance } from "../../data/items";
import { TileObjects, Tiles, TrapChance } from "../../data/tiles";
import Random from "../../utils/random";
import { Vec2 } from "../../utils/vectors";
import { DungeonGrid } from "../map/grid";
import { DungeonCarpet } from "./carpet";
import { DungeonItem } from "./item";
import { DungeonObject } from "./object";
import { DungeonTile } from "./tile";

export class DungeonObjectGenerator {
    private grid: DungeonGrid;

    private items!: [number, number][];
    private traps!: [number, number][];

    constructor(grid: DungeonGrid, info: DungeonFloorInfo) {
        this.grid = grid;

        this.items = this.extractItemChances(info?.items ?? null);
        this.traps = this.extractTrapChances(info?.traps ?? null);
    }

    private getRandomItem(): number {
        const rand = Random.float(1);

        for (const [id, chance] of this.items) {
            if (rand < chance)
                return id;
        }
        throw new Error('No item was chosen');
    }

    private getRandomTrap(): number {
        const rand = Random.float(1);

        for (const [id, chance] of this.traps) {
            if (rand < chance)
                return id;
        }
        throw new Error('No trap was chosen');
    }

    private extractItemChances(items: ItemChance[] | null): [number, number][] {
        if (!items) return [];

        const chances: [number, number][] = [];

        let chance = 0;
        for (const item of items) {
            chance += item.chance;
            chances.push([item.id, chance]);
        }

        // Update the chances so that the maximum chance is 1
        for (let i = 0; i < chances.length; i++) {
            const [id, chance] = chances[i];
            chances[i] = [id, chance / chances[chances.length - 1][1]];
        }

        return chances;
    }

    private extractTrapChances(traps: TrapChance[] | null): [number, number][] {
        if (!traps) return [];

        const chances: [number, number][] = [];

        let chance = 0;
        for (const trap of traps) {
            chance += trap.chance;
            chances.push([trap.id, chance]);
        }

        // Update the chances so that the maximum chance is 1
        for (let i = 0; i < chances.length; i++) {
            const [id, chance] = chances[i];
            chances[i] = [id, chance / chances[chances.length - 1][1]];
        }

        return chances;
    }

    public generate(): DungeonObject[] {
        const list: DungeonObject[] = [];
        // Loop through the grid
        for (const [pos, tile] of this.grid) {
            if (tile === Tiles.UNOBSTRUCTABLE)
                this.clearTile(pos);
            else if (tile === Tiles.MARKER_STAIRS)
                list.push(this.createStairs(pos));
            else if (tile === Tiles.MARKER_ITEM)
                list.push(this.createItem(pos));
            else if (tile === Tiles.MARKER_TRAP)
                list.push(this.createTrap(pos));
            else if (tile === Tiles.KECLEON_CARPET)
                list.push(this.createKecleonCarpet(pos));
            else if (tile === Tiles.KECLEON_ITEM)
                list.push(...this.createKecleonItem(pos));
            else if (tile === Tiles.KECLEON_MARKER) {
                list.push(this.createKecleonCarpet(pos));
                this.clearTile(pos, Tiles.KECLEON_MARKER);
            }
        }

        return list;
    }

    /** Clears the tile */
    private clearTile(pos: Vec2, tile: Tiles = Tiles.FLOOR) {
        this.grid.set(pos.x, pos.y, tile);
    }

    // ANCHOR Create x functions
    private createStairs(pos: Vec2) {
        const object = new DungeonTile(pos, TileObjects.STAIRS_DOWN, false, true);
        this.clearTile(pos, Tiles.CLEAR_TILE);
        return object;
    }
    private createItem(pos: Vec2) {
        const item = this.getRandomItem();
        const object = new DungeonItem(pos, item);
        this.clearTile(pos, Tiles.ITEM);
        return object;
    }
    private createTrap(pos: Vec2) {
        const trap = this.getRandomTrap();
        // TODO                                // true
        const object = new DungeonTile(pos, trap, false, false);
        this.clearTile(pos, Tiles.CLEAR_TILE);
        return object;
    }
    private createKecleonCarpet(pos: Vec2) {
        const object = new DungeonCarpet(pos, TileObjects.KECLEON_CARPET);
        this.clearTile(pos, Tiles.CLEAR_TILE);
        return object;
    }
    private createKecleonItem(pos: Vec2) {
        const item = this.getRandomItem();
        const object = new DungeonItem(pos, item);
        const carpet = this.createKecleonCarpet(pos);
        return [object, carpet];
    }
}