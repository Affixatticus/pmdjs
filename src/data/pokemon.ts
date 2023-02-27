export enum Gender {
    MALE = 0,
    FEMALE = 2,
};

export enum Form {
    BASE_FORM = 0
};

export enum Pokedex {
    BULBASAUR = 1,
    IVYSAUR = 2,
    VENUSAUR = 3,
    CHARMANDER = 4,
    CHARMELEON = 5,
    CHARIZARD = 6,
    EEVEE = 133,
    TORCHIC = 255,
};

export enum Type {
    NORMAL = 0,
    FIGHTING = 1,
    FLYING = 2,
    POISON = 3,
    GROUND = 4,
    ROCK = 5,
    BUG = 6,
    GHOST = 7,
    STEEL = 8,
    FIRE = 9,
    WATER = 10,
    GRASS = 11,
    ELECTRIC = 12,
    PSYCHIC = 13,
    ICE = 14,
    DRAGON = 15,
    DARK = 16,
    FAIRY = 17,
    UNKNOWN = 18,
};
export interface PokemonBaseData {
    name: string;
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    type: [Type, Type];
}

export const PokedexData: Record<number, PokemonBaseData> = {
    [6]: {
        name: "Charizard",
        hp: 78,
        attack: 84,
        defense: 78,
        specialAttack: 109,
        specialDefense: 85,
        speed: 100,
        type: [Type.FIRE, Type.FLYING],
    },  // Charizard
    [495]: {
        name: "Snivy",
        hp: 45,
        attack: 49,
        defense: 49,
        specialAttack: 65,
        specialDefense: 65,
        speed: 45,
        type: [Type.GRASS, Type.GRASS],
    }, // Snivy
    [501]: {
        name: "Oshawott",
        hp: 45,
        attack: 65,
        defense: 34,
        specialAttack: 40,
        specialDefense: 34,
        speed: 45,
        type: [Type.WATER, Type.WATER],
    }, // Oshawott
}

export enum PokemonNature {
    HARDY = 0,
    LONELY = 1,
    BRAVE = 2,
    ADAMANT = 3,
    NAUGHTY = 4,
    BOLD = 5,
    DOCILE = 6,
    RELAXED = 7,
    IMPISH = 8,
    LAX = 9,
    TIMID = 10,
    HASTY = 11,
    SERIOUS = 12,
    JOLLY = 13,
    NAIVE = 14,
    MODEST = 15,
    MILD = 16,
    QUIET = 17,
    BASHFUL = 18,
    RASH = 19,
    CALM = 20,
    GENTLE = 21,
    SASSY = 22,
    CAREFUL = 23,
    QUIRKY = 24,
};
export type StatName = "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";

export const Naturedex: Record<PokemonNature, [StatName, StatName]> = {
    [PokemonNature.HARDY]: ["attack", "attack"],
    [PokemonNature.LONELY]: ["attack", "defense"],
    [PokemonNature.BRAVE]: ["attack", "speed"],
    [PokemonNature.ADAMANT]: ["attack", "specialAttack"],
    [PokemonNature.NAUGHTY]: ["attack", "specialDefense"],
    [PokemonNature.BOLD]: ["defense", "attack"],
    [PokemonNature.DOCILE]: ["defense", "defense"],
    [PokemonNature.RELAXED]: ["defense", "speed"],
    [PokemonNature.IMPISH]: ["defense", "specialAttack"],
    [PokemonNature.LAX]: ["defense", "specialDefense"],
    [PokemonNature.TIMID]: ["speed", "attack"],
    [PokemonNature.HASTY]: ["speed", "defense"],
    [PokemonNature.SERIOUS]: ["speed", "speed"],
    [PokemonNature.JOLLY]: ["speed", "specialAttack"],
    [PokemonNature.NAIVE]: ["speed", "specialDefense"],
    [PokemonNature.MODEST]: ["specialAttack", "attack"],
    [PokemonNature.MILD]: ["specialAttack", "defense"],
    [PokemonNature.QUIET]: ["specialAttack", "speed"],
    [PokemonNature.BASHFUL]: ["specialAttack", "specialAttack"],
    [PokemonNature.RASH]: ["specialAttack", "specialDefense"],
    [PokemonNature.CALM]: ["specialDefense", "attack"],
    [PokemonNature.GENTLE]: ["specialDefense", "defense"],
    [PokemonNature.SASSY]: ["specialDefense", "speed"],
    [PokemonNature.CAREFUL]: ["specialDefense", "specialAttack"],
    [PokemonNature.QUIRKY]: ["specialDefense", "specialDefense"],
};

export enum PokemonStatus {
    NONE,
    PARALYZED,
    SLEEP,
    POISON,
    BURN,
    FROZEN,
};
export enum PokemonVolatileStatus {
    NONE,
    CONFUSION,
};

export type PokemonFormIdentifier = [
    dexNumber: Pokedex,
    form: Form,
    isShiny: boolean,
    gender: Gender,
];

export type PokemonId = Pokedex;

export interface PokemonChance {
    /** Pokemon species */
    species: PokemonId;
    /** Number from 0 to 100 */
    chance: number;
    /** Range between 0 and 100 */
    levelRange: [number, number];
}