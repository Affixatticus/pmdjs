import { VerticalMenuListGUI, YesNoGUI } from "./menu_list";

const DELAY = 5;

export enum GUIType {
    YES_NO
}

export class GUIManager {
    static visibleGUI: AbstractGUI | null = null;
    static delay: number = 0;

    static showGUI(gui: AbstractGUI) {
        if (this.visibleGUI !== null) {
            this.visibleGUI.hide();
        }
        this.delay = DELAY;
        this.visibleGUI = gui;
        this.visibleGUI.show();
    }

    static hideGUI() {
        if (this.visibleGUI !== null) {
            this.visibleGUI.hide();
            this.visibleGUI = null;
        }
    }

    static awaitOutput(guiType: GUIType): any | null {
        if (this.visibleGUI === null) {
            switch (guiType) {
                case GUIType.YES_NO:
                    this.showGUI(new YesNoGUI());
                    break;
            }
        }

        this.tick();
        const result = (<VerticalMenuListGUI>this.visibleGUI).output;
        if (result !== null) this.hideGUI();
        return result;
    }

    static tick() {
        if (this.delay > 0) {
            this.delay--;
            return false;
        }

        if (this.visibleGUI !== null) {
            const result = this.visibleGUI.tick();
            if (!result) this.hideGUI();
            return result;
        }
        this.delay = DELAY;
        return false;
    }
}


export abstract class AbstractGUI {
    public id: string;
    public element!: HTMLElement;
    public abstract visible: boolean;
    public abstract show(): void;
    public abstract hide(): void;
    /** @returns `true` if the you want to lock the loop, `false` otherwise */
    public abstract tick(): boolean;
    public abstract createElement(): HTMLElement;

    constructor(id: string) {
        this.id = id;
    }
}