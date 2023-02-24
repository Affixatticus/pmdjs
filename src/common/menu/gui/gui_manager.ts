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
    private static DELAY_LENGTH: number = 20;
    private static delay: number = this.DELAY_LENGTH;
    public static get currentGui(): Gui { return this.stack[this.stack.length - 1] }

    /** Opens a Gui */
    static openGui(gui: Gui) {
        this.stack.push(gui);
        this.currentGui.lastOutput = GuiOutput.UNASSIGNED;
        this.currentGui.isVisible = true;
        // Set all other guis to unfocused
        for (let i = 0; i < this.stack.length - 1; i++) {
            this.stack[i].elements.container.classList.add("unfocused");
        }
        this.delay = this.DELAY_LENGTH;
    }
    /** Closes the Gui */
    static closeGui() {
        this.shouldClose = true;
        this.currentGui.isVisible = false;
        for (let i = 0; i < this.stack.length - 1; i++) {
            this.stack[i].elements.container.classList.remove("unfocused");
        }
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
        if (this.delay > 0) {
            this.delay--;
            return true;
        } else if (this.delay === 0) {
            this.delay = -1;
        }
        // Update the current gui
        this.shouldClose = this.currentGui.forceClose ? true : this.currentGui.handleInput();
        this.guiOutput = this.currentGui.lastOutput;
        if (this.shouldClose) this.closeGui();

        return true;
    }
}