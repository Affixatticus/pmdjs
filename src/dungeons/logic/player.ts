import { GUIManager } from "../../common/menu/gui/gui";
import { Tile } from "../../data/tiles";
import { Controls } from "../../utils/controls";
import { Direction } from "../../utils/direction";
import Random from "../../utils/random";
import { DungeonPokemon, Obstacle } from "../objects/pokemon";
import { PushAction } from "./actions/walk";
import { DungeonLogic } from "./logic";

const MAX_DISTANCE_FOR_INLINE_CHECK = 10;
const WALKING_SPEED = 1;
const RUNNING_SPEED = 40;
const TURNING_TICKS = 4;
const WALKING_TICKS = 2;
const GUIDE_TICKS = 5;

export let PLAYER_SPEED: number = 1;
export let TICK_PER_TILE: number = 40;

export class Player {
    private logic: DungeonLogic;
    private floor!: DungeonLogic["state"]["floor"];
    private leader!: DungeonPokemon;
    private floorGuide!: DungeonLogic["state"]["floorGuide"];
    private isRunning = false;

    /** Saves whether the last waked tile was a corridor `true` or a room `false` */
    private lastWalkedTile!: boolean;
    /** Set when you are stopped while running */
    private movementHaltedAt!: Direction | null;
    /** The number of ticks since a direction other than NONE has been selected */
    private movementTick!: number;

    constructor(logic: DungeonLogic) {
        this.logic = logic;
    }


    public update() {
        this.floor = this.logic.state.floor;
        this.leader = this.floor.pokemon.getLeader();
        this.floorGuide = this.logic.state.floorGuide;
        this.isRunning = false;
        this.lastWalkedTile = this.floor.grid.isCorridor(this.leader.position);
        this.movementHaltedAt = null;
        this.movementTick = 0;
        this.turningDirection = null;
        this.turningTick = 0;
    }

    // ANCHOR Running Methods
    public getSpeed() {
        return this.isRunning ? RUNNING_SPEED : WALKING_SPEED;
    }
    public setRunning(running = true) {
        this.isRunning = running;
        PLAYER_SPEED = this.getSpeed();
    }
    /** Returns true if player is now in a room when it was in a corridor before */
    private justEnteredRoom() {
        if (this.lastWalkedTile && !this.floor.grid.isCorridor(this.leader.position, this.leader)) {
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
        this.setRunning(false);
        // Update the leader's direction
        this.leader.direction = direction;
    }
    private updateMovementTick(tick: number): boolean {
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

    /** Takes in controller inputs from the connected joystick and returns
     * the direction the player wants to move in next turn or null if it wants
     * to stay still
     */
    public doInput(): Direction | null {
        let input = Direction.fromVector(Controls.leftStick).flipY();
        let output = null;

        if (input !== Direction.NONE) Controls.B.resetLastPressed();
        if (Controls.B.onReleased(2)) {
            GUIManager.showGUI(this.logic.state.menu.gui);
            return null;
        }
        if (GUIManager.tick()) return null;


        // See if the player should be able to walk after halting movement
        if (this.movementHaltedAt !== null) {
            // If the player released the button it was pressing when the movement halted
            if (input !== this.movementHaltedAt)
                this.movementHaltedAt = null;
            return null;
        }

        // Turn the player if the process is not finished
        if (this.turningDirection !== null) {
            if (this.turnPlayer()) return null;
            else {
                this.movementTick = WALKING_TICKS;
                input = this.leader.direction;
            }
        }
        // Check if the input direction is the opposite of the player's current direction
        else if (input !== Direction.NONE && this.leader.direction.isOpposite(input)) {
            if (this.turnPlayer(input)) return null;
        }

        // See if you should load the floor guide
        if (Controls.Y.isDown) {
            this.floorGuide.update(this.leader.direction);

            if (input !== Direction.NONE)
                if (this.updateMovementTick(GUIDE_TICKS)) return null;

            if (input !== Direction.NONE)
                this.leader.direction = input;

            output = null;
        }
        // See if you should hide the floor guide
        else if (Controls.Y.isUp && this.floorGuide.lastDirection !== Direction.NONE) {
            this.floorGuide.hide();
            output = null;
        }
        // See if the player can move in that direction
        else if (input !== Direction.NONE) {
            if (this.updateMovementTick(WALKING_TICKS)) return null;
            // Stop the player if it's running into a possible turning point
            if (Controls.B.isDown && this.isRunning && input !== Direction.NONE && this.shouldStopRunning(input)) {
                this.setRunning(false);
                this.movementHaltedAt = input;
                return null;
            }
            const obstacle = this.leader.canMoveTowards(input, this.floor);

            switch (obstacle) {
                case Obstacle.NONE:
                    // TODO: Use a better function  
                    this.setRunning(Controls.B.isDown);
                    // You could run
                    output = input;
                    break;
                case Obstacle.WALL:
                    this.noMove(input);
                    output = null;
                    break;
                case Obstacle.PARTNER:
                    this.noMove(input);

                    // Check to see if you can swap with the partner
                    if (Controls.B.isDown) {
                        output = Controls.B ? input : null;
                    }
                    // Check to see if you can push the partner
                    else {
                        const pos = this.leader.position.add(input.toVector());
                        // Find a partner that will be in the position you are trying to move in
                        const partner = this.floor.pokemon.getPartners().find(p => p.nextTurnPosition.equals(pos))!;
                        output = this.pushPartnerBackwards(partner, input) ? input : null;
                    }
                    break;
                case Obstacle.ENEMY:
                    this.noMove(input);

                    // Halt the player
                    this.setRunning(false);

                    this.leader.direction = input;
                    output = null;
                    break;
            }
        }

        // Update the last walked tile
        this.lastWalkedTile = this.floor.grid.isCorridor(this.leader.position);

        return output;
    }
}


// enum PlayerState {
//     /** In this state, the player can choose whichever action available */
//     IDLE,
//     /** This is a transistioning state while the player changes direction */
//     TURNING,
//     /** This is the walking state, on while the player is walking */
//     WALKING,
//     /** This is the state in which you can turn freely (Holding Y) */
//     TURN,
// };


// export class Player {
//     private playerState: PlayerState = PlayerState.IDLE;

//     private lastDirection = Direction.NONE;
//     private directionTimeStamp = 0;
//     private turningDelay = 0;
//     private walkingStartedTurn = 0;
//     private turnStateTicks = 0;
//     private logic: DungeonLogic;

//     constructor(logic: DungeonLogic) {
//         this.logic = logic;
//     }

//     public get leader() {
//         return this.logic.state.floor.pokemon.getLeader();
//     }


//     private setState(state: PlayerState) {
//         this.playerState = state;
//         this.walkingStartedTurn = 0;
//         this.turningDelay = 0;
//         this.walkingStartedTurn = this.logic.currentTurn;
//     }

//     private setIdle() {
//         this.setState(PlayerState.IDLE);
//         return null;
//     }

//     private setTurning(direction: Direction) {
//         this.setState(PlayerState.TURNING);
//         this.lastDirection = direction;
//         return null;
//     }

//     private setWalking(direction: Direction) {
//         this.setState(PlayerState.WALKING);
//         this.lastDirection = direction;
//         return null;
//     }

//     // TODO: Implement this
//     private turnTowardsHotspot(): Direction {
//         return Direction.NORTH;
//     }

//     /** Returns the DungeonPokemon in the way that is a partner */
//     private partnerInTheWay(targetDirection: Direction, subject: DungeonPokemon = this.logic.state.floor.pokemon.getLeader()): DungeonPokemon | null {
//         const partners = this.logic.state.floor.pokemon.getPartners();
//         const subjectPosition = subject.position.add(targetDirection.toVector());

//         for (const partner of partners) {
//             if (partner === subject) continue;
//             if (partner.position.equals(subjectPosition)) {
//                 return partner;
//             }
//         }
//         return null;
//     }

//     private pushPartnerBackwards(partner: DungeonPokemon, lastDirection: Direction): Direction | null {
//         // Check if the partner can move in the new position
//         if (this.logic.state.floor.canMoveTowards(partner, lastDirection)) {
//             // Add the new position to the action list
//             partner.ai.overwrittenAction = new PushAction(partner, lastDirection);
//             return this.lastDirection;
//         }
//         // If the partner can't move, check if the partner has a partner in the way
//         else {
//             const partnerInTheWay = this.partnerInTheWay(lastDirection, partner);

//             if (partnerInTheWay)
//                 if (this.logic.state.floor.canMoveTowards(partnerInTheWay, lastDirection)) {
//                     // Add the new position to the action list
//                     partnerInTheWay.ai.overwrittenAction = new PushAction(partnerInTheWay, lastDirection);
//                     partner.ai.overwrittenAction = new PushAction(partner, lastDirection);
//                     return this.lastDirection;
//                 }
//         }
//         this.setTurning(lastDirection);
//         return null;
//     }

//     /** Takes in the chosen movement of the player */
//     public doInput() {
//         const stick = Controls.leftStick;
//         const inputDirection = Direction.fromVector(stick).flipY();
//         const player = this.logic.state.floor.pokemon.getLeader();


//         switch (this.playerState) {
//             case PlayerState.IDLE: {
//                 // If you press the Y button, you can turn freely
//                 if (!Controls.Y) {
//                     if (this.turnStateTicks > 2) {
//                         this.lastDirection = this.turnTowardsHotspot();
//                         this.setState(PlayerState.TURNING);
//                     }
//                     this.turnStateTicks = 0;
//                 }
//                 if (Controls.Y && this.turnStateTicks >= 0) {
//                     this.turnStateTicks++;
//                     if (this.turnStateTicks === 20) {
//                         this.turnStateTicks = 0;
//                         this.setState(PlayerState.TURN);
//                     }
//                 }

//                 // In whichever case, ignore null inputs
//                 if (inputDirection === Direction.NONE) return null;

//                 if (inputDirection !== this.lastDirection) {
//                     this.lastDirection = inputDirection;
//                     this.directionTimeStamp = Date.now();
//                 }

//                 if (inputDirection === this.lastDirection
//                     && Date.now() - this.directionTimeStamp > 50) {
//                     // Change state to walking
//                     return this.setWalking(inputDirection);
//                 }
//                 break;
//             }
//             case PlayerState.TURNING: {
//                 if (this.turningDelay++ >= 4) {
//                     if (player.direction !== this.lastDirection) {
//                         player.turnTowards(this.lastDirection);
//                         // Set the player's animation to Idle
//                         player.setAnimation("Idle");
//                         this.turningDelay = 0;
//                     }
//                     else if (this.turnStateTicks > 0) {
//                         this.setState(PlayerState.TURN);
//                     }
//                     else {
//                         return this.setIdle();
//                     }
//                 }
//                 break;
//             }
//             case PlayerState.WALKING: {
//                 // After the first turn, you are allowed to change direction
//                 if (this.walkingStartedTurn !== this.logic.currentTurn) {
//                     // If you want to, you can stop walking
//                     if (this.lastDirection === Direction.NONE) {
//                         this.setIdle();
//                         return null;
//                     }
//                     // Depending on the direction you choose, you can either walk or turn
//                     const canMove = this.logic.state.floor.canMoveTowards(player, inputDirection);
//                     if (!canMove) {
//                         this.setIdle();
//                         return null;
//                     }
//                     // Check if the player is going to turn the opposite direction
//                     if (this.lastDirection.isOpposite(inputDirection)) {
//                         this.setTurning(inputDirection);
//                         return null;
//                     }
//                     // Keep walking in the input direction
//                     this.lastDirection = inputDirection;
//                     return this.lastDirection;
//                 } else {
//                     const canMove = this.logic.state.floor.canMoveTowards(player, this.lastDirection);
//                     const partner = this.partnerInTheWay(this.lastDirection);
//                     if (canMove) {
//                         return this.lastDirection;
//                     } else if (Controls.B && partner) {
//                         return this.lastDirection;
//                     } else if (inputDirection !== Direction.NONE && partner) {
//                         // Push the partners backwards
//                         return this.pushPartnerBackwards(partner, this.lastDirection);
//                     } else if (!canMove) {
//                         return this.setTurning(this.lastDirection);
//                     }
//                     return this.setIdle();
//                 }
//             }
//             case PlayerState.TURN: {
//                 if (Controls.Y && this.turnStateTicks === 0) {
//                     this.logic.state.floorGuide.show();
//                 }
//                 this.turnStateTicks++;
//                 if (!Controls.Y && this.turnStateTicks > 20) {
//                     this.turnStateTicks = 0;
//                     this.logic.state.floorGuide.hide();
//                     return this.setIdle();
//                 }
//                 if (inputDirection === Direction.NONE) return null;

//                 if (inputDirection !== this.lastDirection) {
//                     this.lastDirection = inputDirection;
//                     this.directionTimeStamp = Date.now();
//                 }

//                 if (inputDirection === this.lastDirection
//                     && Date.now() - this.directionTimeStamp > 50) {
//                     // Update the floor guide
//                     this.logic.state.floorGuide.update(inputDirection);
//                     // Change state to walking
//                     this.setTurning(inputDirection);
//                 }
//             }
//         }


//         return null;
//     }

// }
