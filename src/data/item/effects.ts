import { DungeonPokemon } from "../../dungeons/objects/dungeon_pokemon";

export function Effect_RestoreHP(restored: number): (pokemon: DungeonPokemon) => void {
    return (pokemon: DungeonPokemon) => {
        console.log(`Restored ${restored} HP to ${pokemon}!`)
    };
}
export function Effect_RestoreBelly(restored: number): (pokemon: DungeonPokemon) => void {
    return (pokemon: DungeonPokemon) => {
        console.log(`Restored ${restored} belly to ${pokemon}!`)
    };
}