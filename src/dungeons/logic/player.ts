import { Controls } from "../../utils/controls";
import { Directions } from "../../utils/direction";
import { DungeonLogic } from "./logic";

enum PlayerStates {
    /** In this state, the player can choose whichever action available */
    IDLE,
    /** This is a transistioning state while the player changes direction */
    TURNING,
    /** This is the walking state, on while the player is walking */
    WALKING,
};


export class Player {
    private playerState: PlayerStates = PlayerStates.IDLE;

    private lastDirection = Directions.NONE;
    private directionTimeStamp = 0;

    private turningDirection = Directions.NONE;
    private turningDelay = 0;

    private walkingDirection = Directions.NONE;
    private walkingStartedTurn = 0;

    constructor() {

    }

    private setState(state: PlayerStates) {
        this.playerState = state;
        this.walkingDirection = Directions.NONE;
        this.walkingStartedTurn = 0;
        this.turningDirection = Directions.NONE;
        this.turningDelay = 0;
        this.lastDirection = Directions.NONE;
    }

    private setIdle() {
        this.setState(PlayerStates.IDLE);
    }

    private setTurning(direction: Directions) {
        this.setState(PlayerStates.TURNING);
        this.turningDirection = direction;
    }

    private setWalking(direction: Directions) {
        this.setState(PlayerStates.WALKING);
        this.walkingDirection = direction;
    }

    /** Takes in the chosen movement of the player */
    public doInput(logic: DungeonLogic) {
        const stick = Controls.leftStick;
        const inputDirection = Directions.fromVector(stick).flipY();
        const player = logic.state.floor.pokemon.getLeader();


        switch (this.playerState) {
            case PlayerStates.IDLE: {
                // In whichever case, ignore null inputs
                if (inputDirection === Directions.NONE) return null;

                if (inputDirection !== this.lastDirection) {
                    this.lastDirection = inputDirection;
                    this.directionTimeStamp = Date.now();
                }

                if (inputDirection === this.lastDirection
                    && Date.now() - this.directionTimeStamp > 35
                    && player.direction !== inputDirection) {
                    // Change state to turning
                    this.setTurning(inputDirection);
                }
                else if (inputDirection === this.lastDirection
                    && Date.now() - this.directionTimeStamp > 50) {
                    // Change state to walking
                    this.setWalking(inputDirection);
                    this.lastDirection = Directions.NONE;
                }
                break;
            }
            case PlayerStates.TURNING: {
                if (this.turningDelay++ >= 4) {
                    if (player.direction !== this.turningDirection) {
                        player.turnTowards(this.turningDirection);
                        // Set the player's animation to Idle
                        player.setAnimation("Idle");
                        this.turningDelay = 0;
                    }
                    else {
                        this.setIdle();
                    }
                }

                break;
            }
            case PlayerStates.WALKING: {
                // After the first turn, you are allowed to change direction
                if (this.walkingStartedTurn !== logic.currentTurn) {
                    // If you want to, you can stop walking
                    if (this.walkingDirection === Directions.NONE) {
                        this.setIdle();
                        return null;
                    }
                    // Depending on the direction you choose, you can either walk or turn
                    const canMove = logic.state.floor.canMoveTowards(player, inputDirection);
                    if (!canMove) {
                        this.setIdle();
                        return null;
                    }
                    // Check if the player is going to turn the opposite direction
                    if (this.walkingDirection.opposite(inputDirection)) {
                        this.setTurning(inputDirection);
                        return null;
                    }
                    // Keep walking in the input direction
                    this.walkingDirection = inputDirection;
                    return this.walkingDirection;
                } else {
                    const canMove = logic.state.floor.canMoveTowards(player, this.walkingDirection);
                    if (canMove) {
                        return this.walkingDirection;
                    }
                    this.setIdle();
                    return null;
                }
            }
        }


        return null;
    }
}