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
};

/** Tiles that should render as FLOOR */
export const WALL_IGNORE_TILES = [Tile.UNBREAKABLE_WALL, Tile.OUT_OF_BOUNDS];
export const WALL_INCLUDE_TILES = [Tile.UNBREAKABLE_WALL];
export const FLOOR_IGNORE_TILES = [Tile.WATER, Tile.ITEM, Tile.TILE, Tile.CLEAR_TILE, Tile.UNOBSTRUCTABLE];
export const FLOOR_INCLUDE_TILES = [Tile.ITEM, Tile.TILE, Tile.UNOBSTRUCTABLE];

export const TILE_WIDTH = 48;

export enum TileObjectId {
    STAIRS_UP,
    SLEEP_TRAP,
    DEBUFF_TRAP,
    FAN_TRAP,
    POISON_TRAP,
    VOLTORB_TRAP,
    ELECTRODE_TRAP,
    GRATE_TRAP,
    STAIRS_DOWN,
    CHESTNUT_TRAP,
    STICKY_TRAP,
    GRIMER_TRAP,
    PP_ZERO_TRAP,
    WARP_TRAP,
    CONFUSE_TRAP,
    // HOLE_TRAP, Actually just the Drop Hole when broken
    TRAP_16,
    MAGIC_TILE,
    SUMMON_TRAP,
    IMPRISON_TRAP,
    BOULDER_TRAP,
    SLOW_TRAP,
    POKEMON_SWITCH,
    TOXIC_SPIKES_TRAP,
    SPIKES_TRAP,
    KECLEON_CARPET,
    WHITE_GUIDE,
    BLACK_GUIDE,
};

export interface TileObject {
    /** The name of the object */
    name: string;
    /** The description of the object */
    description: string;
    /* The position of the texture on the sprite sheet in units */
    texCoords: CropParams;
    /** The high-res texture location */
    imageLocation: string;
};

export const TileObjects: Record<TileObjectId, TileObject> = {
    [TileObjectId.STAIRS_UP]: {
        name: "Stairs",
        description: "",
        texCoords: [0, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.SLEEP_TRAP]: {
        name: "Bug Switch",
        description: "Induces sleep on Pokémon that steps on it.",
        texCoords: [1, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.DEBUFF_TRAP]: {
        name: "Mud Switch",
        description: "Randomly decreases one stat by 1.",
        texCoords: [2, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.FAN_TRAP]: {
        name: "Fan Switch",
        description: "Sends Pokémon blasting against wall in any direction, causes damage unless holding Passthrough Scarf or is a ghost Pokémon.",
        texCoords: [3, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.POISON_TRAP]: {
        name: "Poison Sting Switch",
        description: "Induces poison on Pokémon that steps on it.",
        texCoords: [4, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.VOLTORB_TRAP]: {
        name: "Self Destruct Switch",
        description: "A Voltorb self-destructs to inflict damage on all Pokémon in the immediately surrounding 8 squares, also breaking some walls and wiping up items.",
        texCoords: [5, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.ELECTRODE_TRAP]: {
        name: "Explosion Switch",
        description: "An Electrode explodes to inflict damage on all Pokémon in the immediately surrounding 20 squares. Break walls, and wipe out items.",
        texCoords: [6, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.GRATE_TRAP]: {
        name: "Drop Hole",
        description: "Pokémon that steps on trap falls to the next floor, other team members will faint even with the Resurrect Seed.",
        texCoords: [7, 0, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.STAIRS_DOWN]: {
        name: "Stairs",
        description: "Stairs leading to the next floor. If you are on the final floor, you will escape from the dungeon.",
        texCoords: [0, 1, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.CHESTNUT_TRAP]: {
        name: "Chestnut Switch",
        description: "Causes spiky chestnuts to fall, inflicts 10 fix damage on the Pokémon that steps on the trap.",
        texCoords: [1, 1, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.STICKY_TRAP]: {
        name: "Glue Switch",
        description: "Randomly disables one of the held items or item in bag until you leave the dungeon.",
        texCoords: [2, 1, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.GRIMER_TRAP]: {
        name: "Grimer Switch",
        description: "Turns one food item in your bag into a Grimer Food.",
        texCoords: [3, 1, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.PP_ZERO_TRAP]: {
        name: "Skill Drop Trap",
        description: "Reduces one random attack's PP to 0.",
        texCoords: [4, 1, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.WARP_TRAP]: {
        name: "Warp Trap",
        description: "Warps to another part of the floor.",
        texCoords: [5, 1, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.CONFUSE_TRAP]: {
        name: "Spin Switch",
        description: "Induces confusion on Pokémon that steps on it.",
        texCoords: [6, 1, 1, 1],
        imageLocation: ""
    },
    // [TileObjectId.HOLE_TRAP]: {
    //     name: "HOLE_TRAP",
    //     description: "",
    //     texCoords: [7, 1, 1, 1],
    //     imageLocation: ""
    // },
    [TileObjectId.TRAP_16]: {
        name: "TRAP_16",
        description: "",
        texCoords: [0, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.MAGIC_TILE]: {
        name: "Magic Tile",
        description: "Restores all stat changes to their original state.",
        texCoords: [1, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.SUMMON_TRAP]: {
        name: "Summon Switch",
        description: "Causes several wild Pokémon to appear. Trap disappears afterwards.",
        texCoords: [2, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.IMPRISON_TRAP]: {
        name: "Imprison Switch",
        description: "Disables one attack until changes floors.",
        texCoords: [3, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.BOULDER_TRAP]: {
        name: "BOULDER_TRAP",
        description: "",
        texCoords: [4, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.SLOW_TRAP]: {
        name: "Slowpoke Switch",
        description: "Slows walking pace of Pokémon that steps on it.",
        texCoords: [5, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.POKEMON_SWITCH]: {
        name: "Pokémon Switch",
        description: "Changes the wild Pokémon or items in the same room.",
        texCoords: [6, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.TOXIC_SPIKES_TRAP]: {
        name: "Toxic Spikes",
        description: "Poisons Pokémon that steps on it.",
        texCoords: [7, 2, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.SPIKES_TRAP]: {
        name: "Spikes",
        description: "Damages Pokémon that steps on it.",
        texCoords: [0, 3, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.KECLEON_CARPET]: {
        name: "",
        description: "",
        texCoords: [0, 3, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.WHITE_GUIDE]: {
        name: "",
        description: "",
        texCoords: [1, 3, 1, 1],
        imageLocation: ""
    },
    [TileObjectId.BLACK_GUIDE]: {
        name: "",
        description: "",
        texCoords: [2, 3, 1, 1],
        imageLocation: ""
    },
};

export interface TrapChance {
    id: TileObjectId;
    chance: number;
};

export function getTileCrop(tileId: TileObjectId): CropParams {
    return TileObjects[tileId].texCoords.map(e => e * TILE_WIDTH) as CropParams;
}