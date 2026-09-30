/**
 * Chunky portrait avatars, generated at runtime like the overworld sprites.
 *
 * The point of these is the face: a tell is shown by changing the expression,
 * so reading an opponent means watching a person rather than reading a caption.
 */

export type Expression =
  | 'neutral'
  | 'thinking'
  | 'won'
  | 'lost'
  | 'arm-shift'
  | 'lip-twitch'
  | 'glance'
  | 'stillness'
  | 'chip-tap'

export type HairStyle = 'short' | 'long' | 'bald' | 'tied'
export type Accessory = 'none' | 'glasses' | 'shades' | 'cap' | 'visor' | 'earring'

export interface AvatarLook {
  skin: string
  hair: string
  hairStyle: HairStyle
  shirt: string
  accessory: Accessory
}

const ART = 24
const SCALE = 3
const OUTLINE = '#15151c'

type Px = (x: number, y: number, w: number, h: number, color: string) => void

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 0xff) * factor)))
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 0xff) * factor)))
  const b = Math.max(0, Math.min(255, Math.round((n & 0xff) * factor)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function drawFace(px: Px, look: AvatarLook, expression: Expression) {
  const { skin, hair, shirt } = look

  // Shoulders.
  px(2, 19, 20, 5, OUTLINE)
  px(3, 20, 18, 4, shirt)
  px(3, 20, 18, 1, shade(shirt, 1.25))

  // Head.
  px(5, 3, 14, 17, OUTLINE)
  px(6, 4, 12, 15, skin)
  px(6, 16, 12, 3, shade(skin, 0.94)) // jaw shadow
  px(5, 8, 1, 4, skin) // ears
  px(18, 8, 1, 4, skin)

  // Hair.
  if (look.hairStyle !== 'bald') {
    px(5, 2, 14, 4, hair)
    px(5, 2, 1, 6, hair)
    px(18, 2, 1, 6, hair)
  }
  if (look.hairStyle === 'long') {
    px(4, 5, 2, 12, hair)
    px(18, 5, 2, 12, hair)
  }
  if (look.hairStyle === 'tied') {
    px(19, 6, 3, 5, hair)
  }
  if (look.hairStyle === 'bald') {
    px(6, 4, 12, 2, shade(skin, 1.05))
  }

  // Eyes — the main carrier of expression.
  const eyeY = 10
  const leftX = 8
  const rightX = 13

  const closed = expression === 'stillness'
  const narrowed = expression === 'thinking' || expression === 'lost'
  const wide = expression === 'won'
  const looking = expression === 'glance' ? 1 : expression === 'chip-tap' ? 0 : null

  if (closed) {
    px(leftX, eyeY + 1, 3, 1, OUTLINE)
    px(rightX, eyeY + 1, 3, 1, OUTLINE)
  } else {
    px(leftX, eyeY, 3, narrowed ? 1 : wide ? 3 : 2, '#f4f4f8')
    px(rightX, eyeY, 3, narrowed ? 1 : wide ? 3 : 2, '#f4f4f8')
    // Pupils; a sideways or downward glance is a tell in itself.
    const pupilDx = looking === 1 ? 2 : 0
    const pupilDy = expression === 'chip-tap' ? 1 : 0
    px(leftX + pupilDx, eyeY + pupilDy, 1, narrowed ? 1 : 2, OUTLINE)
    px(rightX + pupilDx, eyeY + pupilDy, 1, narrowed ? 1 : 2, OUTLINE)
  }

  // Brows.
  const browY = expression === 'lost' || expression === 'thinking' ? 8 : 7
  px(leftX - 1, browY, 4, 1, shade(hair, 0.8))
  px(rightX, browY, 4, 1, shade(hair, 0.8))

  // Mouth.
  if (expression === 'won') {
    px(9, 15, 6, 2, '#6b2b2b')
    px(10, 16, 4, 1, '#c96a6a')
  } else if (expression === 'lost') {
    px(9, 16, 6, 1, '#6b2b2b')
    px(8, 15, 1, 1, '#6b2b2b')
    px(15, 15, 1, 1, '#6b2b2b')
  } else if (expression === 'lip-twitch') {
    px(9, 15, 6, 1, '#6b2b2b')
    px(14, 14, 2, 1, '#6b2b2b') // one corner pulled up
  } else if (expression === 'arm-shift') {
    px(10, 15, 4, 2, '#6b2b2b')
  } else {
    px(10, 15, 4, 1, '#6b2b2b')
  }

  // Accessories.
  if (look.accessory === 'glasses') {
    px(7, eyeY - 1, 5, 4, '#2a2a38')
    px(8, eyeY, 3, 2, '#9fd4ff')
    px(12, eyeY - 1, 5, 4, '#2a2a38')
    px(13, eyeY, 3, 2, '#9fd4ff')
    px(12, eyeY, 1, 1, '#2a2a38')
  } else if (look.accessory === 'shades') {
    px(6, eyeY - 1, 12, 4, '#1a1a22')
    px(7, eyeY, 4, 2, '#33333f')
    px(13, eyeY, 4, 2, '#33333f')
  } else if (look.accessory === 'cap') {
    px(4, 1, 16, 4, '#2f3d5c')
    px(4, 5, 16, 1, '#26314a')
    px(3, 5, 6, 2, '#26314a') // peak
  } else if (look.accessory === 'visor') {
    px(5, 5, 14, 2, '#1e5c3a')
    px(3, 7, 8, 1, '#17472d')
  } else if (look.accessory === 'earring') {
    px(5, 12, 1, 1, '#d9c46a')
  }

  // A bead of sweat sells the moment a big bet lands.
  if (expression === 'lost' || expression === 'thinking') {
    px(18, 6, 1, 2, '#8ad4ff')
  }
}

const cache = new Map<string, string>()

/** Returns a data URL, cached per look and expression. */
export function avatarDataUrl(look: AvatarLook, expression: Expression = 'neutral'): string {
  const key = `${look.skin}|${look.hair}|${look.hairStyle}|${look.shirt}|${look.accessory}|${expression}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = ART * SCALE
  canvas.height = ART * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  drawFace(
    (x, y, w, h, color) => {
      ctx.fillStyle = color
      ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE)
    },
    look,
    expression,
  )

  const url = canvas.toDataURL()
  cache.set(key, url)
  return url
}

/** The expression an opponent should be wearing right now. */
export function expressionFor(options: {
  tellKind?: Expression | null
  isActing: boolean
  wonLast: boolean
  lostLast: boolean
}): Expression {
  if (options.wonLast) return 'won'
  if (options.lostLast) return 'lost'
  if (options.tellKind) return options.tellKind
  if (options.isActing) return 'thinking'
  return 'neutral'
}
