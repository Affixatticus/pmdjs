import { V2, Vec2 } from "./vectors";

enum Keys {
    L_UP = "ArrowUp",
    L_DOWN = "ArrowDown",
    L_LEFT = "ArrowLeft",
    L_RIGHT = "ArrowRight",
    R_UP = "KeyW",
    R_DOWN = "KeyS",
    R_LEFT = "KeyA",
    R_RIGHT = "KeyD",
};

/** 
 * Container for the controls.
 */
export class Controls {
    private keys: Set<Keys>;

    /** Left Stick */
    public LS: Vec2;
    /** Right Stick */
    public RS: Vec2;

    constructor() {
        this.keys = new Set();
        this.LS = V2(0, 0);
        this.RS = V2(0, 0);

        // Add event listeners
        document.addEventListener("keydown", (e) => this.mouseDown(e));
        document.addEventListener("keyup", (e) => this.mouseUp(e));
    }

    private updateSticks() {
        // Update the left stick
        this.LS.x = 0, this.LS.y = 0;
        if (this.isPressed(Keys.L_UP)) this.LS.y += 1;
        if (this.isPressed(Keys.L_DOWN)) this.LS.y -= 1;
        if (this.isPressed(Keys.L_LEFT)) this.LS.x -= 1;
        if (this.isPressed(Keys.L_RIGHT)) this.LS.x += 1;

        // Update the right stick
        this.RS.x = 0, this.RS.y = 0;
        if (this.isPressed(Keys.R_UP)) this.RS.y += 1;
        if (this.isPressed(Keys.R_DOWN)) this.RS.y -= 1;
        if (this.isPressed(Keys.R_LEFT)) this.RS.x -= 1;
        if (this.isPressed(Keys.R_RIGHT)) this.RS.x += 1;
    }

    private mouseDown(e: KeyboardEvent) {
        // Return if the element was already in the array
        if (this.keys.has(e.key as Keys)) return;
        // Add the current keyCode to the keys array
        this.keys.add(e.key as Keys);
        // Update the sticks
        this.updateSticks();
    }

    private mouseUp(e: KeyboardEvent) {
        // Return if the element was not in the set
        if (!this.keys.has(e.key as Keys)) return;
        // Remove the current keyCode from the keys set
        this.keys.delete(e.key as Keys);
        // Update the sticks
        this.updateSticks();
    }

    public isPressed(key: string): boolean {
        return this.keys.has(key as Keys);
    }
}