export interface TurnAction {
    /** Runs down the action tick by tick. Returns true if it's done */
    tick(): boolean;
    /** True if the action is finished */
    done: boolean;
    /** True if the action is registered in the exploration log */
    doLogging?: boolean;
    /** The message to display in the exploration log */
    logMessage?: string;
}