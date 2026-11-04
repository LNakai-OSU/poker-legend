import { useEffect, useRef, useState } from 'react'
import { ENDING_FILM, type EndingLine, type EndingMessage } from '../world/ending'
import { HERO_FIGURE } from '../overworld/casting'
import { drawPerson, type Figure, type WalkFrame } from '../overworld/characterArt'
import { figureForCharacter, lookFromId } from '../overworld/casting'
import { CHARACTERS } from '../world/characters'
import { isActionKey, useKeyLayer } from './keys'
import { useTouchFirst } from './device'
import { TABLE_THEMES } from './tableThemes'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { useCrispScale } from './useCrispScale'
import { Raster } from './pixel/raster'
import { LINE_HEIGHT, drawText, measureText, wrapText } from './pixel/font'
import { playSound } from '../audio/audio'
import { UI_FONT } from './pixel/webFont'
import {
  DESK_LAMP,
  FEET_Y,
  noise,
  PENTHOUSE_LIGHTS,
  PENTHOUSE_SPARKLES,
  PHOTO,
  SHEET,
  VIEW_H,
  VIEW_W,
  WIN,
  WORLD_W,
  drawDeskBack,
  drawFramedPhoto,
  drawHarbour,
  drawPenthouse,
  drawPhotoPicture,
  drawSheet,
  drawSkyPicture,
  drawSkylineStrip,
  drawWindowFrame,
} from './endingArt'

/**
 * The ending: after the last hand, and none of it is a party. The stage with the
 * confetti coming down on nobody, the walk through the penthouse the wins built,
 * the photograph on the desk, the divorce papers, the settlement statement, the
 * phone, the window, the credits, and one more thing after them — cut together
 * with a dip to black, in the same pixel density as the opening. Like the opening it never moves on by the
 * clock: every line is turned with Space (or E, X, Enter, a tap), and only the
 * walking and the light move by themselves.
 */

export type EndingShot = 'stage' | 'walk' | 'photo' | 'papers' | 'ledger' | 'phone' | 'window' | 'credits' | 'after'

const GOLD = '#c9a14a'
const THEME = TABLE_THEMES.finale
const FILM = ENDING_FILM
const START_X = 24
const END_X = 500
const SPEED = 64 // art pixels a second
const FADE_OUT = 240
const FADE_IN = 520
const REVEAL_EVERY = 560

type Assets = ReturnType<typeof makeAssets>
let cache: Assets | null = null

function makeAssets() {
  const strips = ([0, 1, 2] as const).map((l) => drawSkylineStrip(l))
  return {
    world: drawPenthouse().toCanvas(),
    deskBack: drawDeskBack().toCanvas(),
    frame: drawFramedPhoto().toCanvas(),
    photo: drawPhotoPicture().toCanvas(),
    sheet: drawSheet(FILM.papers).toCanvas(),
    sky: drawSkyPicture().toCanvas(),
    strips,
    stripCanvases: strips.map((s) => s.toCanvas()),
    harbour: drawHarbour().toCanvas(),
    winFrame: drawWindowFrame().toCanvas(),
  }
}
const assets = () => (cache ??= makeAssets())

type Ctx = CanvasRenderingContext2D

const labels = new Map<string, HTMLCanvasElement>()
/** A line of the pixel font, drawn onto the scene. */
function label(c: Ctx, text: string, x: number, y: number, color: string, align: 'left' | 'centre' = 'left') {
  const key = `${color}|${text}`
  let cv = labels.get(key)
  if (!cv) {
    const r = new Raster(measureText(text) + 2, 10)
    drawText(r, text, 1, 1, color)
    cv = r.toCanvas()
    labels.set(key, cv)
  }
  const dx = align === 'centre' ? x - Math.floor(cv.width / 2) : x
  c.drawImage(cv, Math.round(dx) - 1, Math.round(y) - 1)
}

function fillRect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), w, h)
}

function glow(c: Ctx, x: number, y: number, rad: number, rgb: string, a: number) {
  for (const [k, m] of [[1, 0.35], [0.7, 0.35], [0.4, 0.4]] as const) {
    c.fillStyle = `rgba(${rgb},${a * m})`
    c.beginPath()
    c.ellipse(x, y, rad * k, rad * k * 0.8, 0, 0, Math.PI * 2)
    c.fill()
  }
}

function dust(c: Ctx, t: number, count: number, y0: number, y1: number, tint = '255,236,190') {
  for (let i = 0; i < count; i++) {
    const px = (i * 47 + t / (34 + (i % 5) * 9)) % VIEW_W
    const py = y0 + ((i * 29 + Math.sin(t / 900 + i) * 6 + (y1 - y0) * 4) % (y1 - y0))
    c.fillStyle = `rgba(${tint},${0.16 + 0.16 * ((i + Math.floor(t / 300)) % 3 === 0 ? 1 : 0)})`
    c.fillRect(Math.floor(px), Math.floor(py), 1, 1)
  }
}

function vignette(c: Ctx, strength: number) {
  const g = c.createLinearGradient(0, 0, VIEW_W, 0)
  g.addColorStop(0, `rgba(0,0,0,${strength})`)
  g.addColorStop(0.22, 'rgba(0,0,0,0)')
  g.addColorStop(0.78, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  c.fillStyle = g
  c.fillRect(0, 0, VIEW_W, VIEW_H)
  const v = c.createLinearGradient(0, 0, 0, VIEW_H)
  v.addColorStop(0, `rgba(0,0,0,${strength * 0.7})`)
  v.addColorStop(0.2, 'rgba(0,0,0,0)')
  v.addColorStop(0.85, 'rgba(0,0,0,0)')
  v.addColorStop(1, `rgba(0,0,0,${strength * 0.8})`)
  c.fillStyle = v
  c.fillRect(0, 0, VIEW_W, VIEW_H)
}

// ---------------------------------------------------------------------------

function drawWalk(c: Ctx, t: number, heroX: number, walking: boolean) {
  const A = assets()
  const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, Math.round(heroX - 150)))
  c.drawImage(A.world, camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H)
  // Moonlight through the glass, laid across the marble.
  c.fillStyle = 'rgba(140,160,255,0.06)'
  c.beginPath()
  c.moveTo(24 - camX, 126)
  c.lineTo(166 - camX, 126)
  c.lineTo(214 - camX, 176)
  c.lineTo(52 - camX, 176)
  c.closePath()
  c.fill()
  // Spots over the medals, the plaque, the cabinet; the desk lamp.
  PENTHOUSE_LIGHTS.forEach((L, i) => {
    const sx = L.x - camX
    if (sx < -80 || sx > VIEW_W + 80) return
    const flick = i === 4 && Math.floor(t / 130) % 23 === 0 ? 0.6 : 1
    if (L.y < 30) {
      c.fillStyle = `rgba(${L.color},${0.05 * flick})`
      c.beginPath()
      c.moveTo(sx - 4, L.y)
      c.lineTo(sx + 4, L.y)
      c.lineTo(sx + 44, 112)
      c.lineTo(sx - 44, 112)
      c.closePath()
      c.fill()
    }
    glow(c, sx, L.y + (L.y < 30 ? 52 : 0), L.r, L.color, L.a * flick)
  })
  // Crystal catching it.
  PENTHOUSE_SPARKLES.forEach(([x, y], i) => {
    if ((Math.floor(t / 240) + i * 3) % 7 !== 0) return
    const sx = x - camX
    fillRect(c, '#ffffff', sx, y, 1, 1)
    fillRect(c, 'rgba(255,255,255,0.6)', sx - 1, y, 3, 1)
    fillRect(c, 'rgba(255,255,255,0.6)', sx, y - 1, 1, 3)
  })
  // The city's own lights move a little in the glass.
  for (let i = 0; i < 6; i++) {
    if ((Math.floor(t / 700) + i) % 4 === 0) fillRect(c, '#f2c14e', 30 + i * 22 - camX, 78 + (i % 3) * 5, 1, 2)
  }
  // You: your shadow, your reflection in the marble, then you.
  const frame3 = (walking ? Math.floor(t / 150) % 3 : 0) as WalkFrame
  const bob = walking && frame3 !== 0 ? 1 : 0
  const sx = Math.round(heroX - camX)
  c.fillStyle = 'rgba(0,0,0,0.4)'
  c.beginPath()
  c.ellipse(sx + 16, FEET_Y + 1, 14, 3, 0, 0, Math.PI * 2)
  c.fill()
  c.save()
  c.globalAlpha = 0.16
  c.translate(0, FEET_Y * 2 + 2)
  c.scale(1, -1)
  drawPerson(c, HERO_FIGURE, 'right', frame3, { x: sx, y: FEET_Y - 48, scale: 2 })
  c.restore()
  drawPerson(c, HERO_FIGURE, 'right', frame3, { x: sx, y: FEET_Y - 48 - bob * 2, scale: 2 })
  dust(c, t, 30, 20, 120)
  vignette(c, 0.5)
}

function deskScene(c: Ctx, t: number) {
  const A = assets()
  c.drawImage(A.deskBack, 0, 0)
  const flick = Math.floor(t / 170) % 41 === 0 ? 0.6 : 1
  glow(c, DESK_LAMP.x, DESK_LAMP.y - 6, 120, '255,226,150', 0.2 * flick)
  glow(c, DESK_LAMP.x - 8, 130, 90, '255,226,150', 0.12 * flick)
}

function drawPhotoShot(c: Ctx, t: number) {
  const A = assets()
  deskScene(c, t)
  const { x, y } = PHOTO
  // The frame's shadow on the wood, and its easel.
  c.fillStyle = 'rgba(0,0,0,0.4)'
  c.beginPath()
  c.ellipse(x + PHOTO.w / 2 + 6, 128, PHOTO.w / 2 + 6, 6, 0, 0, Math.PI * 2)
  c.fill()
  c.drawImage(A.frame, x, y)
  const ix = x + PHOTO.innerX - 5
  const iy = y + PHOTO.innerY - 4
  c.drawImage(A.photo, ix, iy)
  // You, in the picture: the same sprite, larger than life, cropped at the chest.
  c.save()
  c.beginPath()
  c.rect(ix, iy, PHOTO.innerW, PHOTO.innerH)
  c.clip()
  drawPerson(c, HERO_FIGURE, 'down', 0, { x: ix + 2, y: iy + 14, scale: 3 })
  // Glass: a slow sheen across it, and the lamp's reflection.
  c.globalAlpha = 0.13
  const sheen = ((t / 28) % 260) - 70
  for (let i = 0; i < 7; i++) fillRect(c, '#ffffff', ix + sheen + i, iy, 7, PHOTO.innerH)
  c.restore()
  // What else is on the desk: a glass of something, the pen.
  fillRect(c, '#d8d4c4', 258, 114, 16, 18)
  fillRect(c, '#c08030', 259, 120, 14, 11)
  fillRect(c, '#e8e4d4', 262, 122, 4, 4)
  fillRect(c, '#ffffff', 260, 115, 1, 14)
  dust(c, t, 22, 30, 110, '255,226,170')
  vignette(c, 0.55)
}

/** The stamp, drawn once: a heavy red box and the word. */
let stampCanvas: HTMLCanvasElement | null = null
function stamp(): HTMLCanvasElement {
  if (stampCanvas) return stampCanvas
  const w = measureText(FILM.papers.stamp) + 13
  const r = new Raster(w, 20)
  r.box(0, 0, w, 20, '#c82828')
  r.box(2, 2, w - 4, 16, '#c82828')
  drawText(r, FILM.papers.stamp, 6, 6, '#c82828')
  drawText(r, FILM.papers.stamp, 7, 6, '#c82828')
  return (stampCanvas = r.toCanvas())
}

function drawPapersShot(c: Ctx, t: number, shot0: number) {
  const A = assets()
  const since = t - shot0
  deskScene(c, t)
  // The stack: two sheets underneath, each a little out of true.
  fillRect(c, 'rgba(0,0,0,0.45)', SHEET.x + 5, SHEET.y + 6, SHEET.w, SHEET.h)
  fillRect(c, '#c8c2ae', SHEET.x + 4, SHEET.y + 3, SHEET.w, SHEET.h)
  fillRect(c, '#dcd6c4', SHEET.x + 2, SHEET.y + 1, SHEET.w, SHEET.h)
  // The thump: the whole desk jumps a pixel or two as the stamp lands.
  const land = since - 900
  const shake = land > 0 && land < 220 ? Math.round(Math.sin(land / 18) * 2 * (1 - land / 220)) : 0
  c.save()
  c.translate(0, shake)
  c.drawImage(A.sheet, SHEET.x, SHEET.y)
  // A coffee ring, an old one.
  c.strokeStyle = 'rgba(120,80,40,0.35)'
  c.lineWidth = 1
  c.beginPath()
  c.ellipse(SHEET.x + 128, SHEET.y + 96, 12, 10, 0, 0, Math.PI * 2)
  c.stroke()
  // The tab where the line beside hers is empty, fluttering.
  const flap = Math.floor(t / 600) % 2
  const tx = SHEET.x + SHEET.w - 6
  const ty = SHEET.y + 138 + flap
  fillRect(c, '#f2c14e', tx, ty, 26, 12)
  fillRect(c, '#d9a83a', tx, ty + 11, 26, 1)
  fillRect(c, '#f2c14e', tx - 4, ty + 2, 4, 8)
  label(c, 'SIGN', tx + 3, ty + 2, '#7a1818')
  label(c, '>>', tx - 18 - flap, ty + 2, '#f2c14e')
  // FILED.
  if (land > 0) {
    const k = Math.min(1, land / 160)
    const s = 3.4 - 1.6 * k
    const st = stamp()
    c.save()
    c.globalAlpha = 0.45 + 0.4 * k
    c.translate(SHEET.x + 100, SHEET.y + 134)
    c.rotate(-0.22)
    c.scale(s, s)
    c.drawImage(st, -st.width / 2, -st.height / 2)
    c.restore()
  }
  c.restore()
  // The pen, uncapped, laid down square to the edge of the sheet.
  fillRect(c, '#0c0c14', 300, 104, 3, 48)
  fillRect(c, '#2a2a3c', 300, 104, 1, 48)
  fillRect(c, GOLD, 300, 104, 3, 5)
  fillRect(c, '#f2f2f6', 301, 152, 1, 6)
  // A ring on the wood, where somebody put it down and meant to come back.
  c.fillStyle = 'rgba(0,0,0,0.4)'
  c.beginPath()
  c.ellipse(41, 154, 14, 5, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#8a6a20'
  c.beginPath()
  c.ellipse(40, 148, 12, 9, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#c9a14a'
  c.beginPath()
  c.ellipse(40, 146, 12, 9, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#4a2a16'
  c.beginPath()
  c.ellipse(40, 146, 8, 5.5, 0, 0, Math.PI * 2)
  c.fill()
  fillRect(c, '#f2d27a', 32, 140, 5, 1)
  if (Math.floor(t / 500) % 5 === 0) {
    fillRect(c, '#ffffff', 47, 141, 2, 2)
    fillRect(c, 'rgba(255,255,255,0.5)', 45, 142, 6, 1)
  }
  dust(c, t, 16, 4, 100, '255,226,170')
  vignette(c, 0.6)
}

// --- The phone ------------------------------------------------------------

const GAP = 6
const BUBBLE_W = 84

interface Laid {
  msg: EndingMessage
  lines: string[]
  top: number
  h: number
}

/** Lays the thread out once: how tall each message is, and where it sits. */
const thread: Laid[] = (() => {
  let y = 2
  return FILM.phone.thread.map((msg) => {
    const lines = msg.missedCall ? [] : wrapText(msg.text, BUBBLE_W - 8)
    const h = msg.missedCall ? 15 : lines.length * LINE_HEIGHT + 4
    const laid = { msg, lines, top: y, h }
    y += 10 + h + GAP
    return laid
  })
})()

interface PhoneState {
  revealed: number
  scroll: number
  buzz: number
  target: number
  last: number
  /** When each message landed, in film time, for its slide-in. */
  landed: number[]
}

function drawPhoneShot(c: Ctx, t: number, st: PhoneState) {
  // The room behind: dark, the city a long way off, a lamp somewhere.
  fillRect(c, '#07060c', 0, 0, VIEW_W, VIEW_H)
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(((i * 97) % VIEW_W))
    const y = 6 + ((i * 53) % 60)
    const s = 5 + (i % 4) * 3
    c.fillStyle = `rgba(${i % 2 ? '242,193,78' : '106,138,232'},${0.05 + (i % 3) * 0.02})`
    c.beginPath()
    c.ellipse(x, y, s, s, 0, 0, Math.PI * 2)
    c.fill()
  }
  const sh = Math.max(0, 1 - (t - st.buzz) / 300)
  const ox = sh > 0 ? Math.round(Math.sin((t - st.buzz) / 22) * 2 * sh) : 0
  const px = 100 + ox
  const skin = HERO_FIGURE.look.skin
  // The hand: the palm under the phone, four fingertips round its right edge.
  c.fillStyle = skin
  c.beginPath()
  c.ellipse(px + 66, 196, 62, 40, 0, 0, Math.PI * 2)
  c.fill()
  for (let i = 0; i < 4; i++) {
    c.fillStyle = skin
    c.beginPath()
    c.ellipse(px + 119, 52 + i * 18, 9, 8, 0, 0, Math.PI * 2)
    c.fill()
    fillRect(c, '#b88860', px + 120, 58 + i * 18, 8, 1)
  }
  // The phone: a dark slab, rounded corners, the screen lit.
  fillRect(c, '#05050a', px, 8, 120, 176)
  fillRect(c, '#05050a', px + 2, 6, 116, 180)
  fillRect(c, '#22222e', px, 10, 1, 170)
  fillRect(c, '#22222e', px + 119, 10, 1, 170)
  const sx = px + 5
  const sy = 14
  const sw = 110
  const shh = 168
  fillRect(c, '#0b0f18', sx, sy, sw, shh)
  // Header.
  fillRect(c, '#151a28', sx, sy, sw, 30)
  fillRect(c, '#222a3c', sx, sy + 30, sw, 1)
  label(c, '<', sx + 5, sy + 11, '#58a0e8')
  c.fillStyle = '#3a5a8a'
  c.beginPath()
  c.arc(sx + 26, sy + 15, 8, 0, Math.PI * 2)
  c.fill()
  label(c, FILM.phone.contact.charAt(0), sx + 26, sy + 11, '#f2f2f6', 'centre')
  label(c, FILM.phone.contact, sx + 38, sy + 7, '#f2f2f6')
  label(c, 'iMessage', sx + 38, sy + 17, '#7a8098')
  const unread = `${FILM.phone.unread}`
  fillRect(c, '#e0403d', sx + sw - 8 - measureText(unread) - 6, sy + 8, measureText(unread) + 8, 12)
  label(c, unread, sx + sw - 8 - measureText(unread) - 2, sy + 11, '#ffffff')
  // The thread, bottom-anchored, climbing as each message lands.
  const areaTop = sy + 32
  const areaH = shh - 32 - 28
  c.save()
  c.beginPath()
  c.rect(sx, areaTop, sw, areaH)
  c.clip()
  thread.slice(0, Math.floor(st.revealed)).forEach((m, i) => {
    const age = t - (st.landed[i] ?? t)
    const slide = Math.max(0, 1 - age / 220) * 8
    const y = areaTop + 4 + m.top - st.scroll + slide
    c.globalAlpha = Math.min(1, age / 160)
    label(c, m.msg.when, sx + sw / 2, y, '#6a7088', 'centre')
    if (m.msg.missedCall) {
      fillRect(c, '#2a1418', sx + 6, y + 9, 70, 14)
      fillRect(c, '#e0403d', sx + 6, y + 9, 2, 14)
      fillRect(c, '#e0403d', sx + 12, y + 14, 6, 4)
      fillRect(c, '#e0403d', sx + 11, y + 12, 2, 8)
      fillRect(c, '#e0403d', sx + 17, y + 12, 2, 8)
      label(c, m.msg.text, sx + 24, y + 13, '#e0605d')
    } else {
      fillRect(c, '#262c3c', sx + 6, y + 9, BUBBLE_W, m.h)
      fillRect(c, '#262c3c', sx + 5, y + 10, 1, m.h - 2)
      fillRect(c, '#262c3c', sx + 6 + BUBBLE_W, y + 10, 1, m.h - 2)
      m.lines.forEach((l, k) => label(c, l, sx + 10, y + 12 + k * LINE_HEIGHT, '#eaeef8'))
    }
    c.globalAlpha = 1
  })
  c.restore()
  // The box where an answer would go. Nothing in it.
  fillRect(c, '#151a28', sx, sy + shh - 26, sw, 26)
  fillRect(c, '#0b0f18', sx + 6, sy + shh - 21, sw - 28, 16)
  fillRect(c, '#222a3c', sx + 6, sy + shh - 21, sw - 28, 1)
  label(c, 'iMessage', sx + 10, sy + shh - 17, '#4a5068')
  if (Math.floor(t / 520) % 2) fillRect(c, '#9ab0e8', sx + 8, sy + shh - 18, 1, 9)
  c.fillStyle = '#222a3c'
  c.beginPath()
  c.arc(sx + sw - 11, sy + shh - 13, 6, 0, Math.PI * 2)
  c.fill()
  label(c, '^', sx + sw - 11, sy + shh - 17, '#4a5068', 'centre')
  // The thumb, resting at the lower edge, not typing.
  c.fillStyle = skin
  c.beginPath()
  c.ellipse(px + 4, 186, 9, 18, -0.5, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#b88860'
  c.beginPath()
  c.ellipse(px + 9, 172, 4, 2, -0.5, 0, Math.PI * 2)
  c.fill()
  // A glow off the screen onto the hand, and a cold edge round everything.
  glow(c, px + 60, 100, 110, '120,160,255', 0.05)
  vignette(c, 0.6)
}

// --- The window -----------------------------------------------------------

let heroTint: HTMLCanvasElement | null = null
function silhouette(): HTMLCanvasElement {
  if (heroTint) return heroTint
  const cv = document.createElement('canvas')
  cv.width = 48
  cv.height = 72
  const c = cv.getContext('2d')!
  drawPerson(c, HERO_FIGURE, 'up', 0, { x: 0, y: 0, scale: 3 })
  c.globalCompositeOperation = 'source-atop'
  c.fillStyle = 'rgba(5,6,22,0.66)'
  c.fillRect(0, 0, 48, 72)
  // The city on the rim of the shoulders and the hair.
  c.fillStyle = 'rgba(120,140,255,0.2)'
  c.fillRect(0, 0, 48, 3)
  return (heroTint = cv)
}

function drawWindowShot(c: Ctx, t: number, breathAt: number | null, rise: number, withHero = true) {
  const A = assets()
  fillRect(c, '#07060e', 0, 0, VIEW_W, VIEW_H)
  c.save()
  c.beginPath()
  c.rect(WIN.x, WIN.y, WIN.w, WIN.h)
  c.clip()
  c.drawImage(A.sky, 0, 0)
  // Stars, a few of them breathing.
  for (let i = 0; i < 70; i++) {
    const x = WIN.x + ((i * 53) % WIN.w)
    const y = WIN.y + 2 + ((i * 29) % 70)
    if ((Math.floor(t / 600) + i * 7) % 11 === 0) continue
    fillRect(c, i % 5 ? '#f4f0d8' : '#c8d0ff', x, y, 1, 1)
  }
  // A plane, slow, blinking, once in a long while.
  const cycle = (t / 1000) % 22
  if (cycle < 14) {
    const px = WIN.x - 10 + (cycle / 14) * (WIN.w + 20)
    fillRect(c, '#9aa0c8', px, 40, 3, 1)
    if (Math.floor(t / 450) % 2) fillRect(c, '#ff5050', px + 3, 40, 1, 1)
    else fillRect(c, '#ffffff', px - 1, 40, 1, 1)
  }
  // The skyline, three layers sliding at three speeds: the camera is moving, very slowly.
  ;([0.7, 1.4, 2.6] as const).forEach((speed, i) => {
    const off = Math.floor((t / 1000) * speed) % WIN.w
    c.drawImage(A.stripCanvases[i], 0, 0, WIN.w, VIEW_H, WIN.x - off, 0, WIN.w, VIEW_H)
    c.drawImage(A.stripCanvases[i], 0, 0, WIN.w, VIEW_H, WIN.x - off + WIN.w, 0, WIN.w, VIEW_H)
    if (i === 2) {
      // The red light on the tallest roof in the near row.
      const col = (70 + off) % WIN.w
      let top = 0
      while (top < VIEW_H && A.strips[2].isClear(col, top)) top++
      if (Math.floor(t / 700) % 2) fillRect(c, '#ff4040', WIN.x - 0 + (col - off), top - 3, 2, 2)
    }
  })
  c.drawImage(A.harbour, 0, 0)
  // The harbour breaking the city up: streaks that shimmer, a boat crossing with its lights.
  for (let i = 0; i < 60; i++) {
    const x = WIN.x + ((i * 47) % WIN.w)
    const y = WIN.horizon + 6 + ((i * 13) % 26)
    const w = 2 + ((i + Math.floor(t / 300)) % 4)
    c.fillStyle = `rgba(${i % 3 ? '242,193,78' : '106,138,232'},${0.35 - (y - WIN.horizon) / 120})`
    c.fillRect(x + (Math.floor(t / 400 + i) % 2), y, w, 1)
  }
  const bx = WIN.x + WIN.w - ((t / 1000) * 5) % (WIN.w + 40)
  fillRect(c, '#0a0e22', bx, WIN.horizon + 12, 12, 3)
  fillRect(c, '#0a0e22', bx + 4, WIN.horizon + 8, 4, 4)
  fillRect(c, '#fff6c0', bx + 5, WIN.horizon + 7, 1, 1)
  fillRect(c, '#50e070', bx + 11, WIN.horizon + 12, 1, 1)
  fillRect(c, 'rgba(255,246,192,0.3)', bx + 5, WIN.horizon + 15, 1, 6)
  c.restore()
  // The glass fogs where you breathed on it: a bloom, then it clears.
  if (breathAt !== null) {
    const k = Math.min(1, (t - breathAt) / 4200)
    const a = Math.sin(Math.min(1, k) * Math.PI) * 0.3
    if (a > 0.005) {
      for (const [rw, rh, m] of [[46, 38, 0.4], [34, 28, 0.35], [22, 18, 0.35]] as const) {
        c.fillStyle = `rgba(210,224,255,${a * m})`
        c.beginPath()
        c.ellipse(160, 112, rw + k * 8, rh + k * 5, 0, 0, Math.PI * 2)
        c.fill()
      }
    }
  }
  c.drawImage(A.winFrame, 0, 0)
  // The floor holds a soft mirror of the harbour and of you.
  c.save()
  c.beginPath()
  c.rect(0, WIN.y + WIN.h, VIEW_W, VIEW_H - WIN.y - WIN.h)
  c.clip()
  c.globalAlpha = 0.16
  c.translate(0, (WIN.y + WIN.h) * 2)
  c.scale(1, -1)
  c.drawImage(c.canvas, 0, 96, VIEW_W, WIN.y + WIN.h - 96, 0, 96, VIEW_W, WIN.y + WIN.h - 96)
  c.restore()
  if (!withHero) return
  // You, from behind, with the city on your shoulders. A breath lifts them.
  const sil = silhouette()
  const hx = 136
  const hy = FEET_Y + 2 - 72 - rise
  c.fillStyle = 'rgba(0,0,0,0.45)'
  c.beginPath()
  c.ellipse(hx + 24, FEET_Y + 4, 22, 4, 0, 0, Math.PI * 2)
  c.fill()
  c.save()
  c.globalAlpha = 0.14
  c.translate(0, (FEET_Y + 4) * 2 - 6)
  c.scale(1, -1)
  c.drawImage(sil, hx, hy)
  c.restore()
  c.drawImage(sil, hx, hy)
  dust(c, t, 14, 10, 130, '180,200,255')
  vignette(c, 0.62)
}

// ---------------------------------------------------------------------------
// The stage, the statement, the credits, and what comes after them.
// ---------------------------------------------------------------------------

const CONFETTI = ['#f2c14e', '#c8402f', '#4a7ae8', '#e8e4d8', '#3ac87a']
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

let nadia: Figure | null = null
let sweeper: Figure | null = null

function drawStageShot(c: Ctx, t: number, beat: number, since: number) {
  const k = Math.min(beat, 5)
  fillRect(c, '#06050c', 0, 0, VIEW_W, VIEW_H)
  // The big screen over the table: the winner, then an advert.
  fillRect(c, '#2a2a5a', 62, 12, 196, 56)
  fillRect(c, '#0b0d22', 64, 14, 192, 52)
  if (k < 4) {
    label(c, 'LEGENDS INVITATIONAL', 160, 20, '#c9a14a', 'centre')
    fillRect(c, '#c9a14a', 80, 31, 160, 1)
    label(c, 'WINNER', 160, 38, '#e8e4d8', 'centre')
    label(c, money(750000), 160, 50, '#f2d27a', 'centre')
    if (Math.floor(t / 500) % 2) label(c, '● LIVE', 72, 18, '#e0402f')
  } else {
    fillRect(c, '#14305a', 64, 14, 192, 52)
    fillRect(c, '#e8e4d8', 148, 26, 24, 14)
    label(c, 'FIRST FEDERAL', 160, 46, '#e8e4d8', 'centre')
    label(c, 'BACK AFTER THESE MESSAGES', 160, 56, '#8aa0c8', 'centre')
  }
  // The truss, and the lamps hanging from it; they come down as the room empties.
  fillRect(c, '#14122a', 0, 0, VIEW_W, 8)
  const lit = Math.max(0.25, 1 - k * 0.17)
  for (let i = 0; i < 12; i++) {
    const x = 14 + i * 27
    fillRect(c, '#2a2850', x - 2, 8, 5, 3)
    c.fillStyle = `rgba(${i % 2 ? '255,226,150' : '150,170,255'},${0.07 * lit})`
    c.beginPath()
    c.moveTo(x - 2, 11)
    c.lineTo(x + 3, 11)
    const aim = 160 + (i - 5.5) * 8
    c.lineTo(aim + 34, 138)
    c.lineTo(aim - 34, 138)
    c.closePath()
    c.fill()
  }
  // The stage.
  fillRect(c, '#120e1c', 0, 100, VIEW_W, 80)
  for (let y = 104; y < 150; y += 8) fillRect(c, '#1a1426', 0, y, VIEW_W, 1)
  // The table: rail, felt, the last hand where it was left.
  c.fillStyle = '#3a2412'
  c.beginPath()
  c.ellipse(160, 130, 80, 20, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#0f5a34'
  c.beginPath()
  c.ellipse(160, 129, 74, 16, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = 'rgba(255,255,255,0.08)'
  c.beginPath()
  c.ellipse(160, 126, 60, 10, 0, 0, Math.PI * 2)
  c.fill()
  const board = [['9', '#c8402f'], ['5', '#14141c'], ['2', '#c8402f'], ['J', '#14141c'], ['7', '#c8402f']]
  board.forEach(([r, col], i) => {
    fillRect(c, '#e8e4d8', 130 + i * 13, 122, 10, 13)
    label(c, r, 132 + i * 13, 126, col)
  })
  // Her two, turned over; and the stack that was hers, pushed to the middle.
  fillRect(c, '#e8e4d8', 196, 136, 9, 11)
  fillRect(c, '#e8e4d8', 207, 136, 9, 11)
  label(c, 'K', 198, 139, '#c8402f')
  label(c, 'Q', 209, 139, '#c8402f')
  for (let i = 0; i < 6; i++) {
    fillRect(c, i % 2 ? '#c8402f' : '#2a4aa8', 96, 140 - i * 2, 12, 2)
    fillRect(c, '#e8e4d8', 96, 140 - i * 2, 12, 1)
  }
  for (let i = 0; i < 9; i++) fillRect(c, i % 3 ? '#f2c14e' : '#2a4aa8', 112, 142 - i * 2, 12, 2)
  // You, at your end of it. Her, till she goes.
  const hero = (x: number) => {
    c.fillStyle = 'rgba(0,0,0,0.45)'
    c.beginPath()
    c.ellipse(x + 16, 133, 14, 3, 0, 0, Math.PI * 2)
    c.fill()
    drawPerson(c, HERO_FIGURE, 'down', 0, { x, y: 86, scale: 2 })
  }
  nadia ??= figureForCharacter('nadia', CHARACTERS.nadia)
  if (k < 4) {
    c.fillStyle = 'rgba(0,0,0,0.45)'
    c.beginPath()
    c.ellipse(236, 133, 14, 3, 0, 0, Math.PI * 2)
    c.fill()
    drawPerson(c, nadia, k === 3 ? 'left' : 'down', 0, { x: 220, y: 86, scale: 2 })
  } else if (k === 4) {
    const nx = 220 + since / 16
    if (nx < 340) drawPerson(c, nadia, 'right', (Math.floor(t / 150) % 3) as WalkFrame, { x: nx, y: 86 - (Math.floor(t / 150) % 3 ? 1 : 0), scale: 2 })
  }
  hero(60)
  // A pool of light that stays on you after the rest has gone.
  glow(c, 76, 112, 70, '255,226,170', 0.14)
  // Cameras at either side, tally lights on until they turn away.
  for (const [x, flip] of [[8, 1], [286, -1]] as const) {
    fillRect(c, '#0e0c1c', x, 92, 24, 24)
    fillRect(c, '#1c1a34', x + (flip > 0 ? 18 : -4), 98, 8, 10)
    fillRect(c, '#05040a', x + (flip > 0 ? 22 : -6), 101, 4, 4)
    fillRect(c, '#0e0c1c', x + 10, 116, 4, 18)
    fillRect(c, k < 4 ? '#e03020' : '#3a1a1a', x + (flip > 0 ? 3 : 17), 95, 3, 3)
  }
  // Confetti, and where it has landed.
  for (let i = 0; i < 70; i++) {
    const x = 10 + Math.floor(noise(i, 7) * 300)
    const y = 104 + Math.floor(noise(i, 8) * 70)
    fillRect(c, CONFETTI[i % 5], x, y, i % 3 ? 1 : 2, 1)
  }
  const falling = [150, 80, 32, 14, 6, 0][k]
  for (let i = 0; i < falling; i++) {
    const x = noise(i, 1, 3) * VIEW_W + Math.sin(t / 700 + i) * 6
    const y = (t / (16 + (i % 6) * 5) + noise(i, 2, 3) * VIEW_H * 2) % VIEW_H
    fillRect(c, CONFETTI[i % 5], x, y, i % 3 ? 1 : 2, i % 4 === 0 ? 2 : 1)
  }
  // The crowd, from behind: arms up while the cheer lasts, then sitting down, then gone.
  const stay = [46, 40, 26, 18, 9, 5][k]
  for (let i = 0; i < stay; i++) {
    const x = ((i * 313) % 330) - 6
    const y = 158 + Math.floor(noise(i, 5) * 14) + (k >= 2 ? 3 : 0)
    fillRect(c, '#0a0914', x, y, 8, 22)
    fillRect(c, '#0a0914', x + 1, y - 4, 6, 5)
    fillRect(c, k < 2 ? '#3a3260' : '#241e3c', x + 1, y - 4, 6, 1)
    if (k < 2 && i % 2) {
      const up = Math.floor(t / 180 + i) % 2
      fillRect(c, '#0a0914', x - 1, y - 8 - up * 2, 2, 8)
      fillRect(c, '#0a0914', x + 7, y - 8 - (1 - up) * 2, 2, 8)
    }
  }
  // Somebody comes with a broom.
  if (k >= 5) {
    sweeper ??= { role: 'local', look: lookFromId('stage-hand', 'Stage hand', 'local') }
    const sx = 130 + Math.sin(t / 1800) * 40
    c.fillStyle = 'rgba(0,0,0,0.4)'
    c.beginPath()
    c.ellipse(sx + 16, 163, 12, 3, 0, 0, Math.PI * 2)
    c.fill()
    drawPerson(c, sweeper, Math.cos(t / 1800) > 0 ? 'right' : 'left', (Math.floor(t / 200) % 3) as WalkFrame, { x: sx, y: 116, scale: 2 })
  }
  // The lights go down; yours stay on.
  c.fillStyle = `rgba(0,0,8,${k * 0.07})`
  c.fillRect(0, 0, VIEW_W, VIEW_H)
  dust(c, t, 18, 10, 120, '255,236,190')
  vignette(c, 0.55)
}

function drawLedgerShot(c: Ctx, t: number, since: number) {
  const L = FILM.ledger
  deskScene(c, t)
  const W = 204
  const x = 58
  const y = 3
  const H = 174
  fillRect(c, 'rgba(0,0,0,0.5)', x + 5, y + 6, W, H)
  fillRect(c, '#c8c2ae', x + 3, y + 3, W, H)
  fillRect(c, '#ece6d4', x, y, W, H)
  fillRect(c, '#d8d2be', x, y, W, 1)
  label(c, L.title, x + W / 2, y + 8, '#2a2a34', 'centre')
  label(c, L.subtitle, x + W / 2, y + 18, '#6a6a7a', 'centre')
  fillRect(c, '#2a2a34', x + 10, y + 29, W - 20, 1)
  const left = x + 12
  const right = x + W - 12
  const row = (n: number, text: string, amount: string, color = '#2a2a34', strong = false) => {
    const yy = y + 36 + n * 12
    label(c, text, left, yy, strong ? '#14141c' : color)
    if (strong) label(c, text, left + 1, yy, '#14141c')
    label(c, amount, right - measureText(amount), yy, color)
  }
  const step = Math.floor(since / 520)
  const net = L.prize - L.deductions.reduce((a, d) => a + d.amount, 0)
  const held = net * L.heldShare
  let n = 0
  if (step >= n++) row(0, 'Prize', money(L.prize))
  L.deductions.forEach((d, i) => {
    if (step >= i + 1) row(i + 1, d.label, `−${money(d.amount)}`, '#a8281f')
  })
  const after = L.deductions.length + 1
  if (step >= after) {
    fillRect(c, '#2a2a34', left, y + 36 + after * 12 - 3, right - left, 1)
    row(after, 'Net to you', money(net), '#2a2a34', true)
  }
  if (step >= after + 1) row(after + 1, L.heldLabel, `−${money(held)}`, '#a8281f')
  if (step >= after + 2) {
    fillRect(c, '#2a2a34', left, y + 36 + (after + 2) * 12 - 3, right - left, 1)
    fillRect(c, '#2a2a34', left, y + 36 + (after + 2) * 12 - 1, right - left, 1)
    row(after + 2, 'AVAILABLE', money(held), '#14603a', true)
  }
  if (step >= after + 3) label(c, L.footnote, x + W / 2, y + H - 12, '#6a6a7a', 'centre')
  dust(c, t, 16, 30, 110, '255,226,170')
  vignette(c, 0.5)
}

/** Where the credits stop: the last words sit in the middle of the glass. */
function creditsLength() {
  return 56 + FILM.credits.entries.length * 26 + 30 + FILM.credits.thanks.length * 14
}
const CREDITS_SPEED = 13

function drawCreditsShot(c: Ctx, t: number, scroll: number) {
  drawWindowShot(c, t, null, 0, false)
  fillRect(c, 'rgba(4,3,10,0.66)', 0, 0, VIEW_W, VIEW_H)
  const base = VIEW_H + 6 - scroll
  const C = FILM.credits
  label(c, C.title, 160, base, '#f2d27a', 'centre')
  label(c, C.title, 161, base, '#f2d27a', 'centre')
  fillRect(c, '#c9a14a', 120, base + 12, 80, 1)
  C.entries.forEach((e, i) => {
    const y = base + 40 + i * 26
    if (y < -12 || y > VIEW_H) return
    label(c, e.role, 160, y, '#c9a14a', 'centre')
    label(c, e.name, 160, y + 10, '#ece8dc', 'centre')
  })
  C.thanks.forEach((line, i) => {
    const y = base + 56 + C.entries.length * 26 + 30 + i * 14
    if (y < -12 || y > VIEW_H) return
    label(c, line, 160, y, i === 0 ? '#f2d27a' : '#9aa0c8', 'centre')
  })
  vignette(c, 0.6)
}

function drawAfterShot(c: Ctx, t: number, beat: number, since: number) {
  deskScene(c, t)
  // First light: the window's city has gone grey.
  fillRect(c, 'rgba(120,132,158,0.2)', 0, 0, VIEW_W, VIEW_H)
  fillRect(c, 'rgba(5,5,12,0.45)', 0, 0, VIEW_W, VIEW_H)
  const ringing = beat === 1 || beat === 2
  const buzz = ringing && Math.floor(t / 90) % 3 === 0 ? 1 : 0
  const px = 118 + buzz
  const py = 108
  const pw = 84
  const ph = 52
  if (ringing) glow(c, px + pw / 2, py + ph / 2, 110, '110,150,255', 0.16 + 0.05 * Math.sin(t / 160))
  fillRect(c, 'rgba(0,0,0,0.5)', px + 4, py + 6, pw, ph)
  fillRect(c, '#1c1c24', px, py, pw, ph)
  fillRect(c, '#34343e', px, py, pw, 1)
  const sx = px + 3
  const sy = py + 3
  const sw = pw - 6
  const sh = ph - 6
  const L = FILM.after
  if (ringing) {
    fillRect(c, '#142a52', sx, sy, sw, sh)
    label(c, L.contact, sx + sw / 2, sy + 6, '#ece8dc', 'centre')
    label(c, 'incoming call', sx + sw / 2, sy + 17, '#8aa0d8', 'centre')
    fillRect(c, '#c83a30', sx + 8, sy + sh - 12, 14, 8)
    fillRect(c, '#38b060', sx + sw - 22, sy + sh - 12, 14, 8)
  } else if (beat >= 3) {
    fillRect(c, '#10131c', sx, sy, sw, sh)
    label(c, 'Missed call', sx + sw / 2, sy + 8, '#e0605d', 'centre')
    label(c, L.contact, sx + sw / 2, sy + 19, '#8a8aa0', 'centre')
  } else {
    fillRect(c, '#0a0b10', sx, sy, sw, sh)
  }
  // Your hand, not quite on it.
  if (beat === 2) {
    const tremor = Math.sin(t / 90) * 0.6
    const tx = px + pw - 15
    const ty = py + ph - 20 - Math.min(5, since / 700) + tremor
    c.fillStyle = HERO_FIGURE.look.skin
    c.beginPath()
    c.ellipse(tx + 26, ty + 20, 30, 8, -0.55, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.beginPath()
    c.ellipse(tx + 29, ty + 22, 26, 5, -0.55, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = HERO_FIGURE.look.skin
    c.beginPath()
    c.ellipse(tx + 4, ty + 3, 8, 3.2, -0.65, 0, Math.PI * 2)
    c.fill()
  }
  dust(c, t, 12, 30, 110, '190,200,230')
  vignette(c, 0.62)
}

// ---------------------------------------------------------------------------

export function EndingFilm({ onDone, startAt = 'stage' }: { onDone: (skipped?: boolean) => void; startAt?: EndingShot }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const isTop = useKeyLayer(true)
  const touch = useTouchFirst()
  const [line, setLine] = useState<EndingLine | null>(null)
  const [shotName, setShotName] = useState<EndingShot>(startAt)
  const [tick, setTick] = useState(0)
  const [ended, setEnded] = useState(false)

  const shot = useRef<EndingShot>(startAt)
  const beat = useRef(0)
  const shotT0 = useRef(0)
  const trans = useRef<{ to: EndingShot; t0: number; ms: number } | null>(null)
  // Within a shot that turns on its own beats: when this one began.
  const beatT0 = useRef(0)
  const creditsY = useRef(0)
  const creditsEnd = useRef<number | null>(null)
  const endAt = useRef<number | null>(null)
  const finished = useRef(false)
  // The walk.
  const heroX = useRef(START_X)
  const walkT = useRef(0)
  const paused = useRef(false)
  const nextStop = useRef(0)
  const arrivedAt = useRef<number | null>(null)
  // The phone.
  const phone = useRef<PhoneState>({ revealed: 0, scroll: 0, buzz: -9999, target: 0, last: 0, landed: [] })
  // The window.
  const breathAt = useRef<number | null>(null)
  const breathStart = useRef<number | null>(null)

  const done = (skipped = false) => {
    if (finished.current) return
    finished.current = true
    onDone(skipped)
  }

  const enter = (s: EndingShot, now: number) => {
    shot.current = s
    setShotName(s)
    beat.current = 0
    shotT0.current = now
    beatT0.current = now
    creditsY.current = 0
    creditsEnd.current = null
    if (s === 'stage') setLine(FILM.stage[0])
    if (s === 'ledger') setLine(FILM.ledger.lines[0])
    if (s === 'credits') setLine(null)
    if (s === 'after') setLine(FILM.after.lines[0])
    if (s === 'photo') setLine(FILM.photo[0])
    if (s === 'papers') setLine(FILM.papers.lines[0])
    if (s === 'phone') {
      phone.current = { revealed: 0, scroll: 0, buzz: -9999, target: FILM.phone.beats[0].upTo, last: now + 900, landed: [] }
      setLine(FILM.phone.beats[0].line)
    }
    if (s === 'window') setLine(FILM.window[0])
    if (s === 'walk') setLine(null)
  }

  const cutTo = (s: EndingShot, ms = FADE_OUT) => {
    setLine(null)
    trans.current = { to: s, t0: performance.now(), ms }
  }

  const press = () => {
    if (trans.current || endAt.current !== null) return
    playSound('dialogue')
    const s = shot.current
    if (s === 'walk') {
      if (!paused.current) return
      paused.current = false
      setLine(null)
      return
    }
    const next = beat.current + 1
    if (s === 'stage') {
      if (next >= FILM.stage.length) return cutTo('walk', 900)
      beat.current = next
      beatT0.current = performance.now()
      setLine(FILM.stage[next])
    } else if (s === 'ledger') {
      if (next >= FILM.ledger.lines.length) return cutTo('phone')
      beat.current = next
      setLine(FILM.ledger.lines[next])
    } else if (s === 'credits') {
      creditsY.current += 36
    } else if (s === 'after') {
      if (next >= FILM.after.lines.length) {
        endAt.current = performance.now()
        setEnded(true)
        setLine(null)
        return
      }
      beat.current = next
      beatT0.current = performance.now()
      setLine(FILM.after.lines[next])
    } else if (s === 'photo') {
      if (next >= FILM.photo.length) return cutTo('papers')
      beat.current = next
      setLine(FILM.photo[next])
    } else if (s === 'papers') {
      if (next >= FILM.papers.lines.length) return cutTo('ledger')
      beat.current = next
      setLine(FILM.papers.lines[next])
    } else if (s === 'phone') {
      if (next >= FILM.phone.beats.length) return cutTo('window')
      beat.current = next
      phone.current.target = FILM.phone.beats[next].upTo
      setLine(FILM.phone.beats[next].line)
    } else if (s === 'window') {
      if (next >= FILM.window.length) return cutTo('credits', 1600)
      beat.current = next
      setLine(FILM.window[next])
      // The breath: when it is said.
      if (FILM.window[next].text.includes('breath')) {
        breathAt.current = performance.now()
        breathStart.current = performance.now()
      }
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        done(true)
        return
      }
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) press()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 90)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const t0 = last
    enter(startAt, last)
    const draw = () => {
      const el = canvas.current
      const now = performance.now()
      const dt = now - last
      last = now
      if (el) {
        const c = el.getContext('2d')!
        c.imageSmoothingEnabled = false
        const t = now - t0
        const s = shot.current
        if (s === 'stage') {
          drawStageShot(c, t, beat.current, now - beatT0.current)
        } else if (s === 'ledger') {
          drawLedgerShot(c, t, now - shotT0.current)
        } else if (s === 'credits') {
          if (!trans.current) creditsY.current += (dt / 1000) * CREDITS_SPEED
          const stop = creditsLength() - 70
          if (creditsY.current >= stop) {
            creditsY.current = stop
            creditsEnd.current ??= now
            if (now - creditsEnd.current > 4200 && !trans.current) cutTo('after', 1800)
          }
          drawCreditsShot(c, t, creditsY.current)
        } else if (s === 'after') {
          drawAfterShot(c, t, beat.current, now - beatT0.current)
        } else if (s === 'walk') {
          // A line holds you where it comes; you walk on when it is turned.
          const stops = FILM.walk.stops
          const due = stops[nextStop.current]
          if (due && heroX.current >= START_X + due.at && !paused.current) {
            paused.current = true
            nextStop.current += 1
            setLine(due.line)
            playSound('dialogue')
          }
          const walking = !paused.current && arrivedAt.current === null && !trans.current
          if (walking) {
            walkT.current += dt
            heroX.current = Math.min(END_X, heroX.current + (dt / 1000) * SPEED)
            if (heroX.current >= END_X) arrivedAt.current = now
          }
          drawWalk(c, t, heroX.current, walking)
          if (arrivedAt.current !== null && now - arrivedAt.current > 900 && !trans.current && !paused.current) cutTo('photo')
        } else if (s === 'photo') {
          drawPhotoShot(c, t)
        } else if (s === 'papers') {
          drawPapersShot(c, t, shotT0.current - t0)
        } else if (s === 'phone') {
          const p = phone.current
          if (Math.floor(p.revealed) < p.target && now >= p.last) {
            p.landed[Math.floor(p.revealed)] = t
            p.revealed += 1
            p.last = now + REVEAL_EVERY
            p.buzz = t
            playSound('ui')
          }
          const shown = Math.floor(p.revealed)
          const bottom = shown > 0 ? thread[shown - 1].top + 10 + thread[shown - 1].h + 6 : 0
          const areaH = 168 - 32 - 28
          const want = Math.max(0, bottom - areaH + 4)
          p.scroll += (want - p.scroll) * 0.16
          if (Math.abs(want - p.scroll) < 0.3) p.scroll = want
          drawPhoneShot(c, t, p)
        } else {
          let rise = 0
          if (breathStart.current !== null) {
            const k = (now - breathStart.current) / 3400
            rise = k < 1 ? Math.sin(k * Math.PI) * 2.4 : 0
          }
          drawWindowShot(c, t, breathAt.current === null ? null : breathAt.current - t0, Math.round(rise))
        }
        // The cut: a dip to black going out and coming in.
        let dip = 0
        if (trans.current) {
          dip = Math.min(1, (now - trans.current.t0) / trans.current.ms)
          if (dip >= 1) {
            const to = trans.current.to
            trans.current = null
            enter(to, now)
          }
        } else {
          dip = 1 - Math.min(1, (now - shotT0.current) / FADE_IN)
        }
        // The last line is said, and the room goes dark, slowly.
        if (endAt.current !== null) {
          dip = Math.min(1, (now - endAt.current) / 3000)
          if (now - endAt.current > 4200) done()
        }
        if (dip > 0) {
          c.fillStyle = `rgba(0,0,0,${dip})`
          c.fillRect(0, 0, VIEW_W, VIEW_H)
        }
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  const P = useCrispScale(VIEW_W, VIEW_H + 46, 5)

  return (
    <div
      data-testid="ending-film"
      data-shot={shotName}
      onClick={press}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 96,
        background: '#05040a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        animation: 'fade-in 420ms ease-out both',
      }}
    >
      <canvas
        ref={canvas}
        width={VIEW_W}
        height={VIEW_H}
        style={{ width: VIEW_W * P, height: VIEW_H * P, imageRendering: 'pixelated', display: 'block', flex: 'none' }}
      />
      <Panel
        theme={THEME}
        scale={P}
        testId="ending-line"
        style={{
          width: VIEW_W * P,
          boxSizing: 'border-box',
          padding: `${3 * P}px ${4 * P}px`,
          minHeight: 28 * P,
          marginTop: 2 * P,
          flex: 'none',
          opacity: ended || shotName === 'credits' ? 0 : 1,
          transition: 'opacity 600ms',
        }}
      >
        {(line?.you || line?.who) && (
          <div style={{ marginBottom: 2 * P }}>
            <PixelText
              text={line.you ? 'You' : line.who!}
              scale={P}
              ink={line.you ? { color: '#a8281f', shadow: '#e8c8c0' } : { color: '#1f4e8c', shadow: '#c8d4e8' }}
            />
          </div>
        )}
        <PixelText text={line ? line.text : ' '} scale={P} wrap ink={INK.dark} />
        {line && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: P }}>
            <PixelText
              text={touch ? 'tap ▸' : 'space ▸'}
              scale={P}
              ink={{ color: '#8a8a98', shadow: '#dcdce4' }}
              style={{ opacity: Math.floor(tick / 5) % 2 ? 0.3 : 1 }}
            />
          </div>
        )}
      </Panel>
      <button
        data-testid="ending-skip"
        onClick={(e) => {
          e.stopPropagation()
          done(true)
        }}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(10,10,16,0.8)',
          color: '#9a9ab0',
          border: '1px solid #4a4a66',
          borderRadius: 4,
          padding: '4px 10px',
          fontFamily: UI_FONT,
          cursor: 'pointer',
        }}
      >
        Skip ▸▸
      </button>
    </div>
  )
}
