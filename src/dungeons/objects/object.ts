import { Scene } from "@babylonjs/core";
import { Vec2 } from "../../utils/vectors";

export enum ObjectTypes {
    ITEM,
    TRAP,
    STAIRS,
};

export interface IDungeonObject {
    pos: Vec2;
    type: number;
    render(scene: Scene, ...params: any): void;
    dispose(): boolean;
};

export abstract class DungeonObject implements IDungeonObject {
    public pos: Vec2;
    public type: ObjectTypes;

    constructor(pos: Vec2, type: ObjectTypes) {
        this.pos = pos;
        this.type = type;
    }

    public abstract render(scene: Scene, ...params: any): void;

    public abstract dispose(): boolean;
}

export class DungeonObjectContainer {
    public objects: IDungeonObject[];

    constructor(objects: DungeonObject[]) {
        this.objects = objects;
    }

    public *[Symbol.iterator]() {
        yield* this.objects;
    }

    public render(scene: Scene) {
        for (const obj of this.objects) {
            obj.render(scene);
        }
    }

    public get(pos: Vec2) {
        return this.objects.find(obj => obj.pos.equals(pos));
    }

    public remove(pos: Vec2) {
        this.objects = this.objects.filter(obj => !obj.pos.equals(pos));
    }

    public add(obj: DungeonObject) {
        this.objects.push(obj);
    }

    public has(pos: Vec2) {
        return this.objects.some(obj => obj.pos.equals(pos));
    }
}