import { Gui, GuiOutput } from "./gui";

/** This class is accessible to all components.
 * It can be used to create a menu, a dialog, a popup, etc.
 * It manages the state of the open GUI, the previous GUI, etc.
 * It saves the return value of the previous GUI.
 */
export class GuiManager {
    public static stack: Gui[] = [];
    public static shouldClose: boolean = false;
    public static guiOutput: GuiOutput = GuiOutput.UNASSIGNED;
    public static get currentGui(): Gui { return this.stack[this.stack.length - 1] }

    /** Opens a Gui */
    static openGui(gui: Gui) {
        this.stack.push(gui);
        this.currentGui.isVisible = true;
        this.currentGui.lastOutput = GuiOutput.UNASSIGNED;
    }
    /** Closes the Gui */
    static closeGui() {
        this.shouldClose = true;
        this.currentGui.isVisible = false;
        this.stack.pop();
    }

    static awaitGuiResult(): GuiOutput {
        // Check the status of the gui
        return this.guiOutput;
    }

    /** Updates the gui state, does nothing if no ui is open, 
     * returns `true` if the gui is open, thus locking the logic from advancing */
    static handleInput(): boolean {
        if (this.stack.length === 0) return false;
        // Update the current gui
        this.guiOutput = this.currentGui.lastOutput;
        this.shouldClose = this.currentGui.forceClose ? true : this.currentGui.handleInput();
        if (this.shouldClose) this.closeGui();

        return true;
    }
}