import { CropParams } from "../utils/canvas";

export enum Tiles {
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
    OUT_OF_BOUNDS = -1
};

/** Tiles that should render as FLOOR */
export const WALL_IGNORE_TILES = [Tiles.UNBREAKABLE_WALL, Tiles.OUT_OF_BOUNDS];
export const WALL_INCLUDE_TILES = [Tiles.UNBREAKABLE_WALL];
export const FLOOR_IGNORE_TILES = [Tiles.WATER, Tiles.ITEM, Tiles.TILE, Tiles.CLEAR_TILE, Tiles.UNOBSTRUCTABLE];
export const FLOOR_INCLUDE_TILES = [Tiles.ITEM, Tiles.UNOBSTRUCTABLE];

export const TILE_WIDTH = 48;

export enum TileObjects {
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
};

export interface TrapChance {
    id: TileObjects;
    chance: number;
};

export const TileSheet: Record<TileObjects, CropParams> = {
    [TileObjects.STAIRS_UP]: [0, 0, 1, 1],
    [TileObjects.TRAP_01]: [1, 0, 1, 1],
    [TileObjects.TRAP_02]: [2, 0, 1, 1],
    [TileObjects.FAN_TRAP]: [3, 0, 1, 1],
    [TileObjects.TRAP_04]: [4, 0, 1, 1],
    [TileObjects.VOLTORB_TRAP]: [5, 0, 1, 1],
    [TileObjects.ELECTRODE_TRAP]: [6, 0, 1, 1],
    [TileObjects.GRATE_TRAP]: [7, 0, 1, 1],
    [TileObjects.STAIRS_DOWN]: [0, 1, 1, 1],
    [TileObjects.EXPLOSION_TRAP]: [1, 1, 1, 1],
    [TileObjects.STICKY_TRAP]: [2, 1, 1, 1],
    [TileObjects.GRIMER_TRAP]: [3, 1, 1, 1],
    [TileObjects.PP_DOWN_TRAP]: [4, 1, 1, 1],
    [TileObjects.TRAP_13]: [5, 1, 1, 1],
    [TileObjects.CONFUSE_TRAP]: [6, 1, 1, 1],
    [TileObjects.HOLE_TRAP]: [7, 1, 1, 1],
    [TileObjects.TRAP_16]: [0, 2, 1, 1],
    [TileObjects.MAGIC_TILE]: [1, 2, 1, 1],
    [TileObjects.TRAP_18]: [2, 2, 1, 1],
    [TileObjects.BLOCK_TRAP]: [3, 2, 1, 1],
    [TileObjects.BOULDER_TRAP]: [4, 2, 1, 1],
    [TileObjects.TRAP_21]: [5, 2, 1, 1],
    [TileObjects.MYSTERY_TRAP]: [6, 2, 1, 1],
    [TileObjects.TOXIC_SPIKES_TRAP]: [7, 2, 1, 1],
    [TileObjects.SPIKES_TRAP]: [0, 3, 1, 1],
    [TileObjects.KECLEON_CARPET]: [0, 3, 1, 1],
};

export function getTileCrop(tile: TileObjects): CropParams {
    return TileSheet[tile].map(e => e * TILE_WIDTH) as CropParams;
}