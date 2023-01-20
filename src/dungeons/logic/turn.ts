import { DungeonState } from "../dungeon";
import { PokemonTypes } from "../objects/pokemon";
import { TurnAction } from "./actions/action";
import { WalkAction, MoveActionGroup } from "./actions/walk";

/** A queue for actions */
export class Turn {
    public actions: TurnAction[];

    constructor() {
        this.actions = [];
    }

    private groupMoveActions(): void {
        // Groups together MoveActions into MoveActionGroups
        for (let i = 0; i < this.actions.length; i++) {
            const action = this.actions[i];
            if (action instanceof WalkAction) {
                const group = new MoveActionGroup(action);
                for (let j = i + 1; j < this.actions.length; j++) {
                    const nextAction = this.actions[j];
                    if (nextAction instanceof WalkAction) {
                        group.addAction(nextAction);
                    }
                }
                this.actions.splice(i, group.actions.length, group);
            }
        }
    }

    public calculate(firstAction: TurnAction, state: DungeonState): void {
        // Add the first action (usually the player's movement)
        this.addAction(firstAction);

        // Calculate the other pokemon's actions
        state.floor.pokemon.getAll().forEach(pokemon => {
            // Skip the player's pokemon
            if (pokemon.type === PokemonTypes.LEADER) return;
            const action = pokemon.ai.calculateNextAction();
            this.addAction(action);
        });

        // Group together MoveAction
        this.groupMoveActions();
    }

    /** Exectues all the actions and recturns true if all actions are finished */
    public runAllActions(): boolean {
        let finished = true;

        for (const action of this.actions) {
            finished &&= action.tick();
        };

        return finished;
    }

    /** Runs all the animations if the turn is ready */
    public execute(): boolean {
        return this.runAllActions();
    }

    public addAction(action: TurnAction): void {
        this.actions.push(action);
    }
}