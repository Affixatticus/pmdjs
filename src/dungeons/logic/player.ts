import { GuiOutput } from "../../common/menu/gui/gui";
import { GuiManager } from "../../common/menu/gui/gui_manager";
import { Inventory } from "../../common/menu/inventory/inventory";
import { Tile } from "../../data/tiles";
import { Controls } from "../../utils/controls";
import { Direction } from "../../utils/direction";
import Random from "../../utils/random";
import { Vec2 } from "../../utils/vectors";
import { DungeonItem } from "../objects/item";
import { DungeonPokemon, Obstacle } from "../objects/dungeon_pokemon";
import { WalkAction } from "./actions/walk";
import { DungeonLogic } from "./logic";

/** Radius in which the running algorithm will check to see if it should stop in line with a corridor */
const MAX_DISTANCE_FOR_INLINE_CHECK = 5;

export const enum InputAction {
    WALK,
    TALK,
    DROP_ITEM,
    PROCEED,
    SWAP_ITEM,
    PICKUP_ITEM,
};

export type InputType =
    null |
    [InputAction.WALK, Direction] |
    [InputAction.TALK, DungeonPokemon] |
    [InputAction.DROP_ITEM, number] |
    [InputAction.PROCEED] |
    [InputAction.SWAP_ITEM, DungeonItem, number] |
    [InputAction.PICKUP_ITEM, DungeonItem];

abstract class InputState {
    public player!: Player;

    constructor(player?: Player) {
        if (player) this.player = player;
    }

    public get leader() {
        return this.player.leader;
    }

    public get floor() {
        return this.player.floor;
    }

    public get state() {
        return this.player.logic.state
    }

    public getInputDirection(): Direction {
        return Direction.fromVector(Controls.LEFT_STICK.position).flipY();
    }

    public init(): void { };

    // Automatically goes to the idle state without returning a value
    public exit(): null {
        if (Controls.B.isDown) Controls.B.lockReleased();
        this.changeState(new IdleState());
        return null;
    }

    public changeState(state: InputState) {
        this.player.state = state;
        state.player = this.player;
        state.init();
        return null;
    }

    public setRunning(running: boolean) {
        this.player.logic.state.setRunning(running);
    }

    public abstract update(): InputType;
}

class IdleState extends InputState {
    public update() {
        if (Controls.Y.isDown)
            this.changeState(new TurningState());
        if (this.getInputDirection() !== Direction.NONE)
            this.changeState(new WalkingState());
        if (Controls.B.onReleased(1)) {
            this.changeState(new InventoryState());
        }

        return null;
    }
}

class WalkingState extends InputState {
    static TURNING_TIME = 4;
    private inputTick: number = 0;

    private running: boolean = false;
    private runningDirection: Direction = Direction.NONE;

    private startRunning(input: Direction) {
        this.running = true;
        this.runningDirection = input;
        this.inputTick = -WalkingState.TURNING_TIME;
        this.setRunning(true);

        return [InputAction.WALK, input] as InputType;
    }

    private handleRunning() {
        // Until you run into something, keep running
        if (this.player.shouldStopRunning(this.runningDirection) || !this.state.isRunning) {
            this.running = false;
            return null;
        }

        // Keep running in said direction
        return [InputAction.WALK, this.runningDirection] as InputType;
    }

    private createPushAction(partner: DungeonPokemon, direction: Direction) {
        partner.ai.overwrittenAction = WalkAction.getAction(partner, direction, true, this.player.logic);
    }

    private handlePushing(input: Direction, partner: DungeonPokemon = this.player.partnerInFront(input)!): InputType | null {
        // First thing is to check if the partner can scoot along the input direction
        const obstacleInFront = partner.canMoveTowards(input, this.floor);
        if (obstacleInFront === Obstacle.NONE || obstacleInFront === Obstacle.ITEM) {
            this.createPushAction(partner, input);
            return [InputAction.WALK, input] as InputType;
        }
        // If it can't, try to push it in the two adjacent directions
        else {
            const r = input.isDiagonal() ? 1 : 2;
            const f = Random.chance(50) ? -1 : 1;
            const firstDirection = input.roll(f * r);
            const secondDirection = input.roll(-f * r);
            const firstObstacle = partner.canMoveTowards(firstDirection, this.floor);
            if (firstObstacle === Obstacle.NONE) {
                this.createPushAction(partner, firstDirection);
                return [InputAction.WALK, input] as InputType;
            }
            const secondObstacle = partner.canMoveTowards(secondDirection, this.floor);
            if (secondObstacle === Obstacle.NONE) {
                this.createPushAction(partner, secondDirection);
                return [InputAction.WALK, input] as InputType;
            }
        }
        // If there's a partner in the way
        if (obstacleInFront === Obstacle.PARTNER) {
            const otherPartner = this.player.partnerAt(partner.position.add(input.toVector()))!;
            const pushingResult = this.handlePushing(input, otherPartner);
            if (pushingResult !== null) {
                this.createPushAction(partner, input);
                return pushingResult;
            }
        }

        // Turn the player        
        this.leader.direction = input;
        return null;
    }

    private handleSwapping(input: Direction, partner: DungeonPokemon = this.player.partnerInFront(input)!): InputType | null {
        // If the partner can move in the input direction, swap with them
        partner.ai.overwrittenAction = WalkAction.getAction(partner, input.getOpposite(), false, this.player.logic);
        return [InputAction.WALK, input] as InputType;
    }

    // Sets the item you just walked on to discarded so that you don't open the gui when you walk on it
    private handleDiscardingItem(input: Direction, wanted: boolean) {
        if (!wanted) {
            const item = this.player.itemInFront(input)!;
            item.discard();
        }
        return null;
    }

    public update() {
        const input = this.getInputDirection();

        // Keep running while the direction is still locked
        if (this.running)
            return this.handleRunning();
        else this.setRunning(false);

        // Exit if you're not pressing anything, automatically resets runningLockedDir
        if (input === Direction.NONE) {
            return this.exit();
        }

        // Give the player TURNING_TIME ticks to choose a diagonal direction
        if (this.inputTick < WalkingState.TURNING_TIME) {
            this.inputTick++;
            return null;
        }

        // Handle obstacles in the best way
        switch (this.leader.canMoveTowards(input, this.floor)) {
            case Obstacle.NONE:
                if (Controls.B.isDown) {
                    if (this.runningDirection !== input)
                        return this.startRunning(input);
                    return null;
                }
                // If you chose a direction, and you are pressing B
                return [InputAction.WALK, input] as InputType;
            case Obstacle.WALL:
                // TODO make this turn like in the TurningState
                this.leader.direction = input;
                return null;
            case Obstacle.PARTNER:
                // Swap with partner
                if (Controls.B.isDown)
                    return this.handleSwapping(input);
                // Push the partner
                return this.handlePushing(input);
            case Obstacle.ITEM:
                this.handleDiscardingItem(input, !Controls.B.isDown);
                break;
            case Obstacle.ENEMY:
                this.leader.direction = input;
                return null;
        }

        return [InputAction.WALK, input] as InputType;
    }
}
class TurningState extends InputState {
    static GUIDE_APPEAR_TIME = 16;
    static TURN_TIME = 4;
    private guideTick = 0;
    private inputTick = 0;
    private chosenDirection: boolean = false;

    private isInputDiagonal: boolean = false;
    private lastCompatibleInput!: Direction;

    private get floorGuide() {
        return this.player.floorGuide;
    }

    private get guideAppeared() {
        return this.guideTick >= TurningState.GUIDE_APPEAR_TIME;
    }

    private handleAutoTurn(): null {
        if (!this.chosenDirection) {
            const partner = this.floor.pokemon.getPartners().find(p => p.position.dist(this.leader.position) < 2);
            if (!partner) return null;
            this.player.leader.direction = Direction.fromVector(partner.position.subtract(this.leader.position)) ?? this.leader.direction;
        }
        return null;
    }

    private handleTurning(input: Direction) {
        // If you haven't chosen a direction, reset the input tick
        if (input === Direction.NONE) {
            this.isInputDiagonal = false;
            this.inputTick = 0;
            return;
        }
        // When that time is up turn in the direction you've chosen
        this.isInputDiagonal ||= input.isDiagonal();
        this.lastCompatibleInput = this.isInputDiagonal ? input.isDiagonal() ? input : this.lastCompatibleInput : input;

        // Turn in the direction you've chosen
        if (this.isInputDiagonal && !input.isDiagonal()) {
            // Give the player a little time to choose a direction, a bit more if it it's not diagonal
            if (this.inputTick < TurningState.TURN_TIME) {
                this.inputTick++;
            }
            else {
                this.inputTick = 0;
                this.isInputDiagonal = false;
            }
        }
        this.leader.direction = this.lastCompatibleInput;
        this.chosenDirection = true;
    }

    private handleGuide() {
        if (this.guideAppeared)
            this.floorGuide.update(this.leader.direction);

        // Update the timer until the guide appears
        else this.guideTick++;
    }

    public update() {
        const input = this.getInputDirection();

        // If you release Y, turn in the calculated direction
        if (Controls.Y.isUp) {
            // Hide the guide
            if (this.guideAppeared) this.floorGuide.hide();
            this.handleAutoTurn();
            // Go back to idle
            return this.exit();
        }
        // Turn the player
        this.handleTurning(input);
        // Show the guide when the timer is up
        this.handleGuide();

        return null;
    }
}

class InventoryState extends InputState {
    public get inventory(): Inventory {
        return this.player.logic.state.inventory;
    }

    public init() {
        // Set the gui's tile as the tile under the player
        this.inventory.gui.setGround(this.floor.objects.get(this.leader.position));
        // Tell the inventory gui that it was opened from the menu
        this.inventory.gui.enteredFromMenu = true;
        // Open the inventory gui
        GuiManager.openGui(this.inventory.gui);
    }

    public update(): InputType {
        const guiResult = GuiManager.awaitGuiResult();
        const guiClose = GuiManager.shouldClose;
        let output: InputType = null;

        switch (guiResult) {
            case GuiOutput.UNASSIGNED:
                output = null;
                break;
            case GuiOutput.INVENTORY_DROP:
                output = [InputAction.DROP_ITEM, this.inventory.cursor];
                break;
            case GuiOutput.PROCEED:
                output = [InputAction.PROCEED];
                break;
            case GuiOutput.INVENTORY_GROUND_SWAP: {
                const item = this.floor.objects.get(this.leader.position) as DungeonItem;
                output = [InputAction.SWAP_ITEM, item, this.inventory.cursor];
                break;
            }
            case GuiOutput.INVENTORY_GROUND_PICKUP: {
                const item = this.floor.objects.get(this.leader.position) as DungeonItem;
                output = [InputAction.PICKUP_ITEM, item];
                break;
            }
            default:
                console.log(GuiOutput[guiResult]);
        }

        if (guiClose) {
            this.exit();
            return output;
        }
        return null;

        // const guiResult = this.inventory.navigate();

        // // Exit if the return state was true
        // switch (guiResult) {
        //     case GUIReturnType.CLOSED:
        //         return this.exit();
        //     case GUIReturnType.INVENTORY_EAT:
        //         return this.exit();
        //     case GUIReturnType.INVENTORY_DROP:
        //         this.exit();
        //         return [InputAction.DROP_ITEM, this.inventory.cursor];
        // }
        return null;
    }
}

export class Player {
    public logic: DungeonLogic;
    public floor!: DungeonLogic["state"]["floor"];
    public leader!: DungeonPokemon;
    public floorGuide!: DungeonLogic["state"]["floorGuide"];

    public state!: InputState;

    /** Saves whether the last waked tile was a corridor `true` or a room `false` */
    public lastWalkedTile!: boolean;
    /** The number of ticks since a direction other than NONE has been selected */
    private movementTick!: number;

    public constructor(logic: DungeonLogic) {
        this.logic = logic;
    }

    public update() {
        this.floor = this.logic.state.floor;
        this.leader = this.floor.pokemon.getLeader();
        this.floorGuide = this.logic.state.floorGuide;
        this.lastWalkedTile = this.floor.grid.isCorridor(this.leader.position, this.leader);
        // The currently active state
        this.state = new IdleState(this);
        this.movementTick = 0;
    }

    // ANCHOR Running Methods
    /** Returns true if player is now in a room when it was in a corridor before */
    private justEnteredRoom() {
        if (this.lastWalkedTile && !this.floor.grid.isCorridor(this.leader.nextTurnPosition, this.leader)) {
            return true;
        }
        return false;
    }
    /** Returns true if the player has a corridor entrace at any position along its sides
     * inside the given room
     */
    private isLinedUpWithCorridor(direction: Direction) {
        // Return false if the player is in a corridor already
        if (this.floor.grid.isCorridor(this.leader.position, this.leader)) return false;

        const r = direction.isDiagonal() ? 1 : 2;
        // Get the sides of the player
        const dir1 = Direction.get(Direction.rollIndex(direction.index - r)).toVector();
        const dir2 = Direction.get(Direction.rollIndex(direction.index + r)).toVector();

        // Check if the player is lined up with a corridor entrance
        let pos1 = this.leader.position.clone();
        let pos2 = this.leader.position.clone();
        // Look in the line of the opposite sides if you can find a corridor entrance
        for (let i = 0; i < MAX_DISTANCE_FOR_INLINE_CHECK; i++) {
            pos1.addInPlace(dir1);
            if (this.leader.isTileObstacle(this.floor.grid.get(pos1))) break;
            if (this.floor.grid.isCorridor(pos1, this.leader))
                return true;
        }
        for (let i = 0; i < MAX_DISTANCE_FOR_INLINE_CHECK; i++) {
            pos2.addInPlace(dir2);
            if (this.leader.isTileObstacle(this.floor.grid.get(pos2))) break;
            if (this.floor.grid.isCorridor(pos2, this.leader))
                return true;
        }
        return false;
    }
    /** Returns true if the player is at the center of a corridor that has 3 or 4 corridors adjacent to it */
    private isAtAJunction() {
        const { position } = this.leader;
        // Return false if the player is in a room
        if (!this.floor.grid.isCorridor(position, this.leader)) return false;


        // Count the neighbors of the player position that are corridors
        let corridorNeighbors = 0;
        for (const direction of Direction.CARDINAL) {
            const neighbor = position.subtract(direction.toVector());

            if (!this.leader.isTileObstacle(this.floor.grid.get(neighbor)))
                corridorNeighbors++;
            if (corridorNeighbors > 2) return true;
        }
        return false;
    }
    /** Returns true if there's an item or the stairs at the leader's facing position */
    private isEntity(direction: Direction) {
        // If following the direction, you come across an entity, stop
        const nextPos = this.leader.position.add(direction.toVector());
        const tile = this.floor.grid.get(nextPos);
        // If the next position is an entity, stop
        if (tile === Tile.ITEM || this.floor.objects.getStairs().position.equals(nextPos)) {
            return true;
        }
        return false;
    }
    /** Returns true if there's an item or the stairs in front or at the sides of the player */
    private isNextToAnObject(direction: Direction) {
        const r = direction.isDiagonal() ? 1 : 2;
        // Check the two sides of the player
        return this.isEntity(direction) || this.isEntity(direction.roll(-r)) || this.isEntity(direction.roll(r));
    }
    /** Returns true if any enemy is within a tile range of the player */
    private isInEnemyRange() {
        // Check if the player is in the range of an enemy
        for (const enemy of this.floor.pokemon.getEnemies()) {
            if (enemy.position.dist(this.leader.position) <= 2) {
                return true;
            }
        }
        return false;
    }
    /** The player should pause from running (and basically stop until the input changes) when: 
     * 1. It has just entered a room
     * 2. It is at a junction in a corridor
     * 3. It is in front of an entity
     * 4. It is in range of an enemy
     * 5. It is in line with a corridor entrance
    */
    public shouldStopRunning(current: Direction): boolean {
        return this.leader.canMoveTowards(current, this.floor) !== Obstacle.NONE ||
            this.justEnteredRoom() ||
            this.isAtAJunction() ||
            this.isNextToAnObject(current) ||
            this.isInEnemyRange() ||
            this.isLinedUpWithCorridor(current);
    }

    // ANCHOR Special Movement Methods
    public awaitMovementTick(tick: number): boolean {
        if (this.movementTick < tick) {
            this.movementTick++;
            return true;
        }
        this.movementTick = 0;
        return false;
    }
    public partnerAt(position: Vec2): DungeonPokemon | null {
        return this.floor.pokemon.getPartners().find(p => p.position.equals(position)) ?? null;
    }

    public partnerInFront(direction: Direction): DungeonPokemon | null {
        return this.partnerAt(this.leader.position.add(direction.toVector()));
    }

    public itemInFront(direction: Direction): DungeonItem | null {
        const nextPos = this.leader.position.add(direction.toVector());
        return this.floor.objects.getItems().find(i => i.position.equals(nextPos)) ?? null;
    }

    /** Takes in controller inputs from the connected joystick and returns
     * the direction the player wants to move in next turn or null if it wants
     * to stay still
     */
    public doInput(): InputType {
        // Update the state
        return this.state.update();
    }
}