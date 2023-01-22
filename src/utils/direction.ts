import Random from "./random";
import { Vec2 } from "./vectors";

export enum DirectionIndex {
    SOUTH,
    SOUTH_EAST,
    EAST,
    NORTH_EAST,
    NORTH,
    NORTH_WEST,
    WEST,
    SOUTH_WEST
};

export class Direction {
    static readonly SOUTH: Direction = new Direction(0, 1, DirectionIndex.SOUTH);
    static readonly SOUTH_EAST: Direction = new Direction(1, 1, DirectionIndex.SOUTH_EAST);
    static readonly EAST: Direction = new Direction(1, 0, DirectionIndex.EAST);
    static readonly NORTH_EAST: Direction = new Direction(1, -1, DirectionIndex.NORTH_EAST);
    static readonly NORTH: Direction = new Direction(0, -1, DirectionIndex.NORTH);
    static readonly NORTH_WEST: Direction = new Direction(-1, -1, DirectionIndex.NORTH_WEST);
    static readonly WEST: Direction = new Direction(-1, 0, DirectionIndex.WEST);
    static readonly SOUTH_WEST: Direction = new Direction(-1, 1, DirectionIndex.SOUTH_WEST);

    static readonly NONE: Direction = new Direction(0, 0, -1);

    static readonly ALL: Direction[] = [
        Direction.SOUTH,
        Direction.SOUTH_EAST,
        Direction.EAST,
        Direction.NORTH_EAST,
        Direction.NORTH,
        Direction.NORTH_WEST,
        Direction.WEST,
        Direction.SOUTH_WEST
    ];

    static readonly CARDINAL: Direction[] = [
        Direction.SOUTH,
        Direction.EAST,
        Direction.NORTH,
        Direction.WEST
    ];

    static get(index: number) {
        if (index === -1) return Direction.NONE;
        return Direction.ALL[index];
    }

    static random() {
        return Direction.ALL[Math.floor(Math.random() * Direction.ALL.length)];
    }

    static rollIndex(index: number) {
        return (index < 0 ? (8 - (index * - 1)) : index) % 8;
    }

    static fromVector(vector: Vec2) {
        for (const direction of Direction.ALL) {
            if (direction.horizontal === vector.x && direction.vertical === vector.y) {
                return direction;
            }
        }
        return Direction.NONE;
    }

    public toVector(): Vec2 {
        return new Vec2(this.horizontal, this.vertical);
    }

    public isDiagonal(): boolean {
        return this.diagonal
    }

    public horizontal: number;
    public vertical: number;
    public index: number;
    public name: string;
    public isNone: boolean;
    private diagonal: boolean;

    constructor(horizontal: number, vertical: number, index: number) {
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.index = index;
        this.name = DirectionIndex[index];
        this.isNone = index === -1;
        this.diagonal = this.horizontal !== 0 && this.vertical !== 0;
    }

    public isOpposite(other: Direction) {
        return this.horizontal === -other.horizontal && this.vertical === -other.vertical;
    }

    public getOpposite(): Direction {
        return Direction.get(Direction.rollIndex(this.index + 4));
    }

    public static flipMap: Record<number, Direction> = {
        [DirectionIndex.SOUTH]: Direction.NORTH,
        [DirectionIndex.SOUTH_EAST]: Direction.NORTH_EAST,
        [DirectionIndex.EAST]: Direction.EAST,
        [DirectionIndex.NORTH_EAST]: Direction.SOUTH_EAST,
        [DirectionIndex.NORTH]: Direction.SOUTH,
        [DirectionIndex.NORTH_WEST]: Direction.SOUTH_WEST,
        [DirectionIndex.WEST]: Direction.WEST,
        [DirectionIndex.SOUTH_WEST]: Direction.NORTH_WEST,
        [-1]: Direction.NONE,
    };

    public flipY(): Direction {
        return Direction.flipMap[this.index] ?? null;
    }

    public getNextClosest(other: Direction) {
        if (!other) return this;

        const start = this.index;
        const end = other.index;

        if (start === end) return this;

        const mod8 = Direction.rollIndex(start - end);
        let result: number;

        if (mod8 === 4)
            result = Random.choose([start - 1, start + 1]);
        else if (mod8 < 4)
            result = start - 1;
        else if (mod8 > 4)
            result = start + 1;
        else
            throw Error("You shouldn't be here")

        return Direction.get(Direction.rollIndex(result));
    }

    public getRotationsTo(other: Direction): Direction[] {
        const rotations: Direction[] = [];
        let current = this as Direction;

        if (current === other) return rotations;

        do {
            current = current.getNextClosest(other);
            rotations.push(current);
        } while (current !== other);

        return rotations;
    }
}