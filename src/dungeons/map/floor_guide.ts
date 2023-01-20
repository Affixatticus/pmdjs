import { Constants, GroundMesh, InstancedMesh, Material, Matrix, MeshBuilder, Scene } from "@babylonjs/core";
import { getTileCrop, TileObjects, Tiles } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { DungeonPokemon } from "../objects/pokemon";
import { DungeonGrid } from "./grid";
import { TileMaterial } from "../objects/tile";
import { DungeonFloor, TileRenderingGroupIds } from "../floor";
import { Directions } from "../../utils/direction";
import { V3, Vec2 } from "../../utils/vectors";

export class FloorGuide {
    private scene: Scene;
    private floor: DungeonFloor;
    private pokemon: DungeonPokemon;

    private whiteGuide!: GroundMesh;
    private blackGuide!: GroundMesh;
    private whiteGuideInstances: InstancedMesh[] = [];
    private blackGuideInstances: InstancedMesh[] = [];

    constructor(scene: Scene, floor: DungeonFloor, pokemon: DungeonPokemon) {
        this.floor = floor;
        this.pokemon = pokemon;
        this.scene = scene;
    }

    private get grid() {
        return this.floor.grid;
    }

    public async init() {
        const source = await AssetsLoader.loadTileSheet();

        // Create the white mesh
        this.whiteGuide = MeshBuilder.CreateGround("floor_guide", {
            width: 1, height: 1, subdivisions: 1
        }, this.scene);
        const whiteMaterial = new TileMaterial("trap", source,
            this.scene, ...getTileCrop(TileObjects.WHITE_GUIDE));
        this.whiteGuide.material = whiteMaterial;
        this.whiteGuide.renderingGroupId = TileRenderingGroupIds.FLOOR;

        // Create the black mesh
        this.blackGuide = MeshBuilder.CreateGround("floor_guide", {
            width: 1,
            height: 1,
            subdivisions: 1
        }, this.scene);
        const blackMaterial = new TileMaterial("trap", source,
            this.scene, ...getTileCrop(TileObjects.BLACK_GUIDE));
        this.blackGuide.material = blackMaterial;
        this.blackGuide.renderingGroupId = TileRenderingGroupIds.FLOOR;
    }

    public instanceBlack(pos: Vec2) {
        const instance = this.blackGuide.createInstance(pos.x + "," + pos.y);
        instance.position = V3(...pos.move(0.5).gameFormat.add(V3(0, 0.01, 0)).xyz);
        this.blackGuideInstances.push(instance);
    }
    public instanceWhite(pos: Vec2) {
        const instance = this.whiteGuide.createInstance(pos.x + "," + pos.y);
        instance.position = V3(...pos.move(0.5).gameFormat.add(V3(0, 0.01, 0)).xyz);
        this.whiteGuideInstances.push(instance);
    }

    public update(direction: Directions = this.pokemon.direction) {
        // Delete all guides
        this.hide();

        // Get the visible area of the pokemon
        const viewArea = this.grid.getViewArea(this.pokemon.position);


        const moveOffset = direction.toVector();
        let position = this.pokemon.position.clone();
        for (let i = 0; i < 10; i++) {
            position.addInPlace(moveOffset);
            if (viewArea.get(...position.xy) === -1) break;
            viewArea.set(...position.xy, 2);
        }
        // Get all the pokemon on the floor
        for (const pokemon of this.floor.pokemon.getAll()) {
            viewArea.set(...pokemon.position.xy, 0);
        }
        for (const object of this.floor.objects) {
            viewArea.set(...object.position.xy, 0);
        }

        // Loop through the view area and create instances
        for (const [pos, tile] of viewArea) {
            if (tile === 0) continue;
            if (tile === 1) this.instanceWhite(pos);
            if (tile === 2) this.instanceBlack(pos);
        }
    }

    public show() {
        this.update();
    }

    public hide() {
        // For all instances, remove them
        for (const instance of this.whiteGuideInstances) {
            instance.dispose();
        }
        this.whiteGuide.instances = [];
        for (const instance of this.blackGuideInstances) {
            instance.dispose();
        }
        this.blackGuide.instances = [];
    }
}