import { DungeonState } from "../dungeon";
import { WalkAction } from "./actions/walk";
import { NilAction } from "./actions/nil";
import { Turn } from "./turn";
import { DungeonPokemonType } from "../objects/pokemon";
import { DungeonPokemonPartnerAI } from "./ai/partner_ai";
import { DungeonPokemonAI } from "./ai/ai";
import { V3 } from "../../utils/vectors";
import { InputAction, InputType, Player } from "./player";
import { TurnAction } from "./actions/action";
import { DungeonPokemonEnemyAI as DungeonPokemonEnemyAI } from "./ai/enemy_ai";
import { DropItemAction } from "./actions/items";

export class DungeonLogic {
    public state: DungeonState;

    public currentTurn: number;
    public turn: Turn | null;
    public turnsHistory: Turn[];
    public player: Player;

    private inputResult: InputType;

    /** Initalizes the game logic */
    constructor(state: DungeonState) {
        this.state = state;
        this.currentTurn = 0;
        this.turn = null;
        this.turnsHistory = [];
        this.player = new Player(this);
        this.inputResult = null;
    }

    /** Initializes the logic with all parameters that are created after its instancing */
    public init() {
        for (const pokemon of this.state.floor.pokemon.getAll()) {
            // Assign the ai to the pokemon
            switch (pokemon.type) {
                case DungeonPokemonType.PARTNER:
                    pokemon.ai = new DungeonPokemonPartnerAI(pokemon, this);
                    break;
                case DungeonPokemonType.ENEMY:
                    pokemon.ai = new DungeonPokemonEnemyAI(pokemon, this);
                    break;
                default:
                    pokemon.ai = new DungeonPokemonAI(pokemon, this);
            }
        }
        // Update the player
        this.player.update();
    }

    /** Updates the player movement and starts off the turn */
    public update() {
        if (!this.state.isLoaded) return;
        const leader = this.state.floor.pokemon.getLeader();
        // Move the camera to the player
        this.state.moveCamera(this.state.floor.pokemon.getLeader().spritePosition.toVec3().add(V3(0, 0, 2)));

        // Await for the player input
        if (this.inputResult === null) {
            this.inputResult = this.player.state.update();
            if (this.inputResult === null) return;
        };

        // Create the actions
        if (!this.turn) {
            let playerAction: TurnAction = new NilAction(leader);

            switch (this.inputResult[0]) {
                case InputAction.WALK:
                    // Update the last walked tile
                    this.player.lastWalkedTile = this.state.floor.grid.isCorridor(leader.position, leader);
                    // Do player movement
                    playerAction = WalkAction.getAction(leader, this.inputResult[1], false, this);
                    break;
                case InputAction.TALK:
                    // Do player talk
                    const partner = this.inputResult[1];
                    const newDirection = leader.direction.getOpposite();
                    if (!partner.animateTurning(newDirection)) return;
                    this.inputResult = null;
                    return;
                case InputAction.DROP_ITEM:
                    // Create the drop item action
                    playerAction = new DropItemAction(leader, this.inputResult[1], this);
                    break;
            }

            this.turn = new Turn();
            // Start the turn
            this.turn.calculate(playerAction, this.state);
            // Update the screen
            this.state.floor.renderToScreen(leader.position);
            // Update the light overlay
            this.state.lightOverlay.lightPokemon(this.state.floor, leader);
        }

        // Execute the turn
        const turnFinished = this.turn.execute();

        if (turnFinished) {
            this.turnsHistory.push(this.turn);
            // Reset all calcedActions
            for (const pokemon of this.state.floor.pokemon.getAll()) {
                pokemon.ai.overwrittenAction = null;
            }
            // See if the stairs were found
            this.state.floor.findStairs(leader.position);
            this.state.ui.minimap.update(leader.position);
            // Execute the special flags
            this.turn.executeSpecialFlags(this.state);
            // Reset the turn
            this.turn = null;
            this.currentTurn++;
            this.inputResult = null;
        }
    }


    // ANCHOR State getters
    public canDropItem(): boolean {
        const floor = this.state.floor;
        return !floor.objects.getItems().some(p => p.position.equals(this.player.leader.position));
    }
}