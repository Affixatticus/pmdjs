import { Tiles } from "../../data/tiles";
import { V2, Vec2 } from "../../utils/vectors";
import { DungeonTiling, Tilings } from "./tiling";

export class ByteGrid {
    private _width: number;
    private _height: number;
    private _data: Uint8Array;

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
        this._data = new Uint8Array(width * height);
    }

    public fill(value: number) {
        this._data.fill(value);
    }

    public get(x: number, y: number) {
        if (x < 0 || x >= this._width || y < 0 || y >= this._height)
            return Tiles.OUT_OF_BOUNDS;
        return this._data[y * this._width + x];
    }

    public set(x: number, y: number, value: number) {
        if (x < 0 || x >= this._width || y < 0 || y >= this._height)
            return;
        this._data[y * this._width + x] = value;
    }

    public get width() {
        return this._width;
    }

    public get height() {
        return this._height;
    }

    public get data() {
        return this._data;
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, number]> {
        for (let y = 0; y < this._height; y++)
            for (let x = 0; x < this._width; x++)
                yield [V2(x, y), this.get(x, y)];
    }

    public getUniqueValues() {
        const values = new Set<number>();

        for (const [_pos, value] of this)
            values.add(value);

        return values;
    }

    // Checks if the given position is inside the grid
    public isInside(x: number, y: number) {
        return x >= 0 && x < this._width && y >= 0 && y < this._height;
    }
    /** Loops through the items of a subgrid; the subgrid is defined by the given position and size.
     * clamps the size to be within the grid size. */
    public *iterGrid(pos: Vec2, size: Vec2): IterableIterator<[Vec2, number]> {
        const x0 = Math.max(0, pos.x);
        const y0 = Math.max(0, pos.y);
        const x1 = Math.min(this._width, pos.x + size.x);
        const y1 = Math.min(this._height, pos.y + size.y);

        for (let y = y0; y < y1; y++)
            for (let x = x0; x < x1; x++)
                yield [V2(x, y), this.get(x, y)];
    }

    public getNeighbors(x: number, y: number) {
        return [
            this.get(x - 1, y - 1), this.get(x, y - 1), this.get(x + 1, y - 1),
            this.get(x - 1, y), this.get(x + 1, y),
            this.get(x - 1, y + 1), this.get(x, y + 1), this.get(x + 1, y + 1)
        ];
    }

    /** Returns a random position at the middle of a square of 3x3 0's */
    public getOpenPosition(): Vec2 | undefined {
        const openPositions: Vec2[] = [];

        for (let y = 1; y < this._height - 1; y++)
            for (let x = 1; x < this._width - 1; x++) {
                if (this.get(x, y) !== Tiles.FLOOR)
                    continue;

                const neighbors = this.getNeighbors(x, y);

                if (neighbors.every(n => n === Tiles.FLOOR))
                    openPositions.push(V2(x, y));
            }

        if (openPositions.length === 0)
            return undefined;

        return openPositions[Math.floor(Math.random() * openPositions.length)];
    }

    /** Returns a random position where the value is 0 */
    public getFreePosition() {
        const freePositions: Vec2[] = [];

        for (let y = 0; y < this._height; y++)
            for (let x = 0; x < this._width; x++) {
                if (this.get(x, y) === Tiles.FLOOR)
                    freePositions.push(V2(x, y));
            }

        if (freePositions.length === 0)
            return undefined;

        return freePositions[Math.floor(Math.random() * freePositions.length)];
    }
}

export class DungeonGrid extends ByteGrid {
    private _mapsTilingsCache: Map<Tiles, ByteGrid> = new Map();

    constructor(width: number, height: number) {
        super(width, height);
    }

    /** Returns a new grid with each cell changed to the correct tiling based on the given tile */
    public mapTilingsFor(tile: Tiles, ignoreTiles: Tiles[] = [], update?: boolean): ByteGrid {
        if (this._mapsTilingsCache.has(tile) && !update)
            return this._mapsTilingsCache.get(tile)!;

        const tilingGrid = new ByteGrid(this.width, this.height);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.get(x, y) !== tile) {
                    tilingGrid.set(x, y, Tilings.UNDEFINED);
                    continue;
                }

                // Get the adjacent tiles
                const neighbors = this.getNeighbors(x, y);
                // Convert the adjacent tiles to a boolean if they are the same as the tile
                const neighborsEqualToTile = neighbors.map(t => t === tile || ignoreTiles.includes(t));
                // Get the tiling for the neighbors
                const tiling = DungeonTiling.getTiling(neighborsEqualToTile);
                tilingGrid.set(x, y, tiling);
            }
        }

        this._mapsTilingsCache.set(tile, tilingGrid);
        return tilingGrid;
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, Tiles]> {
        for (const [pos, _value] of super[Symbol.iterator]())
            yield [pos, this.get(pos.x, pos.y)];
    }
}