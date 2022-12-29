import Random from "../../utils/random";
import { V2, Vec2 } from "../../utils/vectors";
import { DungeonFloor } from "../floor";

export class DungeonStartup {
    private static leaderPosition: Vec2;
    private static partnerPositions: Vec2[];

    private static pickedPositions: Vec2[];

    static getStartingLeaderPosition() {
        return this.leaderPosition;
    }

    /** Find the position for the leader */
    static placeLeader(floor: DungeonFloor): Vec2 {
        return (this.leaderPosition = floor.getSpawnPosition());
    }

    static placePartner(floor: DungeonFloor): Vec2 {
        // Find a suitable position around the player
        if (!this.partnerPositions) {
            this.partnerPositions = [];
            for (const [pos, _] of floor.grid.getNeighborsPositions(...this.leaderPosition.xy)) {
                this.partnerPositions.push(pos);
            }
        }

        // Get the partner position
        return Random.pick(this.partnerPositions);
    }
}