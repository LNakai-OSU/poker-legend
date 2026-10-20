import { INK, glow, rounded, shadow, speck, text, textCentred, textWidth, tint, type Px } from '../pixelArt'

/**
 * The parts a building is made of.
 *
 * A GBA house reads first as a roof — courses of shingle in two tones, a lit
 * ridge, eaves that overhang the wall and throw a dark line under them — and
 * then as a light wall with framed windows and a door with a step. These are
 * those parts, each drawn the same way everywhere so a street of different
 * buildings still looks like one town. The buildings themselves are in
 * `buildingArt.ts`, and every one of them is put together from here.
 *
 * Coordinates are art units from the stamp's top-left; 16 to a tile.
 */

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

export interface RoofPalette {
  /** The outline: top edge, gable ends and the eave line. */
  line: string
  /** The ridge cap along the top. */
  ridge: string
  /** Lit edge of a course. */
  hi: string
  /** The two alternating course tones. */
  a: string
  b: string
  /** The shadow line under each course and between tabs. */
  seam: string
  /** The board along the bottom edge of the roof. */
  fascia: string
}

export interface WallPalette {
  hi: string
  base: string
  lo: string
  /** Mortar, grooves, joints. */
  line: string
}

export interface WindowStyle {
  /** The dark outline round the opening. */
  frame: string
  /** The painted frame and glazing bars. */
  trim: string
  glass: string
  glassHi: string
  sill: string
  curtain?: string
  /** A box of flowers under the sill. */
  flowers?: boolean
  /** Glazing bars: a cross, one down the middle, or none. */
  bars?: 'cross' | 'vertical' | 'none'
  /** Shutters either side, in this colour. */
  shutters?: string
}

export interface DoorStyle {
  line: string
  trim: string
  leaf: string
  /** A glass panel in the upper half of the door, in this colour. */
  glass?: string
  step?: string
  knob?: string
}

// ---------------------------------------------------------------------------
// Roofs
// ---------------------------------------------------------------------------

/**
 * A pitched roof seen from the front: shingle courses in two tones, a lit ridge
 * along the top, the gable ends outlined, and a fascia board under the eave.
 */
export function shingleRoof(px: Px, x: number, y: number, w: number, h: number, p: RoofPalette, course = 4) {
  px(x + 1, y, w - 2, h, p.line)
  px(x, y + 1, w, h - 1, p.line)
  // Ridge cap.
  px(x + 1, y + 1, w - 2, 2, p.ridge)
  px(x + 2, y + 1, w - 4, 1, p.hi)
  // Courses, getting a touch darker towards the eave as the roof turns away from the light.
  let row = 0
  const courses = Math.max(1, Math.floor((h - 5) / course))
  for (let cy = y + 3; cy < y + h - 2; cy += course) {
    const fade = -0.16 * (row / courses)
    const tone = tint(row % 2 === 0 ? p.a : p.b, fade)
    const height = Math.min(course, y + h - 2 - cy)
    px(x + 1, cy, w - 2, height, tone)
    px(x + 1, cy, w - 2, 1, tint(tone, 0.16))
    if (height === course) px(x + 1, cy + course - 1, w - 2, 1, p.seam)
    // Staggered tab seams.
    const offset = row % 2 === 0 ? 2 : 5
    for (let sx = x + offset; sx < x + w - 2; sx += 6) px(sx, cy + 1, 1, Math.max(1, height - 2), p.seam)
    row++
  }
  // Light down the left gable, shade down the right.
  px(x + 1, y + 2, 1, h - 4, p.hi)
  px(x + w - 2, y + 2, 1, h - 4, p.seam)
  // Fascia, then the eave line.
  px(x + 1, y + h - 2, w - 2, 1, p.fascia)
  px(x, y + h - 1, w, 1, p.line)
}

/** Slate: small grey-blue slates in tight courses, cooler and flatter than shingle. */
export function slateRoof(px: Px, x: number, y: number, w: number, h: number, p: RoofPalette) {
  shingleRoof(px, x, y, w, h, p, 3)
  // Slates are smaller than shingles: an extra seam in each course.
  let row = 0
  for (let cy = y + 3; cy < y + h - 4; cy += 3) {
    const offset = row % 2 === 0 ? 4 : 1
    for (let sx = x + offset; sx < x + w - 2; sx += 6) px(sx, cy, 1, 2, p.seam)
    row++
  }
}

/** Barrel tiles in columns, Spanish style: the island and the waterfront. */
export function barrelRoof(px: Px, x: number, y: number, w: number, h: number, p: RoofPalette) {
  px(x + 1, y, w - 2, h, p.line)
  px(x, y + 1, w, h - 1, p.line)
  px(x + 1, y + 1, w - 2, 2, p.ridge)
  px(x + 2, y + 1, w - 4, 1, p.hi)
  for (let cx = x + 1; cx < x + w - 1; cx += 4) {
    const width = Math.min(4, x + w - 1 - cx)
    px(cx, y + 3, width, h - 5, p.a)
    px(cx, y + 3, 1, h - 5, p.hi)
    if (width > 2) px(cx + 2, y + 3, 1, h - 5, p.b)
    if (width > 3) px(cx + 3, y + 3, 1, h - 5, p.seam)
  }
  // Courses: each tile's lower lip throws a shadow on the next.
  for (let cy = y + 7; cy < y + h - 2; cy += 5) px(x + 1, cy, w - 2, 1, p.seam)
  px(x + 1, y + h - 2, w - 2, 1, p.fascia)
  px(x, y + h - 1, w, 1, p.line)
}

/** Corrugated tin: the river town's sheds and stores. */
export function tinRoof(px: Px, x: number, y: number, w: number, h: number, p: RoofPalette) {
  px(x, y, w, h, p.line)
  px(x + 1, y + 1, w - 2, h - 2, p.a)
  for (let cx = x + 1; cx < x + w - 1; cx += 3) {
    px(cx, y + 1, 1, h - 3, p.hi)
    px(cx + 2, y + 1, 1, h - 3, p.seam)
  }
  // Rust where the sheets overlap, and the odd streak.
  for (const [rx, ry] of [[0.2, 0.5], [0.55, 0.3], [0.8, 0.65]]) {
    px(x + Math.round(w * rx), y + Math.round(h * ry), 2, 3, p.b)
  }
  px(x + 1, y + Math.round(h / 2), w - 2, 1, p.seam)
  px(x + 1, y + h - 2, w - 2, 1, p.fascia)
}

/**
 * A flat roof seen from above: the parapet cap round its edge, the tar or
 * gravel inside it, and the cornice along the front edge where it meets the
 * facade. Shops, casinos and towers are mostly this.
 */
export function flatRoof(
  px: Px, x: number, y: number, w: number, h: number,
  cap: { hi: string; base: string; lo: string }, surface: string,
) {
  px(x, y, w, h, cap.lo)
  px(x + 1, y, w - 2, 1, cap.hi)
  px(x, y + 1, w, 1, cap.base)
  // Inside the parapet.
  if (h > 5) {
    px(x + 2, y + 2, w - 4, h - 5, surface)
    px(x + 2, y + 2, w - 4, 1, tint(surface, -0.25))
    for (let gy = y + 3; gy < y + h - 3; gy++) {
      for (let gx = x + 2; gx < x + w - 2; gx++) {
        if (speck(gx, gy, 5, 9)) px(gx, gy, 1, 1, tint(surface, 0.12))
      }
    }
  }
  // The front parapet, lit along its top.
  px(x, y + h - 3, w, 1, cap.hi)
  px(x, y + h - 2, w, 1, cap.base)
  px(x, y + h - 1, w, 1, cap.lo)
}

/** A brick chimney poking up through a roof, with its cap and a dark flue. */
export function chimney(px: Px, x: number, y: number, h: number, brick: string, cap: string) {
  px(x, y + 2, 8, h, tint(brick, -0.5))
  px(x + 1, y + 2, 6, h - 1, brick)
  for (let by = y + 4; by < y + h; by += 3) px(x + 1, by, 6, 1, tint(brick, -0.25))
  px(x + 4, y + 5, 1, 2, tint(brick, -0.25))
  px(x + 1, y + 2, 1, h - 1, tint(brick, 0.18))
  px(x + 6, y + 2, 1, h - 1, tint(brick, -0.3))
  px(x - 1, y, 10, 3, tint(cap, -0.35))
  px(x - 1, y, 10, 2, cap)
  px(x - 1, y, 10, 1, tint(cap, 0.25))
  px(x + 2, y, 4, 1, INK)
  shadow(px, x + 8, y + 3, 2, h - 2, 0.3)
}

/** An air-conditioning unit on a flat roof. */
export function acUnit(px: Px, x: number, y: number) {
  px(x, y + 1, 7, 5, 'rgba(10, 8, 20, 0.3)')
  px(x, y, 6, 5, '#7a8088')
  px(x, y, 6, 1, '#b8c0c8')
  px(x + 1, y + 1, 4, 3, '#5a6068')
  px(x + 2, y + 2, 2, 1, '#9aa2aa')
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

/** Brick in four-unit courses, bricks staggered, the odd brick a shade off. */
export function brickWall(px: Px, x: number, y: number, w: number, h: number, p: WallPalette) {
  px(x, y, w, h, p.line)
  let course = 0
  for (let cy = y; cy < y + h; cy += 4) {
    const height = Math.min(3, y + h - cy)
    const offset = course % 2 === 0 ? 0 : 4
    for (let bx = x - offset; bx < x + w; bx += 8) {
      const left = Math.max(x, bx)
      const right = Math.min(x + w, bx + 7)
      if (right <= left) continue
      const odd = speck(bx, cy, 11, 9)
      const color = odd ? p.lo : speck(bx, cy, 3, 13) ? p.hi : p.base
      px(left, cy, right - left, height, color)
      if (height > 1) px(left, cy, right - left, 1, tint(color, 0.06))
    }
    course++
  }
}

/** Clapboard: overlapping boards, each throwing a thin shadow on the one below. */
export function sidingWall(px: Px, x: number, y: number, w: number, h: number, p: WallPalette) {
  px(x, y, w, h, p.base)
  for (let cy = y; cy < y + h; cy += 3) {
    px(x, cy, w, 1, p.hi)
    if (cy + 2 < y + h) px(x, cy + 2, w, 1, p.lo)
  }
}

/** Smooth render with a little texture in it and grime along the bottom. */
export function stuccoWall(px: Px, x: number, y: number, w: number, h: number, p: WallPalette, seed = 1) {
  px(x, y, w, h, p.base)
  for (let cy = y; cy < y + h; cy++) {
    for (let cx = x; cx < x + w; cx++) {
      if (speck(cx, cy, seed, 23)) px(cx, cy, 1, 1, p.hi)
      else if (speck(cx, cy, seed + 7, 29)) px(cx, cy, 1, 1, p.lo)
    }
  }
}

/** Dressed stone blocks, lit along their top and left edges. */
export function stoneWall(px: Px, x: number, y: number, w: number, h: number, p: WallPalette, block = 8) {
  px(x, y, w, h, p.line)
  let course = 0
  for (let cy = y; cy < y + h; cy += 5) {
    const height = Math.min(4, y + h - cy)
    const offset = course % 2 === 0 ? 0 : block / 2
    for (let bx = x - offset; bx < x + w; bx += block) {
      const left = Math.max(x, bx)
      const right = Math.min(x + w, bx + block - 1)
      if (right <= left) continue
      px(left, cy, right - left, height, speck(bx, cy, 4, 6) ? p.lo : p.base)
      px(left, cy, right - left, 1, p.hi)
      px(left, cy, 1, height, p.hi)
    }
    course++
  }
}

/** Adobe: soft-edged earth render, darker at the foot where the dust collects. */
export function adobeWall(px: Px, x: number, y: number, w: number, h: number, p: WallPalette) {
  stuccoWall(px, x, y, w, h, p, 9)
  px(x, y + h - 4, w, 4, p.lo)
  for (let cx = x; cx < x + w; cx += 3) px(cx, y + h - 5, 2, 1, p.lo)
}

/** A plinth along the foot of a wall, so the building sits on the ground. */
export function plinth(px: Px, x: number, y: number, w: number, color: string, h = 2) {
  px(x, y, w, h, color)
  px(x, y, w, 1, tint(color, 0.18))
}

/** The shadow the eave throws on the wall under it. */
export function eaveShadow(px: Px, x: number, y: number, w: number) {
  shadow(px, x, y, w, 1, 0.45)
  shadow(px, x, y + 1, w, 1, 0.22)
}

/** A building's shadow on the ground to its right. */
export function groundShadow(px: Px, w: number, top: number, h: number) {
  shadow(px, w, top + 2, 2, h - top - 2, 0.26)
  shadow(px, w + 2, top + 4, 1, h - top - 4, 0.14)
}

/** A drainpipe down a corner, with its hopper at the top. */
export function downpipe(px: Px, x: number, y: number, h: number, color: string) {
  px(x - 1, y, 4, 2, tint(color, -0.2))
  px(x, y + 2, 2, h - 2, color)
  px(x, y + 2, 1, h - 2, tint(color, 0.25))
  for (let by = y + 6; by < y + h - 2; by += 9) px(x - 1, by, 4, 1, tint(color, -0.3))
}

// ---------------------------------------------------------------------------
// Windows and doors
// ---------------------------------------------------------------------------

/**
 * A framed window: a dark outline, a painted frame, glass lighter at the top
 * with a glint in the top-left pane, glazing bars, and a sill that sticks out
 * a unit either side.
 */
export function windowAt(px: Px, x: number, y: number, w: number, h: number, s: WindowStyle) {
  if (s.shutters) {
    for (const sx of [x - 3, x + w]) {
      px(sx, y, 3, h, tint(s.shutters, -0.35))
      px(sx, y, 3, h - 1, s.shutters)
      for (let ly = y + 1; ly < y + h - 1; ly += 2) px(sx, ly, 3, 1, tint(s.shutters, -0.18))
    }
  }
  px(x, y, w, h, s.frame)
  px(x + 1, y + 1, w - 2, h - 2, s.trim)
  const gx = x + 2
  const gy = y + 2
  const gw = w - 4
  const gh = h - 4
  // A fifth of the windows in a town are dark at night: nobody home.
  const home = (x * 7 + y * 13) % 5 !== 0
  const glass = () => {
    px(gx, gy, gw, gh, s.glass)
    px(gx, gy, gw, Math.ceil(gh / 2), s.glassHi)
  }
  if (home) glow('window', glass)
  else glass()
  if (s.curtain) {
    px(gx, gy, 1, gh, s.curtain)
    px(gx + gw - 1, gy, 1, gh, s.curtain)
    px(gx, gy, gw, 1, tint(s.curtain, -0.2))
  }
  const bars = s.bars ?? 'cross'
  if (bars !== 'none') px(gx + Math.floor(gw / 2), gy, 1, gh, s.trim)
  if (bars === 'cross') px(gx, gy + Math.floor(gh / 2), gw, 1, s.trim)
  // The glint.
  px(gx + (s.curtain ? 1 : 0), gy, 2, 1, '#ffffff')
  px(gx + (s.curtain ? 1 : 0), gy + 1, 1, 1, '#ffffff')
  // Sill.
  px(x - 1, y + h, w + 2, 1, s.sill)
  shadow(px, x - 1, y + h + 1, w + 2, 1, 0.3)
  if (s.flowers) {
    px(x - 1, y + h + 1, w + 2, 3, '#5a3a24')
    px(x - 1, y + h + 1, w + 2, 1, '#7a5234')
    for (let fx = x; fx < x + w; fx += 2) {
      px(fx, y + h - 1, 1, 2, '#3e7a3a')
      px(fx, y + h - 2, 1, 1, fx % 4 === 0 ? '#f06a9a' : '#f6d24a')
    }
  }
}

/** A round window — a porthole, an oculus. */
export function roundWindow(px: Px, cx: number, cy: number, r: number, rim: string, glass: string) {
  const n = parseInt(glass.slice(1), 16)
  const pale = (((n >> 16) & 0xff) * 0.299 + ((n >> 8) & 0xff) * 0.587 + (n & 0xff) * 0.114) / 255 > 0.5
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dy * dy
      if (d > r * r + r) continue
      if (d >= (r - 1) * (r - 1) + 1) px(cx + dx, cy + dy, 1, 1, rim)
      else if (pale) glow('window', () => px(cx + dx, cy + dy, 1, 1, glass))
      else px(cx + dx, cy + dy, 1, 1, glass)
    }
  }
  px(cx - Math.floor(r / 2), cy - Math.floor(r / 2), 1, 1, '#ffffff')
}

/** An arched window: square below, a stepped round head above. */
export function archedWindow(px: Px, x: number, y: number, w: number, h: number, s: WindowStyle) {
  const head = Math.ceil(w / 2)
  px(x, y + 2, w, h - 2, s.frame)
  rounded(px, x, y, w, head + 1, s.frame, Math.min(2, Math.floor(w / 3)))
  px(x + 1, y + 2, w - 2, h - 3, s.trim)
  rounded(px, x + 1, y + 1, w - 2, head, s.trim, Math.min(2, Math.floor(w / 3)))
  glow('window', () => {
    px(x + 2, y + 3, w - 4, h - 5, s.glass)
    px(x + 2, y + 2, w - 4, Math.ceil((h - 4) / 2), s.glassHi)
  })
  px(x + Math.floor(w / 2), y + 2, 1, h - 4, s.trim)
  px(x + 2, y + 3, 1, 2, '#ffffff')
  px(x - 1, y + h, w + 2, 1, s.sill)
  shadow(px, x - 1, y + h + 1, w + 2, 1, 0.3)
}

/**
 * A door in the bottom row of a building, filling one tile: a frame, a leaf
 * with two panels (or glass), a knob, and a stone step in front.
 * (x, y) is the top-left of the door's tile.
 */
export function doorAt(px: Px, x: number, y: number, s: DoorStyle) {
  // Recess, frame and leaf.
  px(x + 2, y, 12, 14, s.line)
  px(x + 3, y + 1, 10, 13, s.trim)
  px(x + 4, y + 2, 8, 12, tint(s.leaf, -0.45))
  px(x + 5, y + 3, 7, 11, s.leaf)
  px(x + 5, y + 3, 7, 1, tint(s.leaf, 0.2))
  if (s.glass) {
    const glass = s.glass
    px(x + 6, y + 4, 5, 4, tint(s.leaf, -0.4))
    glow('window', () => px(x + 6, y + 4, 5, 4, glass))
    px(x + 6, y + 4, 2, 1, '#ffffff')
    px(x + 8, y + 4, 1, 4, tint(s.leaf, -0.2))
  } else {
    px(x + 6, y + 4, 5, 3, tint(s.leaf, -0.2))
    px(x + 6, y + 4, 5, 1, tint(s.leaf, -0.35))
  }
  px(x + 6, y + 9, 5, 3, tint(s.leaf, -0.2))
  px(x + 6, y + 9, 5, 1, tint(s.leaf, -0.35))
  px(x + 10, y + 8, 1, 1, s.knob ?? '#f2c14e')
  // The step.
  const step = s.step ?? '#bab2a2'
  px(x + 1, y + 14, 14, 1, tint(step, 0.18))
  px(x + 1, y + 15, 14, 1, tint(step, -0.2))
}

/** A pair of glass doors with a push bar each, for shops and casinos. */
export function glassDoors(px: Px, x: number, y: number, w: number, frame: string, glass: string, bar: string) {
  px(x, y, w, 15, frame)
  const leaf = Math.floor((w - 3) / 2)
  for (const lx of [x + 1, x + 2 + leaf]) {
    glow('window', () => {
      px(lx, y + 1, leaf, 14, glass)
      px(lx, y + 1, leaf, 6, tint(glass, 0.2))
    })
    px(lx + 1, y + 2, 1, 4, '#ffffff')
    px(lx, y + 8, leaf, 1, bar)
  }
  px(x, y + 15, w, 1, tint(frame, -0.3))
}

// ---------------------------------------------------------------------------
// Shopfronts
// ---------------------------------------------------------------------------

/** A striped awning with a scalloped valance and a shadow under it. */
export function awning(px: Px, x: number, y: number, w: number, h: number, a: string, b: string, stripe = 3) {
  for (let sx = x; sx < x + w; sx += stripe) {
    const color = Math.floor((sx - x) / stripe) % 2 === 0 ? a : b
    px(sx, y, Math.min(stripe, x + w - sx), h, color)
    // Each stripe darker towards the front, where the canvas bends down.
    px(sx, y + h - 2, Math.min(stripe, x + w - sx), 1, tint(color, -0.15))
  }
  px(x, y, w, 1, tint(a, 0.25))
  // Valance: a scallop hanging off every stripe.
  for (let sx = x; sx < x + w; sx += stripe) {
    const color = Math.floor((sx - x) / stripe) % 2 === 0 ? a : b
    px(sx, y + h, Math.min(stripe, x + w - sx) - (stripe > 2 ? 1 : 0), 1, tint(color, -0.25))
  }
  shadow(px, x, y + h + 1, w, 2, 0.32)
}

/** A display window full of goods: a dark interior, shelves, and the stock in front. */
export function displayWindow(
  px: Px, x: number, y: number, w: number, h: number, frame: string, goods: string[], seed = 1,
) {
  px(x, y, w, h, frame)
  glow('window', () => {
    px(x + 1, y + 1, w - 2, h - 2, '#2a3440')
    px(x + 1, y + 1, w - 2, 2, '#3a4a5a')
  })
  // Shelves, and things on them, seen in the shop's own light.
  glow('neon', () => {
    for (let sy = y + 4; sy < y + h - 2; sy += 4) {
      px(x + 1, sy + 2, w - 2, 1, '#6a5a48')
      for (let gx = x + 2; gx < x + w - 2; gx += 3) {
        if (speck(gx, sy, seed, 4)) continue
        const color = goods[(gx + sy + seed) % goods.length]
        px(gx, sy, 2, 2, color)
        px(gx, sy, 1, 1, tint(color, 0.3))
      }
    }
  })
  // Reflections across the glass.
  px(x + 2, y + 2, 1, h - 4, 'rgba(255, 255, 255, 0.22)')
  px(x + 4, y + 2, 1, Math.floor(h / 2), 'rgba(255, 255, 255, 0.14)')
  px(x - 1, y + h, w + 2, 1, tint(frame, 0.2))
}

/** A sign board with a border and lettering. Returns nothing; fits the text to the board. */
export function signBoard(
  px: Px, x: number, y: number, w: number, h: number,
  words: string, board: string, ink: string, border: string,
) {
  px(x, y, w, h, border)
  px(x + 1, y + 1, w - 2, h - 2, board)
  px(x + 1, y + 1, w - 2, 1, tint(board, 0.2))
  const scale = textWidth(words, 2) <= w - 4 && h >= 14 ? 2 : 1
  textCentred(px, words, x + w / 2, y + Math.floor((h - 5 * scale) / 2), ink, scale)
  shadow(px, x, y + h, w, 1, 0.3)
}

/** A sign that hangs off a bracket beside a door, seen face-on. */
export function hangingSign(px: Px, x: number, y: number, words: string, board: string, ink: string) {
  const w = Math.max(9, textWidth(words) + 4)
  px(x, y, w + 2, 1, '#2a2a30')
  px(x + 2, y + 1, 1, 2, '#2a2a30')
  px(x + w - 1, y + 1, 1, 2, '#2a2a30')
  px(x + 1, y + 3, w, 8, tint(board, -0.4))
  px(x + 2, y + 4, w - 2, 6, board)
  text(px, words, x + 3, y + 5, ink)
}

/** A wall lantern, for the side of a door. */
export function wallLamp(px: Px, x: number, y: number, light: string) {
  px(x + 1, y, 1, 1, '#2a2a30')
  px(x, y + 1, 3, 4, '#2a2a30')
  glow('lamp', () => px(x + 1, y + 2, 1, 2, light))
  px(x, y + 5, 3, 1, '#2a2a30')
}

/** A row of light bulbs, alternate ones lit on alternate frames so they chase. */
export function bulbs(px: Px, x: number, y: number, count: number, gap: number, frame: number, on = '#ffe680', off = '#8a6a2a') {
  for (let i = 0; i < count; i++) {
    const lit = (i + frame) % 2 === 0
    if (lit) glow('neon', () => px(x + i * gap, y, 1, 1, on))
    else px(x + i * gap, y, 1, 1, off)
  }
}

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------

/** A stone lintel over a window or door: a lighter band with a shadow under it. */
export function lintel(px: Px, x: number, y: number, w: number, color: string) {
  px(x - 1, y - 2, w + 2, 2, color)
  px(x - 1, y - 2, w + 2, 1, tint(color, 0.2))
}

/** A half-round fanlight over a door. (x, y) is the top-left of the door's tile. */
export function fanlight(px: Px, x: number, y: number, frame: string, glass: string) {
  px(x + 4, y - 4, 8, 4, frame)
  px(x + 3, y - 2, 10, 2, frame)
  glow('window', () => {
    px(x + 5, y - 3, 6, 3, glass)
    px(x + 4, y - 1, 8, 1, glass)
  })
  px(x + 7, y - 3, 1, 3, frame)
  px(x + 9, y - 3, 1, 3, frame)
  px(x + 5, y - 3, 1, 1, '#ffffff')
}

/** A steel roller shutter pulled down over an opening: a door that is shut for the night. */
export function rollerShutter(px: Px, x: number, y: number, w: number, h: number, steel = '#8a9098') {
  px(x, y, w, h, tint(steel, -0.45))
  px(x + 1, y + 1, w - 2, h - 1, steel)
  for (let sy = y + 2; sy < y + h; sy += 2) px(x + 1, sy, w - 2, 1, tint(steel, -0.18))
  px(x + 1, y + 1, w - 2, 1, tint(steel, 0.3))
  px(x, y, w, 2, tint(steel, -0.3))
  px(x + Math.floor(w / 2) - 1, y + h - 3, 3, 1, tint(steel, -0.5))
}

/** Puffs of smoke or steam over a flue, rising on alternate frames. */
export function puffs(px: Px, x: number, y: number, frame: number, color = 'rgba(220, 220, 228, 0.7)') {
  const rise = frame % 2 === 0 ? 0 : -2
  px(x, y + rise, 3, 2, color)
  px(x + 2, y - 3 + rise, 3, 3, color)
  px(x - 1, y - 6 + rise, 2, 2, color)
  if (frame % 2 === 1) px(x + 3, y - 8, 2, 1, color)
}

/** A run of bulbs round the edge of a sign board, chasing on alternate frames. */
export function bulbBorder(
  px: Px, x: number, y: number, w: number, h: number, frame: number, on = '#ffe680', off = '#7a5a20',
) {
  let i = 0
  const dot = (bx: number, by: number) => {
    if ((i + frame) % 2 === 0) glow('neon', () => px(bx, by, 1, 1, on))
    else px(bx, by, 1, 1, off)
    i++
  }
  for (let bx = x; bx < x + w; bx += 2) dot(bx, y)
  for (let by = y + 2; by < y + h; by += 2) dot(x + w - 1, by)
  for (let bx = x + w - 3; bx >= x; bx -= 2) dot(bx, y + h - 1)
  for (let by = y + h - 3; by > y; by -= 2) dot(x, by)
}

/** An iron fire escape: a railed landing, with the ladder down to the next one. */
export function fireEscape(px: Px, x: number, y: number, w: number, drop: number) {
  const iron = '#24242c'
  const lit = '#4a4a58'
  px(x, y + 4, w, 2, iron)
  px(x, y + 4, w, 1, lit)
  px(x, y, w, 1, iron)
  for (let rx = x; rx < x + w; rx += 3) px(rx, y, 1, 5, iron)
  shadow(px, x, y + 6, w, 2, 0.3)
  if (drop > 0) {
    const lx = x + w - 6
    px(lx, y + 6, 1, drop, iron)
    px(lx + 3, y + 6, 1, drop, iron)
    for (let ry = y + 8; ry < y + 6 + drop; ry += 2) px(lx, ry, 4, 1, lit)
  }
}

/** A rooftop water tank on its legs, the way old walk-ups have them. */
export function waterTower(px: Px, x: number, y: number) {
  px(x + 1, y + 10, 1, 5, '#2a2420')
  px(x + 8, y + 10, 1, 5, '#2a2420')
  px(x + 1, y + 12, 8, 1, '#2a2420')
  px(x, y + 3, 10, 8, '#5a3e2a')
  px(x + 1, y + 3, 8, 8, '#7a5638')
  px(x + 1, y + 3, 2, 8, '#94704a')
  px(x, y + 5, 10, 1, '#2a2420')
  px(x, y + 9, 10, 1, '#2a2420')
  px(x + 1, y + 2, 8, 1, '#3a3036')
  px(x + 2, y + 1, 6, 1, '#4a4046')
  px(x + 4, y, 2, 1, '#4a4046')
}

/** A barber's pole: a striped cylinder whose stripes climb on alternate frames. */
export function barberPole(px: Px, x: number, y: number, h: number, frame: number) {
  px(x, y - 2, 4, 2, '#d8dce4')
  px(x, y + h, 4, 2, '#d8dce4')
  px(x, y - 2, 4, 1, '#ffffff')
  glow('neon', () => {
    for (let i = 0; i < h; i++) {
      const phase = (i + frame * 2) % 6
      const color = phase < 2 ? '#d83a3a' : phase < 4 ? '#f4f4f4' : '#3a5ad8'
      px(x, y + i, 4, 1, color)
    }
  })
  px(x, y, 1, h, 'rgba(255, 255, 255, 0.35)')
  px(x + 3, y, 1, h, 'rgba(0, 0, 0, 0.25)')
}

/** A front-loading washing machine seen through a shop window: white box, round glass door. */
export function washer(px: Px, x: number, y: number, drum = '#4a8ad8') {
  px(x, y, 11, 12, '#a8b0b8')
  px(x + 1, y + 1, 9, 10, '#eef1f4')
  px(x + 1, y + 1, 9, 2, '#d0d6dc')
  px(x + 2, y + 1, 2, 1, '#3aa860')
  px(x + 3, y + 4, 5, 6, '#5a6470')
  px(x + 2, y + 5, 7, 4, '#5a6470')
  px(x + 4, y + 5, 3, 4, drum)
  px(x + 3, y + 6, 5, 2, drum)
  px(x + 4, y + 5, 1, 1, '#ffffff')
}

/** A satellite dish bolted to a wall or roof. */
export function dish(px: Px, x: number, y: number) {
  px(x, y, 5, 5, '#c8ccd4')
  px(x + 1, y + 1, 3, 3, '#e8ecf0')
  px(x + 4, y + 2, 2, 1, '#6a7078')
  px(x + 2, y + 5, 1, 2, '#6a7078')
}

/** A canvas canopy projecting over a doorway. */
export function canopy(px: Px, x: number, y: number, w: number, color: string, words = '') {
  px(x, y, w, 5, tint(color, -0.35))
  px(x, y, w, 4, color)
  px(x, y, w, 1, tint(color, 0.25))
  if (words) textCentred(px, words, x + w / 2, y, '#f4ead0')
  shadow(px, x, y + 5, w, 2, 0.35)
}
