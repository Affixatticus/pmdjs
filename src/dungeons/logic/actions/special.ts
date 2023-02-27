import { confirmGui } from "../../../common/menu/gui/confirm_gui";
import { GuiOutput } from "../../../common/menu/gui/gui";
import { GuiManager } from "../../../common/menu/gui/gui_manager";
import { DungeonItem } from "../../objects/item";
import { DungeonPokemon } from "../../objects/dungeon_pokemon";
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
        confirmGui.update("Do you want to go down the stairs?", [{
            text: "Proceed", callback: () => {
                return GuiOutput.PROCEED;
            }
        }]);
        yield GuiManager.openGui(confirmGui);
        const result = GuiManager.awaitGuiResult();

        // Tell the logic to go down the stairs at the end of the turn
        if (result === GuiOutput.PROCEED)
            this.logic.turn!.setSpecialFlag(TurnFlag.PROCEED);
    }
}

export class OpenItemMenuAction extends TurnAction {
    public item: DungeonItem;
    public logic: DungeonLogic;
    public doLogging = true;
    public logMessage = `You picked up an item!`;

    constructor(item: DungeonItem, logic: DungeonLogic) {
        super();
        this.item = item;
        this.logic = logic;
        this.generator = this.run();
    }

    private get state() {
        return this.logic.state;
    }

    public *run() {
        GuiManager.openGui(this.state.inventory.gui);
        this.state.inventory.gui.setGround(this.item);
        this.state.inventory.gui.moveToGroundPage();
        yield this.state.inventory.gui.openContextMenu();

        const result = GuiManager.awaitGuiResult();
        switch (result) {
            case GuiOutput.INVENTORY_GROUND_SWAP:
                this.state.inventory.swapItemWithGround(this.item);
                break;
            default:
                this.item.discard();
        }
    }

}