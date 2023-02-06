import { DungeonFloorInfo } from "../../data/dungeons";
import { PokemonChance } from "../../data/pokemon";
import { Tile } from "../../data/tiles";
import Random from "../../utils/random";
import { Vec2 } from "../../utils/vectors";
import { DungeonGrid } from "../map/grid";
import { DungeonPokemon, DungeonPokemonType } from "./pokemon";

export class DungeonEnemyGenerator {
    private grid: DungeonGrid;
    private enemiesChances!: PokemonChance[] | null;

    constructor(grid: DungeonGrid, info: DungeonFloorInfo) {
        this.grid = grid;
        this.enemiesChances = this.extractEnemyChances(info.enemies);
    }

    private getRandomEnemy(): PokemonChance {
        const rand = Random.float(1);

        for (const enemy of this.enemiesChances!) {
            if (rand < enemy.chance)
                return enemy;
        }

        throw new Error('No enemy was chosen');
    }

    private findEnemySpawns(): Vec2[] {
        // Find a list of suitable positions for the enemies
        const spawns = this.grid.getFilteredPositions((t) => t === Tile.FLOOR);
        // Pick a random number of enemies
        const numEnemies = Random.int(0);
        // Pick random positions for the enemies
        return Random.shuffle(spawns).splice(0, numEnemies);
    }

    public generate(): DungeonPokemon[] {
        if (!this.enemiesChances) return [];

        const enemies: DungeonPokemon[] = [];
        const spawns = this.findEnemySpawns();
        for (const spawn of spawns) {
            const enemy = new DungeonPokemon(
                spawn, DungeonPokemonType.ENEMY, [this.getRandomEnemy().species, 0, false, 0]
            );
            enemies.push(enemy);
        }

        return enemies;
    }

    private extractEnemyChances(enemies: PokemonChance[] | null) {
        if (!enemies) return [];

        const chances: PokemonChance[] = [];

        let chance = 0;
        for (const enemy of enemies) {
            chance += enemy.chance;
            chances.push({ ...enemy, chance });
        }

        // Update the chances so that the maximum chance is 1
        for (let i = 0; i < chances.length; i++) {
            const enemy = chances[i];
            chances[i] = { ...enemy, chance: enemy.chance / chances[chances.length - 1].chance };
        }

        return chances;
    }
}