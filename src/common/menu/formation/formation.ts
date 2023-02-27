import { Pokemon } from "./pokemon";
import { FormationTeam } from "./team";
import { DungeonTeamOverlay } from "./team_overlay";

/** Formation is intended as the list of teams the player composed.
 * + It contains the references to all the active pokemon in the dungeon.
 */
export class Formation {
    public activeTeam: number;
    public teams: FormationTeam[];
    public overlay: DungeonTeamOverlay;

    /** Returns the currently active team */
    public get team() {
        return this.teams[this.activeTeam];
    }

    public newTeam(...pokemon: Pokemon[]) {
        this.teams[this.activeTeam] = new FormationTeam(...pokemon);
        this.overlay.update(this.team);
    }

    constructor() {
        this.teams = [];
        this.activeTeam = 0;
        this.overlay = new DungeonTeamOverlay(this.team);
    }

    public store() {

    }
    public load() {

    }
}