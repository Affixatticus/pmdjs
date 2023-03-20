import { Scene } from "@babylonjs/core";
import { DungeonFloorInfo } from "../data/dungeons";
import { PokemonFormIdentifier } from "../data/pokemon";
import { Vec2 } from "../utils/vectors";
import { DungeonGenerator } from "./map/map_generator";
import { DungeonObjectGenerator } from "./objects/object_generator";
import { DungeonGrid, OffsetGrid } from "./map/grid";
import { DungeonMap } from "./map/map";
import { DungeonObjectContainer } from "./objects/object";
import { DungeonPokemon, DungeonPokemonList, DungeonPokemonType } from "./objects/dungeon_pokemon";
import { DungeonStartup } from "./logic/startup";
import { Tile } from "../data/tiles";
import { AssetsLoader } from "../utils/assets_loader";
import { DungeonTile } from "./objects/tile";
import { DungeonEnemyGenerator } from "./objects/enemy_generator";
import { DungeonItem } from "./objects/item";
import { FormationTeam } from "../common/menu/formation/team";

export enum FloorRenderingLevels {
    /** The level that has the floor and water, the tiles and the items */
    GROUND,
    /** The level that displays above the floor, but below the entities and walls */
    INBETWEEN,
    /** The level that has entities and walls */
    WALLS,
    /** The level that is displayed above everything else */
    HIGHEST,
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

    /** Map of positions to actionAreas */
    public actionAreaPositions: Map<string, string> = new Map();
    /** List of actionAreas */
    public actionAreas: Record<string, OffsetGrid> = {};

    /** The species of the pokemon in the party */
    private partySpecies: PokemonFormIdentifier[] = [];

    constructor(scene: Scene, info: DungeonFloorInfo) {
        this.scene = scene;
        this.info = info;
    }

    // ANCHOR Generating and loading

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
    public generatePokemon(party: FormationTeam) {
        // Gets all the party species
        this.partySpecies = party.pokemon.map(p => p.id);
        // Generate the pokemon
        this.pokemon = new DungeonPokemonList();
        // Place the leader
        const leader = new DungeonPokemon(
            DungeonStartup.placeLeader(this), DungeonPokemonType.LEADER, party.leader
        );
        this.pokemon.add(leader);
        // Place the partners
        party.partners.forEach((pokemon) => {
            const partner = new DungeonPokemon(
                DungeonStartup.placePartner(this), DungeonPokemonType.PARTNER, pokemon);
            this.pokemon.add(partner);
        });
        // Place the enemies
        const enemyGenerator = new DungeonEnemyGenerator(this.grid, this.info);
        enemyGenerator.generate().forEach(e => this.pokemon.add(e));
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

    // ANCHOR Rendering

    public build(position: Vec2) {
        // Build the first screen of the map
        this.map.build(position);

        return Promise.all([
            // Build all the objects
            this.objects.render(this.scene),
            // Build all the pokemon
            this.pokemon.render(this.scene),
        ]);
    }

    /** Renders the first view of the map */
    public renderToScreen(position: Vec2) {
        this.map.buildView(position);
    }

    /** Real-time updates all its subcomponents */
    public animate(tick: number, isRunning: boolean) {
        this.map.animateTiles(tick / 5 | 0);
        this.pokemon.animate(isRunning);
    }

    /** Called by DungeonState every time it changes the floor */
    public onMapUpdate() {
        // Clear the cache
        this.actionAreaPositions.clear();
        this.actionAreas = {};
    }

    // ANCHOR Modifier functions
    public removeItem(item: DungeonItem) {
        this.objects.removeObject(item);
        this.grid.set(item.position, Tile.FLOOR);
    }

    // ANCHOR Getters

    /** Returns an offsetgrid that marks with 1 all the positions that a
     * pokemon in the given position can see or act upon
     */
    public getActionArea(position: Vec2): OffsetGrid {
        const posString = position.toString();
        // Check if the actionArea is already cached
        if (this.actionAreaPositions.has(posString)) {
            // Get a copy of the cached actionArea
            return this.actionAreas[this.actionAreaPositions.get(posString)!].copy();
        }
        // If the position is not cached, calculate the actionArea
        let actionArea = this.grid.getActionArea(position);

        const id = actionArea.hash();
        // Add the actionArea to the actionAreas
        this.actionAreas[id] = actionArea;
        // Add the position to the actionAreaPositions
        this.actionAreaPositions.set(posString, id);

        // Return a copy of the retrieved actionArea
        return actionArea.copy();
    }

    // Utility
    public findStairs(position: Vec2) {
        const stairs = this.objects.getStairs() as DungeonTile;
        if (!stairs?.isHidden) return true;
        // Find the stairs
        const viewArea = this.getActionArea(position);
        if (viewArea.get(stairs.position) !== Tile.OUT_OF_BOUNDS) {
            stairs.isHidden = false;
            return true;
        }
        return false;
    }

    public getSpawnPosition(): Vec2 {
        return this.grid.getOpenPosition() ?? this.grid.getFreePosition() ?? this.grid.getRandomPosition();
    }

    public dispose() {
        this.map.dispose();
        this.objects.dispose();
        this.pokemon.dispose();
    }
}