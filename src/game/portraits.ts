import type { AvatarLook, Expression } from './avatars'
import { hashString, luminance, mix, shade } from './pixel/color'
import { Raster, pack } from './pixel/raster'

/**
 * Head-and-shoulders portraits for the table, 48 art pixels square.
 *
 * Twice the detail of the old 24-pixel faces, which is what lets a tell read as
 * a person doing something — eyes sliding to the chips, a mouth tightening —
 * rather than a caption. Lit from the top left like the rest of the game: a
 * highlight, a base and a shade for skin, hair and clothes, a darker line for
 * features, and a near-black outline round the silhouette.
 *
 * A character's look gives the colours, hair and accessory. Everything else —
 * the shape of the face, the brows, the nose, the collar — comes from a hash of
 * the look, so two people who happen to share a palette still do not share a
 * face.
 */

export const PORTRAIT_SIZE = 48

const OUTLINE = '#1c1418'
const EYE_WHITE = '#f8f8f8'
const MOUTH = '#6a2a2a'
const TEETH = '#f8f0f0'
const TONGUE = '#c85a5a'
const SWEAT = '#90d8f8'
const BLUSH = '#f0907a'

interface Traits {
  /** 0 round, 1 long, 2 square. */
  face: number
  brows: 'thin' | 'thick'
  nose: 'small' | 'long' | 'wide'
  collar: 'tee' | 'collar' | 'suit' | 'polo'
  /** Which side a fringe falls to, for short hair. */
  part: -1 | 1
  freckles: boolean
  smile: boolean
  tie: string
}

function traitsFor(look: AvatarLook, seed: string): Traits {
  const h = (salt: string) => hashString(`${seed}|${look.skin}|${look.hair}|${look.shirt}|${salt}`)
  const dark = luminance(look.shirt) < 0.16
  const collars: Traits['collar'][] = ['tee', 'collar', 'polo', 'collar']
  return {
    face: Math.floor(h('face') * 3),
    brows: h('brows') < 0.5 ? 'thin' : 'thick',
    nose: (['small', 'long', 'wide'] as const)[Math.floor(h('nose') * 3)],
    collar: dark ? 'suit' : collars[Math.floor(h('collar') * collars.length)],
    part: h('part') < 0.5 ? -1 : 1,
    freckles: luminance(look.skin) > 0.62 && h('freckles') < 0.3,
    smile: h('smile') < 0.4,
    tie: ['#a82838', '#2848a0', '#c8a030', '#286848', '#e8e8f0'][Math.floor(h('tie') * 5)],
  }
}

/** Left and right edge of the face on each row, for the head shape. */
function faceRows(kind: number): Map<number, [number, number]> {
  const rows = new Map<number, [number, number]>()
  // Rows are shared down to the cheekbones; the jaw is where faces differ.
  const top: [number, number, number][] = [
    [8, 18, 29],
    [9, 16, 31],
    [10, 15, 32],
    [11, 14, 33],
  ]
  for (const [y, a, b] of top) rows.set(y, [a, b])
  for (let y = 12; y <= 24; y++) rows.set(y, [13, 34])
  const jaws: [number, number, number][][] = [
    // Round.
    [
      [25, 13, 34],
      [26, 14, 33],
      [27, 14, 33],
      [28, 15, 32],
      [29, 16, 31],
      [30, 17, 30],
      [31, 19, 28],
      [32, 21, 26],
    ],
    // Long, with a narrower chin.
    [
      [25, 14, 33],
      [26, 14, 33],
      [27, 15, 32],
      [28, 15, 32],
      [29, 16, 31],
      [30, 17, 30],
      [31, 18, 29],
      [32, 20, 27],
      [33, 21, 26],
    ],
    // Square, with a broad jaw.
    [
      [25, 13, 34],
      [26, 13, 34],
      [27, 14, 33],
      [28, 14, 33],
      [29, 15, 32],
      [30, 16, 31],
      [31, 18, 29],
      [32, 20, 27],
    ],
  ]
  for (const [y, a, b] of jaws[kind]) rows.set(y, [a, b])
  return rows
}

export function drawPortrait(look: AvatarLook, expression: Expression, seed: string): Raster {
  const t = traitsFor(look, seed)
  const r = new Raster(PORTRAIT_SIZE, PORTRAIT_SIZE)
  const skin = look.skin
  const skinLit = mix(shade(skin, 1.12), '#fff0e0', 0.12)
  const skinShade = mix(shade(skin, 0.8), '#6a3050', 0.12)
  const skinDeep = shade(skin, 0.6)
  const line = mix(shade(skin, 0.42), '#3a1a20', 0.3)
  const hair = look.hair
  const hairLit = mix(shade(hair, 1.35), '#ffffff', luminance(hair) < 0.12 ? 0.18 : 0.08)
  const hairShade = shade(hair, 0.68)
  const shirt = look.shirt
  const shirtLit = mix(shade(shirt, 1.25), '#ffffff', 0.08)
  const shirtShade = shade(shirt, 0.7)
  const shirtDeep = shade(shirt, 0.5)

  // An arm shift moves the whole body a pixel, the way the cue would.
  const lean = expression === 'arm-shift' ? 1 : 0

  // --- Shoulders and clothes ----------------------------------------------
  const torso: [number, number, number][] = [
    [36, 13, 34],
    [37, 9, 38],
    [38, 6, 41],
    [39, 4, 43],
    [40, 3, 44],
  ]
  for (let y = 41; y < 48; y++) torso.push([y, 2, 45])
  for (const [y, a, b] of torso) {
    for (let x = a; x <= b; x++) {
      const xs = x + lean
      // Lit from the left; the far shoulder and the folds under the arms in shade.
      let c = shirt
      if (x > 35 || (y > 42 && x > 32)) c = shirtShade
      if (x < 12 && y < 42) c = shirtLit
      if ((x === 10 || x === 37) && y > 41) c = shirtDeep
      r.put(xs, y, c)
    }
  }

  // Neck, in shade under the jaw.
  for (let y = 30; y <= 37; y++) {
    for (let x = 19; x <= 28; x++) r.put(x, y, y < 34 ? skinShade : skin)
  }
  for (let x = 19; x <= 28; x++) r.put(x, 30, skinDeep)

  // Necklines.
  if (t.collar === 'tee') {
    for (let x = 18; x <= 29; x++) r.put(x, 36, shirtShade)
    for (let x = 19; x <= 28; x++) r.put(x, 37, x < 21 || x > 26 ? shirt : skin)
  } else if (t.collar === 'polo') {
    for (let y = 35; y <= 39; y++) {
      r.put(23, y, shirtDeep)
      r.put(24, y, shirtDeep)
    }
    r.sprite(['ccc....ccc', 'cccc..cccc', '.cc....cc.'], 19, 35, { c: shirtLit })
    r.put(23, 38, '#e8e8e0')
  } else if (t.collar === 'collar') {
    // A shirt collar: two white-ish points either side of the throat.
    const collar = mix(shirt, '#f8f8f0', 0.55)
    r.sprite(['cc......cc', 'ccc....ccc', '.ccc..ccc.', '..cc..cc..'], 19, 34, { c: collar })
    for (let y = 37; y < 48; y += 3) r.put(23, y, shirtDeep)
  } else {
    // A jacket over a white shirt and a tie: the high-stakes regulars.
    const lapel = shade(shirt, 1.6)
    for (let y = 36; y < 48; y++) {
      const half = Math.min(6, Math.floor((y - 35) / 1.6) + 1)
      for (let x = 24 - half; x < 24 + half; x++) r.put(x, y, '#ecece4')
      r.put(24 - half - 1, y, lapel)
      r.put(24 + half, y, lapel)
    }
    for (let y = 37; y < 48; y++) {
      const w = y < 39 ? 1 : 2
      for (let x = 24 - w; x < 24 + w; x++) r.put(x, y, t.tie)
    }
    r.put(23, 37, shade(t.tie, 0.7))
    r.put(24, 37, shade(t.tie, 0.7))
  }

  // --- Head ------------------------------------------------------------------
  const rows = faceRows(t.face)
  for (const [y, [a, b]] of rows) {
    for (let x = a; x <= b; x++) {
      let c = skin
      if (x >= b - 2 || y >= 30) c = skinShade
      if (x <= a + 2 && y >= 13 && y <= 22) c = skinLit
      r.put(x, y, c)
    }
  }
  // Cheek highlight and the shadow the nose and jaw throw.
  r.rect(15, 23, 3, 2, skinLit)
  for (const [y, [, b]] of rows) if (y >= 27) r.put(b - 1, y, skinShade)

  // Ears.
  for (let y = 18; y <= 24; y++) {
    r.put(11, y, y === 18 || y === 24 ? OUTLINE : skin)
    r.put(12, y, skinShade)
    r.put(35, y, skinShade)
    r.put(36, y, y === 18 || y === 24 ? OUTLINE : skinShade)
  }
  r.put(12, 20, skinDeep)
  r.put(35, 20, skinDeep)

  // --- Hair -------------------------------------------------------------------
  drawHair(r, look, t, { hair, hairLit, hairShade, skinShade })

  // --- Face features ---------------------------------------------------------
  drawEyes(r, expression, line, t)
  drawBrows(r, expression, t, shade(hair, luminance(hair) > 0.6 ? 0.55 : 0.85))
  drawNose(r, t, skinShade, line)
  drawMouth(r, expression, t, line)

  if (t.freckles) for (const [x, y] of [[16, 24], [18, 25], [29, 24], [31, 25], [17, 26]]) r.put(x, y, shade(skin, 0.82))
  if (expression === 'won' || expression === 'lip-twitch') {
    r.rect(15, 25, 2, 1, BLUSH)
    r.rect(31, 25, 2, 1, BLUSH)
  }
  if (expression === 'lost' || expression === 'thinking' || expression === 'stillness') {
    // A bead of sweat sells the moment a big bet lands.
    r.sprite(['.s.', 'sss', 'ssw', '.s.'], 33, 11, { s: SWEAT, w: '#f8f8ff' })
  }

  drawAccessory(r, look)

  // Everything gets the dark outline that separates a sprite from its ground.
  r.outline(OUTLINE)
  return r
}

function drawHair(
  r: Raster,
  look: AvatarLook,
  t: Traits,
  c: { hair: string; hairLit: string; hairShade: string; skinShade: string },
) {
  const { hair, hairLit, hairShade } = c
  const fill = (x: number, y: number, w: number, h: number, ink = hair) => r.rect(x, y, w, h, ink)
  switch (look.hairStyle) {
    case 'bald': {
      // A fringe round the back and sides, and the shine on top.
      for (let y = 16; y <= 22; y++) {
        r.put(13, y, hairShade)
        r.put(34, y, hairShade)
      }
      r.rect(13, 17, 2, 4, hair)
      r.rect(33, 17, 2, 4, hairShade)
      r.rect(18, 10, 4, 1, '#fff8f0')
      r.rect(17, 11, 2, 1, '#fff8f0')
      return
    }
    case 'long': {
      // Falls past the ears to the shoulders on both sides.
      fill(14, 5, 20, 4)
      fill(12, 7, 24, 5)
      fill(10, 11, 5, 26)
      fill(33, 11, 5, 26)
      fill(9, 20, 3, 18, hairShade)
      fill(36, 20, 3, 18, hairShade)
      fill(15, 12, 5, 2)
      fill(28, 12, 5, 2)
      r.rect(15, 6, 8, 1, hairLit)
      r.rect(13, 9, 3, 1, hairLit)
      r.rect(11, 14, 1, 10, hairLit)
      for (let y = 14; y < 36; y += 4) r.put(35, y, hair)
      break
    }
    case 'tied': {
      // Pulled back from the face, with the tail showing over one shoulder.
      fill(14, 5, 20, 4)
      fill(12, 8, 24, 4)
      fill(12, 12, 3, 6)
      fill(33, 12, 3, 6, hairShade)
      fill(36, 12, 5, 4, hairShade)
      fill(38, 15, 4, 12, hairShade)
      fill(37, 26, 4, 4, hairShade)
      r.rect(39, 12, 2, 2, '#c84a6a')
      r.rect(16, 6, 7, 1, hairLit)
      r.rect(14, 9, 3, 1, hairLit)
      // A parting line.
      for (let y = 6; y <= 10; y++) r.put(22, y, hairShade)
      break
    }
    default: {
      // Short: a cap of hair, the fringe swept to one side.
      fill(14, 5, 20, 4)
      fill(12, 8, 24, 4)
      fill(12, 12, 2, 7)
      fill(34, 12, 2, 7, hairShade)
      if (t.part === 1) {
        fill(14, 12, 12, 2)
        fill(14, 14, 6, 1)
        fill(26, 12, 6, 1)
      } else {
        fill(22, 12, 12, 2)
        fill(28, 14, 6, 1)
        fill(16, 12, 6, 1)
      }
      r.rect(16, 6, 9, 1, hairLit)
      r.rect(14, 9, 4, 1, hairLit)
      r.rect(13, 12, 1, 4, hairLit)
      r.rect(30, 9, 4, 2, hairShade)
    }
  }
  // Under the fringe the forehead is in shade: one pixel of shadow below the
  // lowest hair in every column across the face.
  const isHair = new Set([pack(hair), pack(hairLit), pack(hairShade)])
  for (let x = 14; x <= 33; x++) {
    for (let y = 16; y >= 9; y--) {
      if (!isHair.has(r.get(x, y))) continue
      if (!r.isClear(x, y + 1) && !isHair.has(r.get(x, y + 1))) r.put(x, y + 1, c.skinShade)
      break
    }
  }
}

function drawEyes(r: Raster, expression: Expression, line: string, t: Traits) {
  const left = 17
  const right = 27
  const y = 19
  const iris = '#2a2a3a'
  const glint = '#ffffff'

  if (expression === 'won') {
    // Squeezed shut with delight: ^ ^
    for (const x of [left, right]) {
      r.rect(x, y + 1, 1, 1, line)
      r.rect(x + 1, y, 2, 1, line)
      r.rect(x + 3, y + 1, 1, 1, line)
    }
    return
  }

  // Where the pupil sits inside each eye.
  let dx = 1
  let dy = 0
  if (expression === 'glance') dx = 2
  if (expression === 'chip-tap') dy = 1
  if (expression === 'thinking') {
    dx = 0
    dy = -1
  }
  const narrow = expression === 'lost'
  const wide = expression === 'stillness' || expression === 'arm-shift'

  for (const x of [left, right]) {
    // Upper lid, the white, and a two-by-two iris with a glint.
    r.rect(x - 1, y - 1, 6, 1, line)
    if (narrow) {
      r.rect(x, y, 4, 2, EYE_WHITE)
      r.rect(x - 1, y, 6, 1, line)
      r.rect(x + dx, y + 1, 2, 1, iris)
      continue
    }
    r.rect(x, y, 4, wide ? 4 : 3, EYE_WHITE)
    if (wide) {
      // A fixed stare: the pupil shrinks to a point.
      r.rect(x + 1, y + 1, 2, 2, iris)
      r.put(x + 1, y + 1, glint)
    } else {
      r.rect(x + dx, y + dy + 1, 2, 2, iris)
      r.put(x + dx, y + dy + 1, glint)
    }
    // Lower lash line, softer than the upper.
    if (t.brows === 'thick') r.put(x + 3, y + (wide ? 4 : 3), line)
  }
}

function drawBrows(r: Raster, expression: Expression, t: Traits, ink: string) {
  const thick = t.brows === 'thick'
  // Inner ends of the brows, relative to the outer ends: up for worry, down for a scowl.
  let tilt = 0
  let lift = 0
  if (expression === 'lost') tilt = -1
  if (expression === 'thinking') tilt = 1
  if (expression === 'won' || expression === 'stillness') lift = -1
  const y = 16 + lift
  // Left brow runs x 16..21, right brow 26..31; the inner end is nearer the nose.
  for (let i = 0; i < 6; i++) {
    const innerness = i / 5
    const yy = y + Math.round(tilt * innerness)
    r.put(16 + i, yy, ink)
    r.put(31 - i, yy + (expression === 'thinking' && i < 3 ? -1 : 0), ink)
    if (thick) {
      r.put(16 + i, yy - 1, ink)
      r.put(31 - i, yy - 1 + (expression === 'thinking' && i < 3 ? -1 : 0), ink)
    }
  }
}

function drawNose(r: Raster, t: Traits, skinShade: string, line: string) {
  if (t.nose === 'long') {
    for (let y = 21; y <= 26; y++) r.put(25, y, skinShade)
    r.put(24, 26, line)
    r.put(22, 26, skinShade)
  } else if (t.nose === 'wide') {
    for (let y = 22; y <= 25; y++) r.put(25, y, skinShade)
    r.rect(21, 26, 2, 1, line)
    r.rect(25, 26, 2, 1, line)
  } else {
    for (let y = 22; y <= 24; y++) r.put(25, y, skinShade)
    r.put(24, 25, line)
  }
}

function drawMouth(r: Raster, expression: Expression, t: Traits, line: string) {
  const y = 28
  switch (expression) {
    case 'won':
      // A wide open grin.
      r.rect(20, y - 1, 8, 1, MOUTH)
      r.rect(19, y, 10, 2, MOUTH)
      r.rect(20, y, 8, 1, TEETH)
      r.rect(21, y + 1, 6, 1, TONGUE)
      r.rect(20, y + 2, 8, 1, MOUTH)
      return
    case 'lost':
      // Turned down at both corners.
      r.rect(21, y, 6, 1, line)
      r.put(20, y + 1, line)
      r.put(27, y + 1, line)
      return
    case 'lip-twitch':
      // One corner pulled up, the other flat.
      r.rect(20, y, 6, 1, line)
      r.put(26, y - 1, line)
      r.put(27, y - 1, line)
      return
    case 'arm-shift':
      r.rect(21, y - 1, 5, 1, line)
      r.rect(21, y, 5, 1, MOUTH)
      r.rect(21, y + 1, 5, 1, line)
      return
    case 'thinking':
      // Pursed to one side.
      r.rect(23, y, 4, 1, line)
      r.put(22, y - 1, line)
      return
    case 'stillness':
      r.rect(20, y, 8, 1, line)
      return
    default:
      if (t.smile) {
        r.rect(21, y, 6, 1, line)
        r.put(20, y - 1, line)
        r.put(27, y - 1, line)
      } else {
        r.rect(21, y, 6, 1, line)
      }
  }
}

function drawAccessory(r: Raster, look: AvatarLook) {
  switch (look.accessory) {
    case 'glasses': {
      const frame = '#2a2a38'
      for (const x of [16, 26]) {
        r.box(x - 1, 17, 7, 6, frame)
        r.put(x, 18, '#c8e8f8')
      }
      r.rect(22, 19, 4, 1, frame)
      r.put(14, 19, frame)
      r.put(33, 19, frame)
      return
    }
    case 'shades': {
      const lens = '#18181e'
      for (const x of [15, 26]) {
        r.rect(x, 17, 7, 5, lens)
        r.rect(x + 1, 18, 2, 1, '#5a5a78')
      }
      r.rect(22, 18, 4, 1, lens)
      r.rect(13, 18, 2, 1, lens)
      r.rect(33, 18, 2, 1, lens)
      return
    }
    case 'cap': {
      const cap = '#2f3d5c'
      const capLit = '#4a5d86'
      const capShade = '#222c44'
      r.rect(13, 3, 22, 3, cap)
      r.rect(12, 6, 24, 6, cap)
      r.rect(14, 4, 8, 1, capLit)
      r.rect(13, 7, 4, 3, capLit)
      r.rect(30, 6, 5, 6, capShade)
      // The peak, coming at you.
      r.rect(10, 12, 26, 2, capShade)
      r.rect(11, 12, 12, 1, cap)
      r.put(23, 5, '#d9c46a')
      return
    }
    case 'visor': {
      const visor = '#1e6c42'
      r.rect(12, 10, 24, 3, visor)
      r.rect(13, 10, 10, 1, '#3a9a62')
      r.rect(9, 13, 24, 2, '#16502f')
      return
    }
    case 'earring': {
      r.put(11, 25, '#f0c840')
      r.put(11, 26, '#c89820')
      r.put(36, 25, '#f0c840')
      r.put(36, 26, '#c89820')
      return
    }
  }
}

const cache = new Map<string, string>()

/** A portrait as a data URL at its native 48x48, cached per face and expression. */
export function portraitUrl(look: AvatarLook, expression: Expression, seed: string): string {
  const key = `${seed}|${look.skin}|${look.hair}|${look.hairStyle}|${look.shirt}|${look.accessory}|${expression}`
  const hit = cache.get(key)
  if (hit) return hit
  const url = drawPortrait(look, expression, seed).toDataURL()
  cache.set(key, url)
  return url
}
