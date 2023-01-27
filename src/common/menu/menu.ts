import { Controls } from "../../utils/controls";
import { GUIManager } from "./gui/gui";
import { ClickableMenuOption, VerticalMenuListGUI } from "./gui/menu_list";
import { Inventory } from "./inventory";

const MIN_TICKS_FOR_MENU = 2;

export class GameMenu {
    public inventory: Inventory;
    public gui: GameMenuGUI;

    public isOpen: boolean = false;

    constructor(inventory: Inventory) {
        this.inventory = inventory;
        this.gui = new GameMenuGUI(this);
    }

    /** Function that returns true if the menu is opened, and otherwise
     * checks to see if you can open the menu
     */
    public controlLoop(cancelCheck: boolean): boolean {
        if (this.isOpen) {
            const result = this.gui.tick();
            if (!result) this.closeMenu();
            return result;
        } else {
            return this.tryOpen(cancelCheck);
        }
    }

    public tryOpen(cancelCheck: boolean): boolean {
        if (cancelCheck) Controls.B.resetLastPressed();
        if (Controls.B.onReleased(MIN_TICKS_FOR_MENU)) {
            this.openMenu();
            return true;
        }
        return false;
    }

    public openMenu() {
        this.isOpen = true;
        this.gui.show();
    }

    public closeMenu() {
        this.isOpen = false;
        this.gui.hide();
    }
}

export class GameMenuGUI extends VerticalMenuListGUI {
    private menuLogic: GameMenu;

    constructor(menuLogic: GameMenu) {
        super("game-menu", [
            new ClickableMenuOption("Inventory", () => { GUIManager.showGUI(this.menuLogic.inventory.gui); return true }),
            new ClickableMenuOption("Tactics", () => false),
            new ClickableMenuOption("Team", () => false),
        ]);

        this.menuLogic = menuLogic;
    }

    public tick() {
        return super.tick();
    }

}