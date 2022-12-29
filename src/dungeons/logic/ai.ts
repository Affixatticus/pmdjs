import { Directions } from "../../utils/direction";
import { DungeonFloor } from "../floor";
import { DungeonPokemon, PokemonTypes } from "../objects/pokemon";
import { TurnAction } from "./actions/action";
import { WalkAction } from "./actions/walk";
import { NilAction } from "./actions/nil";

export class DungeonPokemonAI {
    private pokemon: DungeonPokemon;
    private floor: DungeonFloor;

    constructor(pokemon: DungeonPokemon, floor: DungeonFloor) {
        this.pokemon = pokemon;
        this.floor = floor;
    }

    private calculatePartnerAction(): TurnAction {
        const leader = this.floor.pokemon.getLeader()
        const targetDir = leader.nextTurnDirection;
        const target = leader.nextTurnPosition;

        // If the pokemon is already close enough, do nothing
        if (this.pokemon.position.dist(target) < 1) return new NilAction(this.pokemon);

        // Calculate all the possible directions and pick the one that is closest to the target
        //                     The score given to staying still
        let minScore: number = this.pokemon.position.dist(target);
        let closestDir: Directions = Directions.NONE;

        for (const dir of Directions.ALL) {
            const newPos = this.pokemon.position.add(dir.toVector());

            // Calculate the distance score
            let score = newPos.dist(target);
            // Add a preference for the direction that brings it inline with the target
            if (newPos.x === target.x) score -= 0.5;
            if (newPos.y === target.y) score -= 0.5;
            // If the position ends up being in front of the target, add a penalty
            if (target.add(targetDir.toVector()).equals(newPos)) score += 1;

            // If the new position would be the target, you are close enough
            if (newPos.equals(target)) continue;

            if (score < minScore) {
                // Check if the new position is valid
                if (!this.floor.canMoveTowards(this.pokemon, dir)) continue;

                minScore = score;
                closestDir = dir;
            }
        }

        if (closestDir === Directions.NONE) {
            // If no valid position was found, do nothing
            return new NilAction(this.pokemon);
        }

        // If the pokemon is not close enough, move towards the target
        return new WalkAction(this.pokemon, closestDir);
    }

    public calculateAction(): TurnAction {
        // Use a different AI based on the pokemon's type
        switch (this.pokemon.type) {
            // case PokemonTypes.ENEMY:
            //     return this.calculateEnemyAction();
            case PokemonTypes.PARTNER:
                return this.calculatePartnerAction();
            // case PokemonTypes.LEADER:
            //     return this.calculateLeaderAction();
            // case PokemonTypes.BOSS:
            //     return this.calculateBossAction();
        }

        return new NilAction(this.pokemon);
    }
} 