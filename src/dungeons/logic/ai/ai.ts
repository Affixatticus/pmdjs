import { DungeonFloor } from "../../floor";
import { DungeonPokemon } from "../../objects/pokemon";
import { TurnAction } from "../actions/action";
import { NilAction } from "../actions/nil";

export class DungeonPokemonAI {
    public pokemon: DungeonPokemon;
    public floor: DungeonFloor;
    public overwrittenAction: TurnAction | null;

    constructor(pokemon: DungeonPokemon, floor: DungeonFloor) {
        this.pokemon = pokemon;
        this.floor = floor;
        this.overwrittenAction = null;
    }

    public setFloor(floor: DungeonFloor) {
        this.floor = floor;
    }

    public calculateNextAction(): TurnAction {
        if (this.overwrittenAction) return this.overwrittenAction;
        return new NilAction(this.pokemon);
    }
} 