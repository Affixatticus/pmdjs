import { PokemonTypes } from "./pokemon_types";

export enum PokemonGenders {
    MALE = 0,
    FEMALE = 2,
};

export enum PokemonForms {
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



export type PokemonFormIdentifier = [
    dexNumber: Pokedex,
    form: PokemonForms,
    isShiny: boolean,
    gender: PokemonGenders,
];

export type PokemonId = Pokedex;

export interface PokemonStats {
    hp: number;
    attack: number
    defense: number;
    spatk: number;
    spdef: number;
    speed: number;
};

export interface PokemonMove {
    // Move identifier
    id: number;
    ppLost: number;
};

/** Generic info for an instanced pokemon */
export interface PokemonData {
    // Pokemon Species
    id: PokemonFormIdentifier;
    // Stat changes
    stats: PokemonStats;
    // Moves
    moves: PokemonMove[];
};

export interface PokemonInfo {
    baseStats: PokemonStats;
    types: PokemonTypes;
};

export interface PokemonChance {
    /** Pokemon species */
    species: PokemonId;
    /** Number from 0 to 100 */
    chance: number;
    /** Range between 0 and 100 */
    levelRange: [number, number];
}