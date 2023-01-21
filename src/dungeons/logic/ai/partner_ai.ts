import { Directions } from "../../../utils/direction";
import { DungeonFloor } from "../../floor";
import { DungeonPokemon } from "../../objects/pokemon";
import { TurnAction } from "../actions/action";
import { NilAction } from "../actions/nil";
import { WalkAction } from "../actions/walk";
import { DungeonPokemonAI } from "./ai";

export class DungeonPokemonPartnerAI extends DungeonPokemonAI {
    constructor(pokemon: DungeonPokemon, floor: DungeonFloor) {
        super(pokemon, floor);
    }

    public calculateNextAction(): TurnAction {
        if (this.overwrittenAction) return this.overwrittenAction;

        // Get the leader's position
        const leader = this.floor.pokemon.getLeader();
        const targetPosition = leader.position;

        // Get the closest direction to the leader
        let minDist = Infinity;
        let closestDir = Directions.NONE;
        for (const dir of Directions.ALL) {
            const newPos = this.pokemon.position.add(dir.toVector());
            const dist = newPos.dist(targetPosition);
            // Skip if you cannot move there
            if (!this.floor.canMoveTowards(this.pokemon, dir)) continue;

            if (dist < minDist) {
                minDist = dist;
                closestDir = dir;
            }
        }

        if (closestDir === Directions.NONE) {
            return new NilAction(this.pokemon);
        }

        return new WalkAction(this.pokemon, closestDir);


        // // Get the previous partner
        // const partners = this.floor.pokemon.getPartners();
        // // Get the index of this pokemon
        // const index = partners.indexOf(this.pokemon);
        // // Get the previous partner
        // let prevPartner = this.floor.pokemon.getLeader();
        // if (index > 0) {
        //     prevPartner = partners[index - 1];
        // }
        // const toFollow = prevPartner;
        // const targetDir = toFollow.nextTurnDirection;
        // const target = toFollow.nextTurnPosition;

        // // If the player is within the 3x3 with you at the center, do not move
        // if (this.pokemon.position.dist(target) <= 1.5) {
        //     // If you have a wall in any of your diagonal directions, move towards the player
        //     if (this.floor.canMoveTowards(toFollow, Directions.NORTH_EAST) &&
        //         this.floor.canMoveTowards(toFollow, Directions.NORTH_WEST) &&
        //         this.floor.canMoveTowards(toFollow, Directions.SOUTH_WEST) &&
        //         this.floor.canMoveTowards(toFollow, Directions.SOUTH_EAST)
        //     ) {
        //         console.log("Can move in all directions")
        //         return new NilAction(this.pokemon);
        //     }

        // }

        // // Calculate all the possible directions and pick the one that is closest to the target
        // //                     The score given to staying still
        // let minScore: number = this.pokemon.position.dist(target);
        // let closestDir: Directions = Directions.NONE;

        // for (const dir of Directions.ALL) {
        //     const newPos = this.pokemon.position.add(dir.toVector());

        //     // Calculate the distance score
        //     let score = newPos.dist(target);
        //     // Add a preference for the direction that brings it inline with the target
        //     if (newPos.x === target.x) score -= 0.5;
        //     if (newPos.y === target.y) score -= 0.5;
        //     // If the position ends up being in front of the target, add a penalty
        //     if (target.add(targetDir.toVector()).equals(newPos)) score += 1;

        //     // If the new position would be the target, you are close enough
        //     if (newPos.equals(target)) continue;

        //     if (score < minScore) {
        //         // Check if the new position is valid
        //         if (!this.floor.canMoveTowards(this.pokemon, dir)) continue;

        //         minScore = score;
        //         closestDir = dir;
        //     }
        // }

        // if (closestDir === Directions.NONE) {
        //     // If no valid position was found, do nothing
        //     return new NilAction(this.pokemon);
        // }

        // // If the pokemon is not close enough, move towards the target
        // return new WalkAction(this.pokemon, closestDir);
    }
}