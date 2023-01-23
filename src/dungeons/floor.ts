import { Scene } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { PokemonData, PokemonFormIdentifier } from "../data/pokemon";
import { Vec2 } from "../utils/vectors";
import { DungeonGenerator } from "./map/map_generator";
import { DungeonObjectGenerator } from "./objects/object_generator";
import { DungeonGrid } from "./map/grid";
import { DungeonMap } from "./map/map";
import { DungeonObjectContainer } from "./objects/object";
import { DungeonPokemon, DungeonPokemonList, DungeonPokemonType } from "./objects/pokemon";
import { DungeonStartup } from "./logic/startup";
import { Tile } from "../data/tiles";
import { AssetsLoader } from "../utils/assets_loader";
import { Direction } from "../utils/direction";
import { DungeonTile } from "./objects/tile";

export enum RenderingGroupId {
    WATER,
    FLOOR,
    WALL,
    ALWAYS_VISIBLE
};

/** 
 * Class that builds the map, pokemon and objects, and generally
 * handles the graphical part of the dungeon's map.
 */
export class DungeonFloor {
    /** The passed scene from DungeonState */
    private scene: Scene;
    /** The passed dungeon info from DungeonState */
    private info: DungeonFloorInfo;

    /** The map grid containing basic tile information */
    public grid!: DungeonGrid;
    /** The container for the graphical representation of the tiles */
    public map!: DungeonMap;
    /** The container for the objects on the floor */
    public objects!: DungeonObjectContainer;
    /** The container for the pokemon on the floor */
    public pokemon!: DungeonPokemonList;

    /** The species of the pokemon in the party */
    private partySpecies: PokemonFormIdentifier[] = [];

    constructor(scene: Scene, info: DungeonFloorInfo) {
        this.scene = scene;
        this.info = info;
    }

    // Generating and loading

    /** Function that fills out the `grid`, `object` attributes */
    public generate() {
        // Generate the dungeon
        const mapGenerator = new DungeonGenerator(this.info);
        // Generate the map
        this.grid = mapGenerator.generate();
        // Generate the objects
        const objectGenerator = new DungeonObjectGenerator(this.grid, this.info);
        // Generate the objects
        this.objects = new DungeonObjectContainer(objectGenerator.generate());
    }

    /** Function that places the party onto the dungeon floor */
    public generatePokemon(party: PokemonData[]) {
        // Gets all the party species
        this.partySpecies = party.map(p => p.id);
        // Generate the pokemon
        this.pokemon = new DungeonPokemonList();
        // Place the leader
        const leader = new DungeonPokemon(
            DungeonStartup.placeLeader(this), DungeonPokemonType.LEADER, party[0].id
        );
        this.pokemon.add(leader);
        // Place the partners
        party.forEach((p, i) => {
            if (i === 0) return;
            const partner = new DungeonPokemon(
                DungeonStartup.placePartner(this), DungeonPokemonType.PARTNER, p.id);
            this.pokemon.add(partner);
        });
    }

    /** Preloads the map's tiles and pokemon */
    public async init() {
        // Load the assets
        this.map = new DungeonMap(this.scene, this.info.path, this.grid);

        // Get the enemies
        const enemies = (
            // If the floor has enemies
            this.info.enemies ?
                [this.info.enemies.map(e =>
                    // Generic male non-shiny
                    AssetsLoader.loadPokemon(e.species, 0, false, 0))]
                // Else
                : []);

        await Promise.all(
            [
                // All the enemies
                ...enemies,
                ...this.partySpecies.map(e => AssetsLoader.loadPokemon(...e)),
                await this.map.preload()
            ]
        );
    }

    // Rendering

    public build(position: Vec2) {
        // Build the first screen of the map
        this.map.build(position);
        // Build all the objects
        this.objects.render(this.scene);
        // Build all the pokemon
        this.pokemon.render(this.scene);
    }

    /** Renders the first view of the map */
    public renderToScreen(position: Vec2) {
        this.map.buildView(position);
    }

    public update(tick: number) {
        this.map.animateTiles(tick / 5 | 0);
        this.pokemon.animate();
    }

    // Utility
    public findStairs(position: Vec2) {
        const stairs = this.objects.getStairs() as DungeonTile;
        if (!stairs?.isHidden) return true;
        // Find the stairs
        const viewArea = this.grid.getViewArea(position);
        if (viewArea.get(...stairs.position.xy) !== Tile.OUT_OF_BOUNDS) {
            stairs.isHidden = false;
            return true;
        }
        return false;
    }

    public getSpawnPosition(): Vec2 {
        return this.grid.getOpenPosition() ?? this.grid.getFreePosition() ?? this.grid.getRandomPosition();
    }

    /** If a tile cannot possibly be occupied by this pokemon */
    public isObstacle(x: number, y: number, pokemon: DungeonPokemon): boolean {
        const OBSTACLES = [
            Tile.WALL,
            Tile.UNBREAKABLE_WALL,
            Tile.WATER,
        ];

        return OBSTACLES.includes(this.grid.get(x, y));
    }

    /** If this tile cannot be traversed by this pokemon while walking diagonally */
    public isUntraversable(x: number, y: number, pokemon: DungeonPokemon): boolean {
        const UNPASSABLE = [
            Tile.WALL,
            Tile.UNBREAKABLE_WALL,
        ];

        return UNPASSABLE.includes(this.grid.get(x, y));
    }

    public canMoveTowards(pokemon: DungeonPokemon, dir: Direction): boolean {
        const position = pokemon.position;
        const nextPosition = position.add(dir.toVector());

        // Check if the position in the grid is usable for this pokemon
        if (this.isObstacle(nextPosition.x, nextPosition.y, pokemon)) return false;

        // If the pokemon is moving diagonally, check if the two adjacent tiles are free
        if (dir.isDiagonal()) {
            // Check the two adjacent tiles
            if (this.isUntraversable(position.x + dir.horizontal, position.y, pokemon)) return false;
            if (this.isUntraversable(position.x, position.y + dir.vertical, pokemon)) return false;
        }

        // Check if no pokemon will occupy this position
        if (this.pokemon.getAll().some(p => p.nextTurnPosition.equals(nextPosition))) return false;

        return true;
    }
}