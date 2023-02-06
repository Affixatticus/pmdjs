export abstract class TurnAction {
    /** The generator related to the action */
    public generator!: Generator;

    /** True if the action is registered in the exploration log */
    public doLogging: boolean = false;
    /** The message to display in the exploration log */
    public logMessage?: string;

    /** Advances the internal generator by one, and returns true if it's done */
    public tick(): boolean {
        return this.generator.next()?.done ?? true;
    }

    public *repeat(times: number, method: (i: number) => void) {
        for (let i = 0; i < times; i++) {
            method(i);
            if (i < times - 1) yield true;
        }
    }
}