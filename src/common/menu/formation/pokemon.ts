import { PokemonNature, PokemonFormIdentifier, PokemonStatus, PokemonVolatileStatus, PokedexData, PokemonBaseData, StatName, Naturedex } from "../../../data/pokemon";

/** Base stats of the given pokemon. Can be changed permanently, 
 * but does not revert to previous states.
 */
export interface PokemonIndividualStats {
    /** The given nickname, null if it equals species name */
    nickname: string | null;
    /** The pokemon's form identifier */
    form: PokemonFormIdentifier;

    /** The pokemon's experience */
    experience: number;
    /** The pokemons ev/s */
    evs: [number, number, number, number, number, number];
    /** The pokemons iv/s */
    ivs: [number, number, number, number, number, number];
    /** The pokemons nature */
    nature: PokemonNature;
}

/** Data relative to a pokemon that is reset after exiting the dungeon */
export interface PokemonVariableStats {
    /** Current HP of the pokemon */
    hp: number;
    /** Current belly fill level of the pokemon */
    belly: number;
    // Base max HP
    baseHp: number;
    // Base stats on dungeon entered
    baseAttack: number;
    baseDefense: number;
    baseSpecialAttack: number;
    baseSpecialDefense: number;
    baseSpeed: number;
};

/** Stats that reset at the beginning of each floor
 * e.g. status conditions, stat changes, etc.
 */
export interface PokemonVolatileStats {
    /** Statuses like paralyzed and poisoned */
    status: PokemonStatus | null;
    /** Volatile statuses */
    stackableStatuses: PokemonVolatileStatus[];
    /** Stat changes
     * Attack, Defense, Special Attack, Special Defense, Speed, Accuracy, Evasion, Critical Hit Rate
     */
    statChanges: [number, number, number, number, number, number, number, number];
}

export class Pokemon {
    public id: PokemonFormIdentifier;
    public baseData: PokemonBaseData;
    public indData!: PokemonIndividualStats;
    public varData!: PokemonVariableStats;
    public volData!: PokemonVolatileStats;

    private calcLevel() {
        return Math.floor(this.exp / 100);
    }
    private calcNatureMultiplier(stat: StatName) {
        const nature = this.indData.nature;
        return 1 +
            (Naturedex[nature][0] === stat ? -0.1 : 0) +
            (Naturedex[nature][1] === stat ? 0.1 : 0);
    }
    private calcHPStat() {
        return Math.floor((Math.floor(0.01 * (2 * this.baseData.hp + this.indData.ivs[0] + Math.floor(0.25 * this.indData.evs[0])) * this.calcLevel()) + 10) + this.calcLevel());
    }
    private calcBaseStat(stat: StatName, index: number) {
        const nature = this.calcNatureMultiplier(stat);
        return Math.floor((Math.floor(0.01 * (2 * this.baseData[stat] + this.indData.ivs[index] + Math.floor(0.25 * this.indData.evs[index])) * this.calcLevel()) + 5) * nature);
    }

    constructor(id: PokemonFormIdentifier) {
        this.id = id;
        this.baseData = PokedexData[this.id[0]];
        this.indData = {
            nickname: null,
            form: this.id,
            experience: 0,
            evs: [0, 0, 0, 0, 0, 0],
            ivs: [0, 0, 0, 0, 0, 0],
            nature: PokemonNature.HARDY,
        };
        this.reload();
    }

    public reload() {
        const varData = {
            baseHp: this.calcHPStat(),
            baseAttack: this.calcBaseStat("attack", 1),
            baseDefense: this.calcBaseStat("defense", 2),
            baseSpecialAttack: this.calcBaseStat("specialAttack", 3),
            baseSpecialDefense: this.calcBaseStat("specialDefense", 4),
            baseSpeed: this.calcBaseStat("speed", 5),
        };
        this.varData = {
            hp: varData.baseHp,
            belly: 100,
            ...varData,
        };
        this.volData = {
            status: PokemonStatus.NONE,
            stackableStatuses: [],
            statChanges: [0, 0, 0, 0, 0, 0, 0, 0],
        };
    }


    // ANCHOR Getters
    public get maxHp() { return this.varData.baseHp }
    public get baseAttack() { return this.varData.baseAttack }
    public get baseDefense() { return this.varData.baseDefense }
    public get baseSpecialAttack() { return this.varData.baseSpecialAttack }
    public get baseSpecialDefense() { return this.varData.baseSpecialDefense }
    public get baseSpeed() { return this.varData.baseSpeed }

    public get hp() { return this.varData.hp }
    public get belly() { return this.varData.belly }
    public get level() { return this.calcLevel() }
    public get name() { return this.indData.nickname || this.baseData.name }
    public get exp() { return this.indData.experience }

    // ANCHOR Setters
    /** Sets the nickname of the specified pokemon, caps at 16 characters */
    public set name(name: string) { this.indData.nickname = name.slice(0, 16) }
    public set belly(belly: number) { this.varData.belly = belly }
    public set exp(exp: number) { this.indData.experience = exp }
}