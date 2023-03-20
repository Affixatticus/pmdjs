import { Pokemon } from "./pokemon";

export class FormationTeam {
    public pokemon: Pokemon[] = [];

    public get leader() {
        return this.pokemon[0];
    }

    public get partners() {
        return this.pokemon.slice(1);
    }

    constructor(...pokemon: Pokemon[]) {
        this.pokemon = pokemon;
    }
}