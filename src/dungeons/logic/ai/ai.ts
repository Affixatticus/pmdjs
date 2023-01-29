import { Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { Direction } from "../../../utils/direction";
import { V3, Vec2 } from "../../../utils/vectors";
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