import { Minimap } from "./minimap";

export interface DungeonUIOptions {
};

export class DungeonUI {
    public minimap: Minimap;

    constructor(options: DungeonUIOptions) {
        this.minimap = new Minimap();
        this.placeInTopLeft(this.minimap.getElement());
    }

    public placeInTopLeft(element: HTMLElement) {
        document.body.appendChild(element);
    }
}