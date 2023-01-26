import { Tile } from "../../data/tiles";
import Random from "../../utils/random";
import { V2, Vec2 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";
import { DungeonCarpet } from "../objects/carpet";
import { DungeonPokemon } from "../objects/pokemon";
import { DungeonTiling, NeighborsLookupTable } from "./tiling";

const ROOM_VIEW_RADIUS = V2(21, 21);
const ROOM_VIEW_RADIUS_HALF = V2(10, 10);
const CORRIDOR_VIEW_RADIUS = 1;
const CORRIDOR_VIEW_AREA = V2(CORRIDOR_VIEW_RADIUS * 2 + 1, CORRIDOR_VIEW_RADIUS * 2 + 1);

export class ByteGrid {
    private _width: number;
    private _height: number;
    private _data: Uint8Array;

    constructor(width: number, height: number, data?: Uint8Array) {
        this._width = width;
        this._height = height;
        this._data = data ?? new Uint8Array(width * height);
    }

    public fill(value: number) {
        this._data.fill(value);
        return this;
    }

    public getXY(x: number, y: number) {
        if (!this.isInside(x, y))
            return -1;

        return this._data[y * this._width + x];
    }

    public get(position: Vec2) {
        return this.getXY(position.x, position.y);
    }

    public setXY(x: number, y: number, value: number) {
        if (!this.isInside(x, y))
            return;

        this._data[y * this._width + x] = value;
    }

    public set(position: Vec2, value: number) {
        this.setXY(position.x, position.y, value);
    }

    public get width() {
        return this._width;
    }

    public get height() {
        return this._height;
    }

    public get size(): Vec2 {
        return V2(this.width, this.height);
    }

    public get data() {
        return this._data;
    }
    public set data(data: Uint8Array) {
        this._data = data;
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, number]> {
        for (let y = 0; y < this._height; y++)
            for (let x = 0; x < this._width; x++)
                yield [V2(x, y), this.getXY(x, y)];
    }

    public getUniqueValues() {
        const values = new Set<number>();

        for (const [, value] of this)
            values.add(value);

        return values;
    }

    public copy() {
        return new ByteGrid(this.width, this.height, this._data.map(e => e));
    }

    // Checks if the given position is inside the grid
    public isInside(x: number, y: number) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
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
                yield [V2(x, y), this.getXY(x, y)];
    }

    public *getNeighborsPositions(x: number, y: number, range: number = 1) {
        for (let _y = y - range; _y <= y + range; _y++)
            for (let _x = x - range; _x <= x + range; _x++) {
                // Skip the center
                if (_x === x && _y === y)
                    continue;

                const value = this.getXY(_x, _y);

                yield [V2(_x, _y), value] as [Vec2, number];
            }
    }

    public getNeighbors(position: Vec2) {
        return this.getNeighborsXY(position.x, position.y);
    }

    public getNeighborsXY(x: number, y: number) {
        return [
            this.getXY(x - 1, y - 1), this.getXY(x, y - 1), this.getXY(x + 1, y - 1),
            this.getXY(x - 1, y), /**********************/  this.getXY(x + 1, y),
            this.getXY(x - 1, y + 1), this.getXY(x, y + 1), this.getXY(x + 1, y + 1)
        ];
    }

    /** Returns a random position at the middle of a square of 3x3 0's */
    public getOpenPosition(): Vec2 | undefined {
        const openPositions: Vec2[] = [];

        for (let y = 2; y < this._height - 1; y++)
            for (let x = 2; x < this._width - 1; x++) {
                if (this.getXY(x, y) !== Tile.FLOOR)
                    continue;

                const neighbors = this.getNeighborsXY(x, y);

                if (neighbors.every(n => n === Tile.FLOOR))
                    openPositions.push(V2(x, y));
            }

        return (openPositions.length === 0) ? undefined : Random.choose(openPositions);
    }

    /** Returns a random position where the value is 0 */
    public getFreePosition() {
        const freePositions: Vec2[] = [];

        for (let y = 0; y < this._height; y++)
            for (let x = 0; x < this._width; x++) {
                if (this.getXY(x, y) === Tile.FLOOR)
                    freePositions.push(V2(x, y));
            }

        if (freePositions.length === 0)
            return undefined;

        return Random.choose(freePositions);
    }


    public getRandomPosition() {
        return V2(
            Random.int(0, this._width - 1),
            Random.int(0, this._height - 1)
        );
    }

    /** Returns a sub grid of this grid  */
    public getSubGrid(start: Vec2, size: Vec2): ByteGrid {
        const grid = new ByteGrid(size.x, size.y);

        for (let y = 0; y < size.y; y++)
            for (let x = 0; x < size.x; x++)
                grid.setXY(x, y, this.getXY(start.x + x, start.y + y));

        return grid;
    }

    public toOffsetGrid(start: Vec2, size: Vec2) {
        const grid = new OffsetGrid(...size.xy, start);

        for (const [pos] of grid) {
            const [x, y] = pos.xy;
            grid.setXY(x, y, this.getXY(x, y));
        }

        return grid;
    }

    /** Returns a list of all possible positions */
    public getPositions(): Vec2[] {
        const positions: Vec2[] = [];

        for (let y = 0; y < this._height; y++)
            for (let x = 0; x < this._width; x++)
                positions.push(V2(x, y));

        return positions;
    }

    /** Sets to zero all points that are occupied by:
     * - Fellow pokemon
     * - objects
     * - untraversable tiles for the specified pokemon
     */
    public hideOccupiedPositions(floor: DungeonFloor, pokemon: DungeonPokemon = floor.pokemon.getLeader()) {
        // Hide under all the pokemon on the floor
        for (const pokemon of floor.pokemon.getAll()) {
            this.set(pokemon.position, 0);
        }
        // Hide under all the objects on the floor
        for (const object of floor.objects) {
            // But keep it on the carpet
            if (object instanceof DungeonCarpet) continue;
            this.set(object.position, 0);
        }
        // Hide under all unpassable tiles
        for (const [pos, visible] of this) {
            if (!visible) continue;
            if (floor.isObstacle(...pos.xy, pokemon)) this.set(pos, 0);
        }
        return this;
    }

    public paste(mask: ByteGrid) {
        for (const [pos, tile] of mask) {
            this.set(pos, tile);
        }
    }

    public setIfNotZero(mask: ByteGrid) {
        for (const [pos, tile] of mask) {
            // If the mask's tile is 0, skip it
            if (tile === 0) continue;
            this.set(pos, tile);
        }
        return this;
    }

    /** Prints the grid as a table of hexadecimal bytes with alternating backgrounds */
    public print() {
        let str = '';
        for (let y = 0; y < this._height; y++) {
            for (let x = 0; x < this._width; x++) {
                const tile = this.getXY(x, y);
                str += tile.toString(16).padStart(2, '0') + ' ';
            }
            str += '\n';
        }
        // Use a colored console log
        console.log(`%c${str}`, 'font-family: monospace; font-size: 12px;');
    }

    public replace(new_: number, old: number = 1) {
        this.data = this.data.map((t) => t === old ? new_ : t);
        return this;
    }

    public binaryMapTilings() {
        const tilingsGrid = this.copy();

        for (const [pos, tile] of this) {
            if (tile === 0) {
                tilingsGrid.set(pos, 255);
                continue;
            }
            const neighbors = this.getNeighbors(pos).map((t) => t ? true : false);
            const tiling = NeighborsLookupTable[neighbors.map(n => n ? "1" : "0").join("")]
            tilingsGrid.set(pos, tiling);
        }

        return tilingsGrid;
    }

    public updateRow(row: number, predicate: (value: number, index: number) => number) {
        if (row < 0) row = this._height + row;
        for (let x = 0; x < this._width; x++) {
            // this.set(x, row, predicate(this.get(x, row), x));
            this.data[row * this._width + x] = predicate(this.data[row * this._width + x], x);
        }
    }

    public updateColumn(column: number, predicate: (value: number, index: number) => number) {
        if (column < 0) column = this._width + column;
        for (let y = 0; y < this._height; y++) {
            // this.set(column, y, predicate(this.get(column, y), y));
            this.data[y * this._width + column] = predicate(this.data[y * this._width + column], y);
        }
    }

    public floodFill(point: Vec2, set: number) {
        const queue = [point];
        const replace = this.get(point);

        while (queue.length) {
            const position = queue.pop()!;

            if (this.get(position) === set) continue;
            if (this.get(position) !== replace) continue;

            this.set(position, set);

            queue.push(V2(position.x + 1, position.y));
            queue.push(V2(position.x - 1, position.y));
            queue.push(V2(position.x, position.y + 1));
            queue.push(V2(position.x, position.y - 1));
        }
    }
}

/** A reduced size grid that has an iterator with the correct x and y */
export class OffsetGrid extends ByteGrid {
    private _start: Vec2;

    constructor(width: number, height: number, start: Vec2, data?: Uint8Array) {
        super(width, height, data);
        this._start = start;
    }

    public toString() {
        return `OffsetGrid(${this.width}, ${this.height}, ${this.start})`;
    }
    public hash() {
        return `${this.width},${this.height},${this.start.x},${this.start.y}`;
    }

    public get start() {
        return this._start;
    }

    public setXY(x: number, y: number, value: number) {
        super.setXY(x - this.start.x, y - this.start.y, value);
    }

    public set(position: Vec2, value: number) {
        this.setXY(position.x, position.y, value);
    }

    public getXY(x: number, y: number) {
        return super.getXY(x - this.start.x, y - this.start.y);
    }

    public get(position: Vec2) {
        return this.getXY(position.x, position.y);
    }

    public getValueAt(x: number, y: number) {
        return super.getXY(x, y);
    }

    public getActualPosition(x: number, y: number): Vec2 {
        return V2(x + this.start.x, y + this.start.y);
    }

    /** Converts this offsetGrid to a grid */
    public toOrigin() {
        return this.getSubGrid(V2(0, 0), this.size);
    }

    /** Returns `true` if the two OffsetGrids are the same */
    public equals(other: OffsetGrid) {
        if (!this.start.equals(other.start) || !this.size.equals(other.size))
            return false;

        for (const [pos, value] of this)
            if (value !== other.get(pos))
                return false;

        return true;
    }

    /** Returns a new OffsetGrid with its size increased by the amount
     * and all internal tiles=1 expanded by the amount
     */
    public inflate(amount: number) {
        const newGrid = new OffsetGrid(this.width + amount * 2, this.height + amount * 2, this.start.move(-amount));

        // Loop through all the tiles in the grid
        for (const [pos, get] of this) {
            if (get !== 1) continue;
            // Set all the neighboring tiles to 1
            for (const [neighborPos, _]
                of this.getNeighborsPositions(...pos.xy, amount)) {
                newGrid.set(neighborPos, 1);
            }
            newGrid.set(pos, 1);
        }

        return newGrid;
    }

    public inflateFromGrid(amount: number, grid: ByteGrid) {
        const newGrid = new OffsetGrid(this.width + amount * 2, this.height + amount * 2, this.start.move(-amount));
        // Loop through all the tiles in the grid
        for (const [pos, tile] of newGrid) {
            if (tile === Tile.OUT_OF_BOUNDS) continue;
            newGrid.set(pos, grid.get(pos));
        }
        return newGrid;
    }

    /** Removes the last rows and columns of all 0s from the original grid */
    public trim() {
        let offsetX = 0;
        let offsetY = 0;
        let newWidth = this.width;
        let newHeight = this.height;

        // Determine top and bottom rows to remove
        for (let y = 0; y < this.height; y++) {
            if (this.data.slice(y * this.width, (y + 1) * this.width).every(v => v === 0)) {
                offsetY++, newHeight--;
            } else break;
        }
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.data.slice(y * this.width, (y + 1) * this.width).every(v => v === 0)) {
                newHeight--;
            } else break;
        }

        // Determine left and right columns to remove
        for (let x = 0; x < this.width; x++) {
            if (this.data.every((v, i) => (i % this.width === x) ? v === 0 : true)) {
                offsetX++, newWidth--;
            } else break;
        }
        for (let x = this.width - 1; x >= 0; x--) {
            if (this.data.every((v, i) => (i % this.width === x) ? v === 0 : true)) {
                newWidth--;
            } else break;
        }

        const newStart = this.start.add(V2(offsetX, offsetY));
        const newGrid = new OffsetGrid(newWidth, newHeight, newStart);
        for (const [pos, value] of this)
            newGrid.set(pos, value);

        return newGrid;
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, number]> {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++) {
                const pos = this.start.add(V2(x, y));
                yield [pos, this.get(pos)];
            }
    }

    public copy() {
        const newOffsetGrid = new OffsetGrid(this.width, this.height, this.start);
        newOffsetGrid.data = new Uint8Array(this.data.subarray(0, this.data.length));
        return newOffsetGrid;
    }

    public print() {
        let str = '';

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.get(this.start.add(V2(x, y)));
                str += tile.toString(16).padStart(2, '0') + ' ';
            }
            str += '\n';
        }
        console.log("Offset Grid: (start=", this.start, "size=", this.size, ")");
        console.log(str);
    }
}

export class DungeonGrid extends ByteGrid {
    static listOfWalkableTiles = [
        Tile.FLOOR, Tile.TILE, Tile.ITEM, Tile.CLEAR_TILE, Tile.WATER,
        Tile.KECLEON_CARPET, Tile.KECLEON_ITEM, Tile.KECLEON_MARKER];

    static fromByteGrid(byteGrid: ByteGrid): DungeonGrid {
        return new DungeonGrid(byteGrid.width, byteGrid.height, byteGrid.data);
    }

    constructor(width: number, height: number, data?: Uint8Array) {
        super(width, height, data);
    }

    /** Returns a new grid with each cell changed to the correct tiling based on the given parameters
     * @param tile The tile to check for
     * @param ignoreTiles These tiles will create an empty spot in the tiling, as if the tiling was cut off
     * @param includeTiles These tiles will be treated the same as the tile
     * @param start The start position of the grid (to get the tilings subgrid with all the context)
     * @param size The size of the grid (to get the tilings subgrid with all the context)
     */
    public mapTilingsFor(tile: number, ignoreTiles: number[] = [], includeTiles: number[] = [], start: Vec2 = V2(0, 0), size: Vec2 = this.size): OffsetGrid {
        const tilingGrid = new OffsetGrid(...size.xy, start);

        for (let y = start.y; y < start.y + size.y; y++) {
            for (let x = start.x; x < start.x + size.x; x++) {
                tilingGrid.setXY(x, y, (DungeonTiling.getGridTiling(
                    this.getXY(x, y), this.getNeighborsXY(x, y),
                    tile, ignoreTiles, includeTiles)));
            }
        }

        return tilingGrid;
    }

    /** Returns true if the tile is a wall */
    public isWall(tile: Tile | number) {
        return tile === Tile.WALL || tile === Tile.UNBREAKABLE_WALL;
    }

    /** Returns true if this tile is walkable for a given pokemon */
    public isWalkable(tile: number): boolean {
        return !this.isWall(tile);
    }

    /** Checks if the specified position is part of a corridor
     * @param position The position to check
     * @returns `true` if the position is part of a corridor, `false` if it's part of a room
     */
    public isCorridor(position: Vec2) {
        // The position is a corridor, if the 3x3 grid it at its center
        // does not contain a 2x2 grid of walkable tiles
        const subGrid = DungeonGrid.fromByteGrid(this.getSubGrid(position.move(-1), V2(3, 3)));
        const walkable = [...subGrid.data].map((t) => subGrid.isWalkable(t));
        // Get the grid of values
        const [a0, a1, a2] = walkable.slice(0, 3);
        const [b0, b1, b2] = walkable.slice(3, 6);
        const [c0, c1, c2] = walkable.slice(6, 9);
        // First square is all walkable, so it's a room
        if (a0 && a1 && b0 && b1) return false;
        // Second square is all walkable, so it's a room
        if (a1 && a2 && b1 && b2) return false;
        // Third square is all walkable, so it's a room
        if (b0 && b1 && c0 && c1) return false;
        // Fourth square is all walkable, so it's a room
        if (b1 && b2 && c1 && c2) return false;
        // If no walkable tiles, it's a room        
        return true;
    }

    /** Gets the tiles that the player sees if it's in a corridor */
    public getCorridorViewArea(position: Vec2) {
        // You have a view radius, all tiles that fit in that and are isWalkable are 1, others are 0
        const viewArea = this.toOffsetGrid(position.move(-CORRIDOR_VIEW_RADIUS), CORRIDOR_VIEW_AREA);
        for (const [pos, tile] of viewArea) {
            if (pos.dist(position) <= CORRIDOR_VIEW_RADIUS && this.isWalkable(tile))
                viewArea.set(pos, 1);
            else
                viewArea.set(pos, 0);
        }
        return viewArea;
    }

    /** Gets the tiles that the player sees if it's in a room */
    public getRoomViewArea(position: Vec2) {
        // Get a subgrid of this grid, with a maximum size
        const maxSize = ROOM_VIEW_RADIUS;
        const subGrid = this.toOffsetGrid(position.subtract(ROOM_VIEW_RADIUS_HALF), maxSize);

        // Calculate a map of possible rooms
        for (const [pos, tile] of subGrid) {
            if (!this.isWalkable(tile) || this.isCorridor(pos))
                subGrid.set(pos, 0);
            else
                subGrid.set(pos, 1);
        }

        // Flood fill the map to find the room the position is in
        subGrid.floodFill(position, 2);

        // Replace everything that is not 2 with 0 amd everything that is 2 with 1
        for (const [pos, tile] of subGrid) {
            if (tile === 2)
                subGrid.set(pos, 1);
            else
                subGrid.set(pos, 0);
        }

        return subGrid.trim();
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, Tile]> {
        for (const [pos, _value] of super[Symbol.iterator]())
            yield [pos, this.get(pos)];
    }

}