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
    public setOutput(output: GuiOutput): void {
        this.lastOutput = output;
    }
    
    public set isVisible(visible: boolean) {
        this.forceClose = false;
        this.elements.container.classList.toggle("hidden", !visible);
    }
    
    public get isVisible(): boolean {
        return this.visible;
    }
}