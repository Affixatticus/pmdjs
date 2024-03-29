import Random from "../../utils/random";
import { Vec2 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";

export class DungeonStartup {
    static leaderPosition: Vec2;
    static partnerPositions: Vec2[];

    static getStartingLeaderPosition() {
        return this.leaderPosition;
    }

    /** Find the position for the leader */
    static placeLeader(floor: DungeonFloor): Vec2 {
        return (this.leaderPosition = floor.getSpawnPosition());
    }

    static placePartner(floor: DungeonFloor): Vec2 {
        // Find a suitable position around the player
        this.partnerPositions = [];
        for (const [pos, _] of floor.grid.getNeighborsPositions(...this.leaderPosition.xy)) {
            this.partnerPositions.push(pos);
        }

        // Get the partner position
        return Random.pick(this.partnerPositions);
    }
}