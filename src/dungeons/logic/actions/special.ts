import { DungeonPokemon } from "../../objects/pokemon";
import { DungeonLogic } from "../logic";
import { TurnFlags as TurnFlag } from "../turn";
import { TurnAction } from "./action";

export class GoDownStairsAction implements TurnAction {
    public pokemon: DungeonPokemon;
    public logic: DungeonLogic;
    public doLogging = true;
    public logMessage = `You went down the stairs!`;

    constructor(pokemon: DungeonPokemon, logic: DungeonLogic) {
        this.pokemon = pokemon;
        this.logic = logic;
        console.log("Created GoDownStairsAction");
    }

    // Do stuff
    public tick(): boolean {
        // Await for the pokemon's animations to finish
        const animationDone = this.pokemon.material.isDone();
        if (!animationDone) return false;

        // Tell the logic to go down the stairs at the end of the turn
        this.logic.turn?.setSpecialFlag(TurnFlag.GO_UP_STAIRS);
        return true;
    }
}