import type { CircleElement, LineElement, RectElement, TextElement } from './schema/elements'
import { newId } from './schema/template'
import { roundMm } from './units'

// Default factories - single source of element defaults for the palette,
// tests, and any host app. Position is the element's center point.

interface PlaceAt {
  centerXMm: number
  centerYMm: number
}

function base(place: PlaceAt, widthMm: number, heightMm: number) {
  return {
    id: newId(),
    xMm: roundMm(place.centerXMm - widthMm / 2),
    yMm: roundMm(place.centerYMm - heightMm / 2),
    widthMm,
    heightMm,
    rotation: 0,
    locked: false,
    visible: true,
  }
}

export function createRect(place: PlaceAt): RectElement {
  return {
    ...base(place, 40, 25),
    type: 'rect',
    name: 'Rectangle',
    fillColor: '#dbeafe',
    strokeColor: '#1e3a5f',
    strokeWidthMm: 0.4,
    cornerRadiusMm: 1,
  }
}

export function createLine(place: PlaceAt): LineElement {
  return {
    ...base(place, 60, 4),
    type: 'line',
    name: 'Line',
    strokeColor: '#334155',
    strokeWidthMm: 0.5,
  }
}

export function createCircle(place: PlaceAt): CircleElement {
  return {
    ...base(place, 30, 30),
    type: 'circle',
    name: 'Circle',
    fillColor: '#fee2e2',
    strokeColor: '#7f1d1d',
    strokeWidthMm: 0.4,
  }
}

export function createText(place: PlaceAt, content = 'Text'): TextElement {
  return {
    ...base(place, 60, 12),
    type: 'text',
    name: 'Text',
    content,
    fontSizePt: 14,
    fontWeight: 400,
    align: 'left',
    color: '#0f172a',
  }
}
