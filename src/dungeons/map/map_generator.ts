import { DungeonFloorInfo, GeneratorParams } from "../../data/dungeons";
import { Tile } from "../../data/tiles";
import Random from "../../utils/random";
import { Rect } from "../../utils/rect";
import { Segment } from "../../utils/segment";
import { V2, Vec2 } from "../../utils/vectors";
import { ByteGrid, DungeonGrid } from "./grid";

export enum GenerationRule {
    ALL_ROOMS,
    HALF_ROOMS,
    // ONE_ROOM, 
    // ROOMS_IN_CORNERS,
    // ROOMS_IN_CENTER,
    // ROOMS_IN_CROSS_FORMATION,
    // ROOMS_IN_STRAIGHT_LINE,
};

enum CellType {
    EMPTY,
    ROOM,
    CORRIDOR,
};

type Connection = Vec2[];
type Room = Rect | null;

export const AssignmentFunctions: Record<GenerationRule, (mapSize: Vec2, roomCount: number) => ByteGrid> = {
    [GenerationRule.ALL_ROOMS]: (mapSize, roomCount) => {
        // Create the grid
        const grid = new ByteGrid(mapSize.x, mapSize.y);
        grid.fill(CellType.CORRIDOR);

        // Get all the possible positions
        const positions = grid.getPositions();

        // Shuffle the positions
        Random.shuffle(positions);

        for (let i = 0; i < roomCount; i++)
            grid.set(positions[i], CellType.ROOM);


        return grid;
    },
    [GenerationRule.HALF_ROOMS]: (mapSize, roomCount) => {
        // Create the grid
        const grid = new ByteGrid(mapSize.x, mapSize.y);
        grid.fill(CellType.EMPTY);

        // Get all the possible positions
        const positions = grid.getPositions().filter(pos => pos.x < (mapSize.x / 2 | 0));

        // Shuffle the positions
        Random.shuffle(positions);

        for (let i = 0; i < Math.min(roomCount, positions.length); i++)
            grid.set(positions[i], CellType.ROOM);

        return grid;
    }
}

export class DungeonGenerator {
    // Consts
    // private static roomBorderSize = V2(10, 8);
    private static roomBorderSize = V2(2, 2);

    // Input
    private info: GeneratorParams;

    // Output
    public grid: DungeonGrid;


    constructor(info: DungeonFloorInfo) {
        this.info = info.generation;

        // Create a new DungeonGrid
        const mapSize = this.info.mapSize;
        const width = mapSize.x * (this.info.bordersSize.x + this.info.maxRoomSize.x) +
            DungeonGenerator.roomBorderSize.x * 2 - this.info.bordersSize.x;
        const height = mapSize.y * (this.info.bordersSize.y + this.info.maxRoomSize.y) +
            DungeonGenerator.roomBorderSize.y * 2 - this.info.bordersSize.y;

        this.grid = new DungeonGrid(width, height);
    }

    // Getters and Setters
    private getMaxRoomCount() {
        return this.info.mapSize.x * this.info.mapSize.y;
    }
    private getRoomsCount() {
        // Return the percentage if 0 < density < 1
        if (this.info.roomDensity && this.info.roomDensity > 0 && this.info.roomDensity < 1)
            return this.info.roomDensity * this.getMaxRoomCount();

        // Return the number of rooms if density >= 1
        if (this.info.roomDensity && this.info.roomDensity >= 1)
            return this.info.roomDensity;

        // Return the max room count minus the number of rooms if density < 0
        if (this.info.roomDensity && this.info.roomDensity < 0)
            return this.getMaxRoomCount() - this.info.roomDensity;

        return this.getMaxRoomCount();
    }
    private getRoomSpace(pos: Vec2): Rect {
        const roomSize = this.info.maxRoomSize;
        const bordersSize = this.info.bordersSize;

        const x = pos.x * (roomSize.x + bordersSize.x) + DungeonGenerator.roomBorderSize.x;
        const y = pos.y * (roomSize.y + bordersSize.y) + DungeonGenerator.roomBorderSize.y;

        return new Rect(x, y, roomSize.x, roomSize.y);
    }
    private getTerrainDensity() {
        return this.info.terrainDensity ?? 50;
    }
    private getExtraCorridorsChance() {
        return this.info.extraCorridorsChance ?? 25;
    }
    private getItemDensity() {
        const density = this.info?.groundItemDensity ?? 4;
        return density >= 2 ? density : 2;
    }
    private getTrapDensity() {
        const density = this.info?.tileDensity ?? 2;
        return density >= 2 ? density : 2;
    }

    private get height() { return this.grid.height; }
    private get width() { return this.grid.width; }

    private get generateItems(): boolean { return this.info?.groundItemDensity ? this.info?.groundItemDensity > 0 : false; }
    private get generateTraps(): boolean { return this.info?.tileDensity ? this.info?.tileDensity > 0 : false; }

    // Public methods
    public generate() {
        // Fill the grid with walls
        this.grid.fill(Tile.WALL);
        // Place the borders on the map
        this.placeBorders();
        // Get the cell types
        const cellTypes = this.assignCellTypes();
        // Place the rooms
        const rooms = this.generateRooms(cellTypes);
        // Calculate the connections
        const connections = this.calculateConnections(cellTypes);
        // Fill the rooms
        this.fillRooms(rooms, cellTypes);
        // Draw the connections
        this.drawConnections(connections, rooms);
        // Randomly join two rooms
        this.joinRooms(rooms);
        // Draw the extra corridors
        this.drawExtraCorridors(rooms);
        // Draw the borders
        this.placeBorders();
        // Place the unobstructable tiles
        this.placeUnobstructableTiles(rooms);
        // Generate water features
        this.drawWaterFeatures();
        // Place keckleon shop
        const chosenRoom = this.placeKecleonShopRoom(rooms);
        let usableRooms = this.getRooms(rooms);
        usableRooms = usableRooms.length > 1 ? usableRooms.filter(r => r !== chosenRoom) : usableRooms;
        // Place items and traps, skip the room with the kecleon shop
        this.placeItemsAndTraps(usableRooms);


        return this.grid;
    }


    // Map common methods
    private fillRect(rect: Rect, tile: Tile = Tile.FLOOR) {
        for (let y = rect.y; y < rect.y + rect.height; y++)
            for (let x = rect.x; x < rect.x + rect.width; x++)
                this.grid.setXY(x, y, tile);
    }
    /** Checks if the connection is already in the given list, and adds it if not */
    private addConnections(list: Connection[], connections: Connection[]) {
        // Check that two connections are not the same before adding them
        for (const connection of connections) {
            // If the connection is already in the list, skip it
            if (list.some(c => c[0].equals(connection[0]) && c[1].equals(connection[1])))
                continue;

            list.push(connection);
        }

        return list;
    }

    private getRoomFreePositions(room: Rect, freeTile: Tile = Tile.FLOOR) {
        if (!room) {
            console.log("Room is undefined")
            return [];
        };
        const positions = [];
        for (let y = room.top; y < room.bottom; y++)
            for (let x = room.left; x < room.right; x++) {
                if (this.grid.getXY(x, y) === freeTile)
                    positions.push(V2(x, y));
            }

        return positions;
    }

    /** Iterable list of actual rooms */
    private *iterRooms(rooms: Room[][]) {
        for (const row of rooms)
            for (const room of row) {
                if (room !== undefined && room !== null && room.width > 1)
                    yield room;
            }
    }

    private getRooms(rooms: Room[][]) {
        const list: Rect[] = [];
        for (const room of this.iterRooms(rooms))
            list.push(room);
        return list;
    }

    // Map generation Methods

    // ANCHOR Borders and Cell Types
    /** Fills the room with `WALL` and the borders with `UNBREAKABLE_WALL` */
    private placeBorders() {
        // Fill the borders with unbreakable walls
        this.fillRect(new Rect(0, 0, this.width, DungeonGenerator.roomBorderSize.y), Tile.UNBREAKABLE_WALL);
        this.fillRect(new Rect(0, this.height - DungeonGenerator.roomBorderSize.y, this.width, DungeonGenerator.roomBorderSize.y), Tile.UNBREAKABLE_WALL);
        this.fillRect(new Rect(0, 0, DungeonGenerator.roomBorderSize.x, this.height), Tile.UNBREAKABLE_WALL);
        this.fillRect(new Rect(this.width - DungeonGenerator.roomBorderSize.x, 0, DungeonGenerator.roomBorderSize.x, this.height), Tile.UNBREAKABLE_WALL);
    }

    /** Assigns each space with a cell type, using different layout types */
    private assignCellTypes(): ByteGrid {
        const mapSize = this.info.mapSize;
        return AssignmentFunctions[this.info.layoutType](mapSize, this.getRoomsCount());
    }

    // ANCHOR Rooms
    /** Places a room and then returns the new room Rect */
    private generateRoom(x: number, y: number, cellType: CellType): Rect | null {
        if (cellType === CellType.ROOM) {
            // Get the room space
            const roomSpace = this.getRoomSpace(V2(x, y));

            // Get a subrect for the room
            const roomRect = roomSpace.subrect({ maxWidth: this.info.maxRoomSize.x, maxHeight: this.info.maxRoomSize.y });

            // Add the room to the list
            return roomRect;
        }
        else if (cellType === CellType.CORRIDOR) {
            // Get the room space
            const roomSpace = this.getRoomSpace(V2(x, y));

            // Get a random position inside the room
            const pos = roomSpace.middle;

            // Create a 1x1 rect
            const roomRect = new Rect(pos.x, pos.y, 1, 1);

            // Add the room to the list
            return roomRect;
        }

        return null;
    }

    /** Creates subrects for each room section that is a room or corridor */
    private generateRooms(cellTypes: ByteGrid) {
        const rooms: Room[][] = [];

        // For each cell type
        for (let y = 0; y < cellTypes.height; y++) {
            const row: Room[] = [];

            for (let x = 0; x < cellTypes.width; x++) {
                // Place the room
                const room = this.generateRoom(x, y, cellTypes.getXY(x, y));

                row.push(room);
            }
            rooms.push(row);
        }

        return rooms;
    }

    // ANCHOR Connections
    private directConnection(pos1: Vec2, pos2: Vec2): Connection[] {
        return [Vec2.sorted(pos1, pos2) as Connection];
    }

    private diagonalConnection(cellTypes: ByteGrid, pos: Vec2, nPos: Vec2): Connection[] {
        const connections: Connection[] = [];

        const betweenP1 = V2(pos.x, nPos.y);
        const betweenP2 = V2(nPos.x, pos.y);

        if (cellTypes.get(betweenP1) === CellType.CORRIDOR && Random.chance(this.info.connectionRate))
            this.addConnections(connections, [
                Vec2.sorted(pos, betweenP1) as Connection,
                Vec2.sorted(betweenP1, nPos) as Connection,
            ]);
        if (cellTypes.get(betweenP2) === CellType.CORRIDOR && Random.chance(this.info.connectionRate))
            this.addConnections(connections, [
                Vec2.sorted(pos, betweenP2) as Connection,
                Vec2.sorted(betweenP2, nPos) as Connection,
            ]);

        return connections;
    }

    /** Recursive method of enstablishing a connection between two rooms */
    private connectRooms(cellTypes: ByteGrid, pos: Vec2, nPos: Vec2, connections: Connection[] = []): Connection[] {
        if (pos.equals(nPos)) return connections;

        const xDiff = nPos.x - pos.x;
        const yDiff = nPos.y - pos.y;

        if (xDiff > 0) {
            const newPos = V2(pos.x + 1, pos.y);
            this.addConnections(connections, this.directConnection(pos, newPos));
            return this.connectRooms(cellTypes, newPos, nPos, connections);
        }
        else if (xDiff < 0) {
            const newPos = V2(pos.x - 1, pos.y);
            this.addConnections(connections, this.directConnection(pos, newPos));
            return this.connectRooms(cellTypes, newPos, nPos, connections);
        }

        if (yDiff > 0) {
            const newPos = V2(pos.x, pos.y + 1);
            this.addConnections(connections, this.directConnection(pos, newPos));
            return this.connectRooms(cellTypes, newPos, nPos, connections);
        }

        if (yDiff < 0) {
            const newPos = V2(pos.x, pos.y - 1);
            this.addConnections(connections, this.directConnection(pos, newPos));
            return this.connectRooms(cellTypes, newPos, nPos, connections);
        }

        return connections;
    }

    /** Calculates all the possible connections from a cell to all its room neighbors */
    private connectionsForCell(cellTypes: ByteGrid, pos: Vec2): Connection[] {
        const connections: Connection[] = [];

        // For each neighbor
        for (const [neighborPos, neighbor] of cellTypes.getNeighborsPositions(pos.x, pos.y)) {
            // Directly adjacent connection
            if (neighbor === CellType.ROOM) {
                // If the neighbor is in the same row or col
                if (neighborPos.x === pos.x || neighborPos.y === pos.y)
                    this.addConnections(connections, this.directConnection(pos, neighborPos));
                // If the neighbor is diagonal
                else this.addConnections(connections,
                    this.diagonalConnection(cellTypes, pos, neighborPos));
            }
        }

        return connections;
    }

    /** Returns the cells that are rooms */
    private getRoomsPositions(cellTypes: ByteGrid): Vec2[] {
        const rooms: Vec2[] = [];
        for (const [pos, type] of cellTypes)
            if (type === CellType.ROOM) rooms.push(pos);
        return rooms;
    }

    /** Creates a path that connects together all rooms */
    private generateSurePath(cellTypes: ByteGrid): Connection[] {
        const connections: Connection[] = [];

        const rooms = this.getRoomsPositions(cellTypes);

        // Start with a random room
        let currentRoom = Random.choose(rooms);
        // Remove it from the list
        rooms.splice(rooms.indexOf(currentRoom), 1);

        // While there are still rooms
        while (rooms.length > 0) {
            // Get the closest room to the current room
            const closestRoom = rooms.reduce((closest, room) => {
                if (cellTypes.get(room) !== CellType.ROOM) return { room, dist: 100000 };
                const dist = currentRoom.dist(room);
                if (dist < closest.dist) return { room, dist };
                return closest;
            }, { room: rooms[0], dist: currentRoom.dist(rooms[0]) }).room;

            // Add the connection
            this.addConnections(connections, this.connectRooms(cellTypes, currentRoom, closestRoom));

            // Remove the room from the list
            rooms.splice(rooms.indexOf(closestRoom), 1);

        }
        return connections;
    }

    /** Sets all corridors without connections to CellTypes.EMPTY */
    private removeUnusedCorridors(cellTypes: ByteGrid, connections: Connection[]) {
        for (let y = 0; y < cellTypes.height; y++)
            for (let x = 0; x < cellTypes.width; x++)
                if (cellTypes.getXY(x, y) === CellType.CORRIDOR) {
                    const pos = V2(x, y);
                    if (!connections.some(([p1, p2]) => p1.equals(pos) || p2.equals(pos)))
                        cellTypes.setXY(x, y, CellType.EMPTY);
                }
    }

    /** Calculates all the possible connections between cells with cellType ROOM
     * - can pass through cells with cellType CORRIDOR, but does not need to pass through all of them
     */
    private calculateConnections(cellTypes: ByteGrid) {
        // List of connections
        const connections: Connection[] = [];

        // For each cell
        for (let y = 0; y < cellTypes.height; y++)
            for (let x = 0; x < cellTypes.width; x++)
                // If the cell is a room
                if (cellTypes.getXY(x, y) === CellType.ROOM) {
                    // Get the connections
                    const cellConnections = this.connectionsForCell(cellTypes, V2(x, y));
                    // Add the connections to the list
                    this.addConnections(connections, cellConnections);
                }

        // Generate the path that connects all rooms
        const surePath = this.generateSurePath(cellTypes);

        // Check if all cells are accessible from all positions
        this.addConnections(connections, surePath);

        // Remove the corridors without connections
        this.removeUnusedCorridors(cellTypes, connections);


        return connections;
    }

    // ANCHOR Drawing Connections
    /** Joins two points
     * - Make sure that the points are in the same row or col
     * - Make sure that the points are made up of integers
     */
    private connectPoints(point1: Vec2, point2: Vec2) {
        const seg = new Segment(point1, point2);
        const points = seg.getPoints();

        for (const point of points)
            this.grid.set(point, Tile.FLOOR);

        return points;
    }

    /** Connects two rooms or corridors together */
    private drawConnection(connection: Connection, rooms: Room[][]) {
        // Get the two points
        const [p1, p2] = connection;

        // Get the rooms
        const room1 = rooms[p1.y][p1.x];
        if (!room1) return;
        const room2 = rooms[p2.y][p2.x];
        if (!room2) return;

        // Connect two rooms together
        // Detect the way of the connection
        const xDiff = p2.x - p1.x;
        const yDiff = p2.y - p1.y;

        // If the connection is horizontal
        if (xDiff !== 0) {
            const corridor1 = room1.width === 1;
            const corridor2 = room2.width === 1;

            // Choose a vertical position at the top-right of the first rect plus some random offset
            let firstPoint = V2(
                room1.right - 1,
                room1.top + Random.int(1, room1.height - 2)
            );
            if (corridor1) firstPoint = V2(room1.left, room1.top);
            let secondPoint = V2(
                room2.left + 1,
                room2.top + Random.int(1, room2.height - 2)
            );
            if (corridor1) secondPoint = V2(room2.left + 1, firstPoint.y);
            if (corridor2) secondPoint = V2(room2.left, room2.top);

            // Get the middle points
            const middlePoint = V2(
                (firstPoint.x + secondPoint.x) / 2 | 0,
                firstPoint.y
            );
            const middlePoint2 = V2(
                middlePoint.x,
                secondPoint.y
            );


            // Connect some points together
            this.connectPoints(firstPoint, middlePoint);
            this.connectPoints(middlePoint, middlePoint2);
            this.connectPoints(middlePoint2, secondPoint);
        }
        // If the connection is vertical
        else if (yDiff !== 0) {
            const corridor1 = room1.width === 1;
            const corridor2 = room2.width === 1;

            let firstPoint = V2(
                room1.left + Random.int(1, room1.width - 2),
                room1.bottom - 1
            );
            if (corridor1) firstPoint = V2(room1.left, room1.top);
            let secondPoint = V2(
                room2.left + Random.int(1, room2.width - 2),
                room2.top + 1
            );
            if (corridor1) secondPoint = V2(firstPoint.x, room2.top + 1);
            if (corridor2) secondPoint = V2(room2.left, room2.top);

            // Get the middle points
            const middlePoint = V2(
                firstPoint.x,
                (firstPoint.y + secondPoint.y) / 2 | 0
            );
            const middlePoint2 = V2(
                secondPoint.x,
                middlePoint.y
            );



            // Connect some points together
            this.connectPoints(firstPoint, middlePoint);
            this.connectPoints(middlePoint, middlePoint2);
            this.connectPoints(middlePoint2, secondPoint);
        }
    }

    /** Draws the corridors between each room */
    private drawConnections(connections: Connection[], rooms: Room[][]) {
        // For each connection
        for (const connection of connections) {
            // Draw the connection
            this.drawConnection(connection, rooms);
        }
    }

    // ANCHOR Filling Rooms
    /** Fills just the rooms that are connected to something */
    private fillRooms(rooms: Room[][], cellTypes: ByteGrid) {
        // For each room
        for (let y = 0; y < rooms.length; y++)
            for (let x = 0; x < rooms[0].length; x++) {
                const room = rooms[y][x];
                // If the room exists
                if (room && cellTypes.getXY(x, y) === CellType.ROOM) {
                    // Fill the room
                    this.fillRect(room, Tile.FLOOR);
                }
            }
    }

    /** Joins two rooms that are vertically adjacent */
    private joinRooms(rooms: Room[][]) {
        for (let y = 0; y < rooms.length - 1; y++) {
            for (let x = 0; x < rooms[0].length; x++) {
                const room = rooms[y][x];
                if (!room) continue;
                if (room.height === 1) continue;

                // Get the room below this one
                const roomBelow = rooms[y + 1][x];

                // Continue if the roomBelow is undefined
                if (!roomBelow) continue;
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
                this.fillRect(newRoom);

                // Add the room to the list
                rooms[y][x] = newRoom;
                rooms[y + 1][x] = newRoom;
                // return;
            }
        }
    }

    // ANCHOR Extra corridors
    // Check if sides are valid
    private extraCorridorsTopCheck(room: Rect): Vec2 | null {
        for (let x = room.left; x < room.right; x++) {
            const tile = V2(x, room.top);
            if (this.grid.getXY(tile.x, tile.y - 1) === Tile.FLOOR) {
                return tile;
            }
        }
        return null;
    }
    private extraCorridorsRightCheck(room: Rect): Vec2 | null {
        for (let y = room.top; y < room.bottom; y++) {
            const tile = V2(room.right - 1, y);
            if (this.grid.getXY(tile.x + 1, tile.y) === Tile.FLOOR) {
                return tile;
            }
        }
        return null;
    }
    private extraCorridorsBottomCheck(room: Rect): Vec2 | null {
        for (let x = room.left; x < room.right; x++) {
            const tile = V2(x, room.bottom - 1);
            if (this.grid.getXY(tile.x, tile.y + 1) === Tile.FLOOR) {
                return tile;
            }
        }
        return null;
    }
    private extraCorridorsLeftCheck(room: Rect): Vec2 | null {
        for (let y = room.top; y < room.bottom; y++) {
            const tile = V2(room.left, y);
            if (this.grid.getXY(tile.x - 1, tile.y) === Tile.FLOOR) {
                return tile;
            }
        }
        return null;
    }

    private getOppositeSides(dir: 0 | 1 | 2 | 3): (0 | 1 | 2 | 3)[] {
        return dir % 2 == 0 ? [1, 3] : [0, 2];
    }
    private getDirectionOffset(dir: 0 | 1 | 2 | 3): Vec2 {
        switch (dir) {
            case 0: return V2(0, -1);
            case 1: return V2(1, 0);
            case 2: return V2(0, 1);
            case 3: return V2(-1, 0);
        }
    }
    private drawExtraCorridor(start: Vec2, direction: 0 | 1 | 2 | 3) {
        const point = start.clone();
        let dir = direction;
        let maxLength = Random.int(3, this.info.bordersSize.x);
        let maxTurns = Random.int(1, 5);

        do {
            // The direction the corridor will go
            const offset = this.getDirectionOffset(dir);
            // Update the position
            point.addInPlace(offset);
            // Set the position to a floor
            this.grid.set(point, Tile.FLOOR);
            // Get the opposite sides
            const sides = this.getOppositeSides(dir);

            // If any of the opposite sides connect to a floor space, break
            if (this.grid.get(point.add(this.getDirectionOffset(sides[0]))) !== Tile.WALL) break;
            if (this.grid.get(point.add(this.getDirectionOffset(sides[1]))) !== Tile.WALL) break;

            // If the max length is reached, change direction
            if (maxLength-- <= 0) {
                dir = Random.choose(sides);
                maxLength = Random.int(3, this.info.bordersSize.x);
                // If the maxTurns is reached, change direction
                if (maxTurns-- <= 0) break;
            }
            // Stop once you reach a floor space or before you reach an unbreakable wall
        } while (this.grid.get(point) === Tile.FLOOR || this.grid.get(point) !== Tile.UNBREAKABLE_WALL);
    }

    // Place on this side
    private placeExtraCorridorTop(room: Rect): boolean {
        const tile = this.extraCorridorsTopCheck(room);
        if (!tile) return false;

        const proposedStart1 = V2(tile.x - 2, tile.y);
        if (this.grid.get(proposedStart1) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart1, 0);
            return true;
        }
        const proposedStart2 = V2(tile.x + 2, tile.y);
        if (this.grid.get(proposedStart2) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart2, 0);
            return true;
        }

        return false;
    }
    private placeExtraCorridorRight(room: Rect): boolean {
        const tile = this.extraCorridorsRightCheck(room);
        if (!tile) return false;

        const proposedStart1 = V2(tile.x, tile.y - 2);
        if (this.grid.get(proposedStart1) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart1, 1);
            return true;
        }
        const proposedStart2 = V2(tile.x, tile.y + 2);
        if (this.grid.get(proposedStart2) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart2, 1);
            return true;
        }

        return false;
    }
    private placeExtraCorridorBottom(room: Rect): boolean {
        const tile = this.extraCorridorsBottomCheck(room);
        if (!tile) return false;

        const proposedStart1 = V2(tile.x - 2, tile.y);
        if (this.grid.get(proposedStart1) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart1, 2);
            return true;
        }
        const proposedStart2 = V2(tile.x + 2, tile.y);
        if (this.grid.get(proposedStart2) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart2, 2);
            return true;
        }

        return false;
    }
    private placeExtraCorridorLeft(room: Rect): boolean {
        const tile = this.extraCorridorsLeftCheck(room);
        if (!tile) return false;

        const proposedStart1 = V2(tile.x, tile.y - 2);
        if (this.grid.get(proposedStart1) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart1, 3);
            return true;
        }
        const proposedStart2 = V2(tile.x, tile.y + 2);
        if (this.grid.get(proposedStart2) === Tile.FLOOR) {
            this.drawExtraCorridor(proposedStart2, 3);
            return true;
        }

        return false;
    }

    /** Adds extra corridors to the map */
    private drawExtraCorridors(rooms: Room[][]) {
        // Choose a random room
        for (const room of this.iterRooms(rooms)) {
            // Continue with random
            if (!Random.chance(this.getExtraCorridorsChance())) {
                continue;
            }

            // Choose a random face to start from
            const face = Random.int(0, 3);

            switch (face) {
                case 0:
                    if (this.placeExtraCorridorTop(room)) { break }
                case 1:
                    if (this.placeExtraCorridorRight(room)) { break }
                case 2:
                    if (this.placeExtraCorridorBottom(room)) { break }
                case 3:
                    if (this.placeExtraCorridorLeft(room)) { break }
                default:
                    if (this.placeExtraCorridorTop(room)) { break }
                    if (this.placeExtraCorridorRight(room)) { break }
                    if (this.placeExtraCorridorBottom(room)) { break }
            }
        }
    }

    // ANCHOR Unobstructable tiles
    private getJunctionPoints(room: Rect): Vec2[] {
        const vitalPoints: Vec2[] = [];

        // Loop through the top and bottom of the room
        for (let x = room.left; x < room.right; x++) {
            const top = V2(x, room.top);
            if (this.grid.getXY(top.x, top.y - 1) === Tile.FLOOR)
                vitalPoints.push(top);
            const bottom = V2(x, room.bottom - 1);
            if (this.grid.getXY(bottom.x, bottom.y + 1) === Tile.FLOOR)
                vitalPoints.push(bottom);
        }
        // Loop through the left and right of the room
        for (let y = room.top; y < room.bottom; y++) {
            const left = V2(room.left, y);
            if (this.grid.getXY(left.x - 1, left.y) === Tile.FLOOR)
                vitalPoints.push(left);
            const right = V2(room.right - 1, y);
            if (this.grid.getXY(right.x + 1, right.y) === Tile.FLOOR)
                vitalPoints.push(right);
        }

        return vitalPoints;
    }

    /** Places unobstructable tiles in a room */
    private placeUnobstructableTilesInRoom(room: Rect) {
        // Get the vital points
        const unobstructablePoints = this.getJunctionPoints(room);

        // For each vital point
        for (const vitalPoint of unobstructablePoints) {
            // Place the vital point
            this.grid.set(vitalPoint, Tile.UNOBSTRUCTABLE);
        }
    }

    /** Places unobstructable tiles in all rooms */
    private placeUnobstructableTiles(rooms: Room[][]) {
        // Loop through each room
        for (let y = 0; y < rooms.length; y++) {
            for (let x = 0; x < rooms[0].length; x++) {
                const room = rooms[y][x];
                // If the room exists
                if (room) {
                    // Place the unobstructable tiles
                    this.placeUnobstructableTilesInRoom(room);
                }
            }
        }
    }

    // ANCHOR Water Features
    private drawWaterFeatures() {
        if (!this.info.generateWater) return;
        const amount = (this.getTerrainDensity() / 100) *
            this.grid.width / this.info.maxRoomSize.x * this.grid.height / this.info.maxRoomSize.y;
        for (let i = 0; i < amount; i++) {
            // Choose a random point
            const point = new Rect(0, 0, this.grid.width, this.grid.height).getRandomPoint();

            // Select an area of 7x7 around the point
            const area = Rect.fromCenter(point, 3);

            // Loop through the area
            for (const pos of area.iter()) {
                if (Random.chance(this.getTerrainDensity())) {
                    if (this.grid.get(pos) === Tile.WALL) {
                        this.grid.set(pos, Tile.WATER);
                    }
                }
            }
        }
    }

    // ANCHOR Items and Traps
    private placeMarkerInRoom(room: Rect, tile: Tile = Tile.MARKER_ITEM) {
        const points = this.getRoomFreePositions(room);
        if (points.length === 0) return;
        const point = Random.choose(points);
        this.grid.set(point, tile);
    }

    private placeMarkersInRooms(rooms: Rect[], amount: number, tile: Tile) {
        const shuffledRooms = Random.shuffle(rooms);

        for (let i = 0; i < amount; i++) {
            const roomIndex = i % shuffledRooms.length;
            this.placeMarkerInRoom(shuffledRooms[roomIndex], tile);
        }
    }

    private placeItems(rooms: Rect[]) {
        if (!this.generateItems) return;
        const amount = (this.getItemDensity()) + Random.int(-2, 2);
        this.placeMarkersInRooms(rooms, amount, Tile.MARKER_ITEM);
    }

    private placeTraps(rooms: Rect[]) {
        if (!this.generateTraps) return;
        const amount = Random.int(this.getTrapDensity() / 2 | 0, this.getTrapDensity() + 2);
        this.placeMarkersInRooms(rooms, amount, Tile.MARKER_TRAP);
    }

    private placeStairs(rooms: Rect[]) {
        this.placeMarkersInRooms(rooms, 1, Tile.MARKER_STAIRS);
    }

    // private placeBuriedItems(rooms: Room[][]) {
    //     const amount = (this.getItemDensity()) + Random.int(-2, 2);
    // }

    private placeItemsAndTraps(rooms: Rect[]) {
        // this.placeBuriedItems(rooms);
        this.placeItems(rooms);
        this.placeTraps(rooms);
        this.placeStairs(rooms);
    }

    // ANCHOR Special rooms
    private placeKecleonShopRoom(rooms: Room[][]): Room | null {
        const room = Random.choose(this.getRooms(rooms));
        if (!room || !Random.chance(1)) return null;
        const carpetArea = room;
        let itemArea = carpetArea.centralRect(V2(2, 2));
        if (itemArea.height <= 1 || itemArea.width <= 1)
            itemArea = itemArea.inflate(1);

        for (const pos of carpetArea.iter()) {
            if (this.grid.get(pos) === Tile.MARKER_STAIRS) continue;
            this.grid.set(pos, Tile.KECLEON_CARPET);
        }
        for (const pos of itemArea.iter()) {
            if (this.grid.get(pos) === Tile.MARKER_STAIRS) continue;
            this.grid.set(pos, Tile.KECLEON_ITEM);
        }
        this.grid.set(carpetArea.getRandomPoint(), Tile.KECLEON_MARKER);
        return room;
    }
}
