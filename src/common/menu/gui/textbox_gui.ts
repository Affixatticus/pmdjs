import { Gui } from "./gui";

export class TextboxGui extends Gui {
    constructor() {
        super();
        this.createElements();
        this.isVisible = false;
    }

    private createContainer() {
        const container = document.createElement("div");
        container.classList.add("textbox", "textbox-container", "menu-container");
        this.elements.container = container;
    }
    private createText() {
        const text = document.createElement("div");
        text.classList.add("textbox", "textbox-text", "menu-text");
        this.elements.container.appendChild(text);
        this.elements.text = text;
    }
    public createElements(): void {
        this.createContainer();
        this.createText();
        this.addToMenu();
        this.update("Do you want to go down the stairs?");
    }

    public updateText(text: string) {
        this.elements.text.innerText = text;
    }
    public update(text: string) {
        this.updateText(text);
    }
}
export const textboxGui = new TextboxGui();