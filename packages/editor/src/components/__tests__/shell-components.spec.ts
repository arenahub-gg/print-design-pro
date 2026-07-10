// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { addElementCommand } from '../../core/commands/element-commands'
import { createRect, createText } from '../../core/element-factories'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useSelectionStore } from '../../stores/selection-store'
import NumberField from '../shell/panel-controls/NumberField.vue'
import PropertiesPanel from '../shell/PropertiesPanel.vue'

describe('numberField', () => {
  it('commits parsed value on enter, resyncs draft from modelValue', async () => {
    const wrapper = mount(NumberField, {
      props: { label: 'X', modelValue: 10 },
    })
    const input = wrapper.find('input')
    await input.setValue('42.5')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('commit')).toEqual([[42.5]])

    await wrapper.setProps({ modelValue: 42.5 })
    expect((input.element as HTMLInputElement).value).toBe('42.5')
  })

  it('restores the draft and emits nothing on invalid input', async () => {
    const wrapper = mount(NumberField, {
      props: { label: 'X', modelValue: 7 },
    })
    const input = wrapper.find('input')
    await input.setValue('')
    await input.trigger('blur')
    expect(wrapper.emitted('commit')).toBeUndefined()
    expect((input.element as HTMLInputElement).value).toBe('7')
  })

  it('clamps to min before committing', async () => {
    const wrapper = mount(NumberField, {
      props: { label: 'W', modelValue: 10, min: 1 },
    })
    const input = wrapper.find('input')
    await input.setValue('-5')
    await input.trigger('keydown.enter')
    expect(wrapper.emitted('commit')).toEqual([[1]])
  })
})

describe('propertiesPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function setup() {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const selection = useSelectionStore()
    const wrapper = mount(PropertiesPanel)
    return { doc, history, selection, wrapper }
  }

  it('shows empty state without selection, fields with one', async () => {
    const { doc, history, selection, wrapper } = setup()
    expect(wrapper.find('[data-pp-panel-empty]').exists()).toBe(true)

    const rect = createRect({ centerXMm: 50, centerYMm: 50 })
    history.dispatch(addElementCommand(doc, rect))
    selection.select(rect.id)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-pp-panel-empty]').exists()).toBe(false)
    expect(wrapper.findAll('input[type="number"]').length).toBeGreaterThanOrEqual(5)
  })

  it('geometry edit dispatches an undoable command that syncs the store', async () => {
    const { doc, history, selection, wrapper } = setup()
    const rect = createRect({ centerXMm: 50, centerYMm: 50 })
    history.dispatch(addElementCommand(doc, rect))
    selection.select(rect.id)
    await wrapper.vm.$nextTick()

    const xInput = wrapper.findAll('input[type="number"]')[0]!
    await xInput.setValue('99')
    await xInput.trigger('keydown.enter')

    expect(doc.getElementById(rect.id)?.xMm).toBe(99)
    history.undo()
    expect(doc.getElementById(rect.id)?.xMm).toBe(rect.xMm)
  })

  it('text section edits content for a text element and respects lock', async () => {
    const { doc, history, selection, wrapper } = setup()
    const text = createText({ centerXMm: 50, centerYMm: 50 })
    history.dispatch(addElementCommand(doc, text))
    selection.select(text.id)
    await wrapper.vm.$nextTick()

    const textarea = wrapper.find('[data-pp-text-section] textarea')
    await textarea.setValue('hello world')
    await textarea.trigger('change')
    expect((doc.getElementById(text.id) as { content?: string }).content).toBe('hello world')

    // Lock, then attempt another edit - must be ignored.
    const lock = wrapper.find('[data-pp-lock-toggle]')
    await lock.setValue(true)
    await wrapper.vm.$nextTick()
    await textarea.setValue('blocked edit')
    await textarea.trigger('change')
    expect((doc.getElementById(text.id) as { content?: string }).content).toBe('hello world')
  })
})
