import { Controls } from "../../../utils/controls";
import { GUIReturnType } from "./common";

export interface ContextMenuOption {
    /** The text that will be displayed on the option */
    text: string;
    /** The function that will be called when the option is selected */
    callback: () => GUIReturnType;
    /** Whether the button is disabled or not */
    disabled?: boolean;
};

/** A customizable list menu that can be created to returns the selected option */
export class ContextMenuGUI {
    /** The list of elements owned by this class */
    public elements: Record<string, HTMLElement> = {};
    /** The list of visible options */
    private options!: ContextMenuOption[];
    /** The currently selected option */
    private cursor: number = 0;
    /** Whether the menu should close on the next tick */
    private closeNextTick: boolean = false;
    /** The value that will be returned on the next tick */
    private nextTurnValue: GUIReturnType = GUIReturnType.NOTHING;
    // ANCHOR Visibility
    private visible: boolean = false;

    public set isVisible(value: boolean) {
        this.visible = value;
        if (this.visible) {
            this.closeNextTick = false;
            this.nextTurnValue = GUIReturnType.NOTHING;
        }
        this.elements.container.classList.toggle("hidden", !value);
    }
    public get isVisible() {
        return this.visible;
    }

    constructor() {
        // Create the elements
        this.createElements();
        // Hide the menu
        this.isVisible = false;
        this.elements.container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.closeNextTick = true;
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

    public navigate(): GUIReturnType {
        if (this.nextTurnValue !== GUIReturnType.NOTHING) {
            return this.nextTurnValue;
        }
        if (Controls.LEFT_STICK.BUTTON_UP.onPressed(0)) {
            this.goUp();
        }
        if (Controls.LEFT_STICK.BUTTON_DOWN.onPressed(0)) {
            this.goDown();
        }
        if (Controls.A.onPressed(1)) {
            // Always close this gui
            this.closeNextTick = true;
            return this.options[this.cursor].callback();
        }
        if (this.closeNextTick || Controls.B.onPressed(1)) {
            return GUIReturnType.CLOSED;
        }
        return GUIReturnType.NOTHING;
    }

    // ANCHOR Element creation
    private createContainer() {
        const container = document.createElement("div");
        container.classList.add("context-menu-container", "menu-container");
        this.elements.container = container;
        return container;
    }
    /** Creates all the element objects of this gui */
    private createElements() {
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
            this.nextTurnValue = buttonInfo.callback();
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
        // Clear the container
        this.elements.container.innerHTML = "";
        // Create the buttons
        for (let i = 0; i < buttonInfo.length; i++) {
            const option = this.createButton(i);
            this.elements.container.appendChild(option);
        }
    }
}