// Command pattern contract. Every document mutation is a Command so undo/redo
// falls out of the history stacks instead of being bolted on per feature.

export interface Command {
  /** Human-readable label shown in undo/redo UI ("Add rect", "Move 3 elements"). */
  readonly label: string
  execute: () => void
  undo: () => void
}

/**
 * Groups several commands into one history entry. Used by transactions so a
 * whole gesture (drag, resize) undoes in a single step.
 */
export class CompositeCommand implements Command {
  constructor(
    readonly label: string,
    private readonly commands: Command[],
  ) {}

  get size(): number {
    return this.commands.length
  }

  execute(): void {
    for (const command of this.commands) {
      command.execute()
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i]!.undo()
    }
  }
}
