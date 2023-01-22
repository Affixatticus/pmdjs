import { Tile } from "../../data/tiles";
import { Direction } from "../../utils/direction";
import Random from "../../utils/random";
import { Rect } from "../../utils/rect";
import { V2, Vec2 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";
import { DungeonCarpet } from "../objects/carpet";
import { DungeonPokemon } from "../objects/pokemon";
import { DungeonTiling } from "./tiling";

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
    }

    public get(x: number, y: number) {
        if (!this.isInside(x, y))
            return -1;

        return this._data[y * this._width + x];
    }

    public set(x: number, y: number, value: number) {
        if (!this.isInside(x, y))
            return;

        this._data[y * this._width + x] = value;
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

    public *[Symbol.iterator](): IterableIterator<[Vec2, number]> {
        for (let y = 0; y < this._height; y++)
            for (let x = 0; x < this._width; x++)
                yield [V2(x, y), this.get(x, y)];
    }

    public getUniqueValues() {
        const values = new Set<number>();

        for (const [, value] of this)
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

    public *getNeighborsPositions(x: number, y: number, range: number = 1) {
        for (let _y = y - range; _y <= y + range; _y++)
            for (let _x = x - range; _x <= x + range; _x++) {
                // Skip the center
                if (_x === x && _y === y)
                    continue;

                const value = this.get(_x, _y);

                yield [V2(_x, _y), value] as [Vec2, number];
            }
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

        for (let y = 2; y < this._height - 1; y++)
            for (let x = 2; x < this._width - 1; x++) {
                if (this.get(x, y) !== Tile.FLOOR)
                    continue;

                const neighbors = this.getNeighbors(x, y);

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
                if (this.get(x, y) === Tile.FLOOR)
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
                grid.set(x, y, this.get(start.x + x, start.y + y));

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
            this.set(...pokemon.position.xy, 0);
        }
        // Hide under all the objects on the floor
        for (const object of floor.objects) {
            // But keep it on the carpet
            if (object instanceof DungeonCarpet) continue;
            this.set(...object.position.xy, 0);
        }
        // Hide under all unpassable tiles
        for (const [pos, visible] of this) {
            if (!visible) continue;
            if (floor.isObstacle(...pos.xy, pokemon)) this.set(...pos.xy, 0);
        }
        return this;
    }
}

/** A reduced size grid that has an iterator with the correct x and y */
export class OffsetGrid extends ByteGrid {
    private _start: Vec2;

    constructor(width: number, height: number, start: Vec2) {
        super(width, height);
        this._start = start;
    }

    public get start() {
        return this._start;
    }

    public set(x: number, y: number, value: number) {
        super.set(x - this.start.x, y - this.start.y, value);
    }

    public get(x: number, y: number) {
        return super.get(x - this.start.x, y - this.start.y);
    }

    public getValueAt(x: number, y: number) {
        return super.get(x, y);
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
            if (value !== other.get(...pos.xy))
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
                newGrid.set(...neighborPos.xy, 1);
            }
            newGrid.set(...pos.xy, 1);
        }

        return newGrid;
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, number]> {
        for (let y = 0; y < this.height; y++)
            for (let x = 0; x < this.width; x++)
                yield [V2(x + this.start.x, y + this.start.y), this.get(x + this.start.x, y + this.start.y)];
    }
}

export class DungeonGrid extends ByteGrid {
    static listOfWalkableTiles = [
        Tile.FLOOR, Tile.TILE, Tile.ITEM, Tile.CLEAR_TILE,
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
        const tilingGrid = new OffsetGrid(...size.spread(), start);

        for (let y = start.y; y < start.y + size.y; y++) {
            for (let x = start.x; x < start.x + size.x; x++) {
                tilingGrid.set(x, y, (DungeonTiling.getGridTiling(
                    this.get(x, y), this.getNeighbors(x, y),
                    tile, ignoreTiles, includeTiles)));
            }
        }

        return tilingGrid;
    }

    /** Returns true if this tile is walkable for a given pokemon */
    public isWalkable(position: Vec2, pokemon?: DungeonPokemon): boolean {
        let tile = this.get(position.x, position.y);
        let isWalkable = DungeonGrid.listOfWalkableTiles.includes(tile);

        if (!isWalkable && pokemon)
            isWalkable ||= pokemon.specialWalkable(tile);

        return isWalkable;
    }

    /** Checks if the specified position is part of a corridor
     * @param position The position to check
     * @returns `true` if the position is part of a corridor, `false` if it's part of a room
     */
    public isCorridor(position: Vec2, pokemon?: DungeonPokemon) {
        // The position is a corridor, if the 3x3 grid it at its center
        // does not contain a 2x2 grid of walkable tiles
        const subGrid = DungeonGrid.fromByteGrid(this.getSubGrid(position.move(-1), V2(3, 3)));

        // Look for a 2x2 subgrid of walkable tiles
        for (let subY = 0; subY < 2; subY++) {
            for (let subX = 0; subX < 2; subX++) {
                // Check all tiles in this subgrid
                let allWalkable = true;
                for (let y = 0; y < 2; y++) {
                    for (let x = 0; x < 2; x++) {
                        if (!subGrid.isWalkable(V2(subX + x, subY + y), pokemon)) {
                            allWalkable = false;
                            break;
                        }
                    }
                    if (!allWalkable) break;
                }
                // Found a 2x2 subgrid of walkable tiles
                if (allWalkable) return false;
            }
        }

        return true;
    }

    public getCorridorViewArea(position: Vec2) {
        const savedPositions: Vec2[] = [position];

        for (const dir of Direction.CARDINAL) {
            const dirVec = dir.toVector();
            const nextPos = position.add(dirVec);

            // Check if the next position is walkable
            if (!this.isWalkable(nextPos)) continue;
            // Add it to the list
            savedPositions.push(nextPos);
            // Exit if you run into a room
            if (!this.isCorridor(nextPos)) continue;
            // Try continuing down the same road
            const nextNextPos = nextPos.add(dirVec);
            if (this.isWalkable(nextNextPos)) {
                savedPositions.push(nextNextPos);
                continue;
            }
            // Try the counter-clockwise direction
            const ccwDir = Direction.ALL[Direction.rollIndex(dir.index - 2)];
            const ccwDirVec = ccwDir.toVector();
            const nextCCWPos = nextPos.add(ccwDirVec);
            // Check if the next position is walkable
            if (this.isWalkable(nextCCWPos)) {
                savedPositions.push(nextCCWPos);
                continue;
            };
            // Try the clockwise direction
            const cwDir = Direction.ALL[Direction.rollIndex(dir.index + 2)];
            const cwDirVec = cwDir.toVector();
            const nextCWPos = nextPos.add(cwDirVec);
            // Check if the next position is walkable
            if (this.isWalkable(nextCWPos)) {
                savedPositions.push(nextCWPos);
                continue;
            }
        }

        // Compose the offsetGrid
        const rect = Rect.fromPositions(savedPositions);
        const offsetGrid = new OffsetGrid(rect.width, rect.height, V2(rect.left, rect.top));

        // Add all the points to the offsetGrid as 1s
        for (const pos of savedPositions) {
            offsetGrid.set(pos.x, pos.y, 1);
        }

        return offsetGrid;
    }

    public getRoomViewArea(position: Vec2) {
        // Find the biggest rectangle that contains all the room tiles
        // Find the top left corner
        let topLeft = position;
        while (!this.isCorridor(topLeft.add(V2(0, -1))) || !this.isCorridor(topLeft.add(V2(0, -2)))) topLeft = topLeft.add(V2(0, -1));
        while (!this.isCorridor(topLeft.add(V2(-1, 0))) || !this.isCorridor(topLeft.add(V2(-2, 0)))) topLeft = topLeft.add(V2(-1, 0));

        // Find the bottom right corner
        let bottomRight = position;
        while (!this.isCorridor(bottomRight.add(V2(0, 1))) || !this.isCorridor(bottomRight.add(V2(0, 2)))) bottomRight = bottomRight.add(V2(0, 1));
        while (!this.isCorridor(bottomRight.add(V2(1, 0))) || !this.isCorridor(bottomRight.add(V2(2, 0)))) bottomRight = bottomRight.add(V2(1, 0));

        // Create the offsetGrid
        // const offsetGrid = new OffsetGrid(bottomRight.x - topLeft.x + 3, bottomRight.y - topLeft.y + 3, topLeft.move(-1));
        const offsetGrid = new OffsetGrid(bottomRight.x - topLeft.x + 1, bottomRight.y - topLeft.y + 1, topLeft);

        // Set all tiles to 1
        offsetGrid.fill(1);
        return offsetGrid;
    }

    /** Returns an offsetgrid that marks with 1 all the positions that a
     * pokemon in the given position can see
     */
    public getViewArea(position: Vec2): OffsetGrid {
        // Calculate the area based on whether the pokemon is in a corridor or a room
        const isCorridor = this.isCorridor(position);
        if (isCorridor)
            return this.getCorridorViewArea(position);
        else
            return this.getRoomViewArea(position);
    }

    public getActionArea(position: Vec2): OffsetGrid {
        // Calculate the area based on whether the pokemon is in a corridor or a room
        const isCorridor = this.isCorridor(position);
        if (isCorridor)
            return this.getCorridorViewArea(position);
        else
            return this.getRoomViewArea(position).inflate(1);
    }

    public *[Symbol.iterator](): IterableIterator<[Vec2, Tile]> {
        for (const [pos, _value] of super[Symbol.iterator]())
            yield [pos, this.get(pos.x, pos.y)];
    }
}