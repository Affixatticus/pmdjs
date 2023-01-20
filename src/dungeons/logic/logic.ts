import { Controls } from "../../utils/controls";
import { Directions } from "../../utils/direction";
import { DungeonState } from "../dungeon";
import { WalkAction } from "./actions/walk";
import { NilAction } from "./actions/nil";
import { Turn } from "./turn";
import { PokemonTypes } from "../objects/pokemon";
import { DungeonPokemonPartnerAI } from "./ai/partner_ai";
import { DungeonPokemonAI } from "./ai/ai";

enum PlayerStates {
    /** In this state, the player can choose whichever action available */
    IDLE,
    /** This is a transistioning state while the player changes direction */
    TURNING,
    /** This is the walking state, on while the player is walking */
    WALKING,
};

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

    /** Initializes the logic with all parameters that are created after its instancing */
    public init() {
        for (const pokemon of this.state.floor.pokemon.getAll()) {
            // Assign the ai to the pokemon
            switch (pokemon.type) {
                case PokemonTypes.PARTNER:
                    pokemon.ai = new DungeonPokemonPartnerAI(pokemon, this.state.floor);
                    break;
                default:
                    pokemon.ai = new DungeonPokemonAI(pokemon, this.state.floor);
            }
        }
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

    // ANCHOR Player input
    private playerState: PlayerStates = PlayerStates.IDLE;

    private lastDirection = Directions.NONE;
    private directionTimeStamp = 0;

    private turningDelay = 0;
    private turningDirection = Directions.NONE;

    private walkingDirection = Directions.NONE;
    private walkingStartedTurn = 0;

    /** Takes in the chosen movement of the player */
    private doPlayerInput() {
        const stick = Controls.leftStick;
        const inputDirection = Directions.fromVector(stick).flipY();
        const player = this.state.floor.pokemon.getLeader();


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
                    this.lastDirection = Directions.NONE;
                    this.playerState = PlayerStates.TURNING;
                    this.turningDirection = inputDirection;
                }
                else if (inputDirection === this.lastDirection
                    && Date.now() - this.directionTimeStamp > 50) {
                    // Change state to walking
                    this.playerState = PlayerStates.WALKING;
                    this.walkingDirection = inputDirection;
                    this.walkingStartedTurn = this.currentTurn;
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
                        this.playerState = PlayerStates.IDLE;
                    }
                }

                break;
            }
            case PlayerStates.WALKING: {
                // After the first turn, you are allowed to change direction
                if (this.walkingStartedTurn !== this.currentTurn) {
                    // If you want to, you can stop walking
                    if (this.walkingDirection === Directions.NONE) {
                        this.playerState = PlayerStates.IDLE;
                        return null;
                    }
                    // Depending on the direction you choose, you can either walk or turn
                    const canMove = this.state.floor.canMoveTowards(player, inputDirection);
                    if (!canMove) {
                        this.playerState = PlayerStates.IDLE;
                        this.walkingDirection = Directions.NONE;
                        return null;
                    }
                    // Check if the player is going to turn the opposite direction
                    if (this.walkingDirection.opposite(inputDirection)) {
                        this.playerState = PlayerStates.TURNING;
                        this.turningDirection = inputDirection;
                        this.turningDelay = 0;
                        this.walkingDirection = Directions.NONE;
                        return null;
                    }
                    // Keep walking in the input direction
                    this.walkingDirection = inputDirection;
                    return this.walkingDirection;
                } else {
                    const canMove = this.state.floor.canMoveTowards(player, this.walkingDirection);
                    if (canMove) {
                        return this.walkingDirection;
                    }
                    this.playerState = PlayerStates.IDLE;
                    this.walkingDirection = Directions.NONE;
                    return null;
                }
            }
        }


        return null;


        // const stick = Controls.leftStick;
        // const walkingDirection = Directions.fromVector(stick).flipY();
        // const leader = this.state.floor.pokemon.getLeader();
        // if (walkingDirection === Directions.NONE) return null;

        // // -- Check if the player is rotating
        // // If the control stick is less than half, get the vector
        // let turningDirection = Directions.fromVector(stick.normalize()).toVector();
        // if ((stick.equals(turningDirection) && Controls.Y)) {
        //     leader.setAnimation("Idle");
        //     leader.direction = Directions.fromVector(turningDirection).flipY();
        //     return null;
        // } else {
        //     const canMove = this.state.floor.canMoveTowards(leader, walkingDirection);

        //     // Check if the player can walk        
        //     if (!canMove) return null;
        // }




        // // Check if the player can move in that direction
        // return walkingDirection;
    }
}