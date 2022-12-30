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

    constructor(button: string, keyboardKey: string) {
        this.isPressed = false;
        this.isDown = false;
        this.isUp = false;
        this.button = button;
        this.keyCode = keyboardKey;
    }

    public Keyboard_update(isDown: boolean) {
        this.isPressed = isDown;
        this.isDown = isDown;
        this.isUp = !isDown;
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


    constructor(stickId: string, buttonGroup: Button[]) {
        this.position = V2(0, 0);

        this.stickId = stickId;
        this.buttonGroup = buttonGroup;
    }

    public Keyboard_updateButton(isDown: boolean, keyCode: string) {
        // Check if the button is in the group
        const button = this.buttonGroup.find((b) => b.keyCode === keyCode);

        if (button)
            button.Keyboard_update(isDown);

        // Update the position
        this.position.x =
            (this.buttonGroup[3].isPressed ? 1 : 0) - (this.buttonGroup[2].isPressed ? 1 : 0);
        this.position.y =
            (this.buttonGroup[0].isPressed ? 1 : 0) - (this.buttonGroup[1].isPressed ? 1 : 0)
    }
}

export class Controls {
    static get A() { return Button.A.isDown; };
    static get B() { return Button.B.isDown; };
    static get X() { return Button.X.isDown; };
    static get Y() { return Button.Y.isDown; };
    static get L() { return Button.L.isDown; };
    static get R() { return Button.R.isDown; };
    static get ZL() { return Button.ZL.isDown; };
    static get ZR() { return Button.ZR.isDown; };
    static get MINUS() { return Button.MINUS.isDown; };
    static get PLUS() { return Button.PLUS.isDown; };
    static get LCLICK() { return Button.LCLICK.isDown; };
    static get RCLICK() { return Button.RCLICK.isDown; };
    static get HOME() { return Button.HOME.isDown; };
    static get CAPTURE() { return Button.CAPTURE.isDown; };
    static get DPAD_UP() { return Button.DPAD_UP.isDown; };
    static get DPAD_DOWN() { return Button.DPAD_DOWN.isDown; };
    static get DPAD_LEFT() { return Button.DPAD_LEFT.isDown; };
    static get DPAD_RIGHT() { return Button.DPAD_RIGHT.isDown; };

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
        Stick.LEFT.Keyboard_updateButton(true, e.code);
        Stick.RIGHT.Keyboard_updateButton(true, e.code);
    }
    private onMouseUp(e: KeyboardEvent) {
        // Find the corresponding button
        const button = Button.list.find((b) => b.keyCode === e.code);
        if (button) {
            button.Keyboard_update(false);
        }
        // Find the corresponding stick
        Stick.LEFT.Keyboard_updateButton(false, e.code);
        Stick.RIGHT.Keyboard_updateButton(false, e.code);
    }

    constructor() {
        const mouseDown = this.onMouseDown.bind(this);
        const mouseUp = this.onMouseUp.bind(this);

        // Add event listeners
        document.addEventListener("keydown", (e) => mouseDown(e));
        document.addEventListener("keyup", (e) => mouseUp(e));
    }
}