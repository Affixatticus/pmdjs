import { Mesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { PokemonFormIdentifier } from "../../data/pokemon";
import { AssetsLoader } from "../../utils/assets_loader";
import { Directions } from "../../utils/direction";
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

export class DungeonPokemon {
    public _position: Vec2;
    public _direction: Directions;
    public type: PokemonTypes;
    public id: PokemonFormIdentifier;

    /** Turn calculation components */
    public nextTurnPosition!: Vec2;
    public nextTurnDirection!: Directions;
    public keepWalking: boolean = false;

    private opaqMesh!: Mesh;
    private tranMesh!: Mesh;
    public material!: DungeonPokemonMaterial;


    constructor(pos: Vec2, type: PokemonTypes, id: PokemonFormIdentifier) {
        this.type = type;
        this.id = id;
        this._position = pos;
        this._direction = Directions.SOUTH;

        this.nextTurnPosition = pos.clone();
        this.nextTurnDirection = this._direction;
    }

    public async addToScene(scene: Scene) {
        // Create the material
        const data = await AssetsLoader.loadPokemon(...this.id);

        if (data === undefined) {
            throw new Error(`Pokemon ${this.id} not found`);
        }

        const opaqMesh = MeshBuilder.CreatePlane("pokemon", {
            width: 1,
            height: 1,
        }, scene);

        opaqMesh.position = this._position.gameFormat.add(V3(0.5, 0, -0.5));

        opaqMesh.scalingDeterminant = 8;
        opaqMesh.renderingGroupId = TileRenderingGroupIds.WALL;
        opaqMesh.rotate(Vector3.Right(), Math.PI / 3);

        const material = new DungeonPokemonMaterial(data, scene);
        material.init("Idle", this._direction);
        this.material = material;
        this.opaqMesh = opaqMesh;
        opaqMesh.material = this.material;

        const tranMesh = opaqMesh.clone("pokemon-tran");
        tranMesh.renderingGroupId = TileRenderingGroupIds.ALWAYS_VISIBLE;
        tranMesh.visibility = 0.5;
        this.tranMesh = tranMesh;
    }

    public animate(tick: number) {
        if (!this.material) return;
        this.material.animate(tick);
    }

    public dispose = () => {
        this.opaqMesh.dispose();
        this.tranMesh.dispose();
        this.material.dispose();
    };

    // Getters and setters
    public get position() {
        return this._position;
    }

    public set position(pos: Vec2) {
        this._position = pos;
        this.opaqMesh.position = pos.gameFormat.add(V3(0.5, 0, -0.5));
        this.tranMesh.position = pos.gameFormat.add(V3(0.5, 0, -0.5));
    }

    public get direction() {
        return this._direction;
    }

    public set direction(dir: Directions) {
        this._direction = dir;
        this.nextTurnDirection = dir;
        this.material?.setDirection(dir);
    }

    /** Makes a single turn that gets the direction closer to the target */
    public turnTowards(dir: Directions) {
        this.direction = this.direction.getNextClosest(dir);
    }

    public setAnimation(animName: string) {
        if (!this.material) return;

        if (animName === this.material.animation) return;
        this.material.setAnimation(animName);
    }
}

export class DungeonPokemonList {
    public objects: DungeonPokemon[];

    public constructor() {
        this.objects = [];
    }

    public getLeader(): DungeonPokemon {
        return this.objects.find(obj => obj.type === PokemonTypes.LEADER) as DungeonPokemon;
    }

    public getPartners() {
        return this.objects.filter(obj => obj.type === PokemonTypes.PARTNER);
    }

    public getAll() {
        return this.objects;
    }

    public render(scene: Scene) {
        for (const obj of this.objects) {
            obj.addToScene(scene);
        }
    }

    public animate(tick: number) {
        for (const obj of this.objects) {
            obj.animate(tick);
        }
    }

    public sort() {
        this.objects.sort((a, b) => a._position.x - b._position.x || a._position.y - b._position.y);
    }

    public get(x: number, y: number): DungeonPokemon | undefined {
        return this.objects.find(obj => obj._position.x === x && obj._position.y === y);
    }

    public add(obj: DungeonPokemon) {
        this.objects.push(obj);
        this.sort();
    }
}