import { Button, Controls, Stick } from "../../utils/controls";
import { Directions } from "../../utils/direction";
import { DungeonState } from "../dungeon";
import { WalkAction } from "./actions/walk";
import { NilAction } from "./actions/nil";
import { Turn } from "./turn";

export class DungeonLogic {
    private state: DungeonState;

    private currentTurn: number;
    private turn: Turn | null;
    private turnsHistory: Turn[];

    private walkDirection: Directions | null;

    /** Initalizes the game logic */
    constructor(state: DungeonState) {
        this.state = state;
        this.currentTurn = 0;
        this.turn = null;
        this.turnsHistory = [];
        this.walkDirection = null;
    }

    /** Updates the player movement and starts off the turn */
    public update() {
        if (!this.state.isLoaded) return;

        // Await for the player input
        if (this.walkDirection === null) {
            this.walkDirection = this.doPlayerInput();
            if (this.walkDirection === null) return;
        };

        // Create the actions
        if (!this.turn) {
            this.turn = new Turn();
            if (this.walkDirection === Directions.NONE)
                this.turn.calculate(new NilAction(this.state.floor.pokemon.getLeader()), this.state);
            else
                this.turn.calculate(new WalkAction(this.state.floor.pokemon.getLeader(), this.walkDirection), this.state);
        }

        // Execute the turn
        const done = this.turn.execute();
        if (done) {
            this.turnsHistory.push(this.turn);
            this.turn = null;
            this.currentTurn++;
            this.walkDirection = null;
        }
    }

    /** Takes in the chosen movement of the player */
    private doPlayerInput() {
        const stick = Controls.leftStick();
        const direction = Directions.fromVector(stick).flipY();
        if (direction === Directions.NONE) return null;

        // Check if the player can move in that direction
        const leader = this.state.floor.pokemon.getLeader();
        const canMove = this.state.floor.canMoveTowards(leader, direction);

        if (!canMove) return null;
        return direction;
    }
}