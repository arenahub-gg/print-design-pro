import { CompositeCommand, type Command } from './command'

/** Undo depth cap - beyond this the oldest entries are dropped. */
export const MAX_HISTORY = 100

// Module-level execution flag. Document store mutators assert on it in dev so
// no code path can mutate the document outside a command. Module scope is
// fine: the editor is single-instance per page (documented limitation).
let executionDepth = 0

export function isExecutingCommand(): boolean {
  return executionDepth > 0
}

export class HistoryManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private txBuffer: Command[] | null = null
  private txLabel = ''

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoLabel(): string | null {
    return this.undoStack.at(-1)?.label ?? null
  }

  get redoLabel(): string | null {
    return this.redoStack.at(-1)?.label ?? null
  }

  get depth(): number {
    return this.undoStack.length
  }

  /** Run a command and record it (into the open transaction if any). */
  execute(command: Command): void {
    this.run(() => command.execute())
    if (this.txBuffer) {
      this.txBuffer.push(command)
      return
    }
    this.record(command)
  }

  undo(): void {
    this.assertNoTransaction('undo')
    const command = this.undoStack.pop()
    if (!command)
      return
    this.run(() => command.undo())
    this.redoStack.push(command)
  }

  redo(): void {
    this.assertNoTransaction('redo')
    const command = this.redoStack.pop()
    if (!command)
      return
    this.run(() => command.execute())
    this.undoStack.push(command)
  }

  /**
   * Collapse every command executed inside `fn` into a single history entry.
   * On throw, already-executed buffered commands are rolled back and the
   * error re-thrown - the document is left as before the transaction.
   */
  transact(label: string, fn: () => void): void {
    this.begin(label)
    try {
      fn()
      this.commit()
    }
    catch (error) {
      this.abort()
      throw error
    }
  }

  begin(label: string): void {
    if (this.txBuffer)
      throw new Error('History transaction already open')
    this.txBuffer = []
    this.txLabel = label
  }

  commit(): void {
    const buffer = this.takeBuffer('commit')
    if (buffer.length === 0)
      return
    this.record(buffer.length === 1 ? buffer[0]! : new CompositeCommand(this.txLabel, buffer))
  }

  abort(): void {
    const buffer = this.takeBuffer('abort')
    for (let i = buffer.length - 1; i >= 0; i--) {
      this.run(() => buffer[i]!.undo())
    }
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.txBuffer = null
  }

  private record(command: Command): void {
    this.undoStack.push(command)
    if (this.undoStack.length > MAX_HISTORY)
      this.undoStack.shift()
    this.redoStack = []
  }

  private takeBuffer(operation: string): Command[] {
    if (!this.txBuffer)
      throw new Error(`No open history transaction to ${operation}`)
    const buffer = this.txBuffer
    this.txBuffer = null
    return buffer
  }

  private assertNoTransaction(operation: string): void {
    if (this.txBuffer)
      throw new Error(`Cannot ${operation} while a history transaction is open`)
  }

  private run(fn: () => void): void {
    executionDepth++
    try {
      fn()
    }
    finally {
      executionDepth--
    }
  }
}
