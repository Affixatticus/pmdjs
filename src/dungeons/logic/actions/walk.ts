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
    public static ANIMATION_LENGTH = 52;

    public currentStep: number = 0;

    /** Distance travelled each step */
    public walkDelta: number;

    constructor(pokemon: DungeonPokemon, direction: Directions) {
        this.done = false;
        this.pokemon = pokemon;
        this.direction = direction;

        // Set the next turn position of this pokemon
        this.pokemon.nextTurnPosition = pokemon.position.add(direction.toVector());
        // Set the next turn direction of this pokemon
        this.pokemon.nextTurnDirection = direction;

        this.walkDelta = 1 / (WalkAction.ANIMATION_LENGTH);
    }

    public tick(): boolean {
        if (this.done) return true;

        // For the first step
        if (this.currentStep === 0) {
            // If the direction is not the same as the sprite direction
            if (this.pokemon.direction !== this.direction) {
                this.pokemon.resetAnimation("Walk");
                // Turn in the correct direction
                this.pokemon.direction = this.direction;
            } else {
                this.pokemon.setAnimation("Walk");
            }
        }
        // While you are still animating
        else if (this.currentStep < WalkAction.ANIMATION_LENGTH) {
            this.pokemon.position = this.pokemon.spritePosition.add(
                this.direction.toVector().scale(this.walkDelta));
        }
        // When stopping
        else {
            this.pokemon.position = this.pokemon.nextTurnPosition;
            if (this.pokemon.material) {
                this.pokemon.material.animCallback = (_material: DungeonPokemonMaterial) => {
                    // Quick check to see if the pokemon is still moving
                    if (this.pokemon.nextTurnPosition.equals(this.pokemon.position)) {
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

export class PushAction extends WalkAction {
    constructor(pokemon: DungeonPokemon, direction: Directions) {
        super(pokemon, direction);
        this.logMessage = `${pokemon.toString()} pushed ${direction.toString()}!`;
    }

    public tick(): boolean {
        if (this.done) return true;

        // For the first step
        if (this.currentStep === 0) {
            // If the direction is not the same as the sprite direction
            if (this.pokemon.direction !== this.direction) {
                this.pokemon.resetAnimation("Walk");
            } else {
                this.pokemon.setAnimation("Walk");
            }
        }
        // While you are still animating
        else if (this.currentStep < WalkAction.ANIMATION_LENGTH) {
            this.pokemon.position = this.pokemon.spritePosition.add(
                this.direction.toVector().scale(this.walkDelta));
            // Modify the direction of the pokemon
            const newDirection = Math.round((this.currentStep / WalkAction.ANIMATION_LENGTH) * 8);
            this.pokemon.direction = Directions.ALL[Directions.rollIndex(this.direction.index + newDirection + 4)];
        }
        // When stopping
        else {
            this.pokemon.position = this.pokemon.nextTurnPosition;
            if (this.pokemon.material) {
                this.pokemon.material.animCallback = (_material: DungeonPokemonMaterial) => {
                    // Quick check to see if the pokemon is still moving
                    if (this.pokemon.nextTurnPosition.equals(this.pokemon.position)) {
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