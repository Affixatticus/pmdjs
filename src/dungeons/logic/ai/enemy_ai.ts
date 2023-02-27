import { DungeonPokemon } from "../../objects/dungeon_pokemon";
import { TurnAction } from "../actions/action";
import { DungeonLogic } from "../logic";
import { DungeonPokemonAI, DungeonWanderAI } from "./ai";

export class DungeonPokemonEnemyAI extends DungeonPokemonAI {
    private wanderAI: DungeonWanderAI;
    
    constructor(pokemon: DungeonPokemon, logic: DungeonLogic) {
        super(pokemon, logic);
        this.wanderAI = new DungeonWanderAI(pokemon, logic);
    }

    public calculateNextAction(): TurnAction {
        if (this.overwrittenAction) return this.overwrittenAction;
        return this.wanderAI.wander();
    }
}