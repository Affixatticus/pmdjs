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
    /** This is the state in which you can turn freely (Holding Y) */
    TURN,
};


export class Player {
    private playerState: PlayerStates = PlayerStates.IDLE;

    private lastDirection = Directions.NONE;
    private directionTimeStamp = 0;
    private turningDelay = 0;
    private walkingStartedTurn = 0;
    private turnStateTicks = 0;

    constructor() {

    }

    private setState(state: PlayerStates) {
        this.playerState = state;
        this.walkingStartedTurn = 0;
        this.turningDelay = 0;
    }

    private setIdle() {
        this.setState(PlayerStates.IDLE);
    }

    private setTurning(direction: Directions) {
        this.setState(PlayerStates.TURNING);
        this.lastDirection = direction;
    }

    private setWalking(direction: Directions) {
        this.setState(PlayerStates.WALKING);
        this.lastDirection = direction;
    }

    /** Takes in the chosen movement of the player */
    public doInput(logic: DungeonLogic) {
        const stick = Controls.leftStick;
        const inputDirection = Directions.fromVector(stick).flipY();
        const player = logic.state.floor.pokemon.getLeader();


        switch (this.playerState) {
            case PlayerStates.IDLE: {
                // If you press the Y button, you can turn freely
                if (!Controls.Y) {
                    if (this.turnStateTicks > 2) {
                        // TODO: Choose the direction to turn to
                        this.lastDirection = Directions.NORTH;
                        this.setState(PlayerStates.TURNING);
                    }
                    this.turnStateTicks = 0;
                }
                if (Controls.Y && this.turnStateTicks >= 0) {
                    this.turnStateTicks++;
                    if (this.turnStateTicks === 20) {
                        this.turnStateTicks = 0;
                        this.setState(PlayerStates.TURN);
                    }
                }

                // In whichever case, ignore null inputs
                if (inputDirection === Directions.NONE) return null;

                if (inputDirection !== this.lastDirection) {
                    this.lastDirection = inputDirection;
                    this.directionTimeStamp = Date.now();
                }

                if (inputDirection === this.lastDirection
                    && Date.now() - this.directionTimeStamp > 50) {
                    // Change state to walking
                    this.setWalking(inputDirection);
                }
                break;
            }
            case PlayerStates.TURNING: {
                if (this.turningDelay++ >= 4) {
                    if (player.direction !== this.lastDirection) {
                        player.turnTowards(this.lastDirection);
                        // Set the player's animation to Idle
                        player.setAnimation("Idle");
                        this.turningDelay = 0;
                    }
                    else if (this.turnStateTicks > 0) {
                        this.setState(PlayerStates.TURN);
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
                    if (this.lastDirection === Directions.NONE) {
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
                    if (this.lastDirection.opposite(inputDirection)) {
                        this.setTurning(inputDirection);
                        return null;
                    }
                    // Keep walking in the input direction
                    this.lastDirection = inputDirection;
                    return this.lastDirection;
                } else {
                    const canMove = logic.state.floor.canMoveTowards(player, this.lastDirection);
                    if (canMove) {
                        return this.lastDirection;
                    }
                    this.setIdle();
                    return null;
                }
            }
            case PlayerStates.TURN: {
                if (Controls.Y && this.turnStateTicks === 0) {
                    logic.state.floorGuide.show();
                }
                this.turnStateTicks++;
                if (!Controls.Y && this.turnStateTicks > 20) {
                    this.turnStateTicks = 0;
                    logic.state.floorGuide.hide();
                    this.setIdle();
                    return null;
                }
                if (inputDirection === Directions.NONE) return null;

                if (inputDirection !== this.lastDirection) {
                    this.lastDirection = inputDirection;
                    this.directionTimeStamp = Date.now();
                }

                if (inputDirection === this.lastDirection
                    && Date.now() - this.directionTimeStamp > 50) {
                    // Change state to walking
                    this.setTurning(inputDirection);
                    // Update the floor guide
                    logic.state.floorGuide.update(inputDirection);
                }
            }
        }


        return null;
    }
}