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