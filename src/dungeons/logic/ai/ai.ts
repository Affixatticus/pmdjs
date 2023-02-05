import { Direction } from "../../../utils/direction";
import Random from "../../../utils/random";
import { V2, Vec2 } from "../../../utils/vectors";
import { DungeonPokemon, Obstacle } from "../../objects/pokemon";
import { TurnAction } from "../actions/action";
import { NilAction } from "../actions/nil";
import { WalkAction } from "../actions/walk";
import { DungeonLogic } from "../logic";

export class DungeonPokemonAI {
    public pokemon: DungeonPokemon;
    public logic: DungeonLogic;
    public overwrittenAction: TurnAction | null;

    constructor(pokemon: DungeonPokemon, logic: DungeonLogic) {
        this.pokemon = pokemon;
        this.logic = logic;
        this.overwrittenAction = null;
    }

    public calculateNextAction(): TurnAction {
        if (this.overwrittenAction) return this.overwrittenAction;
        return new NilAction(this.pokemon);
    }
}

export class DungeonFollowAI {
    public pokemon: DungeonPokemon;
    public targetPokemon: DungeonPokemon;
    public logic: DungeonLogic;

    constructor(pokemon: DungeonPokemon, target: DungeonPokemon, logic: DungeonLogic) {
        this.pokemon = pokemon;
        this.targetPokemon = target;
        this.logic = logic;
    }

    public get position() {
        return this.pokemon.position;
    }

    public get target() {
        return this.targetPokemon.nextTurnPosition;
    }

    // Sets the follow ai's target
    public setTarget(target: DungeonPokemon) {
        this.targetPokemon = target;
    }

    public canSeeTarget(target: Vec2 = this.target) {
        const viewArea = this.logic.state.floor.getActionArea(this.position);
        if (viewArea.get(target) === 1) {
            return true;
        }
        return false;
    }

    public move(direction: Direction) {
        return WalkAction.getAction(this.pokemon, direction, false, this.logic);
    }

    public canMove(direction: Direction) {
        const obstacle = this.pokemon.canMoveTowards(direction, this.logic.state.floor);
        return obstacle === Obstacle.NONE || obstacle === Obstacle.LEADER;
    }

    public dontMove() {
        return new NilAction(this.pokemon);
    }

    // Calculates the next action
    public follow() {
        // Calculate the closest direction to the target
        const vector = this.target.subtract(this.pokemon.position).normalize();
        const direction = Direction.fromVector(vector);

        // If you've reached the target, don't move
        if (this.canMove(direction) && this.position.add(vector.round()).equals(this.target)) {
            return this.dontMove();
        }

        let target = this.target;

        // Get the latest visible target
        if (!this.canSeeTarget()) {
            for (let i = this.targetPokemon.lastVisitedPositions.length - 1; i >= 0; i--) {
                const latestTarget = this.targetPokemon.lastVisitedPositions[i];
                if (this.canSeeTarget(target)) {
                    target = latestTarget;
                }
            }
        }

        // If the target is to the left, to the direction
        if (this.canMove(direction)) {
            return this.move(direction);
        }
        else {
            const leftDir = direction.roll(-1);
            if (this.canMove(leftDir)) return this.move(leftDir);
            else {
                const rightDir = direction.roll(1);
                if (this.canMove(rightDir)) return this.move(rightDir);
            }
        }

        return this.dontMove();
    }
}

export class DungeonGoToAI {
    public pokemon: DungeonPokemon;
    public target: Vec2;
    public logic: DungeonLogic;

    constructor(pokemon: DungeonPokemon, target: Vec2, logic: DungeonLogic) {
        this.pokemon = pokemon;
        this.target = target;
        this.logic = logic;
    }

    public setTarget(target: Vec2) {
        this.target = target;
    }

    private dontMove() {
        return new NilAction(this.pokemon);
    }

    /** Tries to move in toward the specified position, and stays still if it can't */
    public goto() {
        const vector = this.target.subtract(this.pokemon.position).normalize();
        const direction = Direction.fromVector(vector);

        if (this.pokemon.position.equals(this.target)) {
            return this.dontMove();
        }

        if (this.pokemon.canMoveTowards(direction, this.logic.state.floor) === Obstacle.NONE) {
            return WalkAction.getAction(this.pokemon, direction, false, this.logic);
        }
        else {
            const leftDir = direction.roll(-1);
            if (this.pokemon.canMoveTowards(leftDir, this.logic.state.floor) === Obstacle.NONE) {
                return WalkAction.getAction(this.pokemon, leftDir, false, this.logic);
            }
            else {
                const rightDir = direction.roll(1);
                if (this.pokemon.canMoveTowards(rightDir, this.logic.state.floor) === Obstacle.NONE) {
                    return WalkAction.getAction(this.pokemon, rightDir, false, this.logic);
                }
            }
        }

        return this.dontMove();
    }
}

export class DungeonWanderAI {
    public pokemon: DungeonPokemon;
    public logic: DungeonLogic;
    public gotoAI: DungeonGoToAI;

    /** The direction to keep moving in while you are in a corridor */
    public direction: Direction = Direction.NONE;
    /** Whether in the last iteration you were in a corridor */
    public wasInCorridor: boolean = true;

    constructor(pokemon: DungeonPokemon, logic: DungeonLogic) {
        this.pokemon = pokemon;
        this.logic = logic;
        this.gotoAI = new DungeonGoToAI(pokemon, V2(0, 0), logic);
        const target = this.getRandomCorridor();
        this.gotoAI.setTarget(target);
    }

    public get floor() {
        return this.logic.state.floor;
    }
    public get grid() {
        return this.floor.grid;
    }

    public get position() {
        return this.pokemon.position;
    }

    public get inCorridor() {
        return this.grid.isCorridor(this.position, this.pokemon);
    }

    public move(direction: Direction) {
        return WalkAction.getAction(this.pokemon, direction, false, this.logic);
    }

    public canMove(direction: Direction) {
        const obstacle = this.pokemon.canMoveTowards(direction, this.logic.state.floor);
        return obstacle === Obstacle.NONE;
    }

    public dontMove() {
        return new NilAction(this.pokemon);
    }

    public getRandomCorridor() {
        const viewArea = this.floor.getActionArea(this.position);

        // Add all the corridors to a list
        const corridors: Vec2[] = [];
        for (const [pos, _] of viewArea) {
            const tile = this.grid.get(pos);
            if (this.grid.isCorridor(pos, this.pokemon) && !this.pokemon.isTileObstacle(tile)) {
                if (pos.dist(this.position) <= 1.5) continue;
                // Do not add the current position
                corridors.push(pos);
            }
        }

        // If there are no corridors, return V2(0, 0)
        if (corridors.length === 0) return V2(0, 0);
        // Otherwise, return a random corridor
        return Random.choose(corridors);
    }

    private getOpenSides() {
        let sides: Direction[] = [];
        for (const dir of Direction.CARDINAL) {
            if (!this.pokemon.isTileObstacle(this.grid.get(this.position.add(dir.toVector())))) sides.push(dir);
        }
        return sides;
    }

    /**
     * Calculates the next action
     * + If the pokemon just entered a room, it will move towards a random corridor
     * + If the pokemon is in a corridor, it will keep moving in the same direction
     * + If the pokemon is in a corridor, and hits a junction, it will choose a random direction
     * + If the pokemon is in a corridor, and hits a dead end, it will turn around and keep walking
     */
    public wander() {
        let output: TurnAction = this.dontMove();

        // If you were in a room
        if (!this.wasInCorridor) {
            // And you are still in a room
            if (!this.inCorridor) {
                // Keep moving towards a random corridor
                output = this.gotoAI.goto();
            }
            // And you entered a corridor
            else {
                // Set the direction to the current direction
                this.direction = this.pokemon.direction;
                this.gotoAI.setTarget(this.position.add(this.direction.toVector()));
                output = this.gotoAI.goto();
            }
        }
        // If you were in a corridor
        else {
            // And you are still in a corridor
            if (this.inCorridor) {
                // See if you are at a junction
                const openSides = this.getOpenSides();
                // If you cannot move towards the current direction, choose another one that isn't the opposite of the current direction
                if (!this.canMove(this.direction) && openSides.length > 1) {
                    // Choose a random direction
                    this.direction = Random.choose(openSides.filter(dir => dir !== this.direction.getOpposite()));
                } else if (openSides.length === 1) {
                    this.direction = this.pokemon.direction.getOpposite();
                }
                this.gotoAI.setTarget(this.position.add(this.direction.toVector()));
                output = this.gotoAI.goto();
            }
            // Or if you entered a room
            else {
                // Update the ai to choose a random corridor
                this.gotoAI.setTarget(this.getRandomCorridor());
                output = this.gotoAI.goto();
            }
        }

        // Update the corridor state
        this.wasInCorridor = this.inCorridor;

        return output;
    }
}