import { DungeonState } from "../dungeon";
import { DungeonPokemonType } from "../objects/dungeon_pokemon";
import { TurnAction } from "./actions/action";
import { WalkAction, MoveActionGroup } from "./actions/walk";

export const enum TurnFlags {
    PROCEED = 1,
}

export class Turn {
    public actions: TurnAction[];
    public specialFlags: TurnFlags[];
    /** The index of the currently ticking action */
    private tickingActionIndex: number = 0;

    constructor() {
        this.actions = [];
        this.specialFlags = [];
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
            if (pokemon.type === DungeonPokemonType.LEADER) return;
            const action = pokemon.ai.calculateNextAction();
            this.addAction(action);
        });

        // Group together MoveAction
        this.groupMoveActions();
    }

    /** Exectues all the actions and returns true if all actions are finished */
    public runAllActions(): boolean {
        if (this.tickingActionIndex === this.actions.length) return true;
        const action = this.actions[this.tickingActionIndex];
        const isFinished = action.tick();
        if (isFinished) this.tickingActionIndex++;

        return this.tickingActionIndex === this.actions.length;
    }

    /** Runs all the actions when the turn is ready */
    public execute(): boolean {
        return this.runAllActions();
    }

    public addAction(action: TurnAction): void {
        this.actions.push(action);
    }

    /** Sets a special flag
     * - special flags represent actions that must be executed after all the actions are finished
     */
    public setSpecialFlag(flag: TurnFlags): void {
        this.specialFlags.push(flag);
    }

    /** Executes a special flag */
    public executeSpecialFlags(state: DungeonState): void {
        for (const flag of this.specialFlags) {
            switch (flag) {
                case TurnFlags.PROCEED:
                    state.goUpAFloor();
                    state.changeFloor();
                    break;
            }
        }
    }

}