import type {
  BarcodeElement,
  CircleElement,
  ImageElement,
  LineElement,
  QrElement,
  RectElement,
  TableElement,
  TextElement,
} from './schema/elements'
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

/**
 * Image element sized from the bitmap's aspect ratio, capped at `maxWidthMm`.
 * `src` is a data URL (self-contained documents, local-first).
 */
export function createImage(
  place: PlaceAt,
  src: string,
  aspectRatio: number,
  maxWidthMm = 80,
): ImageElement {
  const widthMm = maxWidthMm
  const heightMm = roundMm(widthMm / (aspectRatio || 1))
  return {
    ...base(place, widthMm, heightMm),
    type: 'image',
    name: 'Image',
    src,
  }
}

export function createQr(place: PlaceAt, content = 'https://example.com'): QrElement {
  return {
    ...base(place, 30, 30),
    type: 'qr',
    name: 'QR code',
    content,
    ecLevel: 'M',
    color: '#000000',
    backgroundColor: '#ffffff',
  }
}

export function createBarcode(place: PlaceAt, content = '123456789012'): BarcodeElement {
  return {
    ...base(place, 60, 20),
    type: 'barcode',
    name: 'Barcode',
    content,
    format: 'CODE128',
    showText: true,
    lineColor: '#000000',
  }
}

export function createTable(place: PlaceAt): TableElement {
  return {
    ...base(place, 100, 40),
    type: 'table',
    name: 'Table',
    columns: [
      { id: newId(), title: 'Item', widthMm: 50 },
      { id: newId(), title: 'Qty', widthMm: 20 },
      { id: newId(), title: 'Price', widthMm: 30 },
    ],
    rows: [
      ['Sample product', '2', '10.00'],
      ['Another item', '1', '5.50'],
      ['', '', ''],
    ],
    fontSizePt: 10,
    showHeader: true,
    headerBackground: '#f1f5f9',
    borderColor: '#94a3b8',
    borderWidthMm: 0.2,
    cellPaddingMm: 1.5,
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
