import { ContextMenuGui, ContextMenuOption } from "./context_menu_gui";
import { Gui } from "./gui";
import { TextboxGui } from "./textbox_gui";

export class ConfirmGui extends Gui {
    private textbox: TextboxGui;
    private ctxMenu: ContextMenuGui;

    public constructor() {
        super();
        this.textbox = new TextboxGui();
        this.ctxMenu = new ContextMenuGui();
        this.ctxMenu.update([]);
        this.createElements();
        this.isVisible = false;
    }

    public onOpen(): void {
        super.onOpen();
        this.textbox.onOpen();
        this.ctxMenu.onOpen();
    }

    public createElements() {
        const container = document.createElement("div");
        container.classList.add("confirm-gui");

        const ctxContainer = this.ctxMenu.elements.container;
        ctxContainer.classList.add("confirm-ctx-menu");
        this.menuDiv.removeChild(ctxContainer);
        container.appendChild(ctxContainer);
        const textboxContainer = this.textbox.elements.container;
        textboxContainer.classList.add("confirm-textbox");
        this.menuDiv.removeChild(textboxContainer);
        container.appendChild(textboxContainer);

        this.menuDiv.appendChild(container);
        this.elements = { container };
    }

    public set isVisible(visible: boolean) {
        this.forceClose = false;
        this.elements.container.classList.toggle("hidden", !visible);
        this.textbox.isVisible = visible;
        this.ctxMenu.isVisible = visible;
    }

    public handleInput() {
        const result = this.ctxMenu.handleInput();
        this.forceClose = this.ctxMenu.forceClose;
        this.lastOutput = this.ctxMenu.lastOutput;
        return result;
    }

    public update(prompt: string, options: ContextMenuOption[]) {
        this.textbox.update(prompt);
        this.ctxMenu.update(options);
    }
}
export const confirmGui = new ConfirmGui();