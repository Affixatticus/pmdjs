import { AbstractMesh, Constants, DynamicTexture, Effect, Scene, ShaderMaterial, StandardMaterial } from "@babylonjs/core";
import { Direction } from "../../utils/direction";
import { fillOutStandardOptions } from "../../utils/material";
import { V3, Vec3 } from "../../utils/vectors";
import { DungeonPokemonType } from "./dungeon_pokemon";

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
    shadow: Record<string, HTMLImageElement>;
    /** Offsets for the animation */
    // offset: Record<string, HTMLImageElement>;
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

const SHADOW_VERTEX_SOURCE = `
    precision highp float;

    // Attributes
    attribute vec3 position;
    attribute vec2 uv;

    // Uniforms
    uniform mat4 worldViewProjection;

    // Varying
    varying vec2 vUV;

    void main(void) {
        gl_Position = worldViewProjection * vec4(position, 1.0);

        vUV = uv;
    }
`;
const SHADOW_FRAGMENT_SOURCE = `
    precision highp float;

    varying vec2 vUV;
    
    uniform vec3 color;
    uniform sampler2D tex;

    void main(void) {
        vec4 texel = texture2D(tex, vUV);

        // Replace the white color
        if (texel.r == 1.0 && texel.g == 1.0 && texel.b == 1.0) {
            texel.rgb = color.rgb * 0.75;
        }
        // Replace the green color
        else if (texel.g == 1.0) {
            texel.rgb = color.rgb * 0.75;
        }
        // Replace the red color
        else if (texel.r == 1.0) {
            texel.rgb = color.rgb * 0.75;
        }
        // Replace the blue color
        else if (texel.b == 1.0) {
            texel.rgb = color.rgb * 1.0;
        }
        if (texel.a != 0.0) {
            texel.a = 0.88;
        }

        gl_FragColor = texel;
    }
`;

Effect.ShadersStore["spriteShadowsVertexShader"] = SHADOW_VERTEX_SOURCE;
Effect.ShadersStore["spriteShadowsFragmentShader"] = SHADOW_FRAGMENT_SOURCE;

export class SpriteMaterial extends StandardMaterial {
    constructor(scene: Scene, texture: DynamicTexture) {
        super("", scene);
        this.diffuseTexture = texture;
        fillOutStandardOptions(this, texture);
    }
    protected _shouldTurnAlphaTestOn(_mesh: AbstractMesh): boolean {
        return this.needAlphaTesting();
    };
}
export class ShadowMaterial extends ShaderMaterial {
    constructor(scene: Scene, texture: DynamicTexture, color: Vec3) {
        super("", scene, {
            vertex: "spriteShadows",
            fragment: "spriteShadows"
        },
            {
                attributes: ["position", "normal", "uv", "color"],
                uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "tex"],
                needAlphaBlending: true
            }
        );
        this.setTexture("tex", texture);
        this.setVector3("color", color);
    }
}

export class PokemonMaterials {
    static getShadowColor(type: DungeonPokemonType): Vec3 {
        switch (type) {
            case DungeonPokemonType.LEADER:
                return V3(0, 1, 0);
            case DungeonPokemonType.PARTNER:
                return V3(1, 1, 0);
            case DungeonPokemonType.ENEMY:
                return V3(1, 0, 0);
            case DungeonPokemonType.BOSS:
                return V3(0.8, 0, 0);
            default:
                return V3(1, 0, 1);
        }
    }

    /** Data */
    public data: PokemonSpriteData;
    public spriteTexture: DynamicTexture;
    public shadowTexture: DynamicTexture;
    public spriteMaterial: SpriteMaterial;
    public shadowMaterial: ShadowMaterial;

    /** Animation */
    public animation = "Idle";
    public direction = Direction.SOUTH;
    private currentFrame = 0;
    private currentFrameDuration = 0;
    public isAnimationDone: boolean = false;
    public animCallback: ((material: PokemonMaterials) => void) | null = null;

    public get animations() {
        return this.data.animations;
    }

    /** Returns the current animation */
    public get anim() {
        return this.animations[this.animation];
    }

    constructor(data: PokemonSpriteData, scene: Scene, shadowColor: Vec3) {
        this.data = data;
        this.spriteTexture = new DynamicTexture("dungeon_pokemon_texture", SHEET_SIZE, scene, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);
        this.shadowTexture = new DynamicTexture("dungeon_pokemon_texture", SHEET_SIZE, scene, true, Constants.TEXTURE_NEAREST_SAMPLINGMODE);

        this.spriteMaterial = new SpriteMaterial(scene, this.spriteTexture);
        this.shadowMaterial = new ShadowMaterial(scene, this.shadowTexture, shadowColor);
    }

    /** Updates one of the textures */
    protected _draw(texture: DynamicTexture, spriteSheet: keyof PokemonSpriteSheets) {
        const ctx = texture.getContext();
        const anim = this.data.animations[this.animation];
        const sheet = this.data.sprites[spriteSheet][anim.source];

        ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

        // Determine how many frames there are
        const dirs = sheet.height / anim.frameHeight;
        const sourceY = dirs === 8 ? this.direction.index : dirs === 4 ? (this.direction.index / 2 | 0) : 0;

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

        texture.update();
    }

    /** Draws the current frame of the current animation at the correct direction */
    public draw() {
        this._draw(this.spriteTexture, "anim");
        this._draw(this.shadowTexture, "shadow");
    }

    /** Updates the frame of the animation */
    public animate(goFast: boolean = false) {
        this.isAnimationDone = false;

        // Update the frame
        this.currentFrameDuration--;
        if (this.currentFrameDuration <= 0) {
            this.currentFrame++;
            if (this.currentFrame >= this.anim.durations.length) {
                this.isAnimationDone = true;
                this.currentFrame = 0;
                this.runCallback();
            }

            this.currentFrameDuration = this.getDuration(this.currentFrame, goFast);
            this.draw();
        }
    }

    public dispose() {
        this.spriteTexture.dispose();
        this.shadowTexture.dispose();
        this.spriteMaterial.dispose();
        this.shadowMaterial.dispose();
    }

    private getDuration(currentFrame: number = this.currentFrame, goFast: boolean = false) {
        return this.anim.durations[currentFrame] * (goFast ? 0.125 : 1) * FRAME_DURATION;
    }

    private runCallback() {
        const result = this.animCallback?.(this);
        // Clear the callback
        if (!result) this.animCallback = null;
    }

    public init(animation: string, direction: Direction) {
        this.setAnimation(animation, false);
        this.setDirection(direction);
        return this;
    }

    public setAnimation(name: string, draw: boolean = true) {
        this.animation = name;
        this.currentFrame = 0;
        this.currentFrameDuration = this.getDuration();

        if (draw)
            this.draw();
    }

    public setDirection(dir: Direction, draw: boolean = true) {
        this.direction = dir;
        if (draw)
            this.draw();
    }
}