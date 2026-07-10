import { describe, expect, it } from 'vitest'
import type { Command } from '../commands/command'
import { HistoryManager, isExecutingCommand, MAX_HISTORY } from '../commands/history-manager'

/** Test double: appends/removes its value from a shared log array. */
function pushCommand(log: number[], value: number): Command {
  return {
    label: `push ${value}`,
    execute: () => log.push(value),
    undo: () => log.pop(),
  }
}

describe('historyManager', () => {
  it('undoes and redoes 50 sequential commands back to initial state', () => {
    const manager = new HistoryManager()
    const log: number[] = []
    for (let i = 0; i < 50; i++)
      manager.execute(pushCommand(log, i))
    expect(log).toHaveLength(50)

    while (manager.canUndo)
      manager.undo()
    expect(log).toEqual([])

    while (manager.canRedo)
      manager.redo()
    expect(log).toEqual(Array.from({ length: 50 }, (_, i) => i))
  })

  it('caps the undo stack at MAX_HISTORY', () => {
    const manager = new HistoryManager()
    const log: number[] = []
    for (let i = 0; i < MAX_HISTORY + 20; i++)
      manager.execute(pushCommand(log, i))
    expect(manager.depth).toBe(MAX_HISTORY)
  })

  it('invalidates redo when a new command is executed after undo', () => {
    const manager = new HistoryManager()
    const log: number[] = []
    manager.execute(pushCommand(log, 1))
    manager.execute(pushCommand(log, 2))
    manager.undo()
    expect(manager.canRedo).toBe(true)
    manager.execute(pushCommand(log, 3))
    expect(manager.canRedo).toBe(false)
    expect(log).toEqual([1, 3])
  })

  it('collapses a transaction into a single undo entry', () => {
    const manager = new HistoryManager()
    const log: number[] = []
    manager.transact('gesture', () => {
      manager.execute(pushCommand(log, 1))
      manager.execute(pushCommand(log, 2))
      manager.execute(pushCommand(log, 3))
    })
    expect(log).toEqual([1, 2, 3])
    expect(manager.depth).toBe(1)
    expect(manager.undoLabel).toBe('gesture')

    manager.undo()
    expect(log).toEqual([])
    manager.redo()
    expect(log).toEqual([1, 2, 3])
  })

  it('rolls back executed commands when a transaction throws', () => {
    const manager = new HistoryManager()
    const log: number[] = []
    expect(() =>
      manager.transact('failing', () => {
        manager.execute(pushCommand(log, 1))
        manager.execute(pushCommand(log, 2))
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(log).toEqual([])
    expect(manager.depth).toBe(0)
    expect(manager.canUndo).toBe(false)
  })

  it('drops empty transactions instead of recording them', () => {
    const manager = new HistoryManager()
    manager.transact('noop', () => {})
    expect(manager.depth).toBe(0)
  })

  it('rejects nested transactions and undo/redo inside a transaction', () => {
    const manager = new HistoryManager()
    manager.begin('outer')
    expect(() => manager.begin('inner')).toThrow('already open')
    expect(() => manager.undo()).toThrow('transaction is open')
    expect(() => manager.redo()).toThrow('transaction is open')
    manager.commit()
  })

  it('exposes the execution flag only while running commands', () => {
    const manager = new HistoryManager()
    let flagDuringExecute = false
    manager.execute({
      label: 'probe',
      execute: () => {
        flagDuringExecute = isExecutingCommand()
      },
      undo: () => {},
    })
    expect(flagDuringExecute).toBe(true)
    expect(isExecutingCommand()).toBe(false)
  })
})
