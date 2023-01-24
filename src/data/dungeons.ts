import { GenerationRule as GeneratorLayouts } from "../dungeons/map/map_generator";
import { V2, Vec2 } from "../utils/vectors";
import { ItemChance, Item } from "./items";
import { Pokedex, PokemonChance } from "./pokemon";
import { TileObject, TrapChance } from "./tiles";
import { WeatherChance, Weather } from "./weather";

export enum Dungeon {
    GRASSY_COVE
};

export enum LightLevel {
    DARKEST,
    DARK,
    NORMAL,
    BRIGHT,
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
    /** Light Level */
    lightLevel: LightLevel;
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

export const DungeonsInfo: Record<Dungeon, DungeonFloorInfoFromLevel> = {
    [Dungeon.GRASSY_COVE]: {
        [4]: {
            name: "Grass Cove",
            path: "western_cave",
            enemies: null,
            lightLevel: LightLevel.BRIGHT,
            items: [
                { id: Item.ORAN_BERRY, chance: 20 },
                { id: Item.COIN, chance: 30 },
                { id: Item.APPLE, chance: 10 },
                { id: Item.BIG_APPLE, chance: 1 },
            ],
            traps: [
                { id: TileObject.TRAP_01, chance: 100 },
                { id: TileObject.FAN_TRAP, chance: 50 },
                { id: TileObject.VOLTORB_TRAP, chance: 25 },
            ],
            weathers: [{
                id: Weather.CLEAR,
                chance: 100
            }],
            generation: {
                maxRoomSize: V2(9, 7),
                connectionRate: 50,
                bordersSize: V2(4, 6),
                mapSize: V2(4, 4),
                generateWater: false,
                // generateWater: true,
                layoutType: GeneratorLayouts.ALL_ROOMS,
                roomDensity: .75,
                terrainDensity: 40,
                groundItemDensity: 4,
                tileDensity: 4,
            }
        },
        [6]: {
            name: "Grass Cave",
            path: "grass_cove_01",
            lightLevel: LightLevel.DARKEST,
            enemies: [
                { species: Pokedex.EEVEE, chance: 100, levelRange: [5, 5] },
            ],
            items: [
                { id: Item.ORAN_BERRY, chance: 20 },
                { id: Item.COIN, chance: 50 },
            ],
            traps: [
                { id: TileObject.TRAP_01, chance: 100 },
                { id: TileObject.FAN_TRAP, chance: 50 },
                { id: TileObject.VOLTORB_TRAP, chance: 25 },
            ],
            weathers: [{
                id: Weather.CLEAR,
                chance: 100
            }],
            generation: {
                maxRoomSize: V2(7, 5),
                connectionRate: 50,
                bordersSize: V2(4, 6),
                mapSize: V2(2, 2),
                generateWater: true,
                // generateWater: false,
                terrainDensity: 10,
                extraCorridorsChance: 12,
                layoutType: GeneratorLayouts.ALL_ROOMS,
                roomDensity: .8,
                tileDensity: 10,
                groundItemDensity: .7,
            },
        }
    }
};
