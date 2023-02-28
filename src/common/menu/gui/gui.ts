export enum GuiOutput {
    IGNORED = -1,
    /** A result is yet to be deduced */
    UNASSIGNED,

    // Inventory specific ouputs
    /** On eat */
    INVENTORY_EAT,
    /** On drop */
    INVENTORY_DROP,
    /** On use */
    INVENTORY_USE,
    /** On toss */
    INVENTORY_TOSS,
    /** On throw */
    INVENTORY_THROW,
    /** When you pick up an item off the ground */
    INVENTORY_GROUND_PICKUP,
    /** When you swap the item on the ground with one from your inventory */
    INVENTORY_GROUND_SWAP,

    /** When you choose to go down the stairs in the ground menu */
    PROCEED,

    /** When you select the inventory option in the game menu */
    MENU_INVENTORY,
    /** When you select the party option in the game menu */
    MENU_PARTY,
};

export type GuiClose = boolean;


export abstract class Gui {
    constructor() { };
    public createElements() { };
    public elements: Record<string, HTMLElement> = {};
    protected visible: boolean = false;
    public handleInput(): boolean { return false; };
    public lastOutput: GuiOutput = GuiOutput.UNASSIGNED;
    public forceClose: boolean = false;

    /** Closes this window without returning an output */
    public close(output: GuiOutput = GuiOutput.UNASSIGNED): void {
        this.forceClose = true;
        this.setOutput(output);
    }
    public onOpen() {
        this.forceClose = false;
        this.lastOutput = GuiOutput.UNASSIGNED;
    }
    public setOutput(output: GuiOutput): void {
        this.lastOutput = output;
    }

    public get menuDiv(): HTMLElement {
        return document.getElementById("menu")!;
    }
    public addToMenu() {
        this.menuDiv.appendChild(this.elements.container);
    }

    public set isVisible(visible: boolean) {
        this.forceClose = false;
        this.elements.container.classList.toggle("hidden", !visible);
    }

    public get isVisible(): boolean {
        return this.visible;
    }
}