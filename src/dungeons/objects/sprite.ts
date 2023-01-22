import { AbstractMesh, Constants, DynamicTexture, Scene, StandardMaterial } from "@babylonjs/core";
import { Direction } from "../../utils/direction";
import { fillOutStandardOptions } from "../../utils/material";

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
const FRAME_DURATION = 144 / 52;
export class DungeonPokemonMaterial extends StandardMaterial {
    private data: PokemonSpriteData;
    public texture: DynamicTexture;

    public animation: string;
    public direction: Direction;


    /** The currently displayed frame */
    private _currentFrame: number = 0;
    /** The time of animation ticks the current frame should remain onscreen */
    private _currentFrameDuration: number = 0;


    public animCallback: ((material: DungeonPokemonMaterial) => void) | null = null;

    constructor(data: PokemonSpriteData, scene: Scene) {
        super("dungeon_pokemon_sprite", scene);
        this.data = data;
        this.texture = this.createTexture(scene);
        fillOutStandardOptions(this, this.texture);
        this.animation = "Idle";
        this.direction = Direction.SOUTH;
    }

    public _shouldTurnAlphaTestOn(_mesh: AbstractMesh): boolean {
        return this.needAlphaTesting();
    };


    private draw() {
        const ctx = this.texture.getContext();
        const anim = this.data.animations[this.animation];
        const sheet = this.data.sprites.anim[anim.source];

        ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

        // Determine how many frames there are
        const dirs = sheet.height / anim.frameHeight;
        const sourceY = dirs === 8 ? this.direction.index : dirs === 4 ? (this.direction.index / 2 | 0) : 0;

        // Draw the frame
        // Clear the ctx
        ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

        // Draw the sprite on top
        const sx = anim.frameWidth * this._currentFrame;
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

    /** Updates the frame of the animation */
    public animate() {
        // Update the frame
        this._currentFrameDuration--;
        if (this._currentFrameDuration <= 0) {
            this._currentFrame++;
            const anim = this.data.animations[this.animation];
            if (this._currentFrame >= anim.durations.length) {
                this._currentFrame = 0;
                this.runCallback();
            }

            this._currentFrameDuration = this.getDuration();
            this.draw();
        }
    }

    private getDuration(currentFrame: number = this._currentFrame) {
        const anim = this.data.animations[this.animation];
        return anim.durations[currentFrame] * FRAME_DURATION;
    }

    private runCallback() {
        const result = this.animCallback?.(this);
        // Clear the callback
        if (!result) this.animCallback = null;
    }

    public init(animation: string, direction: Direction) {
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
        this._currentFrame = 0;
        this._currentFrameDuration = this.getDuration();

        if (draw)
            this.draw();
    }

    public setDirection(dir: Direction, draw: boolean = true) {
        this.direction = dir;
        if (draw)
            this.draw();
    }

}