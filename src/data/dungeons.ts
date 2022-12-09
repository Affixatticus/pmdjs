import { GenerationRules as GeneratorLayouts } from "../dungeons/map/map_generator";
import { V2, Vec2 } from "../utils/vectors";
import { ItemChance, Items } from "./items";
import { Pokedex, PokemonChance } from "./pokemon";
import { TileObjects, TrapChance } from "./tiles";
import { WeatherChance, Weathers } from "./weather";

export enum Dungeons {
    GRASSY_COVE
};

export type DungeonFloorInfoFromLevel = Record<number, DungeonFloorInfo>;


export interface GeneratorParams {
    // Generation Parameters
    maxRoomSize: Vec2;
    bordersSize: Vec2;
    mapSize: Vec2;
    /** Number that specified how many of the spaces are rooms
     * + `n < 0`:       All spaces but n are rooms
     * + `0 < n < 1`:   n% of the spaces are rooms
     * + `n > 1`:       n rooms are generated 
     */
    roomDensity?: number;
    groundItemDensity?: number;
    tileDensity?: number;
    buriedItemDensity?: number;

    // Generation Methods
    layoutType: GeneratorLayouts;
    connectionRate: number;
    extraCorridorsChance?: number;

    // Water Generation
    /** Whether the dungeon should have water tiles */
    generateWater: boolean,
    terrainDensity?: number;
}

export interface DungeonFloorInfo {
    /** Dungeon Floor */
    name: string;
    /** Information for the graphic rendering */
    path: string;
    /** List of possible enemies to spawn */
    enemies: PokemonChance[] | null;
    /** Chance of spawning in items */
    items: ItemChance[] | null;
    /** Chance of spawning in traps */
    traps: TrapChance[] | null;
    /** List of possible weathers to spawn */
    weathers: WeatherChance[] | null;
    /** Flags */
    generation: GeneratorParams;
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
            enemies: null,
            items: [
                { id: Items.ORAN_BERRY, chance: 20 },
                { id: Items.COIN, chance: 30 },
                { id: Items.APPLE, chance: 10 },
                { id: Items.BIG_APPLE, chance: 1 },
            ],
            traps: [
                { id: TileObjects.TRAP_01, chance: 100 },
                { id: TileObjects.FAN_TRAP, chance: 50 },
                { id: TileObjects.VOLTORB_TRAP, chance: 25 },
            ],
            weathers: [{
                id: Weathers.CLEAR,
                chance: 100
            }],
            generation: {
                maxRoomSize: V2(9, 7),
                connectionRate: 50,
                bordersSize: V2(4, 6),
                mapSize: V2(6, 6),
                generateWater: false,
                layoutType: GeneratorLayouts.ALL_ROOMS,
                roomDensity: .75,
                terrainDensity: 10,
                groundItemDensity: 4,
                tileDensity: 4,
            }
        },
        [6]: {
            name: "Grass Cave",
            path: "deep_boulder_quarry_01",
            enemies: [
                { species: Pokedex.EEVEE, chance: 100, levelRange: [5, 5] },
            ],
            items: [
                { id: Items.ORAN_BERRY, chance: 20 },
                { id: Items.COIN, chance: 50 },
            ],
            traps: null,
            weathers: [{
                id: Weathers.CLEAR,
                chance: 100
            }],
            generation: {
                maxRoomSize: V2(7, 5),
                connectionRate: 50,
                bordersSize: V2(4, 6),
                mapSize: V2(4, 5),
                generateWater: true,
                terrainDensity: 40,
                extraCorridorsChance: 12,
                layoutType: GeneratorLayouts.ALL_ROOMS,
                roomDensity: .6,
                // tileDensity: 4,
                groundItemDensity: 16,
            },
        }
    }
};
