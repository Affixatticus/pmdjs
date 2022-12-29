import { Vec2 } from "./vectors";

export enum DirectionIndexes {
    SOUTH,
    SOUTH_EAST,
    EAST,
    NORTH_EAST,
    NORTH,
    NORTH_WEST,
    WEST,
    SOUTH_WEST
};

export class Directions {
    static readonly SOUTH: Directions = new Directions(0, 1, DirectionIndexes.SOUTH);
    static readonly SOUTH_EAST: Directions = new Directions(1, 1, DirectionIndexes.SOUTH_EAST);
    static readonly EAST: Directions = new Directions(1, 0, DirectionIndexes.EAST);
    static readonly NORTH_EAST: Directions = new Directions(1, -1, DirectionIndexes.NORTH_EAST);
    static readonly NORTH: Directions = new Directions(0, -1, DirectionIndexes.NORTH);
    static readonly NORTH_WEST: Directions = new Directions(-1, -1, DirectionIndexes.NORTH_WEST);
    static readonly WEST: Directions = new Directions(-1, 0, DirectionIndexes.WEST);
    static readonly SOUTH_WEST: Directions = new Directions(-1, 1, DirectionIndexes.SOUTH_WEST);

    static readonly NONE: Directions = new Directions(0, 0, -1);

    static readonly ALL: Directions[] = [
        Directions.SOUTH,
        Directions.SOUTH_EAST,
        Directions.EAST,
        Directions.NORTH_EAST,
        Directions.NORTH,
        Directions.NORTH_WEST,
        Directions.WEST,
        Directions.SOUTH_WEST
    ];

    static get(index: number) {
        if (index === -1) return Directions.NONE;
        return Directions.ALL[index];
    }

    static fromVector(vector: Vec2) {
        for (const direction of Directions.ALL) {
            if (direction.horizontal === vector.x && direction.vertical === vector.y) {
                return direction;
            }
        }
        return Directions.NONE;
    }

    static random() {
        return Directions.ALL[Math.floor(Math.random() * Directions.ALL.length)];
    }

    public horizontal: number;
    public vertical: number;
    public index: number;
    public name: string;
    public isNone: boolean;

    constructor(horizontal: number, vertical: number, index: number) {
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.index = index;
        this.name = DirectionIndexes[index];
        this.isNone = index === -1;
    }

    public toVector(): Vec2 {
        return new Vec2(this.horizontal, this.vertical);
    }

    public static flipMap: Record<number, Directions> = {
        [DirectionIndexes.SOUTH]: Directions.NORTH,
        [DirectionIndexes.SOUTH_EAST]: Directions.NORTH_EAST,
        [DirectionIndexes.EAST]: Directions.EAST,
        [DirectionIndexes.NORTH_EAST]: Directions.SOUTH_EAST,
        [DirectionIndexes.NORTH]: Directions.SOUTH,
        [DirectionIndexes.NORTH_WEST]: Directions.SOUTH_WEST,
        [DirectionIndexes.WEST]: Directions.WEST,
        [DirectionIndexes.SOUTH_WEST]: Directions.NORTH_WEST,
        [-1]: Directions.NONE,
    };

    public flipY(): Directions {
        return Directions.flipMap[this.index];
    }

}