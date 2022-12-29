import { TurnAction } from "./action";

export class SpawnAction extends TurnAction {
    public doLogging = true;
    public logMessage = "Spawned in dungeon.";
    
    constructor() {
        super();
    }

    public happen() {
        
    }
}