import { Direction } from "./direction";
import { V2, Vec2 } from "./vectors";

export class Button {
    static readonly A: Button = new Button("a", "KeyZ");
    static readonly B: Button = new Button("b", "KeyX");
    static readonly X: Button = new Button("x", "KeyA");
    static readonly Y: Button = new Button("y", "KeyS");
    static readonly L: Button = new Button("l", "KeyQ");
    static readonly R: Button = new Button("r", "KeyW");
    static readonly ZL: Button = new Button("zl", "KeyE");
    static readonly ZR: Button = new Button("zr", "KeyD");
    static readonly MINUS: Button = new Button("minus", "Backspace");
    static readonly PLUS: Button = new Button("plus", "Enter");
    static readonly LCLICK: Button = new Button("lclick", "1");
    static readonly RCLICK: Button = new Button("rclick", "2");
    static readonly HOME: Button = new Button("home", "Escape");
    static readonly CAPTURE: Button = new Button("capture", "KeyP");
    static readonly DPAD_UP: Button = new Button("dpad_up", "KeyT");
    static readonly DPAD_DOWN: Button = new Button("dpad_down", "KeyG");
    static readonly DPAD_LEFT: Button = new Button("dpad_left", "KeyF");
    static readonly DPAD_RIGHT: Button = new Button("dpad_right", "KeyH");

    static readonly list = [
        Button.A,
        Button.B,
        Button.X,
        Button.Y,
        Button.L,
        Button.R,
        Button.ZL,
        Button.ZR,
        Button.MINUS,
        Button.PLUS,
        Button.LCLICK,
        Button.RCLICK,
        Button.HOME,
        Button.CAPTURE,
        Button.DPAD_UP,
        Button.DPAD_DOWN,
        Button.DPAD_LEFT,
        Button.DPAD_RIGHT,
    ];

    // Non static part
    public isPressed: boolean;
    public isDown: boolean;
    public isUp: boolean;
    public button: string;
    public keyCode: string;

    public ticksDown: number = 0;
    public ticksUp: number = 0;
    private lastTicksDown: number = 0;
    private lastTicksUp: number = 0;
    private isReleaseLocked = false;
    private isPressedLocked = false;

    constructor(button: string, keyboardKey: string) {
        this.isPressed = false;
        this.isDown = false;
        this.isUp = true;
        this.button = button;
        this.keyCode = keyboardKey;

        this.ticksDown = 0;
        this.ticksUp = 0;
        this.lastTicksDown = 0;
        this.lastTicksUp = 0;
        this.isReleaseLocked = false;
        this.isPressedLocked = false;
    }

    public Keyboard_update(isDown: boolean) {
        this.isDown = isDown;
        this.isUp = !isDown;
    }

    public Tick_update() {
        if (this.isDown) {
            this.ticksDown++;
            if (this.isPressedLocked && this.ticksUp >= 1)
                this.isPressedLocked = false;
        }
        else {
            this.lastTicksDown = this.ticksDown;
            this.ticksDown = 0;
        }

        if (this.isUp) {
            this.ticksUp++;
            if (this.isReleaseLocked && this.ticksUp >= 4)
                this.isReleaseLocked = false;
        }
        else {
            this.lastTicksUp = this.ticksUp;
            this.ticksUp = 0;
        }

        this.isPressed = this.isDown && this.ticksDown === 1;
    }

    public onReleased(ticks: number) {
        if (this.isReleaseLocked) {
            return false;
        }
        if (this.isUp && this.lastTicksDown >= ticks) {
            this.isReleaseLocked = true;
            return true;
        }
        return false;
    }

    public onPressed(ticks: number) {
        if (this.isPressedLocked) {
            return false;
        }
        if (this.isDown && this.lastTicksUp >= ticks) {
            this.isPressedLocked = true;
            return true;
        }
        return false;
    }

    public lockReleased() {
        this.lastTicksDown = 0;
        this.isReleaseLocked = true;
    }
    public lockPressed() {
        this.lastTicksUp = 0;
        this.isPressedLocked = true;
    }
};

export class Stick {
    static readonly LEFT: Stick = new Stick("left",
        [
            new Button("left_stick_up", "ArrowUp"),
            new Button("left_stick_down", "ArrowDown"),
            new Button("left_stick_left", "ArrowLeft"),
            new Button("left_stick_right", "ArrowRight"),
        ]);
    static readonly RIGHT: Stick = new Stick("right",
        [
            new Button("right_stick_up", "KeyI"),
            new Button("right_stick_down", "KeyK"),
            new Button("right_stick_left", "KeyJ"),
            new Button("right_stick_right", "KeyL"),
        ]);

    public position: Vec2;

    public stickId: string;
    public buttonGroup: Button[];
    public BUTTON_UP: Button;
    public BUTTON_DOWN: Button;
    public BUTTON_LEFT: Button;
    public BUTTON_RIGHT: Button;


    constructor(stickId: string, buttonGroup: Button[]) {
        this.position = V2(0, 0);
        this.BUTTON_UP = buttonGroup[0];
        this.BUTTON_DOWN = buttonGroup[1];
        this.BUTTON_LEFT = buttonGroup[2];
        this.BUTTON_RIGHT = buttonGroup[3];

        this.stickId = stickId;
        this.buttonGroup = buttonGroup;
    }

    /** Gets the button from the direction */
    public getButtonsFromDirection(dir: Direction): Button[] {
        switch (dir) {
            case Direction.NORTH:
                return [this.BUTTON_UP];
            case Direction.SOUTH:
                return [this.BUTTON_DOWN];
            case Direction.WEST:
                return [this.BUTTON_LEFT];
            case Direction.EAST:
                return [this.BUTTON_RIGHT];
            case Direction.NORTH_WEST:
                return [this.BUTTON_UP, this.BUTTON_LEFT];
            case Direction.NORTH_EAST:
                return [this.BUTTON_UP, this.BUTTON_RIGHT];
            case Direction.SOUTH_WEST:
                return [this.BUTTON_DOWN, this.BUTTON_LEFT];
            case Direction.SOUTH_EAST:
                return [this.BUTTON_DOWN, this.BUTTON_RIGHT];
        }
        return [];
    }

    public Keyboard_updateButtons(isDown: boolean, keyCode: string) {
        // Check if the button is in the group
        const button = this.buttonGroup.find((b) => b.keyCode === keyCode);

        if (button)
            button.Keyboard_update(isDown);

        // Update the position
        this.position.x =
            (this.buttonGroup[3].isDown ? 1 : 0) - (this.buttonGroup[2].isDown ? 1 : 0);
        this.position.y =
            (this.buttonGroup[0].isDown ? 1 : 0) - (this.buttonGroup[1].isDown ? 1 : 0)
    }

    public Tick_updateButtons() {
        this.buttonGroup.forEach((b) => b.Tick_update());
    }
}

export class Controls {
    static A = Button.A;
    static B = Button.B;
    static X = Button.X;
    static Y = Button.Y;
    static L = Button.L;
    static R = Button.R;
    static ZL = Button.ZL;
    static ZR = Button.ZR;
    static MINUS = Button.MINUS;
    static PLUS = Button.PLUS;
    static LCLICK = Button.LCLICK;
    static RCLICK = Button.RCLICK;
    static HOME = Button.HOME;
    static CAPTURE = Button.CAPTURE;
    static DPAD_UP = Button.DPAD_UP;
    static DPAD_DOWN = Button.DPAD_DOWN;
    static DPAD_LEFT = Button.DPAD_LEFT;
    static DPAD_RIGHT = Button.DPAD_RIGHT;

    static LEFT_STICK = Stick.LEFT;
    static RIGHT_STICK = Stick.RIGHT;

    static get leftStick() {
        return Stick.LEFT.position;
    }
    static get rightStick() {
        return Stick.RIGHT.position;
    }

    private onMouseDown(e: KeyboardEvent) {
        // Find the corresponding button
        const button = Button.list.find((b) => b.keyCode === e.code);
        if (button) {
            button.Keyboard_update(true);
        }
        // Find the corresponding stick
        Stick.LEFT.Keyboard_updateButtons(true, e.code);
        Stick.RIGHT.Keyboard_updateButtons(true, e.code);
    }
    private onMouseUp(e: KeyboardEvent) {
        // Find the corresponding button
        const button = Button.list.find((b) => b.keyCode === e.code);
        if (button) {
            button.Keyboard_update(false);
        }
        // Find the corresponding stick
        Stick.LEFT.Keyboard_updateButtons(false, e.code);
        Stick.RIGHT.Keyboard_updateButtons(false, e.code);
    }

    constructor() {
        const mouseDown = this.onMouseDown.bind(this);
        const mouseUp = this.onMouseUp.bind(this);

        // Add event listeners
        document.addEventListener("keydown", (e) => mouseDown(e));
        document.addEventListener("keyup", (e) => mouseUp(e));
    }

    public tickUpdate() {
        Button.list.forEach((b) => b.Tick_update());
        Stick.LEFT.Tick_updateButtons();
        Stick.RIGHT.Tick_updateButtons();
    }
}