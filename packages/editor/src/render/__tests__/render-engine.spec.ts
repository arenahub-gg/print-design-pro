// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEmptyTemplate } from '../../core/schema/template'
import { createRect, createText } from '../../core/element-factories'
import { PAGE_PRESETS } from '../../core/schema/page'
import { renderToCanvas } from '../render-engine'

// happy-dom has no real 2D raster - assert against a recorded mock context.
// Pixel-level verification runs in real Chromium via Playwright (phase 4).

interface Call { method: string, args: unknown[] }

function makeMockContext() {
  const calls: Call[] = []
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
  }
  const ctx = {
    calls,
    scale: record('scale'),
    translate: record('translate'),
    rotate: record('rotate'),
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    roundRect: record('roundRect'),
    rect: record('rect'),
    clip: record('clip'),
    fill: record('fill'),
    stroke: record('stroke'),
    fillRect: record('fillRect'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    ellipse: record('ellipse'),
    fillText: record('fillText'),
    setLineDash: record('setLineDash'),
    measureText: (text: string) => ({ width: text.length * 2 }), // 2mm/char model
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    font: '',
    textBaseline: '',
    textAlign: '',
  }
  return ctx
}

let mockCtx: ReturnType<typeof makeMockContext>

beforeEach(() => {
  mockCtx = makeMockContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as never)
})

describe('renderToCanvas', () => {
  it('sizes the canvas for the page at the requested DPI', async () => {
    const doc = createEmptyTemplate('t', PAGE_PRESETS.a4)
    const canvas = await renderToCanvas(doc, { dpi: 300 })
    // A4 210x297mm at 300dpi
    expect(canvas.width).toBe(2480)
    expect(canvas.height).toBe(3508)

    const label = await renderToCanvas(createEmptyTemplate('l', PAGE_PRESETS.label50x30), { dpi: 300 })
    expect(label.width).toBe(591)
    expect(label.height).toBe(354)
  })

  it('scales the context once to mm space and paints the background', async () => {
    const doc = createEmptyTemplate('t', PAGE_PRESETS.a4)
    await renderToCanvas(doc, { dpi: 300 })
    const scale = mockCtx.calls.find(c => c.method === 'scale')!
    expect(scale.args[0]).toBeCloseTo(300 / 25.4, 6)
    const bg = mockCtx.calls.find(c => c.method === 'fillRect')!
    expect(bg.args).toEqual([0, 0, 210, 297])
  })

  it('skips background when null', async () => {
    await renderToCanvas(createEmptyTemplate(), { background: null })
    expect(mockCtx.calls.some(c => c.method === 'fillRect')).toBe(false)
  })

  it('applies the editor transform sequence for a rotated element', async () => {
    const doc = createEmptyTemplate()
    const rect = createRect({ centerXMm: 50, centerYMm: 40 })
    rect.rotation = 30
    doc.elements.push(rect)
    await renderToCanvas(doc)

    const translates = mockCtx.calls.filter(c => c.method === 'translate')
    const rotate = mockCtx.calls.find(c => c.method === 'rotate')!
    // translate to center -> rotate -> translate back by half size
    expect(translates[0]!.args[0]).toBeCloseTo(50, 6)
    expect(translates[0]!.args[1]).toBeCloseTo(40, 6)
    expect(rotate.args[0]).toBeCloseTo((30 * Math.PI) / 180, 6)
    expect(translates[1]!.args).toEqual([-rect.widthMm / 2, -rect.heightMm / 2])
  })

  it('skips invisible elements and preserves array paint order', async () => {
    const doc = createEmptyTemplate()
    const hidden = createRect({ centerXMm: 20, centerYMm: 20 })
    hidden.visible = false
    const first = createRect({ centerXMm: 30, centerYMm: 30 })
    const second = createRect({ centerXMm: 60, centerYMm: 60 })
    doc.elements.push(hidden, first, second)
    await renderToCanvas(doc)

    const rects = mockCtx.calls.filter(c => c.method === 'roundRect')
    expect(rects).toHaveLength(2)
    const translates = mockCtx.calls.filter(c => c.method === 'translate')
    // first element's center translate comes before second's
    expect(translates[0]!.args[0]).toBeCloseTo(30, 6)
    expect(translates[2]!.args[0]).toBeCloseTo(60, 6)
  })

  it('applies dash patterns and resets them after each stroke', async () => {
    const doc = createEmptyTemplate()
    const rect = createRect({ centerXMm: 50, centerYMm: 40 })
    rect.strokeStyle = 'dashed' // strokeWidth 0.4 -> pattern [1.6, 0.8]
    doc.elements.push(rect)
    await renderToCanvas(doc)

    const dashes = mockCtx.calls.filter(c => c.method === 'setLineDash')
    expect(dashes.map(c => c.args[0])).toEqual([[1.6, 0.8], []])
  })

  it('shortens an arrowed line and fills the head after the dashed stroke', async () => {
    const doc = createEmptyTemplate()
    const { createLine } = await import('../../core/element-factories')
    const line = createLine({ centerXMm: 50, centerYMm: 40 }) // 60x4, strokeWidth 0.5
    line.strokeStyle = 'dotted'
    line.endCap = 'arrow' // head length = max(0.5*4, 1.5) = 2
    doc.elements.push(line)
    await renderToCanvas(doc)

    const lineTo = mockCtx.calls.find(c => c.method === 'lineTo')!
    expect(lineTo.args[0]).toBe(58) // shaft ends under the head
    // head triangle: closePath + fill AFTER the stroke, dash already reset
    const methods = mockCtx.calls.map(c => c.method)
    expect(methods.indexOf('closePath')).toBeGreaterThan(methods.indexOf('stroke'))
    expect(mockCtx.calls.filter(c => c.method === 'setLineDash').at(-1)!.args[0]).toEqual([])
  })

  it('renders text with wrapping, clipping, and pt->mm font size', async () => {
    const doc = createEmptyTemplate()
    const text = createText({ centerXMm: 105, centerYMm: 30 }, 'hello world wrap me')
    text.widthMm = 20 // narrow: forces wrapping at 2mm/char model
    doc.elements.push(text)
    await renderToCanvas(doc)

    expect(mockCtx.calls.some(c => c.method === 'clip')).toBe(true)
    const fillTexts = mockCtx.calls.filter(c => c.method === 'fillText')
    expect(fillTexts.length).toBeGreaterThan(1)
    // 14pt -> mm
    expect(mockCtx.font).toContain(`${(14 * 25.4) / 72}px`)
    // successive baselines advance by lineHeight = 1.25 * fontSize
    const y0 = fillTexts[0]!.args[2] as number
    const y1 = fillTexts[1]!.args[2] as number
    expect(y1 - y0).toBeCloseTo(((14 * 25.4) / 72) * 1.25, 6)
  })
})
