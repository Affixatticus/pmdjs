export interface PokemonSpriteAnimationData {
    /** Name of the animation */
    name: string;
    /** Name of the spritesheet file */
    url: string;
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

    copyOf?: string;
};

export interface PokemonSpriteMetaData {
    shadowSize: number;
    animations: Record<string, PokemonSpriteAnimationData>;
};