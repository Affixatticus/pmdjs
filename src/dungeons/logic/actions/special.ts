import { GuiOutput } from "../../../common/menu/gui/gui";
import { GuiManager } from "../../../common/menu/gui/gui_manager";
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

    public get inventory() {
        return this.logic.state.inventory;
    }

    public get ctxMenu() {
        return this.inventory.gui.ctxMenu;
    }

    public *run(): Generator {
        this.logic.state.setRunning(false);
        // Skip until the animation is done
        while (this.pokemon.material.isAnimationDone) yield;
        // Wait 20 ticks
        yield* this.repeat(20);

        // Await for the player's response
        this.ctxMenu.update([{
            text: "Proceed", callback: () => {
                return GuiOutput.PROCEED;
            }
        }, {
            text: "Info", callback: () => {
                return GuiOutput.IGNORED;
            }
        }]);
        yield GuiManager.openGui(this.ctxMenu);
        const result = GuiManager.awaitGuiResult();

        // Tell the logic to go down the stairs at the end of the turn
        if (result === GuiOutput.PROCEED)
            this.logic.turn?.setSpecialFlag(TurnFlag.PROCEED);
    }
}