import { Constants, DynamicTexture, Scene, StandardMaterial } from "@babylonjs/core";
import { Directions } from "./pokemon";

export interface PokemonSpriteAnimationData {
    /** Name of the animation */
    name: string;
    /** Name of the spritesheet file */
    source: string;
    /** Animation index */
    index: number;
    /** Width of each sprite in the sprite sheet in pixels */
    frameWidth: number;
    /** Height of each sprite in the sprite sheet in pixels */
    frameHeight: number;

    /** Rush frame */
    rushFrame?: number;
    /** Hit frame */
    hitFrame?: number;
    /** Return frame */
    returnFrame?: number;
    /** List of durations of each frame of the animation */
    durations: number[];
};

export interface PokemonSpriteSheets {
    /** Sprites for the animation */
    anim: Record<string, HTMLImageElement>;
    /** Shadows for the animation */
    shadow?: Record<string, HTMLImageElement>;
    /** Offsets for the animation */
    offset?: Record<string, HTMLImageElement>;
};

export interface PokemonSpriteData {
    /** Animation metadata */
    animations: Record<string, PokemonSpriteAnimationData>;
    /** Size of the shadow */
    shadowSize: number;
    /** Animation sprites */
    sprites: PokemonSpriteSheets;
};

const SHEET_SIZE = 24 * 8;
export class DungeonPokemonMaterial extends StandardMaterial {
    private data: PokemonSpriteData;
    public texture: DynamicTexture;

    private animation: string;
    private direction: Directions;

    private currentFrame: number = 0;
    private currentTick: number = 0;

    constructor(data: PokemonSpriteData, scene: Scene) {
        super("dungeon_pokemon_sprite", scene);
        this.data = data;
        this.texture = this.createTexture(scene);
        this.specularPower = 100000;
        this.animation = "Idle";
        this.direction = Directions.SOUTH;
    }

    private draw() {
        const ctx = this.texture.getContext();
        const anim = this.data.animations[this.animation];
        const sheet = this.data.sprites.anim[anim.source];

        ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

        // Determine how many frames there are
        const dirs = sheet.height / anim.frameHeight;
        const sourceY = dirs === 8 ? this.direction : dirs === 4 ? (this.direction / 2 | 0) : 0;

        // Draw the frame
        // Clear the ctx
        ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

        // Draw the sprite on top
        const sx = anim.frameWidth * this.currentFrame;
        const sy = anim.frameHeight * sourceY;
        const dx = Math.floor((SHEET_SIZE - anim.frameWidth) / 2);
        const dy = Math.floor((SHEET_SIZE - anim.frameHeight) / 2);

        ctx.drawImage(sheet,
            // Source
            sx, sy,
            anim.frameWidth, anim.frameHeight,
            // Destination
            dx, dy,
            anim.frameWidth, anim.frameHeight
        );

        this.texture.update();
    }

    public animate(_tick: number) {
        const anim = this.data.animations[this.animation];
        const frame = anim.durations[this.currentFrame];
        this.currentTick += 1 / 4;
        if (this.currentTick >= frame) {
            this.currentFrame += 1;
            this.currentTick = 0;
            this.draw();
        }
        if (this.currentFrame >= anim.durations.length) {
            this.currentFrame = 0;
            this.draw();
        }
    }

    public init(animation: string, direction: Directions) {
        this.diffuseTexture = this.texture;
        this.texture.hasAlpha = true;
        this.texture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
        this.texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;

        this.setAnimation(animation, false);
        this.setDirection(direction);
        return this;
    }

    /** Creates the dynamic texture */
    private createTexture(scene: Scene): DynamicTexture {
        const texture = new DynamicTexture("dungeon_pokemon_texture",
            SHEET_SIZE, scene, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);

        return texture;
    }


    public setAnimation(name: string, draw: boolean = true) {
        this.animation = name;
        this.currentFrame = 0;
        this.currentTick = 0;
        if (draw)
            this.draw();
    }

    public setDirection(dir: Directions, draw: boolean = true) {
        this.direction = dir;
        if (draw)
            this.draw();
    }

}