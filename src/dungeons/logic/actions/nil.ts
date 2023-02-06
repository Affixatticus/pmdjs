import { DungeonPokemon } from "../../objects/pokemon";
import { TurnAction } from "./action";

export class NilAction extends TurnAction {
    /** @ts-ignore Unused */
    private pokemon: DungeonPokemon;

    constructor(pokemon: DungeonPokemon) {
        super();
        this.pokemon = pokemon;
        this.generator = this.run();
    }

    public *run() {
        // TODO Should turn the pokemon to face the specified direction,
        // plus it should run with the other walking actions
        // Do not yield
    }
}