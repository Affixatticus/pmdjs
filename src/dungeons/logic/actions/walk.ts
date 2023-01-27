import { GUIManager, GUIType } from "../../../common/menu/gui/gui";
import { Tile } from "../../../data/tiles";
import { Direction } from "../../../utils/direction";
import { DungeonState } from "../../dungeon";
import { DungeonItem } from "../../objects/item";
import { ObjectType } from "../../objects/object";
import { DungeonPokemon } from "../../objects/pokemon";
import { DungeonPokemonMaterial } from "../../objects/sprite";
import { DungeonTile } from "../../objects/tile";
import { PLAYER_SPEED, TICK_PER_TILE } from "../player";
import { TurnAction } from "./action";
import { NilAction } from "./nil";


export class WalkAction implements TurnAction {
    public readonly pokemon: DungeonPokemon;
    public readonly direction: Direction;

    /** Logging */
    public doLogging: boolean = false;
    public logMessage!: string | never;

    // Animation
    public static ANIMATION_LENGTH = TICK_PER_TILE;

    public currentStep: number = 0;

    /** Distance travelled each step */
    public animationLength: number = WalkAction.ANIMATION_LENGTH;
    public walkDelta: number;

    static getAction(pokemon: DungeonPokemon, direction: Direction, state: DungeonState): TurnAction {
        // If the pokemon is not actually moving
        if (direction === Direction.NONE) return new NilAction(pokemon);
        // If there are stairs in the next position
        const nextPos = pokemon.position.add(direction.toVector());
        if (state.floor.objects.getStairs().position.equals(nextPos))
            return new StairsAction(pokemon, direction, state);
        // If the next position is an item
        if (state.floor.grid.get(nextPos) === Tile.ITEM)
            return new ItemAction(pokemon, direction, state.floor.objects.get(nextPos) as DungeonItem, state);
        // If there is a trap in the next position
        if (state.floor.objects.get(nextPos)?.type === ObjectType.TRAP)
            return new TrapAction(pokemon, direction, state.floor.objects.get(nextPos) as DungeonTile);

        return new WalkAction(pokemon, direction);
    }

    constructor(pokemon: DungeonPokemon, direction: Direction, speed = PLAYER_SPEED) {
        this.pokemon = pokemon;
        this.direction = direction;

        // Set the next turn position of this pokemon
        this.pokemon.nextTurnPosition = pokemon.position.add(direction.toVector());
        // Set the next turn direction of this pokemon
        this.pokemon.nextTurnDirection = direction;

        this.animationLength = WalkAction.ANIMATION_LENGTH / speed;
        this.walkDelta = 1 / this.animationLength;
    }

    /** Animates the walk, and returns true when it's finished */
    public tick(): boolean {
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
        else if (this.currentStep <= this.animationLength) {
            this.pokemon.position = this.pokemon.spritePosition.clone();
            this.pokemon.spritePosition.addInPlace(
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
            return true;
        }

        // Increment the step
        this.currentStep++;

        return false;
    }
}

export class PushAction extends WalkAction {
    constructor(pokemon: DungeonPokemon, direction: Direction) {
        super(pokemon, direction);
        this.logMessage = `${pokemon.toString()} pushed ${direction.toString()}!`;
    }

    public tick(): boolean {
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
            this.pokemon.direction = Direction.ALL[Direction.rollIndex(this.direction.index + newDirection + 4)];
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
            return true;
        }

        // Increment the step
        this.currentStep++;

        return false;
    }
}

export class StairsAction extends WalkAction {
    public state: DungeonState;

    constructor(pokemon: DungeonPokemon, direction: Direction, state: DungeonState) {
        super(pokemon, direction);
        this.state = state;
        console.log("Created StairsAction");
        this.logMessage = `${pokemon.toString()} went up the stairs!`;
    }

    public tick(): boolean {
        const doneWalking = super.tick();
        if (!doneWalking) return false;
        if (!this.pokemon.isLeader) return true;
        // Prompt the user
        const result = GUIManager.awaitOutput(GUIType.YES_NO);
        if (result === null) return false;

        if (result === true) {
            this.state.goUpAFloor();
            this.state.changeFloor();
        }
        return true;
    }
}
export class TrapAction extends WalkAction {
    constructor(pokemon: DungeonPokemon, direction: Direction, trap: DungeonTile) {
        super(pokemon, direction);
        console.log("Created TrapAction");
        this.logMessage = `${pokemon.toString()} triggered a trap!`;
    }
}
export class ItemAction extends WalkAction {
    public item: DungeonItem;
    public state: DungeonState;

    constructor(pokemon: DungeonPokemon, direction: Direction, item: DungeonItem, state: DungeonState) {
        super(pokemon, direction);
        this.item = item;
        this.state = state;
        console.log("Created ItemAction");
        this.logMessage = `${pokemon.toString()} picked up an item!`;
    }

    public tick(): boolean {
        const doneWalking = super.tick();
        if (!doneWalking) return false;

        // If it is a wild pokemon
        if (!this.pokemon.inFormation) {
            // Remove the item from the floor
            this.state.floor.objects.removeObject(this.item);
            // TODO Add the item to the pokemon's inventory
            return true;
        }

        // If it the player pokemon
        if (this.pokemon.inFormation) {
            // Try to add the item to the inventory
            const leftoverStack = this.state.menu.inventory.addStack(this.item.stack);
            // If there is a leftover stack
            if (leftoverStack) {
                // TODO Decide what to do with the leftover stack
                if (this.pokemon.isLeader) {
                    const output = GUIManager.awaitOutput(GUIType.YES_NO);
                    if (output === null) return false;

                    if (output === true) {
                        // Change the stack
                        this.item.stack = leftoverStack;
                    } else if (output === false) {
                        // Change the stack
                        this.item.stack = leftoverStack;
                        // Set the item to not wanted
                        this.item.setWanted(false);
                    }
                } else {
                    // Change the stack
                    this.item.stack = leftoverStack;
                    // Set the item to not wanted
                    this.item.setWanted(false);
                }
            } else {
                // Remove the item from the floor
                this.state.floor.objects.removeObject(this.item);
                this.state.floor.grid.set(this.item.position, Tile.FLOOR);
            }
        }
        return true;
    }
}

export class MoveActionGroup implements TurnAction {
    public actions: WalkAction[];

    constructor(...moveActions: WalkAction[]) {
        this.actions = moveActions;
    }

    public addAction(action: WalkAction) {
        this.actions.push(action);
    }

    public tick(): boolean {
        let allDone = true;

        for (const action of this.actions) {
            const done = action.tick();
            allDone &&= done;
        }

        return allDone;
    }
}