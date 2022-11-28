import { PokemonTypes } from "./pokemon_types";

export enum PokemonSpecies {
    BULBASAUR,
    IVYSAUR,
    VENUSAUR,
    CHARMANDER,
    CHARMELEON,
    CHARIZARD,
    //...
};

export enum PokemonForms {
    MALE,
    FEMALE,
    SHINY_MALE,
    SHINY_FEMALE
};

export type PokemonId = [species: string, form: number];

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
    id: PokemonId;
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
    id: PokemonId;
    /** Number from 0 to 100 */
    chance: number;
    /** Range between 0 and 100 */
    levelRange: [number, number];
}