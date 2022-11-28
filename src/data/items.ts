export enum Items {
    EMPTY,
    ORAN_BERRY
};

export interface ItemChance {
    /** The item id */
    id: Items;
    /** A number between 0 and 100 */
    chance: number;
}