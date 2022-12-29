import { Scene } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { PokemonData, PokemonFormIdentifier, PokemonForms } from "../data/pokemon";
import { Vec2 } from "../utils/vectors";
import { DungeonGenerator } from "./map/map_generator";
import { DungeonObjectGenerator } from "./objects/object_generator";
import { DungeonGrid } from "./map/grid";
import { DungeonMap } from "./map/scene";
import { DungeonObjectContainer } from "./objects/object";
import { DungeonPokemon, DungeonPokemonList, PokemonTypes } from "./objects/pokemon";
import { DungeonStartup } from "./logic/startup";
import { Tiles } from "../data/tiles";
import { AssetsLoader } from "../utils/assets_loader";
import { Directions } from "../utils/direction";

export enum TileRenderingGroupIds {
    WATER,
    FLOOR,
    WALL,
    ALWAYS_VISIBLE
};

/** Class that builds the structure of the dungeon */
export class DungeonFloor {
    private scene: Scene;
    private info: DungeonFloorInfo;

    public grid!: DungeonGrid;
    public map!: DungeonMap;
    public objects!: DungeonObjectContainer;
    public pokemon!: DungeonPokemonList;
    private partySpecies: PokemonFormIdentifier[] = [];

    constructor(scene: Scene, info: DungeonFloorInfo) {
        this.scene = scene;
        this.info = info;
    }

    // Generating and loading

    public generate() {
        // Generate the dungeon
        const mapGenerator = new DungeonGenerator(this.info);

        // Generate the map
        this.grid = mapGenerator.generate();

        // Generate the objects
        const objectGenerator = new DungeonObjectGenerator(this.grid, this.info);

        this.objects = new DungeonObjectContainer(objectGenerator.generate());
    }

    public generatePokemon(party: PokemonData[]) {
        this.partySpecies = party.map(p => p.id);

        // Generate the pokemon
        this.pokemon = new DungeonPokemonList();

        // Place the leader
        this.pokemon.add(new DungeonPokemon(DungeonStartup.placeLeader(this), PokemonTypes.LEADER, party[0].id));

        // Place the partners
        party.forEach((p, i) => {
            if (i > 0) {
                this.pokemon.add(new DungeonPokemon(DungeonStartup.placePartner(this), PokemonTypes.PARTNER, p.id));
            }
        })
    }

    /** Loads the tiles */
    public async preloadAssets() {
        // Load the assets
        this.map = new DungeonMap(this.scene, this.info.path, this.grid);
        await this.map.preload();

        const start = performance.now();
        await Promise.all(
            [
                ...(this.info.enemies ? [this.info.enemies.map(e => AssetsLoader.loadPokemon(e.species, 0, false, 0))] : []),
                ...this.partySpecies.map(e => AssetsLoader.loadPokemon(...e)),
            ]
        );
        console.log(`-> Loaded ${this.info?.enemies?.length ?? 0 + this.partySpecies.length} pokemon in ${performance.now() - start}ms`);
    }

    // Rendering

    public build(position: Vec2) {
        // Build the first screen of the map
        this.map.build(position);
        // Build all the objects
        this.objects.render(this.scene);

        this.pokemon.render(this.scene);
    }

    /** Renders the first view of the map */
    public renderToScreen(position: Vec2) {
        this.map.buildView(position);
    }

    public update(tick: number) {
        this.map.animateTiles(tick / 5 | 0);
        this.pokemon.animate(tick / 3 | 0);
    }

    // Utility
    public getSpawnPosition(): Vec2 {
        return this.grid.getOpenPosition() ?? this.grid.getFreePosition() ?? this.grid.getRandomPosition();
    }

    public isObstacle(x: number, y: number, pokemon: DungeonPokemon): boolean {
        const OBSTACLES = [
            Tiles.WALL,
            Tiles.UNBREAKABLE_WALL,
        ];

        return OBSTACLES.includes(this.grid.get(x, y));
    }

    public canMoveTowards(pokemon: DungeonPokemon, dir: Directions): boolean {
        const pos = pokemon.position.add(dir.toVector());

        // Check if the position in the grid is usable for this pokemon
        if (this.isObstacle(pos.x, pos.y, pokemon)) return false;

        // Check if no pokemon will occupy this position
        if (this.pokemon.getAll().some(p => p.nextTurnPosition.equals(pos))) return false;

        return true;
    }
}