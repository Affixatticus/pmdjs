import { Mesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { PokemonFormIdentifier } from "../../data/pokemon";
import { Tile } from "../../data/tiles";
import { AssetsLoader } from "../../utils/assets_loader";
import { Direction } from "../../utils/direction";
import { V3, Vec2 } from "../../utils/vectors";
import { DungeonFloor, RenderingGroupId } from "../floor";
import { DungeonPokemonAI } from "../logic/ai/ai";
import { DungeonGrid } from "../map/grid";
import { DungeonPokemonMaterial } from "./sprite";

export const enum DungeonPokemonType {
    LEADER,
    PARTNER,
    ENEMY,
    BOSS
};

export enum Obstacle {
    NONE,
    LEADER,
    WALL,
    ENEMY,
    PARTNER,
    ITEM,
};


const TURNING_TICKS = 10;

export class DungeonPokemon {
    private _position: Vec2;
    private _spritePosition: Vec2;
    private _direction: Direction;
    public type: DungeonPokemonType;
    public id: PokemonFormIdentifier;
    public ai!: DungeonPokemonAI;

    public isLeader: boolean;
    public isPartner: boolean;
    public inFormation: boolean;

    public turningTick: number = 0;

    /** Turn calculation components */
    public nextTurnPosition!: Vec2;
    public nextTurnDirection!: Direction;

    private opaqMesh!: Mesh;
    private tranMesh!: Mesh;
    public material!: DungeonPokemonMaterial;

    static walkingTicks: number = 40;
    static _walkingAnimationSpeed: number = 1;
    static _runningAnimationSpeed: number = 40;
    private static _animationSpeed = DungeonPokemon._walkingAnimationSpeed;

    static get animationSpeed() {
        return this._animationSpeed;
    }
    static get isRunning() {
        return this._animationSpeed === this._runningAnimationSpeed;
    }
    static get isWalking() {
        return this._animationSpeed === this._walkingAnimationSpeed;
    }
    static setRunning(running: boolean) {
        this._animationSpeed = running ? this._runningAnimationSpeed : this._walkingAnimationSpeed;
    }


    constructor(pos: Vec2, type: DungeonPokemonType, id: PokemonFormIdentifier) {
        this.type = type;
        this.isLeader = type === DungeonPokemonType.LEADER;
        this.isPartner = type === DungeonPokemonType.PARTNER;
        this.inFormation = this.isLeader || this.isPartner;
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

        opaqMesh.scalingDeterminant = 7;
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

    public animate(goFast: boolean) {
        if (!this.material) return;
        this.material.animate(goFast);
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

    /** Action that slowly turns this pokemon towards the final direction
     * Returns true if the pokemon is facing the final direction
     */
    public animateTurning(finalDirection: Direction): boolean {
        if (this.turningTick < TURNING_TICKS) {
            this.turningTick++;
            return false;
        }
        this.turningTick = 0;
        this.turnTowards(finalDirection);
        return this.direction === finalDirection;
    }

    /** Returns true if this pokemon cannot stand on this tile */
    public isTileObstacle(tile: Tile): boolean {
        // If this pokemon cannot walk on water, then it's an obstacle
        const canWalkOnWater = false;
        if (!canWalkOnWater && tile === Tile.WATER) return true;
        return DungeonGrid.isObstacle(tile);
    }

    /** Returns true if this pokemon cannot walk around this tile */
    public isTileWalkable(tile: Tile): boolean {
        return DungeonGrid.isWalkable(tile);
    }

    /** Returns the obstacle that would block the pokemon from moving in the given direction */
    public canMoveTowards(dir: Direction, floor: DungeonFloor): Obstacle {
        const possiblePosition = this.position.add(dir.toVector());

        // If the pokemon is moving diagonally
        if (dir.isDiagonal()) {
            // If the tiles around the pokemon are not walkable, then it cannot move
            const oneSide = this.position.add(Direction.get(Direction.rollIndex(dir.index - 1)).toVector());
            const twoSide = this.position.add(Direction.get(Direction.rollIndex(dir.index + 1)).toVector());
            if (!this.isTileWalkable(floor.grid.get(oneSide)) || !this.isTileWalkable(floor.grid.get(twoSide))) {
                return Obstacle.WALL;
            }
        }

        // The tile to check if the pokemon can stand on
        const tile = floor.grid.get(possiblePosition);

        // If the tile is an obstacle, then return it
        if (this.isTileObstacle(tile)) {
            return Obstacle.WALL;
        }
        // If there is a pokemon on this tile, then return it
        const pokemon = floor.pokemon.getAll().find(p => p.nextTurnPosition.equals(possiblePosition));
        if (pokemon) {
            if (pokemon.type === DungeonPokemonType.ENEMY) return Obstacle.ENEMY;
            if (pokemon.type === DungeonPokemonType.PARTNER) return Obstacle.PARTNER;
        }
        // If there is an item on this tile, then return it
        if (floor.grid.get(possiblePosition) === Tile.ITEM) return Obstacle.ITEM;
        if (possiblePosition.equals(floor.pokemon.getLeader().position))
        return Obstacle.LEADER;
        return Obstacle.NONE;
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

    public getEnemies() {
        return this.objects.filter(obj => obj.type === DungeonPokemonType.ENEMY);
    }

    public getAll() {
        return this.objects;
    }

    public render(scene: Scene) {
        for (const obj of this.objects) {
            obj.addToScene(scene);
        }
    }

    public animate(goFast: boolean) {
        for (const obj of this.objects) {
            obj.animate(goFast);
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

    public dispose() {
        for (const obj of this.objects) {
            obj.dispose();
        }
    }
}