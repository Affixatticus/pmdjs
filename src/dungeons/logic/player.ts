import { Controls } from "../../utils/controls";
import { Directions } from "../../utils/direction";
import { DungeonPokemon } from "../objects/pokemon";
import { PushAction } from "./actions/walk";
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
    private logic: DungeonLogic;

    constructor(logic: DungeonLogic) {
        this.logic = logic;
    }

    public get leader() {
        return this.logic.state.floor.pokemon.getLeader();
    }


    private setState(state: PlayerStates) {
        this.playerState = state;
        this.walkingStartedTurn = 0;
        this.turningDelay = 0;
        this.walkingStartedTurn = this.logic.currentTurn;
    }

    private setIdle() {
        this.setState(PlayerStates.IDLE);
        return null;
    }

    private setTurning(direction: Directions) {
        this.setState(PlayerStates.TURNING);
        this.lastDirection = direction;
        return null;
    }

    private setWalking(direction: Directions) {
        this.setState(PlayerStates.WALKING);
        this.lastDirection = direction;
        return null;
    }

    // TODO: Implement this
    private turnTowardsHotspot(): Directions {
        return Directions.NORTH;
    }

    /** Returns the DungeonPokemon in the way that is a partner */
    private partnerInTheWay(targetDirection: Directions, subject: DungeonPokemon = this.logic.state.floor.pokemon.getLeader()): DungeonPokemon | null {
        const partners = this.logic.state.floor.pokemon.getPartners();
        const subjectPosition = subject.position.add(targetDirection.toVector());

        for (const partner of partners) {
            if (partner === subject) continue;
            if (partner.position.equals(subjectPosition)) {
                return partner;
            }
        }
        return null;
    }

    private pushPartnerBackwards(partner: DungeonPokemon, lastDirection: Directions): Directions | null {
        // Check if the partner can move in the new position
        if (this.logic.state.floor.canMoveTowards(partner, lastDirection)) {
            // Add the new position to the action list
            partner.ai.overwrittenAction = new PushAction(partner, lastDirection);
            return this.lastDirection;
        }
        // If the partner can't move, check if the partner has a partner in the way
        else {
            const partnerInTheWay = this.partnerInTheWay(lastDirection, partner);

            if (partnerInTheWay)
                if (this.logic.state.floor.canMoveTowards(partnerInTheWay, lastDirection)) {
                    // Add the new position to the action list
                    partnerInTheWay.ai.overwrittenAction = new PushAction(partnerInTheWay, lastDirection);
                    partner.ai.overwrittenAction = new PushAction(partner, lastDirection);
                    return this.lastDirection;
                }
        }
        this.setTurning(lastDirection);
        return null;
    }

    /** Takes in the chosen movement of the player */
    public doInput() {
        const stick = Controls.leftStick;
        const inputDirection = Directions.fromVector(stick).flipY();
        const player = this.logic.state.floor.pokemon.getLeader();


        switch (this.playerState) {
            case PlayerStates.IDLE: {
                // If you press the Y button, you can turn freely
                if (!Controls.Y) {
                    if (this.turnStateTicks > 2) {
                        this.lastDirection = this.turnTowardsHotspot();
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
                    return this.setWalking(inputDirection);
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
                        return this.setIdle();
                    }
                }
                break;
            }
            case PlayerStates.WALKING: {
                // After the first turn, you are allowed to change direction
                if (this.walkingStartedTurn !== this.logic.currentTurn) {
                    // If you want to, you can stop walking
                    if (this.lastDirection === Directions.NONE) {
                        this.setIdle();
                        return null;
                    }
                    // Depending on the direction you choose, you can either walk or turn
                    const canMove = this.logic.state.floor.canMoveTowards(player, inputDirection);
                    if (!canMove) {
                        this.setIdle();
                        return null;
                    }
                    // Check if the player is going to turn the opposite direction
                    if (this.lastDirection.isOpposite(inputDirection)) {
                        this.setTurning(inputDirection);
                        return null;
                    }
                    // Keep walking in the input direction
                    this.lastDirection = inputDirection;
                    return this.lastDirection;
                } else {
                    const canMove = this.logic.state.floor.canMoveTowards(player, this.lastDirection);
                    const partner = this.partnerInTheWay(this.lastDirection);
                    if (canMove) {
                        return this.lastDirection;
                    } else if (Controls.B && partner) {
                        return this.lastDirection;
                    } else if (inputDirection !== Directions.NONE && partner) {
                        // Push the partners backwards
                        return this.pushPartnerBackwards(partner, this.lastDirection);
                    } else if (!canMove) {
                        return this.setTurning(this.lastDirection);
                    }
                    return this.setIdle();
                }
            }
            case PlayerStates.TURN: {
                if (Controls.Y && this.turnStateTicks === 0) {
                    this.logic.state.floorGuide.show();
                }
                this.turnStateTicks++;
                if (!Controls.Y && this.turnStateTicks > 20) {
                    this.turnStateTicks = 0;
                    this.logic.state.floorGuide.hide();
                    return this.setIdle();
                }
                if (inputDirection === Directions.NONE) return null;

                if (inputDirection !== this.lastDirection) {
                    this.lastDirection = inputDirection;
                    this.directionTimeStamp = Date.now();
                }

                if (inputDirection === this.lastDirection
                    && Date.now() - this.directionTimeStamp > 50) {
                    // Update the floor guide
                    this.logic.state.floorGuide.update(inputDirection);
                    // Change state to walking
                    this.setTurning(inputDirection);
                }
            }
        }


        return null;
    }

}