import { DungeonFloor } from "../../floor";
import { DungeonPokemon } from "../../objects/pokemon";
import { TurnAction } from "../actions/action";
import { NilAction } from "../actions/nil";

export class DungeonPokemonAI {
    public pokemon: DungeonPokemon;
    public floor: DungeonFloor;

    constructor(pokemon: DungeonPokemon, floor: DungeonFloor) {
        this.pokemon = pokemon;
        this.floor = floor;
    }

    public setFloor(floor: DungeonFloor) {
        this.floor = floor;
    }

    public calculateNextAction(): TurnAction {
        return new NilAction(this.pokemon);
    }
} 