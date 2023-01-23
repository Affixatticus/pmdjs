import { Minimap, MinimapStyle } from "./minimap";

export interface DungeonUIOptions {
    minimapStyle: MinimapStyle;
};

export class DungeonUI {
    public minimap: Minimap;

    constructor(options: DungeonUIOptions) {
        this.minimap = new Minimap(options.minimapStyle);
        this.placeInTopLeft(this.minimap.getElement());
    }

    public placeInTopLeft(element: HTMLElement) {
        document.body.appendChild(element);
    }
}