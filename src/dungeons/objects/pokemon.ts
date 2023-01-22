import { Mesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { PokemonFormIdentifier } from "../../data/pokemon";
import { Tile } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { Direction } from "../../utils/direction";
import { V3, Vec2 } from "../../utils/vectors";
import { RenderingGroupId } from "../floor";
import { DungeonPokemonAI } from "../logic/ai/ai";
import { DungeonPokemonMaterial } from "./sprite";

export const enum DungeonPokemonType {
    LEADER,
    PARTNER,
    ENEMY,
    BOSS
};

export class DungeonPokemon {
    private _position: Vec2;
    private _spritePosition: Vec2;
    private _direction: Direction;
    public type: DungeonPokemonType;
    public id: PokemonFormIdentifier;
    public ai!: DungeonPokemonAI;

    /** Turn calculation components */
    public nextTurnPosition!: Vec2;
    public nextTurnDirection!: Direction;

    private opaqMesh!: Mesh;
    private tranMesh!: Mesh;
    public material!: DungeonPokemonMaterial;


    constructor(pos: Vec2, type: DungeonPokemonType, id: PokemonFormIdentifier) {
        this.type = type;
        this.id = id;
        /** Create the AI */
        this._position = pos;
        this._spritePosition = pos;
        this._direction = Direction.SOUTH;

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
        opaqMesh.renderingGroupId = RenderingGroupId.WALL;
        opaqMesh.rotate(Vector3.Right(), Math.PI / 3);

        const material = new DungeonPokemonMaterial(data, scene);
        material.init("Idle", this._direction);
        this.material = material;
        this.opaqMesh = opaqMesh;
        opaqMesh.material = this.material;

        const tranMesh = opaqMesh.clone("pokemon-tran");
        tranMesh.renderingGroupId = RenderingGroupId.ALWAYS_VISIBLE;
        tranMesh.visibility = 0.5;
        this.tranMesh = tranMesh;
    }

    public animate() {
        if (!this.material) return;
        this.material.animate();
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

    public get spritePosition() {
        return this._spritePosition;
    }

    public set spritePosition(pos: Vec2) {
        this._spritePosition = pos;
        this.opaqMesh.position = this._spritePosition.gameFormat.add(V3(0.5, 0, -0.5));
        this.tranMesh.position = this._spritePosition.gameFormat.add(V3(0.5, 0, -0.5));
    }

    public set position(pos: Vec2) {
        this._position = pos;
        this.spritePosition = pos;
    }

    public get direction() {
        return this._direction;
    }

    public set direction(dir: Direction) {
        this._direction = dir;
        this.nextTurnDirection = dir;
        this.material?.setDirection(dir);
    }

    /** Makes a single turn that gets the direction closer to the target */
    public turnTowards(dir: Direction) {
        this.direction = this.direction.getNextClosest(dir);
    }

    public setAnimation(animName: string) {
        if (!this.material) return;
        if (animName === this.material.animation) return;
        this.material.setAnimation(animName);
    }

    public resetAnimation(animName: string) {
        if (!this.material) return;
        this.material.setAnimation(animName);
    }

    /** TODO: Implement this to work with types 
     * Returns true if this pokemon can pass over the specified tile */
    public specialWalkable(_tile: Tile): boolean {
        return false;
    }
}

export class DungeonPokemonList {
    public objects: DungeonPokemon[];

    public constructor() {
        this.objects = [];
    }

    public getLeader(): DungeonPokemon {
        return this.objects.find(obj => obj.type === DungeonPokemonType.LEADER) as DungeonPokemon;
    }

    public getPartners() {
        return this.objects.filter(obj => obj.type === DungeonPokemonType.PARTNER);
    }

    public getAll() {
        return this.objects;
    }

    public render(scene: Scene) {
        for (const obj of this.objects) {
            obj.addToScene(scene);
        }
    }

    public animate() {
        for (const obj of this.objects) {
            obj.animate();
        }
    }

    public sort() {
        this.objects.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
    }

    public get(x: number, y: number): DungeonPokemon | undefined {
        return this.objects.find(obj => obj.position.x === x && obj.position.y === y);
    }

    public add(obj: DungeonPokemon) {
        this.objects.push(obj);
        this.sort();
    }
}