import { CropParams } from "../utils/canvas";


export enum Tile {
    FLOOR,
    WALL,
    WATER,
    TILE,
    CLEAR_TILE,
    ITEM,
    UNBREAKABLE_WALL,

    MARKER_ITEM,
    MARKER_TRAP,
    MARKER_STAIRS,

    KECLEON_CARPET,
    KECLEON_ITEM,
    KECLEON_MARKER,

    UNOBSTRUCTABLE,
    UNKNOWN,
    OUT_OF_BOUNDS = -1,
    WHITE_GUIDE
};

/** Tiles that should render as FLOOR */
export const WALL_IGNORE_TILES = [Tile.UNBREAKABLE_WALL, Tile.OUT_OF_BOUNDS];
export const WALL_INCLUDE_TILES = [Tile.UNBREAKABLE_WALL];
export const FLOOR_IGNORE_TILES = [Tile.WATER, Tile.ITEM, Tile.TILE, Tile.CLEAR_TILE, Tile.UNOBSTRUCTABLE];
export const FLOOR_INCLUDE_TILES = [Tile.ITEM, Tile.UNOBSTRUCTABLE];

export const TILE_WIDTH = 48;

export enum TileObject {
    STAIRS_UP,
    TRAP_01,
    TRAP_02,
    FAN_TRAP,
    TRAP_04,
    VOLTORB_TRAP,
    ELECTRODE_TRAP,
    GRATE_TRAP,
    STAIRS_DOWN,
    EXPLOSION_TRAP,
    STICKY_TRAP,
    GRIMER_TRAP,
    PP_DOWN_TRAP,
    TRAP_13,
    CONFUSE_TRAP,
    HOLE_TRAP,
    TRAP_16,
    MAGIC_TILE,
    TRAP_18,
    BLOCK_TRAP,
    BOULDER_TRAP,
    TRAP_21,
    MYSTERY_TRAP,
    TOXIC_SPIKES_TRAP,
    SPIKES_TRAP,
    KECLEON_CARPET,
    WHITE_GUIDE,
    BLACK_GUIDE,
};

export interface TrapChance {
    id: TileObject;
    chance: number;
};

export const TileSheet: Record<TileObject, CropParams> = {
    [TileObject.STAIRS_UP]: [0, 0, 1, 1],
    [TileObject.TRAP_01]: [1, 0, 1, 1],
    [TileObject.TRAP_02]: [2, 0, 1, 1],
    [TileObject.FAN_TRAP]: [3, 0, 1, 1],
    [TileObject.TRAP_04]: [4, 0, 1, 1],
    [TileObject.VOLTORB_TRAP]: [5, 0, 1, 1],
    [TileObject.ELECTRODE_TRAP]: [6, 0, 1, 1],
    [TileObject.GRATE_TRAP]: [7, 0, 1, 1],
    [TileObject.STAIRS_DOWN]: [0, 1, 1, 1],
    [TileObject.EXPLOSION_TRAP]: [1, 1, 1, 1],
    [TileObject.STICKY_TRAP]: [2, 1, 1, 1],
    [TileObject.GRIMER_TRAP]: [3, 1, 1, 1],
    [TileObject.PP_DOWN_TRAP]: [4, 1, 1, 1],
    [TileObject.TRAP_13]: [5, 1, 1, 1],
    [TileObject.CONFUSE_TRAP]: [6, 1, 1, 1],
    [TileObject.HOLE_TRAP]: [7, 1, 1, 1],
    [TileObject.TRAP_16]: [0, 2, 1, 1],
    [TileObject.MAGIC_TILE]: [1, 2, 1, 1],
    [TileObject.TRAP_18]: [2, 2, 1, 1],
    [TileObject.BLOCK_TRAP]: [3, 2, 1, 1],
    [TileObject.BOULDER_TRAP]: [4, 2, 1, 1],
    [TileObject.TRAP_21]: [5, 2, 1, 1],
    [TileObject.MYSTERY_TRAP]: [6, 2, 1, 1],
    [TileObject.TOXIC_SPIKES_TRAP]: [7, 2, 1, 1],
    [TileObject.SPIKES_TRAP]: [0, 3, 1, 1],
    [TileObject.KECLEON_CARPET]: [0, 3, 1, 1],
    [TileObject.WHITE_GUIDE]: [1, 3, 1, 1],
    [TileObject.BLACK_GUIDE]: [2, 3, 1, 1],
};

export function getTileCrop(tile: TileObject): CropParams {
    return TileSheet[tile].map(e => e * TILE_WIDTH) as CropParams;
}