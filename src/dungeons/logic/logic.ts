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
                    pokemon.ai = new DungeonPokemonPartnerAI(pokemon, this.state.floor);
                    break;
                default:
                    pokemon.ai = new DungeonPokemonAI(pokemon, this.state.floor);
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
            this.inputResult = this.player.doInput();
            if (this.inputResult === null) return;

        };

        // Create the actions
        if (!this.turn) {
            let playerAction: TurnAction = new NilAction(leader);

            switch (this.inputResult[0]) {
                case InputAction.WALK:
                    // Do player movement
                    playerAction = WalkAction.getAction(leader, this.inputResult[1], this);
                    break;
                case InputAction.TALK:
                    // Do player talk
                    console.log("HEY, How are you doing?");
                    const partner = this.inputResult[1];
                    const newDirection = leader.direction.getOpposite();
                    if (!partner.animateTurning(newDirection)) return;
                    this.inputResult = null;
                    return;
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
        const done = this.turn.execute();

        if (done) {
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
}