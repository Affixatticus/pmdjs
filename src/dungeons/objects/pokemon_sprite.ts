import { Mesh, Scene, MeshBuilder, Vector3 } from "@babylonjs/core";
import { PokemonFormIdentifier } from "../../data/pokemon";
import { AssetsLoader } from "../../utils/assets_loader";
import { Direction } from "../../utils/direction";
import { V3, Vec2, Vec3 } from "../../utils/vectors";
import { FloorRenderingLevels } from "../floor";
import { PokemonMaterials } from "./pokemon_materials";

export class PokemonSprite {
    static SCALING_DETERMINANT = 7;
    static SPRITE_ROTATION = Math.PI / 3;
    static TRANSLUCID_MESH_VISIBILITY = 0.5;
    static SHADOW_OFFSET = V3(0.5 - this.SCALING_DETERMINANT / 512, 0.01, -0.5);
    static SPRITE_OFFSET = V3(0.5, 0, -0.5);

    private _position: Vec2;
    private _direction: Direction;

    /** Base of the mesh rendered below the walls with visibility = 1 */
    private opaqueMesh!: Mesh;
    /** Copy of the opaqueMesh rendered above the walls with visibility < 1 */
    private translucentMesh!: Mesh;
    /** Mesh for the sprite's shadow */
    private shadowMesh!: Mesh;
    /** Material that takes care of animations */
    public material!: PokemonMaterials;

    public id: PokemonFormIdentifier;
    public shadowColor: Vec3;

    constructor(id: PokemonFormIdentifier, shadowColor: Vec3, position: Vec2, direction: Direction) {
        this.id = id;
        this.shadowColor = shadowColor;
        this._position = position;
        this._direction = direction;
    }

    public get position() {
        return this._position;
    }

    public set position(pos: Vec2) {
        this._position = pos;
        this.opaqueMesh.position = this._position.gameFormat.add(PokemonSprite.SPRITE_OFFSET);
        this.translucentMesh.position = this._position.gameFormat.add(PokemonSprite.SPRITE_OFFSET);
        this.shadowMesh.position = this._position.gameFormat.add(PokemonSprite.SHADOW_OFFSET);
    }

    public get direction() {
        return this._direction;
    }

    public set direction(dir: Direction) {
        this.material.setDirection(dir);
        this._direction = dir;
    }

    /** Adds all of the meshes to the scene */
    public async render(scene: Scene) {
        // Create the material
        const data = await AssetsLoader.loadPokemon(...this.id);

        if (data === undefined)
            throw new Error(`Pokemon ${this.id} not found`);

        // Create the materials
        const materials = new PokemonMaterials(data, scene, this.shadowColor);
        materials.init("Idle", this._direction);
        this.material = materials;

        // Create the meshes
        /* Shadow */
        const shadowMesh = MeshBuilder.CreateGround("shadow", {
            width: 1,
            height: 1,
        }, scene);

        shadowMesh.position = this._position.gameFormat.add(PokemonSprite.SHADOW_OFFSET);
        shadowMesh.scalingDeterminant = PokemonSprite.SCALING_DETERMINANT;
        shadowMesh.renderingGroupId = FloorRenderingLevels.INBETWEEN;
        shadowMesh.material = this.material.shadowMaterial;
        this.shadowMesh = shadowMesh;

        /* Sprite */
        const opaqMesh = MeshBuilder.CreatePlane("pokemon", {
            width: 1,
            height: 1,
        }, scene);

        opaqMesh.position = this._position.gameFormat.add(PokemonSprite.SPRITE_OFFSET);
        opaqMesh.scalingDeterminant = PokemonSprite.SCALING_DETERMINANT;
        opaqMesh.renderingGroupId = FloorRenderingLevels.WALLS;
        opaqMesh.rotate(Vector3.Right(), PokemonSprite.SPRITE_ROTATION);

        this.opaqueMesh = opaqMesh;
        opaqMesh.material = this.material.spriteMaterial;

        const tranMesh = opaqMesh.clone("pokemon-tran");
        tranMesh.renderingGroupId = FloorRenderingLevels.HIGHEST;
        tranMesh.visibility = PokemonSprite.TRANSLUCID_MESH_VISIBILITY;
        this.translucentMesh = tranMesh;
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

    public dispose() {
        this.opaqueMesh.dispose();
        this.translucentMesh.dispose();
        this.shadowMesh.dispose();
    }
}