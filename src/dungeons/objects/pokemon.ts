import { MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { PokemonId } from "../../data/pokemon";
import { AssetsLoader } from "../../utils/assets_loader";
import Random from "../../utils/random";
import { V3, Vec2 } from "../../utils/vectors";
import { TileRenderingGroupIds } from "../floor";
import { DungeonPokemonMaterial } from "./sprite";

export const enum PokemonTypes {
    LEADER,
    PARTNER,
    ENEMY,
    BOSS
};

export enum Directions {
    SOUTH,
    SOUTH_EAST,
    EAST,
    NORTH_EAST,
    NORTH,
    NORTH_WEST,
    WEST,
    SOUTH_WEST
};

export class DungeonPokemon {
    public pos: Vec2;
    public type: PokemonTypes;
    public id: PokemonId;
    public direction: Directions;

    private material!: DungeonPokemonMaterial;

    constructor(pos: Vec2, type: PokemonTypes, id: PokemonId) {
        this.pos = pos;
        this.type = type;
        this.id = id;
        this.direction = Directions.SOUTH;
    }

    public async render(scene: Scene) {
        // Create the material
        const data = await AssetsLoader.loadPokemon(...this.id);
        if (data === undefined) {
            throw new Error(`Pokemon ${this.id} not found`);
        }

        const mesh = MeshBuilder.CreatePlane("pokemon", {
            width: 1,
            height: 1,
        }, scene);

        mesh.position = this.pos.gameFormat.subtract(V3(0.5, 0, 0.5));

        mesh.scalingDeterminant = 8;
        mesh.renderingGroupId = TileRenderingGroupIds.WALL;
        mesh.rotate(Vector3.Right(), Math.PI / 4);

        const material = new DungeonPokemonMaterial(data, scene);
        material.init("Idle", Random.int(8));

        this.material = material;
        mesh.material = this.material;
    }

    public animate(tick: number) {
        // Animate the pokemon once the material is loaded
        this.material?.animate(tick);
    }

    public dispose = () => true;
}

export class DungeonPokemonContainer {
    public objects: DungeonPokemon[];

    public constructor() {
        this.objects = [];
    }

    public getLeader() {
        return this.objects.find(obj => obj.type === PokemonTypes.LEADER);
    }

    public getPartners() {
        return this.objects.filter(obj => obj.type === PokemonTypes.PARTNER);
    }

    public render(scene: Scene) {
        for (const obj of this.objects) {
            obj.render(scene);
        }
    }

    public animate(tick: number) {
        for (const obj of this.objects) {
            obj.animate(tick);
        }
    }

    public sort() {
        this.objects.sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y);
    }

    public add(obj: DungeonPokemon) {
        this.objects.push(obj);
        this.sort();
    }
}