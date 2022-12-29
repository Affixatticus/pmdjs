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

    constructor(pokemon: DungeonPokemon, direction: Directions) {
        this.done = false;
        this.pokemon = pokemon;
        this.direction = direction;

        // Set the next turn position of this pokemon
        this.pokemon.nextTurnPosition = pokemon.position.add(direction.toVector());
        // Set the next turn direction of this pokemon
        this.pokemon.nextTurnDirection = direction;
    }

    static MAX_STEP = 48;
    private step: number = WalkAction.MAX_STEP;
    private firstStep = () => this.step === WalkAction.MAX_STEP;

    public tick(): boolean {
        if (this.done) return true;

        if (this.firstStep()) {
            this.pokemon.direction = this.direction;
            this.pokemon.setAnimation("Walk");
        }

        // Move the pokemon
        if (this.step-- <= 0) {
            this.pokemon.position = this.pokemon.nextTurnPosition;
            if (this.pokemon.material) {
                this.pokemon.material.animCallback = (material: DungeonPokemonMaterial) => {
                    material.setAnimation("Idle");
                }
            }
            return this.done = true;
        } else {
            this.pokemon.position = this.pokemon.position.add(
                this.direction.toVector().scale(1 / WalkAction.MAX_STEP));
            this.pokemon.setAnimation("Walk");
        }

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