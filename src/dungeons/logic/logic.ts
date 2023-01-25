import { Direction } from "../../utils/direction";
import { DungeonState } from "../dungeon";
import { WalkAction } from "./actions/walk";
import { NilAction } from "./actions/nil";
import { Turn } from "./turn";
import { DungeonPokemonType } from "../objects/pokemon";
import { DungeonPokemonPartnerAI } from "./ai/partner_ai";
import { DungeonPokemonAI } from "./ai/ai";
import { V3 } from "../../utils/vectors";
import { Player } from "./player";
import { Tile, TileObject } from "../../data/tiles";
import { DungeonTile } from "../objects/tile";
export class DungeonLogic {
    public state: DungeonState;

    public currentTurn: number;
    public turn: Turn | null;
    public turnsHistory: Turn[];
    public player: Player;

    private walkDirection: Direction | null;

    /** Initalizes the game logic */
    constructor(state: DungeonState) {
        this.state = state;
        this.currentTurn = 0;
        this.turn = null;
        this.turnsHistory = [];
        this.player = new Player(this);
        this.walkDirection = null;
    }

    /** Initializes the logic with all parameters that are created after its instancing */
    public init() {
        for (const pokemon of this.state.floor.pokemon.getAll()) {
            // Assign the ai to the pokemon
            switch (pokemon.type) {
                case DungeonPokemonType.PARTNER:
                    pokemon.ai = new DungeonPokemonPartnerAI(pokemon, this.state.floor);
                    break;
                default:
                    pokemon.ai = new DungeonPokemonAI(pokemon, this.state.floor);
            }
        }
    }

    /** Updates the player movement and starts off the turn */
    public update() {
        if (!this.state.isLoaded) return;
        const leader = this.state.floor.pokemon.getLeader();


        // Move the camera to the player
        this.state.moveCamera(this.state.floor.pokemon.getLeader().spritePosition.toVec3().add(V3(0, 0, 2)));

        // Await for the player input
        if (this.walkDirection === null) {
            this.walkDirection = this.player.doInput();
            if (this.walkDirection === null) return;
        };

        // Create the actions
        if (!this.turn) {
            this.turn = new Turn();
            if (this.walkDirection === Direction.NONE)
                this.turn.calculate(new NilAction(leader), this.state);
            else {
                // Add the action to the turn
                this.turn.calculate(new WalkAction(leader, this.walkDirection), this.state);
                // Update the screen
                this.state.floor.renderToScreen(leader.position);
                // Update the light overlay
                this.state.lightOverlay.lightPokemon(this.state.floor, leader);
            }
        }

        // Execute the turn
        const done = this.turn.execute();

        if (done) {
            this.turnsHistory.push(this.turn);
            this.turn = null;
            this.currentTurn++;
            this.walkDirection = null;
            // Reset all calcedActions
            for (const pokemon of this.state.floor.pokemon.getAll()) {
                pokemon.ai.overwrittenAction = null;
            }
            // See if the stairs were found
            this.state.floor.findStairs(leader.position);
            this.state.ui.minimap.update(leader.position);
            // See if you are on the stairs
            if (this.state.floor.objects.getStairs().position.equals(leader.position)) {
                this.state.goUpAFloor();
                this.state.changeFloor();
            }
        }
    }
}