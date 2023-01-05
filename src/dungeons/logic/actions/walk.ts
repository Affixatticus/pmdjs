import { Directions } from "../../../utils/direction";
import { DungeonPokemon } from "../../objects/pokemon";
import { DungeonPokemonMaterial } from "../../objects/sprite";
import { TurnAction } from "./action";


export class WalkAction implements TurnAction {
    public done: boolean;
    public readonly pokemon: DungeonPokemon;
    public readonly direction: Directions;

    /** Logging */
    public doLogging: boolean = false;
    public logMessage!: string | never;


    // Animation
    private static ANIMATION_LENGTH = 48;
    private static TURNING_LENGTH = 3;

    private currentStep: number = 0;
    private turnStep: number = 0;
    private rotations: Directions[];

    /** Step at which the moving can begin */
    private walkStart: number;
    /** Distance travelled each step */
    private walkDelta: number;

    constructor(pokemon: DungeonPokemon, direction: Directions) {
        this.done = false;
        this.pokemon = pokemon;
        this.direction = direction;

        // Set the next turn position of this pokemon
        this.pokemon.nextTurnPosition = pokemon.position.add(direction.toVector());
        // Set the next turn direction of this pokemon
        this.pokemon.nextTurnDirection = direction;

        // Get the number of rotations needed to get to the target direction
        this.rotations = this.pokemon.direction.getRotationsTo(direction);
        // Based on the number of rotations, determine how long the turn animation should be
        const ticksForTurning = this.rotations.length * WalkAction.TURNING_LENGTH;
        // The walk animation should start after the turn animation
        this.walkStart = ticksForTurning;
        // The distance travelled each step
        this.walkDelta = 1 / (WalkAction.ANIMATION_LENGTH - ticksForTurning);
    }

    public tick(): boolean {
        if (this.done) return true;

        // For the first step
        if (this.currentStep === 0) {
            this.pokemon.setAnimation("Walk");
        }

        // Turning time
        if (this.currentStep < this.walkStart) {
            if (this.turnStep++ > WalkAction.TURNING_LENGTH) {
                // Get the direction of the next rotation
                const nextDir = this.rotations[Math.floor(this.currentStep / WalkAction.TURNING_LENGTH)];
                // Set the direction of the pokemon
                this.pokemon.direction = nextDir;
                // Increment the step
                this.turnStep = 0;
            } else {
                this.turnStep++;
            }
        }
        // While you are still animating
        else if (this.currentStep < WalkAction.ANIMATION_LENGTH) {
            this.pokemon.position = this.pokemon.spritePosition.add(
                this.direction.toVector().scale(this.walkDelta));
            // this.pokemon.setAnimation("Walk");
        }
        // When stopping
        else {
            this.pokemon.position = this.pokemon.nextTurnPosition;
            if (this.pokemon.material) {
                this.pokemon.material.animCallback = (_material: DungeonPokemonMaterial) => {
                    // Quick check to see if the pokemon is still moving
                    if (this.pokemon.nextTurnPosition.equals(this.pokemon.position)) {
                        console.log("Intercepted")
                        this.pokemon.setAnimation("Idle");
                    }
                }
            }
            return this.done = true;
        }

        // Increment the step
        this.currentStep++;

        return false;
    }
}

export class MoveActionGroup implements TurnAction {
    public done: boolean;
    public actions: WalkAction[];

    constructor(...moveActions: WalkAction[]) {
        this.done = false;
        this.actions = moveActions;
    }

    public addAction(action: WalkAction) {
        this.actions.push(action);
    }

    public tick(): boolean {
        let allDone = true;

        for (let i = 0; i < this.actions.length; i++) {
            const action = this.actions[i];
            if (!action.done)
                action.tick();
            allDone &&= action.done;
        }

        return this.done = allDone;
    }
}