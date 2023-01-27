import { Controls } from "./controls";

export interface MenuOption {
    /** The visual name of the string */
    name: string;
    /** The function to call when the option is selected */
    callback: () => void;
    /** The related element, generated once you build the menu */
    element?: HTMLDivElement;
}

export class OptionMenuGUI {
    public options: MenuOption[];
    public hidden: boolean;
    public id: string;

    public element!: HTMLDivElement;
    public selectedIndex: number = 0;

    constructor(id: string, place: [left: number, top: number], options: MenuOption[]) {
        this.options = options;
        this.hidden = true;
        this.id = id;
        this.buildMenu(place);
    }

    public setSelected(index: number, selected: boolean) {
        if (selected) {
            this.options[index]?.element?.classList.add("selected");
            this.selectedIndex = index;
        } else {
            this.options[index]?.element?.classList.remove("selected");
        }
    }

    public buildMenu(place: [left: number, top: number]) {
        this.element = document.createElement("div");
        this.element.id = this.id;
        this.element.classList.add("option-menu");
        this.element.style.left = `${place[0]}%`;
        this.element.style.top = `${place[1]}%`;

        for (let i of this.iterOptions()) {
            const option = this.options[i];
            const optionElement = document.createElement("div");
            optionElement.classList.add("option");
            optionElement.innerText = option.name;
            optionElement.addEventListener("click", option.callback);
            option.element = optionElement;
            this.element.appendChild(optionElement);

            optionElement.addEventListener("mouseover", () => {
                for (let o of this.iterOptions())
                    this.setSelected(o, false);
                this.setSelected(i, true);
            });
        }
        this.setSelected(0, true);
    }

    public *iterOptions(): IterableIterator<number> {
        for (let i = 0; i < this.options.length; i++)
            yield i;
    }

    public show() {
        if (this.hidden) {
            this.hidden = false;
            document.body.appendChild(this.element);
        }
    }

    public hide() {
        if (!this.hidden) {
            this.hidden = true;
            document.body.removeChild(this.element);
        }
    }

    /** Binds controls to navigate on this menu */
    public tick(): boolean {
        if (this.hidden) return false;

        if (Controls.LEFT_STICK.BUTTON_UP.onReleased(1) || Controls.DPAD_UP.onReleased(1)) {
            for (const option of this.iterOptions())
                this.setSelected(option, false);
            this.setSelected((this.selectedIndex - 1 + this.options.length) % this.options.length, true);
        }
        if (Controls.LEFT_STICK.BUTTON_DOWN.onReleased(1) || Controls.DPAD_DOWN.onReleased(1)) {
            for (const option of this.iterOptions())
                this.setSelected(option, false);
            this.setSelected((this.selectedIndex + 1) % this.options.length, true);
        }
        if (Controls.PLUS.onReleased(1) || Controls.A.onReleased(1)) {
            this.options[this.selectedIndex].callback();
        }
        if (Controls.B.onReleased(1))
            return false;
        return true;
    }
}