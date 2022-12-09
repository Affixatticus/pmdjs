import { DungeonFloorInfo } from "../../data/dungeons";
import { Tiles } from "../../data/tiles";
import Random from "../../utils/random";
import { Rect } from "../../utils/rect";
import { Segment } from "../../utils/segment";
import { V2, Vec2 } from "../../utils/vectors";
import { DungeonGrid } from "./grid";

export enum DungeonGeneratorType {
    STANDARD_HALF_ROOMS,
    // ONE_BIG_ROOM,
    // ROOMS_WITH_CORRIDORS_RING,
    // ROOMS_RING_WITH_CORRIDORS_OUTLINE,
    // TWO_BIG_ROOMS,
    // FIVE_ROOMS_IN_A_LINE,
    // FIVE_ROOMS_IN_CROSS_FORMATION,
    STANDARD_ALL_ROOMS,
    // ROOMS_OUTSIDE_RING,
    STANDARD_ALMOST_FULL_ROOMS,
};

interface DungeonParamtersInnate {
    minimumSectors: Vec2;
    maximumSectors: Vec2;
    roomDensity: number;
    terrainDensity: number;
    connectAdjacentRooms: boolean;
    groundItemDensity: number;
    tileDensity: number;
    buriedItemDensity: number;
    generatorType: DungeonGeneratorType;
};

const DungeonGeneratorInnateParameters: Record<DungeonGeneratorType, DungeonParamtersInnate> = {
    [DungeonGeneratorType.STANDARD_HALF_ROOMS]: {
        minimumSectors: V2(4, 2),
        maximumSectors: V2(5, 4),
        roomDensity: 2,
        terrainDensity: 2,
        connectAdjacentRooms: true,
        groundItemDensity: 2,
        tileDensity: 2,
        buriedItemDensity: 2,
        generatorType: DungeonGeneratorType.STANDARD_HALF_ROOMS,
    },
    [DungeonGeneratorType.STANDARD_ALMOST_FULL_ROOMS]: {
        minimumSectors: V2(3, 2),
        maximumSectors: V2(5, 3),
        roomDensity: 3,
        terrainDensity: 2,
        connectAdjacentRooms: true,
        groundItemDensity: 2,
        tileDensity: 2,
        buriedItemDensity: 2,
        generatorType: DungeonGeneratorType.STANDARD_ALMOST_FULL_ROOMS,
    },
    [DungeonGeneratorType.STANDARD_ALL_ROOMS]: {
        minimumSectors: V2(3, 3),
        maximumSectors: V2(5, 3),
        roomDensity: 4,
        terrainDensity: 2,
        connectAdjacentRooms: true,
        groundItemDensity: 2,
        tileDensity: 2,
        buriedItemDensity: 2,
        generatorType: DungeonGeneratorType.STANDARD_ALL_ROOMS,
    },
}

type Room = Rect;

export class DungeonGenerator {
    private _width: number = 56;
    private _height: number = 32;

    private grid!: DungeonGrid;
    private params: DungeonParamtersInnate;

    private cols!: number;
    private rows!: number;

    private rooms: Room[][] = [];

    public get width() { return this._width; }
    public get height() { return this._height; }
    public get size() { return V2(this.width, this.height); }

    constructor(info: DungeonFloorInfo) {
        const generatorType = info.generation.generatorType;
        const generatorParams = DungeonGeneratorInnateParameters[generatorType];
        this.params = { ...generatorParams, ...info.generation };
    }

    public generate(): DungeonGrid {
        this.grid = new DungeonGrid(this.width, this.height);

        // Clear the grid
        this.clearGrid();

        // Place hard walls
        this.placeHardWalls();

        // Generate the rooms
        this.generateSectors();

        // Fill the first sector with water
        this.generateRooms();

        this.connectRooms();

        // Connect a pair of rooms together at a low chance
        this.createTallRoom();

        return this.grid;
    }

    /** Clears the grid and places a 2-wide border on the inside */
    private clearGrid() {
        // Place blocks of walls around the grid
        for (let x = 0; x < this.width; x++)
            for (let y = 0; y < this.height; y++) {
                this.grid.set(x, y, Tiles.WALL);
            }
    }

    private placeHardWalls() {
        for (let x = 0; x < this.width; x++)
            for (let y = 0; y < this.height; y++) {
                if (x < 2 || x >= this.width - 2 || y < 2 || y >= this.height - 2)
                    this.grid.set(x, y, Tiles.UNBREAKABLE_WALL);
            }
    }

    private generateSectors() {
        // Generate the sectors
        this.cols = Random.int(this.params.minimumSectors.x, this.params.maximumSectors.x);
        this.rows = Random.int(this.params.minimumSectors.y, this.params.maximumSectors.y);
    }

    private getSector(x: number, y: number): Rect {
        const sectorWidth = Math.floor((this.width - 4) / this.cols);
        const sectorHeight = Math.floor((this.height - 4) / this.rows);

        const sectorX = x * sectorWidth + 2;
        const sectorY = y * sectorHeight + 2;

        return new Rect(sectorX, sectorY, sectorWidth, sectorHeight);
    }

    private generateRoom(sector: Rect): Room {
        const room = sector.subrect();
        return room;
    }

    private generateDummyRoom(sector: Rect): Room {
        const point = sector.getRandomPointAroundCenter();

        return new Rect(point.x, point.y, 1, 1) as Room;
    }

    private getFullRooms(width: number, height: number, count: number): boolean[][] {
        const result: boolean[][] = [];

        for (let y = 0; y < height; y++) {
            result[y] = [];
            for (let x = 0; x < width; x++) {
                result[y][x] = false;
            }
        }

        // Place the markers make sure they don't overlap
        for (let i = 0; i < count; i++) {
            let x = Random.int(0, width - 1);
            let y = Random.int(0, height - 1);

            while (result[y][x]) {
                x = Random.int(0, width - 1);
                y = Random.int(0, height - 1);
            }

            result[y][x] = true;
        }

        return result;
    }

    private fillRoom(room: Room, tile: Tiles = Tiles.FLOOR) {
        for (let x = room.x; x < room.x + room.width; x++)
            for (let y = room.y; y < room.y + room.height; y++) {
                this.grid.set(x, y, tile);
            }
    }

    private generateRooms() {
        // Get the generator type
        const generatorType = this.params.generatorType;
        const density = this.params.roomDensity;

        let cols = 0;
        switch (generatorType) {
            case DungeonGeneratorType.STANDARD_HALF_ROOMS:
                cols = Math.floor(this.cols / 2);
                break;
            case DungeonGeneratorType.STANDARD_ALMOST_FULL_ROOMS:
                cols = Math.floor(this.cols * 0.75);
                break;
            case DungeonGeneratorType.STANDARD_ALL_ROOMS:
                cols = this.cols;
                break;
        }


        switch (generatorType) {
            case DungeonGeneratorType.STANDARD_HALF_ROOMS:
            case DungeonGeneratorType.STANDARD_ALMOST_FULL_ROOMS:
            case DungeonGeneratorType.STANDARD_ALL_ROOMS:
                const fullRoomsCount = density < 0 ? Math.max(2, Math.abs(density)) :
                    Random.int(Math.max(2, density), cols * this.rows);

                const fullRooms = this.getFullRooms(cols, this.rows, fullRoomsCount);

                for (let y = 0; y < this.rows; y++) {
                    this.rooms.push([]);
                    for (let x = 0; x < cols; x++) {
                        const sector = this.getSector(x, y);

                        const room = fullRooms[y][x] ? this.generateRoom(sector) : this.generateDummyRoom(sector);

                        // Fill the room
                        this.fillRoom(room);

                        this.rooms[y].push(room);
                    }
                }
                break;
        }

        console.log(this.rooms);
    }

    private createTallRoom() {
        for (let y = 0; y < this.rows - 1; y++) {
            for (let x = 0; x < this.cols; x++) {
                const room = this.rooms[y][x];
                if (room === undefined) continue;
                if (room.height === 1) continue;

                // Get the room below this one
                const roomBelow = this.rooms[y + 1][x];

                // Continue if the roomBelow is undefined
                if (roomBelow === undefined) continue;
                // or it's a dummy room
                if (roomBelow.height === 1) continue;

                // Stop if you don't get a random chance
                if (!Random.chance(5)) continue;

                // Get the minumum x between the two rooms
                const minLeft = Math.min(room.left, roomBelow.left);
                const maxRight = Math.max(room.right, roomBelow.right);
                const minTop = Math.min(room.top, roomBelow.top);
                const maxBottom = Math.max(room.bottom, roomBelow.bottom);

                // Create the new room
                const newRoom = Rect.fromLTRB(minLeft, minTop, maxRight, maxBottom);

                // Fill the room
                this.fillRoom(newRoom);

                // Add the room to the list
                this.rooms[y][x] = newRoom;
                this.rooms[y + 1][x] = newRoom;

                return;
            }
        }
    }

    /** Dots can be connected with a straight line */
    private connectDots(dot1: Vec2, dot2: Vec2) {
        const segment = new Segment(dot1, dot2);

        // Get the points on the segment
        const points = segment.getPoints();

        // Fill the points
        for (const point of points) {
            this.grid.set(point.x, point.y, Tiles.FLOOR);
        }
    }

    private connectRooms() {
        const roomPairs: [Room, Room, string][] = [];

        // Get a random point for each room
        const randomPoints: Record<string, Vec2> = {};
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const room = this.rooms[y][x];
                if (room === undefined) continue;

                randomPoints[room.toString()] = room.getRandomPointAroundCenter();
            }
        }

        // Get the room pairs
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const room = this.rooms[y][x];

                // Continue if the room is undefined
                if (room === undefined) continue;

                // Get all the adjacent rooms
                const adjacentRooms: Record<string, Room | undefined> = {
                    // top: y > 0 ? this.rooms[y - 1][x] : undefined,
                    right: x < this.cols - 1 ? this.rooms[y][x + 1] : undefined,
                    bottom: y < this.rows - 1 ? this.rooms[y + 1][x] : undefined,
                    // left: x > 0 ? this.rooms[y][x - 1] : undefined
                };

                // Add each pair to the list
                for (const direction in adjacentRooms) {
                    const adjacentRoom = adjacentRooms[direction];

                    if (adjacentRoom === undefined) continue;

                    // Push the room if a similar connection doens't already exist
                    if (!roomPairs.some(pair => (pair[0] === adjacentRoom && pair[1] === room) || (pair[0] === room && pair[1] === adjacentRoom))) {
                        roomPairs.push([room, adjacentRoom, direction]);
                    }
                }
            }
        }

        // Connect the rooms
        for (const pair of roomPairs) {
            const room1 = pair[0];
            const room2 = pair[1];
            const direction = pair[2];

            // Get the center of each room
            const center1 = randomPoints[room1.toString()];
            const center2 = randomPoints[room2.toString()];


            switch (direction) {
                case "bottom": {
                    // Find the point at the center of room1's bottom and room2's top
                    const height = Math.round((room1.bottom + room2.top) / 2);

                    // If the space between the two rooms is less than 2, then just connect them
                    if (height - room1.bottom < 3) {
                        // Determine which one is the 1x1
                        const oneByOne = room1.width === 1 ? room1 : room2.width === 1 ? room2 : room1;
                        const other = oneByOne === room1 ? room2 : room1;

                        this.connectDots(V2(oneByOne.x + other.x / 2, oneByOne.y), V2(oneByOne.x + other.x / 2, other.y));

                        this.connectDots(
                            V2((oneByOne.x + other.x) / 2, oneByOne.y).roundDown(),
                            V2((oneByOne.x + other.x) / 2, other.y).roundDown()
                        );
                    } else {
                        const point1 = new Vec2(center1.x, height);
                        const point2 = new Vec2(center2.x, height);

                        // Connect the dots
                        this.connectDots(center1, point1);
                        this.connectDots(point1, point2);
                        this.connectDots(point2, center2);
                    }
                    break;
                }
                case "right": {
                    // Find the point at the center of room1's right and room2's left
                    const width = Math.round((room1.right + room2.left) / 2);

                    // If the space between the two rooms is less than 2, then just connect them
                    if (width - room1.right < 3) {
                        // Determine which one is the 1x1
                        const oneByOne = room1.width === 1 ? room1 : room2.width === 1 ? room2 : room1;
                        const other = oneByOne === room1 ? room2 : room1;

                        this.connectDots(
                            V2(oneByOne.x, (oneByOne.y + other.y) / 2).roundDown(),
                            V2(other.x, (oneByOne.y + other.y) / 2).roundDown()
                        );
                    } else {
                        const point1 = new Vec2(width, center1.y);
                        const point2 = new Vec2(width, center2.y);

                        // Connect the dots
                        this.connectDots(center1, point1);
                        this.connectDots(point1, point2);
                        this.connectDots(point2, center2);
                    }
                    break;
                }
            }
        }


        console.log(roomPairs);
    }
}