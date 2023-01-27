import { Controls } from "../../../utils/controls";
import { AbstractGUI } from "./gui";

export class ClickableMenuOption {
    public name: string;
    public callback: () => boolean;
    public element!: HTMLDivElement;

    constructor(name: string, callback: () => any) {
        this.name = name;
        this.callback = callback;
        this.element = this.createElement();
    }

    private createElement() {
        const element = document.createElement("div");
        element.classList.add("clickable-menu-option");
        element.innerText = this.name;
        element.addEventListener("click", this.callback);
        return element;
    }
};

export abstract class MenuListGUI extends AbstractGUI {
    public options: ClickableMenuOption[];
    public output: boolean | null = null;
    /** The index of the selected option */
    public selectedOption: number = 0;

    constructor(id: string, options: ClickableMenuOption[]) {
        super(id);
        this.options = options;
        this.element = this.createElement();
    }

    public updateOptions(options: ClickableMenuOption[]) {
        this.options = options;
        this.selectedOption = 0;
        this.element.innerHTML = "";
        for (let option of this.options) {
            this.element.appendChild(option.element);
        }
    }

    public abstract select(index: number): void;
    public abstract createElement(): HTMLElement;

    public show(): void {
        this.visible = true;
        this.element.classList.remove("hidden");
    }

    public hide() {
        this.visible = false;
        this.element.classList.add("hidden");
    }
}

export class VerticalMenuListGUI extends MenuListGUI {
    public visible = false;

    constructor(id: string, options: ClickableMenuOption[]) {
        super(id, options);
    }

    public hide() {
        super.hide();
        this.select(0);
    }

    public show() {
        // Wait one tick to avoid the menu being deleted right after being created
        super.show();
        this.select(0);
    }

    public onBPressed(): boolean {
        return false;
    }

    public createElement() {
        const element = document.createElement("div");
        element.classList.add("vertical-menu-list", "hidden");
        element.id = this.id;
        for (let option of this.options) {
            element.appendChild(option.element);
        }
        document.body.appendChild(element);
        return element;
    }

    public select(index: number) {
        if (this.options.length === 0) return;
        if (index < 0) {
            index = this.options.length - 1;
        } else if (index >= this.options.length) {
            index = 0;
        }
        this.options[this.selectedOption].element.classList.remove("selected");
        this.options[index].element.classList.add("selected");
        this.selectedOption = index;
    }

    public tick() {
        if (Controls.B.onPressed(0)) {
            this.onBPressed();
        }
        if (Controls.LEFT_STICK.BUTTON_UP.onPressed(0)) {
            this.select(this.selectedOption - 1);
        } else if (Controls.LEFT_STICK.BUTTON_DOWN.onPressed(0)) {
            this.select(this.selectedOption + 1);
        } else if (Controls.A.onPressed(0)) {
            const result = this.options[this.selectedOption].callback();
            return result;
        }

        return true;
    }
}

export class YesNoGUI extends VerticalMenuListGUI {
    public output: boolean | null = null;

    constructor() {
        super("yes-no-menu", []);
        this.output = null;
        const that = this;
        this.updateOptions([
            new ClickableMenuOption("Yes", () => {
                that.output = true;
                return true;
            }),
            new ClickableMenuOption("No", () => {
                that.output = false;
                return true;
            }),
        ]);
    }

    public onBPressed(): boolean {
        this.output = false;
        return true;
    }

    hide() {
        super.hide();
        this.output = null;
        document.body.removeChild(this.element);
    }
}
