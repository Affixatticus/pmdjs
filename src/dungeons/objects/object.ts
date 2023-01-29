import { Scene } from "@babylonjs/core";
import { Vec2 } from "../../utils/vectors";
import { DungeonItem } from "./item";
import { DungeonTile } from "./tile";

export enum ObjectType {
    ITEM,
    TRAP,
    STAIRS,
};

export interface IDungeonObject {
    position: Vec2;
    type: number;
    render(scene: Scene, ...params: any): void;
    dispose(): boolean;
};

export abstract class DungeonObject implements IDungeonObject {
    public position: Vec2;
    public type: ObjectType;

    constructor(pos: Vec2, type: ObjectType) {
        this.position = pos;
        this.type = type;
    }

    public abstract render(scene: Scene, ...params: any): void;

    public abstract dispose(): boolean;
}

export class DungeonObjectContainer {
    public objects: DungeonObject[];

    constructor(objects: DungeonObject[]) {
        this.objects = objects;
    }

    public *[Symbol.iterator]() {
        yield* this.objects;
    }

    public async render(scene: Scene) {
        const renderers = [];
        for (const obj of this.objects) {
            renderers.push(obj.render(scene));
        }
        await Promise.all(renderers);
    }

    public get(pos: Vec2) {
        return this.objects.find(obj => obj.position.equals(pos));
    }

    public getItems(): DungeonItem[] {
        return this.objects.filter(obj => obj.type === ObjectType.ITEM) as DungeonItem[];
    }

    public getStairs(): DungeonTile {
        return this.objects.find(obj => obj.type === ObjectType.STAIRS) as DungeonTile;
    }

    public remove(pos: Vec2) {
        this.objects = this.objects.filter(obj => !obj.position.equals(pos));
    }

    public removeObject(obj: DungeonObject) {
        const index = this.objects.indexOf(obj);
        obj.dispose();
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }

    public add(obj: DungeonObject) {
        this.objects.push(obj);
    }

    public has(pos: Vec2) {
        return this.objects.some(obj => obj.position.equals(pos));
    }

    public dispose() {
        for (const obj of this.objects) {
            obj.dispose();
        }
    }
}