import { DungeonPokemon } from "../../objects/pokemon";
import { DungeonLogic } from "../logic";
import { TurnFlags as TurnFlag } from "../turn";
import { TurnAction } from "./action";

export class GoDownStairsAction extends TurnAction {
    public pokemon: DungeonPokemon;
    public logic: DungeonLogic;
    public doLogging = true;
    public logMessage = `You went down the stairs!`;

    constructor(pokemon: DungeonPokemon, logic: DungeonLogic) {
        super();
        this.pokemon = pokemon;
        this.logic = logic;
        this.generator = this.run();
    }

    public *run(): Generator {
        this.logic.state.setRunning(false);
        // Skip until the animation is done
        while (this.pokemon.material.isDone()) yield;
        // Tell the logic to go down the stairs at the end of the turn
        this.logic.turn?.setSpecialFlag(TurnFlag.GO_UP_STAIRS);
    }
}