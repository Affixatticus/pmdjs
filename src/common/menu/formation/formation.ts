import { Pokemon } from "./pokemon";

export class FormationTeam {
    public pokemon: Pokemon[] = [];

    public get leader() {
        return this.pokemon[0];
    }

    constructor(...pokemon: Pokemon[]) {
        this.pokemon = pokemon;
    }
}

/** Formation is intended as the list of teams the player composed.
 * + It contains the references to all the active pokemon in the dungeon.
 */
export class Formation {
    public activeTeam: number;
    public teams: FormationTeam[];

    public get team() {
        return this.teams[this.activeTeam];
    }

    constructor() {
        this.teams = [];
        this.activeTeam = 0;
    }

    public store() {

    }
    public load() {

    }
}