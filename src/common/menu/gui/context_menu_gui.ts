import { Controls } from "../../../utils/controls";
import { Gui, GuiClose, GuiOutput } from "./gui";

export interface ContextMenuOption {
    /** The text that will be displayed on the option */
    text: string;
    /** The function that will be called when the option is selected */
    callback: (gui: ContextMenuGui) => GuiOutput;
    /** Whether the button is disabled or not */
    disabled?: boolean;
};

/** A customizable list menu that can be created to returns the selected option */
export class ContextMenuGui extends Gui {
    /** The list of elements owned by this class */
    public elements: Record<string, HTMLElement> = {};
    /** The list of visible options */
    private options!: ContextMenuOption[];
    /** The special function to be executed when cacelling */
    private cancelCallback: ((gui: ContextMenuGui) => GuiOutput) | null = null;
    /** The currently selected option */
    private cursor: number = 0;

    constructor() {
        super();
        // Create the elements
        this.createElements();
        // Hide the menu
        this.isVisible = false;
        this.elements.container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
    }

    // ANCHOR Navigation
    public goUp() {
        // Go up but ignores disabled buttons
        let index = this.cursor - 1;
        while (index >= 0 && this.options[index].disabled) {
            index--;
        }
        if (index >= 0)
            this.updateSelection(index);
    }
    public goDown() {
        // Go down but ignores disabled buttons
        let index = this.cursor + 1;
        while (index < this.options.length && this.options[index].disabled) {
            index++;
        }
        if (index < this.options.length)
            this.updateSelection(index);
    }
    public goLeft() {
        // Go to the 0th option
        this.updateSelection(0);
    }
    public goRight() {
        // Go to the last option
        this.updateSelection(this.options.length - 1);
    }

    public handleInput(): GuiClose {
        if (Controls.LEFT_STICK.BUTTON_UP.onPressed(0)) {
            this.goUp();
        }
        if (Controls.LEFT_STICK.BUTTON_DOWN.onPressed(0)) {
            this.goDown();
        }
        if (Controls.LEFT_STICK.BUTTON_LEFT.onPressed(0)) {
            this.goLeft();
        }
        if (Controls.LEFT_STICK.BUTTON_RIGHT.onPressed(0)) {
            this.goRight();
        }
        if (Controls.A.onPressed(1)) {
            // Always close this gui
            this.lastOutput = this.options[this.cursor].callback(this);
            return true;
        }
        if (Controls.B.onPressed(1)) {
            // Execute the cancel callback
            if (this.cancelCallback !== null)
                this.lastOutput = this.cancelCallback(this);
            return true;
        }
        return false;
    }

    // ANCHOR Element creation
    private createContainer() {
        const container = document.createElement("div");
        container.classList.add("context-menu-container", "menu-container");
        this.elements.container = container;
        return container;
    }
    /** Creates all the element objects of this gui */
    public createElements() {
        const container = this.createContainer();
        document.getElementById("menu")!.appendChild(container);
        this.elements.container = container;
    }

    // ANCHOR Element updates
    public updateSelection(index: number = this.cursor) {
        // Update the cursor
        this.cursor = index;
        // Set all buttons to inactive
        const buttons = this.elements.container.children;
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove("menu-option-selected");
        }
        // Set the selected button to active
        buttons[index].classList.add("menu-option-selected");
    }

    private createButton(index: number): HTMLElement {
        const buttonInfo = this.options[index];
        const option = document.createElement("div");
        option.classList.add("menu-option", "context-menu-option", "menu-text");
        if (this.cursor === index)
            option.classList.add("menu-option-selected");
        // Update the button's information
        option.innerText = buttonInfo.text;
        if (buttonInfo.disabled)
            option.setAttribute("disabled", "");
        // Add the button's functionality
        option.addEventListener("click", () => {
            if (buttonInfo.disabled) return;
            this.updateSelection(index);
            this.close(buttonInfo.callback(this));
        });
        option.addEventListener("mousedown", () => {
            if (buttonInfo.disabled) return;
            this.updateSelection(index);
        });
        // Set the button to active if it is the selected option
        if (index === this.cursor)
            option.classList.add("active");
        return option;
    }
    /** Constructs the items */
    public update(buttonInfo: ContextMenuOption[]) {
        // Reset the cursor
        this.cursor = 0;
        this.options = buttonInfo;
        // Add the cancel button
        const cancelIndex = this.options.findIndex((option) => option.text === "Cancel");
        if (cancelIndex === -1) {
            this.options.push({ text: "Cancel", callback: () => { return GuiOutput.UNASSIGNED } });
        } else {
            const cancelButton = this.options[cancelIndex];
            this.cancelCallback = cancelButton.callback;
        }

        // Clear the container
        this.elements.container.innerHTML = "";
        // Create the buttons
        for (let i = 0; i < buttonInfo.length; i++) {
            const option = this.createButton(i);
            this.elements.container.appendChild(option);
        }
    }
}