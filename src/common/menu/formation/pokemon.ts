import { PokemonFormIdentifier } from "../../../data/pokemon";

export class Pokemon {
    public id: PokemonFormIdentifier;
    
    constructor(id: PokemonFormIdentifier) {
        this.id = id;
    }
}