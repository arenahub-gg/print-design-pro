import type { TemplateDocument, TemplateElement } from '@pro-print/editor'
import {
  createBarcode,
  createCircle,
  createEmptyTemplate,
  createLine,
  createQr,
  createRect,
  createShape,
  createTable,
  createText,
  PAGE_PRESETS,
  roundMm,
} from '@pro-print/editor'

// Five starter templates seeded on first run so a new user sees what the
// tool can do instead of an empty library. Built through the public element
// factories (schema-safe defaults) with explicit geometry per design.

/** Pin an element's box (factories place by center with default sizes). */
function at<T extends TemplateElement>(element: T, xMm: number, yMm: number, widthMm: number, heightMm: number): T {
  element.xMm = roundMm(xMm)
  element.yMm = roundMm(yMm)
  element.widthMm = roundMm(widthMm)
  element.heightMm = roundMm(heightMm)
  return element
}

const CENTER = { centerXMm: 0, centerYMm: 0 } // geometry pinned by at()

function shippingLabel(): TemplateDocument {
  const doc = createEmptyTemplate('Shipping label', PAGE_PRESETS.label100x150)
  const header = at(createRect(CENTER), 2, 2, 96, 16)
  header.fillColor = '#2a6fdb'
  header.strokeWidthMm = 0
  header.cornerRadiusMm = 1.5

  const brand = at(createText(CENTER, 'PRO PRINT EXPRESS'), 6, 6, 70, 9)
  brand.fontSizePt = 14
  brand.fontWeight = 700
  brand.color = '#ffffff'

  const from = at(createText(CENTER, 'From: Pro Print Co.\n123 Market St, Hanoi'), 6, 24, 56, 14)
  from.fontSizePt = 9
  from.color = '#5b6575'

  const to = at(createText(CENTER, 'To: Nguyen Van A\n456 Le Loi, Da Nang\n0901 234 567'), 6, 44, 58, 22)
  to.fontSizePt = 11
  to.fontWeight = 700

  const qr = at(createQr(CENTER, 'https://propr.int/track/PP123456789VN'), 68, 24, 26, 26)

  const divider = at(createLine(CENTER), 4, 70, 92, 4)
  divider.strokeStyle = 'dashed'
  divider.strokeColor = '#94a3b8'

  const barcode = at(createBarcode(CENTER, 'PP123456789VN'), 10, 80, 80, 22)

  const care = at(createText(CENTER, 'Fragile — handle with care'), 6, 110, 60, 8)
  care.fontSizePt = 9
  care.color = '#dc2626'

  const star = at(createShape(CENTER, 'star'), 82, 106, 12, 12)
  star.fillColor = '#fde68a'
  star.strokeColor = '#b45309'

  doc.elements.push(header, brand, from, to, qr, divider, barcode, care, star)
  return doc
}

function priceTag(): TemplateDocument {
  const doc = createEmptyTemplate('Product price tag', PAGE_PRESETS.label50x30)
  const name = at(createText(CENTER, 'Arabica Coffee 250g'), 2, 2, 46, 7)
  name.fontSizePt = 8
  name.fontWeight = 700

  const price = at(createText(CENTER, '129.000đ'), 2, 9, 30, 10)
  price.fontSizePt = 16
  price.fontWeight = 700
  price.color = '#dc2626'

  const barcode = at(createBarcode(CENTER, '4006381333931'), 2, 20, 32, 9)
  barcode.format = 'EAN13'

  const accent = at(createShape(CENTER, 'diamond'), 38, 11, 9, 9)
  doc.elements.push(name, price, barcode, accent)
  return doc
}

function deliveryNote(): TemplateDocument {
  const doc = createEmptyTemplate('Delivery note', PAGE_PRESETS.a5)
  const title = at(createText(CENTER, 'DELIVERY NOTE'), 10, 12, 128, 11)
  title.fontSizePt = 18
  title.fontWeight = 700
  title.align = 'center'

  const rule = at(createLine(CENTER), 10, 24, 128, 3)
  rule.strokeColor = '#18202e'

  const order = at(createText(CENTER, 'Order #: DN-2026-0158\nDate: 2026-07-14'), 10, 30, 62, 14)
  order.fontSizePt = 10

  const customer = at(createText(CENTER, 'Customer: Cafe 24\n789 Tran Phu, Hue'), 78, 30, 60, 14)
  customer.fontSizePt = 10

  const items = at(createTable(CENTER), 10, 52, 128, 52)
  items.rows = [
    ['Arabica beans 1kg', '2', '24.00'],
    ['Paper cups (50)', '3', '7.50'],
    ['Cold brew bottle', '1', '9.00'],
  ]

  const total = at(createText(CENTER, 'Total: $72.00'), 78, 110, 60, 9)
  total.fontSizePt = 12
  total.fontWeight = 700
  total.align = 'right'

  const footerRule = at(createLine(CENTER), 10, 126, 128, 3)
  footerRule.strokeStyle = 'dotted'
  footerRule.strokeColor = '#94a3b8'

  const thanks = at(createText(CENTER, 'Thank you for your business!'), 10, 132, 128, 8)
  thanks.fontSizePt = 9
  thanks.align = 'center'
  thanks.color = '#5b6575'

  doc.elements.push(title, rule, order, customer, items, total, footerRule, thanks)
  return doc
}

function binLabel(): TemplateDocument {
  // Landscape variant of the shipping preset - custom sizes are first-class.
  const doc = createEmptyTemplate('Warehouse bin label', {
    ...PAGE_PRESETS.label100x150,
    widthMm: 150,
    heightMm: 100,
    orientation: 'landscape',
  })
  const bin = at(createText(CENTER, 'BIN A-12'), 8, 8, 95, 22)
  bin.fontSizePt = 36
  bin.fontWeight = 700

  const hex = at(createShape(CENTER, 'hexagon'), 112, 8, 30, 30)
  hex.fillColor = '#fef9c3'
  hex.strokeStyle = 'dashed'

  const barcode = at(createBarcode(CENTER, 'A12-0091'), 8, 42, 80, 26)
  barcode.format = 'CODE39'

  const arrow = at(createShape(CENTER, 'arrow'), 100, 46, 42, 20)
  arrow.fillColor = '#2a6fdb'
  arrow.strokeWidthMm = 0

  const location = at(createText(CENTER, 'Aisle A · Rack 12 · Level 3'), 8, 78, 90, 9)
  location.fontSizePt = 11
  location.color = '#5b6575'

  doc.elements.push(bin, hex, barcode, arrow, location)
  return doc
}

function eventBadge(): TemplateDocument {
  const doc = createEmptyTemplate('Event badge', PAGE_PRESETS.label100x150)
  const avatar = at(createCircle(CENTER), 35, 12, 30, 30)
  avatar.fillColor = '#e8f0fd'
  avatar.strokeColor = '#2a6fdb'

  const name = at(createText(CENTER, 'LINH TRAN'), 10, 50, 80, 12)
  name.fontSizePt = 20
  name.fontWeight = 700
  name.align = 'center'

  const role = at(createText(CENTER, 'Speaker'), 10, 64, 80, 9)
  role.fontSizePt = 12
  role.align = 'center'
  role.color = '#2a6fdb'

  const qr = at(createQr(CENTER, 'https://event.example/checkin/8841'), 35, 80, 30, 30)

  const rule = at(createLine(CENTER), 10, 116, 80, 3)
  rule.strokeStyle = 'dotted'
  rule.strokeColor = '#94a3b8'

  const org = at(createText(CENTER, 'VietDev Conference 2026'), 10, 122, 80, 8)
  org.fontSizePt = 9
  org.align = 'center'
  org.color = '#5b6575'

  const sparkLeft = at(createShape(CENTER, 'star4'), 12, 78, 10, 10)
  sparkLeft.fillColor = '#fde68a'
  sparkLeft.strokeColor = '#b45309'
  const sparkRight = at(createShape(CENTER, 'star4'), 78, 78, 10, 10)
  sparkRight.fillColor = '#fde68a'
  sparkRight.strokeColor = '#b45309'

  doc.elements.push(avatar, name, role, qr, rule, org, sparkLeft, sparkRight)
  return doc
}

/** Ordering matters: seeded oldest-first so the library lists them nicely. */
export function createDemoTemplates(): TemplateDocument[] {
  return [eventBadge(), binLabel(), deliveryNote(), priceTag(), shippingLabel()]
}
