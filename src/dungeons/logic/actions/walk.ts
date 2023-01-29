import { Tile } from "../../../data/tiles";
import { Direction } from "../../../utils/direction";
import { DungeonState } from "../../dungeon";
import { DungeonItem } from "../../objects/item";
import { ObjectType } from "../../objects/object";
import { DungeonPokemon } from "../../objects/pokemon";
import { DungeonPokemonMaterial } from "../../objects/sprite";
import { DungeonTile } from "../../objects/tile";
import { DungeonLogic } from "../logic";
import { Turn } from "../turn";
import { TurnAction } from "./action";
import { NilAction } from "./nil";
import { GoDownStairsAction } from "./special";


const TICK_PER_TILE = 40;

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

    /** Flag set at the creation of this action, which is set when the pokemon was pushed */
    private usePushingAnimation: boolean;

    static getAction(pokemon: DungeonPokemon, direction: Direction, push: boolean, logic: DungeonLogic): TurnAction {
        // If the pokemon is not actually moving
        if (direction === Direction.NONE) return new NilAction(pokemon);
        // If there are stairs in the next position
        const nextPos = pokemon.position.add(direction.toVector());
        if (logic.state.floor.objects.getStairs().position.equals(nextPos)) {
            return new StairsAction(pokemon, direction, push, logic);
        }
        // If the next position is an item
        if (logic.state.floor.grid.get(nextPos) === Tile.ITEM) {
            return new ItemAction(pokemon, direction, push, logic.state.floor.objects.get(nextPos) as DungeonItem, logic.state);
        }
        // If there is a trap in the next position
        if (logic.state.floor.objects.get(nextPos)?.type === ObjectType.TRAP) {
            return new TrapAction(pokemon, direction, push, logic.state.floor.objects.get(nextPos) as DungeonTile);
        }

        return new WalkAction(pokemon, direction, push);
    }

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, speed = DungeonPokemon.animationSpeed) {
        this.pokemon = pokemon;
        this.direction = direction;
        this.usePushingAnimation = push;

        // Set the next turn position of this pokemon
        this.pokemon.nextTurnPosition = pokemon.position.add(direction.toVector());
        // Set the next turn direction of this pokemon
        this.pokemon.nextTurnDirection = direction;

        this.animationLength = WalkAction.ANIMATION_LENGTH / speed;
        this.walkDelta = 1 / this.animationLength;
    }

    public walk(): boolean {
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
                        // Set the animation to idle
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
    public pushWalk(): boolean {
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

    /** Animates the walk, and returns true when it's finished */
    public tick(): boolean {
        if (this.usePushingAnimation) return this.pushWalk();
        return this.walk();
    }
}

export class StairsAction extends WalkAction {
    public done: boolean;
    public logic: DungeonLogic;

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, logic: DungeonLogic) {
        super(pokemon, direction, push);
        this.logic = logic;
        this.done = false;
        console.log("Created StairsAction");
        this.logMessage = `${pokemon.toString()} went up the stairs!`;
    }

    private get turn(): Turn {
        return this.logic.turn!;
    }


    public tick(): boolean {
        if (this.done) return true;

        const doneWalking = super.tick();
        if (!doneWalking) return false;

        // Append a new action at the end of this turn
        if (this.pokemon.isLeader) {
            this.turn.addAction(new GoDownStairsAction(this.pokemon, this.logic));
        }
        return this.done = true;
    }
}
export class TrapAction extends WalkAction {
    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, trap: DungeonTile) {
        super(pokemon, direction, push);
        console.log("Created TrapAction");
        this.logMessage = `${pokemon.toString()} triggered a trap!`;
    }
}
export class ItemAction extends WalkAction {
    public done: boolean;
    public item: DungeonItem;
    public state: DungeonState;

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, item: DungeonItem, state: DungeonState) {
        super(pokemon, direction, push);
        this.item = item;
        this.state = state;
        this.done = false;
        console.log("Created ItemAction");
        this.logMessage = `${pokemon.toString()} picked up an item!`;
    }

    public tick(): boolean {
        if (this.done) return true;

        const doneWalking = super.tick();
        if (!doneWalking) return this.done = false;

        // If it is a wild pokemon
        if (this.pokemon.inFormation) {
            // Remove the item from the floor
            this.state.floor.objects.removeObject(this.item);
            this.state.floor.grid.set(this.item.position, Tile.FLOOR);
            // TODO Add the item to the pokemon's inventory
            return this.done = true;
        }

        // If it the player pokemon
        // if (this.pokemon.inFormation) {
        //     // Try to add the item to the inventory
        //     const leftoverStack = this.state.menu.inventory.addStack(this.item.stack);
        //     // If there is a leftover stack
        //     if (leftoverStack) {
        //         // TODO Decide what to do with the leftover stack
        //         if (this.pokemon.isLeader) {

        //         } else {
        //             // Change the stack
        //             this.item.stack = leftoverStack;
        //             // Set the item to not wanted
        //             this.item.setWanted(false);
        //         }
        //     } else {
        //         // Remove the item from the floor
        //         this.state.floor.objects.removeObject(this.item);
        //         this.state.floor.grid.set(this.item.position, Tile.FLOOR);
        //     }
        // }
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