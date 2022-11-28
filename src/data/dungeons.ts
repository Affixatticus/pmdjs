import { Color4 } from "@babylonjs/core";
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

export interface DungeonFloorInfo {
    /** Dungeon Floor */
    name: string;
    /** Information for the graphic rendering */
    path: string;
    /** Background of the Dungeon (mostly useless) */
    clearColor: Color4;
    /** Dungeon's sizes */
    size: DungeonSize;
    /** List of possible enemies to spawn */
    enemies: PokemonChance[] | null;
    /** Chance of spawning in items and items */
    items: ItemRarity | null;
    /** List of possible weathers to spawn */
    weathers: WeatherChance[] | null;
};

interface ItemRarity {
    rarity: number;
    /** List of possible items to spawn */
    items: ItemChance[];
};


export interface DungeonTexturesProperties {
    variants: {
        walls: Record<number, number>;
        floor: Record<number, number>;
    };
};

export interface DungeonTextures {
    textures: HTMLImageElement,
    heightmaps: HTMLImageElement,
    properties: DungeonTexturesProperties;
};

export const DungeonsInfo: Record<Dungeons, DungeonFloorInfoFromLevel> = {
    [Dungeons.GRASSY_COVE]: {
        [4]: {
            name: "Grass Cove",
            path: "grass_cove_01",
            clearColor: new Color4(0.2588, 0.8078, 0),
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
            }]
        }

    }
};
