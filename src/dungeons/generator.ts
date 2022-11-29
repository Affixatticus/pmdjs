import Random from '../utils/random';
import { DungeonFloorInfo, GeneratorFlags } from "../data/dungeons";
import { V2, Vec2 } from "../utils/vectors"
import { Tiles } from '../data/tiles';
import { DungeonGrid } from './grid';

type Room = Vec2;
type Corridor = Vec2[];
type Pool = Vec2[];

export class DungeonGenerator {
    private maxRoomSize: Vec2;
    private paddingSize: Vec2;
    private roomsLayout: Vec2;
    private roomsAmount: number;
    private flags: GeneratorFlags;

    private width!: number;
    private height!: number;
    private grid!: DungeonGrid;

    static ROOM_BORDERS = V2(12, 8);

    constructor(info: DungeonFloorInfo) {
        this.maxRoomSize = info.size.maxRoomSize;
        this.paddingSize = info.size.paddingSize;
        this.roomsLayout = info.size.roomsLayout;
        this.roomsAmount = info.size.roomsAmount;

        this.flags = info.flags;

        this.width = this.maxRoomSize.x * this.roomsLayout.x +
            this.paddingSize.x * (this.roomsLayout.x - 1) + DungeonGenerator.ROOM_BORDERS.x * 2;
        this.height = this.maxRoomSize.y * this.roomsLayout.y +
            this.paddingSize.y * (this.roomsLayout.y - 1) + DungeonGenerator.ROOM_BORDERS.y * 2;
    }

    public toString() {
        let str = '';

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.grid.get(x, y);
                if (tile === Tiles.WALL)
                    str += '█';
                else if (tile === Tiles.FLOOR)
                    str += ' ';
                else if (tile === Tiles.WATER)
                    str += '░';
            }
            str += '\n';
        }

        return str;
    }

    /** Fills up the map with tiles to form a dungeon */
    public generate(): DungeonGrid {
        this.grid = new DungeonGrid(this.width, this.height);
        this.grid.fill(Tiles.WALL);

        // Create the rooms
        const rooms = this.createRooms();

        // Choose the rooms to keep
        const roomsToKeep = this.chooseRoomsToKeep(rooms);

        // Place the tiles for the rooms
        this.placeRooms(roomsToKeep);

        // Connect the rooms with corridors
        const corridors = this.generateCorridors(roomsToKeep);

        // Draw the corridors
        this.drawCorridors(corridors);

        // Generate some pools of water
        if (this.flags.water) {
            const pools = this.generatePools();
            this.drawPools(pools);
        }

        return this.grid;
    }

    private createRooms() {
        const rooms: Room[] = [];

        for (let y = 0; y < this.roomsLayout.y; y++) {
            for (let x = 0; x < this.roomsLayout.x; x++) {
                const room = V2(x, y);
                rooms.push(room);
            }
        }

        return rooms;
    }

    private chooseRoomsToKeep(rooms: Room[]) {
        const roomsToKeep: Room[] = [];

        for (let i = 0; i < this.roomsAmount; i++) {
            const index = Random.int(0, rooms.length - 1);
            const room = rooms[index];
            roomsToKeep.push(room);
            rooms.splice(index, 1);
        }

        return roomsToKeep;
    }

    private placeRooms(rooms: Room[]) {
        for (const room of rooms) {
            const x = room.x * (this.maxRoomSize.x + this.paddingSize.x) + DungeonGenerator.ROOM_BORDERS.x;
            const y = room.y * (this.maxRoomSize.y + this.paddingSize.y) + DungeonGenerator.ROOM_BORDERS.y;

            for (let i = 0; i < this.maxRoomSize.y; i++) {
                for (let j = 0; j < this.maxRoomSize.x; j++) {
                    const tileX = x + j;
                    const tileY = y + i;

                    this.grid.set(tileX, tileY, Tiles.FLOOR);
                }
            }
        }
    }

    private generateCorridor(room1: Room, room2: Room): Corridor {
        const corridor: Corridor = [];

        const x1 = room1.x * (this.maxRoomSize.x + this.paddingSize.x) +
            ((this.maxRoomSize.x / 2) | 0);
        const y1 = room1.y * (this.maxRoomSize.y + this.paddingSize.y) +
            ((this.maxRoomSize.y / 2) | 0);

        const x2 = room2.x * (this.maxRoomSize.x + this.paddingSize.x) +
            ((this.maxRoomSize.x / 2) | 0);
        const y2 = room2.y * (this.maxRoomSize.y + this.paddingSize.y) +
            ((this.maxRoomSize.y / 2) | 0);

        const xDiff = x2 - x1;
        const yDiff = y2 - y1;

        const xDir = xDiff < 0 ? -1 : 1;
        const yDir = yDiff < 0 ? -1 : 1;

        // Horizontal
        for (let i = x1; i !== x2; i += xDir) {
            const pos = V2(i, y1);
            corridor.push(pos);
        }

        // Vertical
        for (let i = y1; i !== y2; i += yDir) {
            const pos = V2(x2, i);
            corridor.push(pos);
        }
        return corridor;
    }

    private generateCorridors(rooms: Room[]): Corridor[] {
        const corridors: Corridor[] = [];

        for (let i = 0; i < rooms.length - 1; i++) {
            const room1 = rooms[i];
            const room2 = rooms[i + 1];

            const corridor = this.generateCorridor(room1, room2);
            corridors.push(corridor);
        }

        return corridors;
    }

    private drawCorridors(corridors: Corridor[]) {
        for (const corridor of corridors) {
            for (const pos of corridor) {
                const x = pos.x + DungeonGenerator.ROOM_BORDERS.x;
                const y = pos.y + DungeonGenerator.ROOM_BORDERS.y;

                this.grid.set(x, y, Tiles.FLOOR);
            }
        }
    }

    private randomPoint(): Vec2 {
        // Within the borders
        const x = Random.int(DungeonGenerator.ROOM_BORDERS.x, this.width - DungeonGenerator.ROOM_BORDERS.x - 1);
        const y = Random.int(DungeonGenerator.ROOM_BORDERS.y, this.height - DungeonGenerator.ROOM_BORDERS.y - 1);
        return V2(x, y);
    }

    private generatePool(): Pool {
        const pool: Pool = [];

        const center = this.randomPoint();
        pool.push(center);

        const rad = Random.int(4, 8); 

        // Create a circle of tiles
        for (let y = center.y - rad + 1; y < rad + center.y; y++) {
            for (let x = center.x - rad + 1; x < rad + center.x; x++) {
                if (Math.abs(V2(x, y).dist(center)) < rad)
                    pool.push(V2(x, y));
            }
        }

        return pool;
    }

    private generatePools(): Pool[] {
        const pools: Pool[] = [];

        const poolAmount = Random.int(4, 8);
        for (let i = 0; i < poolAmount; i++) {
            const pool = this.generatePool();
            pools.push(pool);
        }

        return pools;
    }

    private drawPools(pools: Pool[]) {
        for (const pool of pools) {
            for (const pos of pool) {
                const x = pos.x + DungeonGenerator.ROOM_BORDERS.x;
                const y = pos.y + DungeonGenerator.ROOM_BORDERS.y;

                this.grid.set(x, y, Tiles.WATER);
            }
        }
    }
}