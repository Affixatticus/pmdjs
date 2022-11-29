import { V2, Vec2 } from "../utils/vectors";
import { ItemChance, Items } from "./items";
import { PokemonChance } from "./pokemon";
import { WeatherChance, Weathers } from "./weather";

export enum Dungeons {
    GRASSY_COVE
};

export type DungeonFloorInfoFromLevel = Record<number, DungeonFloorInfo>;

/**
 * For instance:
 * ```
 * {
 *  maxRoomSize: V2(4, 3),
 *  borderSize: V2(3, 3),
 *  roomsLayout: V2(3, 2),
 *  roomsAmount: 4
 * }
 * ```
 * ```
 * RRRR+++\\\\+++RRRR+++
 * RRRR+++\\\\+++RRRR+++
 * RRRR+++\\\\+++RRRR+++
 * +++++++++++++++++++++
 * +++++++++++++++++++++
 * RRRR+++RRRR+++\\\\+++
 * RRRR+++RRRR+++\\\\+++
 * RRRR+++RRRR+++\\\\+++
 * +++++++++++++++++++++
 * +++++++++++++++++++++
 * ```
 */
export interface DungeonSize {
    maxRoomSize: Vec2,
    paddingSize: Vec2,
    roomsLayout: Vec2,
    roomsAmount: number,
};

export interface GeneratorFlags {
    /** Whether the dungeon should have water tiles */
    water: boolean,
}

export interface DungeonFloorInfo {
    /** Dungeon Floor */
    name: string;
    /** Information for the graphic rendering */
    path: string;
    /** Dungeon's sizes */
    size: DungeonSize;
    /** List of possible enemies to spawn */
    enemies: PokemonChance[] | null;
    /** Chance of spawning in items and items */
    items: ItemRarity | null;
    /** List of possible weathers to spawn */
    weathers: WeatherChance[] | null;
    /** Flags */
    flags: GeneratorFlags;
};

interface ItemRarity {
    rarity: number;
    /** List of possible items to spawn */
    items: ItemChance[];
};


export interface DungeonTexturesProperties {
    /** Clear color for the scene */
    background?: [number, number, number];
    variants: {
        walls: Record<number, number[]>;
        floor: Record<number, number[]>;
    },
    /** Information about the water */
    water?: {
        /** Colors that need changing each frames in reference to the first color */
        frames?: [number, number, number][][],
        /** The speed of the animation (relative to other animations) */
        speed?: number,
        /** If the water has an overlay */
        overlayed: boolean;
        /** The height of the water heightmap */
        height: number,
        /** The position to add to the water heightmap */
        level: number,
    };
};

export interface DungeonTextures {
    textures: CanvasImageSource,
    heightmaps: CanvasImageSource,
    waterTextures?: CanvasImageSource[],
    properties: DungeonTexturesProperties;
};

export const DungeonsInfo: Record<Dungeons, DungeonFloorInfoFromLevel> = {
    [Dungeons.GRASSY_COVE]: {
        [4]: {
            name: "Grass Cove",
            path: "grass_cove_01",
            size: {
                paddingSize: V2(5, 5),
                maxRoomSize: V2(8, 8),
                roomsLayout: V2(3, 3),
                roomsAmount: 8
            },
            enemies: null,
            items: {
                rarity: 0.5,
                items: [{ id: Items.ORAN_BERRY, chance: 20 }]
            },
            weathers: [{
                id: Weathers.CLEAR,
                chance: 100
            }],
            flags: {
                water: true
            }
        },
        [6]: {
            name: "Grass Cave",
            path: "deep_boulder_quarry_01",
            size: {
                paddingSize: V2(5, 5),
                maxRoomSize: V2(8, 8),
                roomsLayout: V2(6, 3),
                roomsAmount: 9
            },
            enemies: null,
            items: {
                rarity: 0.5,
                items: [{ id: Items.ORAN_BERRY, chance: 20 }]
            },
            weathers: [{
                id: Weathers.CLEAR,
                chance: 100
            }],
            flags: {
                water: true
            },
        }
    }
};
