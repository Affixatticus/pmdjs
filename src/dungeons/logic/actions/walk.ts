import { Tile } from "../../../data/tiles";
import { Direction } from "../../../utils/direction";
import { DungeonState } from "../../dungeon";
import { DungeonItem } from "../../objects/item";
import { ObjectType } from "../../objects/object";
import { DungeonPokemon } from "../../objects/dungeon_pokemon";
import { DungeonTile } from "../../objects/tile";
import { DungeonLogic } from "../logic";
import { Turn } from "../turn";
import { TurnAction } from "./action";
import { NilAction } from "./nil";
import { GoDownStairsAction, OpenItemMenuAction } from "./special";


const TICK_PER_TILE = 40;

export class WalkAction extends TurnAction {
    public readonly pokemon: DungeonPokemon;
    public readonly direction: Direction;
    public logic: DungeonLogic;

    // Animation
    public static ANIMATION_LENGTH = TICK_PER_TILE;

    /** Distance travelled each step */
    public animationLength: number = WalkAction.ANIMATION_LENGTH;
    public walkDelta: number;

    /** Flag set at the creation of this action, which is set when the pokemon was pushed */
    private usePushingAnimation: boolean;

    protected get state(): DungeonState {
        return this.logic.state;
    }

    protected get turn(): Turn {
        return this.logic.turn!;
    }

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
            return new ItemAction(pokemon, direction, push, logic.state.floor.objects.get(nextPos) as DungeonItem, logic);
        }
        // If there is a trap in the next position
        if (logic.state.floor.objects.get(nextPos)?.type === ObjectType.TRAP) {
            return new TrapAction(pokemon, direction, push, logic.state.floor.objects.get(nextPos) as DungeonTile, logic);
        }

        return new WalkAction(pokemon, direction, push, logic);
    }

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, logic: DungeonLogic) {
        super();
        this.pokemon = pokemon;
        this.direction = direction;
        this.usePushingAnimation = push;
        this.logic = logic;

        // Set the next turn position of this pokemon
        this.pokemon.nextTurnPosition = pokemon.position.add(direction.toVector());
        // Set the next turn direction of this pokemon
        this.pokemon.nextTurnDirection = direction;

        this.animationLength = WalkAction.ANIMATION_LENGTH / logic.state.animationSpeed;
        this.walkDelta = 1 / this.animationLength;

        this.generator = this.run();
    }

    public *playWalkAnimation(): Generator {
        // If the pokemon changed direction, restart the walking animation
        if (this.pokemon.direction !== this.direction) {
            this.pokemon.resetAnimation("Walk");
            // Turn in the correct direction
            this.pokemon.direction = this.direction;
        }
        // Otherwise, continue smoothly
        else this.pokemon.setAnimation("Walk");

        // Animate the movement
        yield* this.repeat(this.animationLength + 1, () => {
            this.pokemon.position = this.pokemon.spritePosition.clone();
            this.pokemon.spritePosition.addInPlace(
                this.direction.toVector().scale(this.walkDelta));
        });

        // Stop the animation, and set the position to the next turn position
        this.pokemon.position = this.pokemon.nextTurnPosition;
        if (this.pokemon.material) {
            this.pokemon.material.animCallback = () => {
                // Quick check to see if the pokemon is still moving
                if (this.pokemon.nextTurnPosition.equals(this.pokemon.position)) {
                    // Set the animation to idle
                    this.pokemon.setAnimation("Idle");
                }
            }
        }
    }

    private *playPushedAnimation(): Generator {
        // If the pokemon changed direction, restart the walking animation
        if (this.pokemon.direction !== this.direction) {
            this.pokemon.resetAnimation("Walk");
            // Turn in the correct direction
            this.pokemon.direction = this.direction;
        }
        // Otherwise, continue smoothly
        else this.pokemon.setAnimation("Walk");

        // Animate the movement
        yield* this.repeat(this.animationLength + 1, (currentStep) => {
            this.pokemon.position = this.pokemon.spritePosition.clone();
            this.pokemon.spritePosition.addInPlace(
                this.direction.toVector().scale(this.walkDelta));
            // Modify the direction of the pokemon
            const newDirection = Math.round((currentStep / WalkAction.ANIMATION_LENGTH) * 8);
            this.pokemon.direction = Direction.ALL[Direction.rollIndex(this.direction.index + newDirection + 4)];
        });

        // Stop the animation, and set the position to the next turn position
        this.pokemon.position = this.pokemon.nextTurnPosition;
        if (this.pokemon.material) {
            this.pokemon.material.animCallback = () => {
                // Quick check to see if the pokemon is still moving
                if (this.pokemon.nextTurnPosition.equals(this.pokemon.position)) {
                    // Set the animation to idle
                    this.pokemon.setAnimation("Idle");
                }
            }
        }
    }

    public *run(): Generator {
        if (this.usePushingAnimation) {
            yield* this.playPushedAnimation();
        }
        else {
            yield* this.playWalkAnimation();
        }
    }
}

export class StairsAction extends WalkAction {
    public logic: DungeonLogic;

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, logic: DungeonLogic) {
        super(pokemon, direction, push, logic);
        this.logic = logic;
        this.logMessage = `${pokemon.toString()} went up the stairs!`;
        this.generator = this.run();
    }

    public *run(): Generator {
        // Wait for the walk animation to finish
        yield* super.run();

        // If the pokemon is the leader, go down the stairs
        if (this.pokemon.isLeader) {
            this.turn.addAction(new GoDownStairsAction(this.pokemon, this.logic));
        }
    }
}
export class TrapAction extends WalkAction {
    public logic: DungeonLogic;

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, _trap: DungeonTile, logic: DungeonLogic) {
        super(pokemon, direction, push, logic);
        this.logic = logic;
        this.logMessage = `${pokemon.toString()} triggered a trap!`;
    }
}
export class ItemAction extends WalkAction {
    public item: DungeonItem;
    public logic: DungeonLogic;

    constructor(pokemon: DungeonPokemon, direction: Direction, push: boolean, item: DungeonItem, logic: DungeonLogic) {
        super(pokemon, direction, push, logic);
        this.item = item;
        this.logic = logic;
        this.logMessage = `${pokemon.toString()} picked up an item!`;
        this.generator = this.run();
    }

    public *promptUser() {
        // See if the item fits in the inventory
        const leftover = this.state.inventory.addStack(this.item.stack);
        // If it's null, a stack was leftover
        if (leftover === null)
            // Remove the stack from the floor
            return this.state.floor.removeItem(this.item);

        // Modify the item on the ground
        this.item.stack = leftover;
        // If the leader picked up the item, ask the player what to do
        if (!this.pokemon.isLeader)
            return this.item.discard();

        this.turn.addAction(new OpenItemMenuAction(this.item, this.logic));
    }

    public * run(): Generator {
        yield* super.run();

        // If it is a wild pokemon
        if (this.pokemon.inFormation) {
            if (this.item.isMoney) {
                this.state.inventory.addMoney(this.item.stack.amount);
                this.state.floor.removeItem(this.item);
                return;
            }
            // If the inventory is full
            if (this.item.isWanted) {
                yield* this.promptUser();
            }
        }
    }
}

export class MoveActionGroup extends TurnAction {
    public actions: WalkAction[];

    constructor(...moveActions: WalkAction[]) {
        super();
        this.actions = moveActions;
        this.generator = this.run();
    }

    public addAction(action: WalkAction) {
        this.actions.push(action);
    }

    public *run(): Generator {
        let allDone = true;
        do {
            allDone = true;
            for (let action of this.actions) {
                const done = action.tick();
                allDone &&= done;
            }
            yield;
        }
        while (!allDone);
    }
}