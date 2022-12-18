import { Scene } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { PokemonData, PokemonFormIdentifier } from "../data/pokemon";
import { V2, Vec2 } from "../utils/vectors";
import { DungeonGenerator } from "./map/map_generator";
import { DungeonObjectGenerator } from "./objects/object_generator";
import { DungeonGrid } from "./map/grid";
import { DungeonMap } from "./map/scene";
import { DungeonObjectContainer } from "./objects/object";
import { DungeonPokemon, DungeonPokemonList, PokemonTypes } from "./objects/pokemon";

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
    private party: PokemonFormIdentifier[] = [];

    public grid!: DungeonGrid;
    public map!: DungeonMap;
    public objects!: DungeonObjectContainer;
    public pokemon!: DungeonPokemonList;


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
        this.party = party.map(p => p.id);

        // Generate the pokemon
        this.pokemon = new DungeonPokemonList();

        // Add the party to the scene
        for (const pokemon of party) {
            this.pokemon.add(
                new DungeonPokemon(
                    this.getSpawnPosition() ?? V2(0, 0),
                    PokemonTypes.PARTNER,
                    pokemon.id,
                ));
        };
    }

    /** Loads the tiles */
    public async preloadAssets() {
        // Load the assets
        this.map = new DungeonMap(this.scene, this.info.path, this.grid);
        await this.map.preload();

        // Load the pokemon
        // const start = performance.now();
        // Preload the pokemon
        // await Promise.all(
        //     [
        //         ...(this.info.enemies ? [this.info.enemies.map(e => AssetsLoader.loadPokemon(e.species, 0, false, 0))] : []),
        //         ...this.party.map(e => AssetsLoader.loadPokemon(...e)),
        //     ]
        // );
        // console.log(AssetsLoader.pokemon);
        // console.log(`-> Loaded ${this.info?.enemies?.length ?? 0 + this.party.length} pokemon in ${performance.now() - start}ms`);
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
        this.pokemon.animate(tick / 4 | 0);
    }

    // Utility
    public getSpawnPosition(): Vec2 {
        return this.grid.getOpenPosition() ?? this.grid.getFreePosition() ?? this.grid.getRandomPosition();
    }
}