import { GroundMesh, InstancedMesh, MeshBuilder, Scene } from "@babylonjs/core";
import { getTileCrop, TileObject } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { DungeonPokemon } from "../objects/pokemon";
import { TileMaterial } from "../objects/tile";
import { DungeonFloor, RenderingGroupId } from "../floor";
import { Direction } from "../../utils/direction";
import { V3, Vec2 } from "../../utils/vectors";

export class FloorGuide {
    private scene: Scene;
    private floor!: DungeonFloor;
    private pokemon!: DungeonPokemon;

    private texture!: HTMLImageElement;

    private whiteGuide!: GroundMesh;
    private blackGuide!: GroundMesh;
    private whiteGuideInstances: InstancedMesh[] = [];
    private blackGuideInstances: InstancedMesh[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public async init(floor: DungeonFloor, pokemon: DungeonPokemon) {
        this.floor = floor;
        this.pokemon = pokemon;
        this.texture = await AssetsLoader.loadTileSheet();

        // Create the white mesh
        if (!this.whiteGuide) {
            this.whiteGuide = MeshBuilder.CreateGround("floor_guide", {
                width: 1, height: 1, subdivisions: 1
            }, this.scene);
            const whiteMaterial = new TileMaterial("trap", this.texture,
                this.scene, ...getTileCrop(TileObject.WHITE_GUIDE));
            this.whiteGuide.material = whiteMaterial;
            this.whiteGuide.renderingGroupId = RenderingGroupId.FLOOR;
        }

        // Create the black mesh
        if (!this.blackGuide) {
            this.blackGuide = MeshBuilder.CreateGround("floor_guide", {
                width: 1,
                height: 1,
                subdivisions: 1
            }, this.scene);
            const blackMaterial = new TileMaterial("trap", this.texture,
                this.scene, ...getTileCrop(TileObject.BLACK_GUIDE));
            this.blackGuide.material = blackMaterial;
            this.blackGuide.renderingGroupId = RenderingGroupId.FLOOR;
        }
    }

    public instanceBlack(pos: Vec2) {
        const instance = this.blackGuide.createInstance(pos.x + "," + pos.y);
        instance.position = V3(...pos.move(0.5).gameFormat.add(V3(0, 0.01, 0)).xyz);
        this.blackGuideInstances.push(instance);
    }
    public instanceWhite(pos: Vec2) {
        const instance = this.whiteGuide.createInstance(pos.x + "," + pos.y);
        instance.position = V3(...pos.move(0.5).gameFormat.add(V3(0, 0.02, 0)).xyz);
        this.whiteGuideInstances.push(instance);
    }

    public update(direction: Direction = this.pokemon.direction) {
        // Delete all guides
        this.hide();

        // Get the visible area of the pokemon
        const actionArea = this.floor.getActionArea(this.pokemon.position);

        // Place the guides
        let position = this.pokemon.position.clone();
        for (let i = 0; i < 10; i++) {
            position.addInPlace(direction.toVector());
            if (actionArea.get(...position.xy) === -1) break;
            actionArea.set(...position.xy, 2);
        }

        // Remove hidden points
        actionArea.hideOccupiedPositions(this.floor);

        // Loop through the view area and create instances
        for (const [pos, tile] of actionArea) {
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

    public dispose() {
        this.whiteGuide.dispose();
        this.blackGuide.dispose();
    }
}