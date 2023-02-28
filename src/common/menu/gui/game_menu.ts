import { ContextMenuGui } from "../inventory/context_menu_gui";
import { Gui, GuiOutput } from "./gui";

export class GameMenuGui extends Gui {
    private ctxMenu!: ContextMenuGui;

    constructor() {
        super();
        this.createElements();
        this.isVisible = false;
    }
    public set isVisible(visible: boolean) {
        super.isVisible = visible;
        this.ctxMenu.isVisible = visible;
    }
    public onOpen(): void {
        this.lastOutput = GuiOutput.UNASSIGNED;
        this.ctxMenu.lastOutput = GuiOutput.UNASSIGNED;
    }

    public handleInput(): boolean {
        const shouldClose = this.ctxMenu.handleInput();
        this.lastOutput = this.ctxMenu.lastOutput;
        return shouldClose;
    }


    // ANCHOR Element Creation
    private createContainer() {
        const container = document.createElement("div");
        container.id = "game-menu";
        container.classList.add("obscured");
        this.elements.container = container;
        return container;
    }

    public createElements(): void {
        this.createContainer();
        this.addToMenu();
        this.ctxMenu = new ContextMenuGui();
        document.getElementById("menu")!.removeChild(this.ctxMenu.elements.container);
        this.elements.container.appendChild(this.ctxMenu.elements.container);
        this.update();
    }

    // ANCHOR Element updating
    public update() {
        this.ctxMenu.update([
            {
                text: "Inventory",
                callback: () => {
                    this.close();
                    return GuiOutput.MENU_INVENTORY;
                }
            },
            {
                text: "Party",
                callback: () => {
                    this.close();
                    return GuiOutput.MENU_PARTY;
                }
            },
        ]);
    }
}

export const gameMenuGui = new GameMenuGui();