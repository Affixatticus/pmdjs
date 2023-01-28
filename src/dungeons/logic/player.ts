import { Tile } from "../../data/tiles";
import { Controls } from "../../utils/controls";
import { Direction } from "../../utils/direction";
import Random from "../../utils/random";
import { DungeonPokemon } from "../objects/pokemon";
import { PushAction } from "./actions/walk";
import { DungeonLogic } from "./logic";

/** Radius in which the running algorithm will check to see if it should stop in line with a corridor */
const MAX_DISTANCE_FOR_INLINE_CHECK = 5;
/** The number of ticks it should takes to turn 45 degrees */
const TURNING_TICKS = 4;

export const enum InputAction {
    WALK,
    TALK,
};

export type InputType = null | [InputAction.WALK, Direction] | [InputAction.TALK, DungeonPokemon];

abstract class InputState {
    public player!: Player;

    constructor(player?: Player) {
        console.log("Created new state");
        if (player) this.player = player;
    }

    // Automatically goes to the idle state without returning a value
    public exit(): null {
        this.changeState(new IdleState());
        return null;
    }

    public changeState(state: InputState) {
        this.player.state = state;
        state.player = this.player;
    }

    public abstract update(): InputType;
}

class IdleState extends InputState {
    public update() {
        if (Controls.Y.isDown) {
            this.changeState(new TurningState());
        }
        return null;
    }
}

class TurningState extends InputState {
    static GUIDE_APPEAR_TIME = 16;
    static TURN_TIME = 4;
    public guideTick = 0;
    public inputTick = 0;

    public isInputDiagonal: boolean = false;
    public lastCompatibleInput!: Direction;

    public get floorGuide() {
        return this.player.floorGuide;
    }

    public get guideAppeared() {
        return this.guideTick >= TurningState.GUIDE_APPEAR_TIME;
    }

    public handleAutoTurn(): null {
        console.log("Turning in the calculated direction");
        return null;
    }

    public handleTurning(input: Direction) {
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
        this.player.leader.direction = this.lastCompatibleInput;
    }

    public handleGuide() {
        if (this.guideAppeared)
            this.floorGuide.update(this.player.leader.direction);

        // Update the timer until the guide appears
        else this.guideTick++;
    }

    public update() {
        const input = Direction.fromVector(Controls.LEFT_STICK.position).flipY();

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

export class Player {
    public logic: DungeonLogic;
    public floor!: DungeonLogic["state"]["floor"];
    public leader!: DungeonPokemon;
    public floorGuide!: DungeonLogic["state"]["floorGuide"];

    public state!: InputState;

    /** Saves whether the last waked tile was a corridor `true` or a room `false` */
    private lastWalkedTile!: boolean;
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
        // If the player is moving diagonally, return false
        if (direction.isDiagonal()) return false;

        // Get the sides of the player
        const dir1 = Direction.get(Direction.rollIndex(direction.index - 2)).toVector();
        const dir2 = Direction.get(Direction.rollIndex(direction.index + 2)).toVector();

        // Check if the player is lined up with a corridor entrance
        let foundCorridorEntrance = false;
        let pos1 = this.leader.position.clone();
        let pos2 = this.leader.position.clone();
        // Look in the line of the opposite sides if you can find a corridor entrance
        for (let i = 0; i < MAX_DISTANCE_FOR_INLINE_CHECK; i++) {
            pos1.addInPlace(dir1);
            if (this.leader.isTileObstacle(this.floor.grid.get(pos1))) break;
            if (this.floor.grid.isCorridor(pos1, this.leader)) {
                foundCorridorEntrance = true;
                break;
            }
        }
        for (let i = 0; i < MAX_DISTANCE_FOR_INLINE_CHECK; i++) {
            pos2.addInPlace(dir2);
            if (this.leader.isTileObstacle(this.floor.grid.get(pos2))) break;
            if (this.floor.grid.isCorridor(pos2, this.leader)) {
                foundCorridorEntrance = true;
                break;
            }
        }
        // Return the result
        return foundCorridorEntrance;
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
    private isNextToAnEntity(direction: Direction) {
        // Check the two sides of the player
        return this.isEntity(direction) ||
            this.isEntity(Direction.get(Direction.rollIndex(direction.index - 2))) ||
            this.isEntity(Direction.get(Direction.rollIndex(direction.index + 2)));
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
    private shouldStopRunning(current: Direction): boolean {
        // If the player entered a room, stop running
        if (this.justEnteredRoom()) return true;
        // If the player is at a junction in a corridor, stop running
        if (this.isAtAJunction()) return true;
        // If the player is in front of an entity, stop running
        if (this.isNextToAnEntity(current)) return true;
        // If the player is in the 3x3 range of an enemy, stop running
        if (this.isInEnemyRange()) return true;
        // If the player is in line with a corridor entrance, stop running
        if (this.isLinedUpWithCorridor(current)) return true;
        return false;
    }

    // ANCHOR Special Movement Methods
    private pushPartnerBackwards(partner: DungeonPokemon, lastDirection: Direction): boolean {
        // Check if the partner can move in the new position
        if (this.logic.state.floor.canMoveTowards(partner, lastDirection)) {
            // Add the new position to the action list
            partner.ai.overwrittenAction = new PushAction(partner, lastDirection);
            return true;
        }
        // Check if the partner can move in a diagonal direction
        const ccwDirection = lastDirection.roll(-2);
        if (Random.chance(50) && this.logic.state.floor.canMoveTowards(partner, ccwDirection)) {
            partner.ai.overwrittenAction = new PushAction(partner, ccwDirection);
            return true;
        }
        const cwDirection = lastDirection.roll(2);
        if (this.logic.state.floor.canMoveTowards(partner, cwDirection)) {
            partner.ai.overwrittenAction = new PushAction(partner, cwDirection);
            return true;
        }
        if (this.logic.state.floor.canMoveTowards(partner, ccwDirection)) {
            partner.ai.overwrittenAction = new PushAction(partner, ccwDirection);
            return true;
        }
        return true;
    }
    /** Function that runs when the input resulted in a obstacled way,
     * but you still want to turn the player
     */
    private noMove(direction: Direction) {
        // Halt the player
        DungeonPokemon.setRunning(false);
        // Update the leader's direction
        this.leader.direction = direction;
    }
    public awaitMovementTick(tick: number): boolean {
        if (this.movementTick < tick) {
            this.movementTick++;
            return true;
        }
        this.movementTick = 0;
        return false;
    }
    private turningDirection: Direction | null = null;
    private turningTick = 0;
    private turnPlayer(direction: Direction = this.turningDirection!): boolean {
        if (direction === null) return false;

        // If the player is already facing the direction, stop turning
        if (this.leader.direction === direction) {
            this.turningDirection = null;
            return false;
        }
        if (++this.turningTick < TURNING_TICKS) {
            this.turningDirection = direction;
            return true;
        }
        // If the player is not facing the direction, turn the player
        this.leader.turnTowards(direction);
        this.turningTick = 0;
        return true;
    }

    private facingPartner(): DungeonPokemon | null {
        const facing = this.leader.position.add(this.leader.direction.toVector());
        for (const partner of this.floor.pokemon.getPartners()) {
            if (partner.position.equals(facing)) return partner;
        }
        return null;
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