import { DungeonPokemon } from "../../objects/pokemon";
import { TurnAction } from "../actions/action";
import { DungeonLogic } from "../logic";
import { DungeonFollowAI, DungeonPokemonAI } from "./ai";

export class DungeonPokemonPartnerAI extends DungeonPokemonAI {
    private followAI: DungeonFollowAI;

    constructor(pokemon: DungeonPokemon, logic: DungeonLogic) {
        super(pokemon, logic);
        this.followAI = new DungeonFollowAI(pokemon, logic.state.floor.pokemon.getLeader(), logic);
    }

    public calculateNextAction(): TurnAction {
        if (this.overwrittenAction) return this.overwrittenAction;
        const leader = this.logic.state.floor.pokemon.getLeader();
        return this.followAI.follow();
    }
}