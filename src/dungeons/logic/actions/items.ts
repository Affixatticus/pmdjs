import { Tile } from "../../../data/tiles";
import { V2 } from "../../../utils/vectors";
import { DungeonItem } from "../../objects/item";
import { DungeonPokemon } from "../../objects/pokemon";
import { DungeonLogic } from "../logic";
import { TurnAction } from "./action";

export class DropItemAction extends TurnAction {
    public logic: DungeonLogic;
    private item: DungeonItem;

    constructor(pokemon: DungeonPokemon, itemIndex: number, logic: DungeonLogic) {
        super();
        this.logic = logic;

        const stack = this.inventory.get(itemIndex);
        this.item = new DungeonItem(V2(-100, -100), ...stack.itemAmount);
        this.item.render(logic.state.scene).then(() => {
            this.item.discard(false);
        });

        this.generator = this.dropItem(pokemon, itemIndex);
    }

    private get inventory() {
        return this.logic.state.inventory;
    }
    private get floor() {
        return this.logic.state.floor;
    }

    public *dropItem(pokemon: DungeonPokemon, itemIndex: number) {
        // Add an item at the pokemon's position
        this.inventory.extractStack(itemIndex);
        // Create a new item at the pokemon's position
        this.item.position = pokemon.position;
        this.floor.grid.set(this.item.position, Tile.ITEM);

        this.floor.objects.add(this.item);
        yield true;
    }
}