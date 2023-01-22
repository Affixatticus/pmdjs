import { DungeonPokemon } from "../../objects/pokemon";
import { TurnAction } from "./action";

export class NilAction implements TurnAction {
    public done: boolean;
    /** @ts-ignore Unused */
    private pokemon: DungeonPokemon;

    /** Logging */
    public doLogging: boolean = false;
    public logMessage!: string | never;

    constructor(pokemon: DungeonPokemon) {
        this.done = false;
        this.pokemon = pokemon;
    }

    public tick(): boolean {
        this.done = true;
        return true;
    }
}