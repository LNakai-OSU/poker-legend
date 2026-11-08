import { useEffect, useRef, useState } from 'react'
import { ENDING_FILM, ledgerFor, type EndingLine, type EndingMessage, type PenthouseDebt } from '../world/ending'
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

export type EndingShot = 'stage' | 'montage' | 'walk' | 'photo' | 'papers' | 'ledger' | 'phone' | 'window' | 'credits' | 'after'

const GOLD = '#c9a14a'
const THEME = TABLE_THEMES.finale
const FILM = ENDING_FILM
// The settlement statement as this run earned it; set when the film mounts.
let LEDGER = FILM.ledger
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

// ---------------------------------------------------------------------------
// Cards, chips and the stands.
// ---------------------------------------------------------------------------

const PIPS = [
  ['01010', '11111', '11111', '01110', '00100'], // heart
  ['00100', '01110', '11111', '01110', '00100'], // diamond
  ['00100', '01110', '11111', '11111', '00100'], // spade
  ['01110', '01110', '11111', '11111', '00100'], // club
]
const SUIT_RED = [true, true, false, false]

/** A card face up (suit 0 heart, 1 diamond, 2 spade, 3 club) or, with suit -1, face down. */
function card(c: Ctx, x: number, y: number, rank: string, suit: number) {
  fillRect(c, 'rgba(0,0,0,0.35)', x + 1, y + 1, 11, 15)
  fillRect(c, '#14141c', x, y, 11, 15)
  if (suit < 0) {
    fillRect(c, '#a8281f', x + 1, y + 1, 9, 13)
    for (let i = 0; i < 6; i++) fillRect(c, i % 2 ? '#d8584a' : '#7a1a14', x + 2, y + 2 + i * 2, 7, 1)
    return
  }
  fillRect(c, '#f0ece0', x + 1, y + 1, 9, 13)
  const col = SUIT_RED[suit] ? '#c8402f' : '#14141c'
  label(c, rank, x + 3, y + 2, col)
  PIPS[suit].forEach((row, py) => {
    for (let px = 0; px < 5; px++) if (row[px] === '1') fillRect(c, col, x + 3 + px, y + 8 + py, 1, 1)
  })
}

/** A stack of chips standing on the felt: dark edge, coloured body, a pale stripe, a shadow. */
function chips(c: Ctx, x: number, baseY: number, n: number, color: string) {
  fillRect(c, 'rgba(0,0,0,0.35)', x + 1, baseY + 2, 12, 2)
  for (let i = 0; i < n; i++) {
    const y = baseY - i * 2
    fillRect(c, '#0a0a10', x, y, 12, 3)
    fillRect(c, color, x + 1, y, 10, 2)
    fillRect(c, '#e8e4d8', x + 2, y, 2, 1)
    fillRect(c, '#e8e4d8', x + 8, y, 2, 1)
  }
}

const FANS = ['gus', 'pearl', 'omar', 'bette', 'teo', 'junie', 'ray', 'deb', 'mack', 'rosa', 'lorna', 'cass', 'hollis', 'lou', 'odette', 'ines', 'otto', 'saul', 'priya', 'august', 'xue', 'fong', 'walt', 'dottie', 'maud', 'ilse']
let fans: Figure[] | null = null
/** Marcus and Dana first, then the faces you met on the way up, then strangers. */
function crowdFigures(): Figure[] {
  if (fans) return fans
  const ids = ['marcus', 'dana', ...FANS.filter((id) => CHARACTERS[id])]
  fans = Array.from({ length: 32 }, (_, i) => {
    const id = ids[i]
    return id && CHARACTERS[id] ? figureForCharacter(id, CHARACTERS[id]) : { role: 'local' as const, look: lookFromId(`fan-${i}`, '', 'local') }
  })
  return fans
}

/** Tiered stands either side of the screen. Everyone is up and shouting until the cheer dies, then seated, then gone. */
function drawStands(c: Ctx, t: number, k: number) {
  const keep = [32, 32, 30, 24, 4, 0][k]
  const cast = crowdFigures()
  const dim = Math.max(0.35, 1 - k * 0.14)
  for (let r = 0; r < 4; r++) {
    const top = 10 + r * 22
    for (const side of [0, 1]) {
      const x0 = side ? 262 : 0
      // The tier it sits on.
      fillRect(c, '#181430', x0, top + 15, 58, 22)
      fillRect(c, '#2e2858', x0, top + 15, 58, 1)
      fillRect(c, '#0e0c20', x0, top + 21, 58, 1)
      for (let j = 0; j < 4; j++) {
        const i = (3 - r) * 8 + side * 4 + j
        if (i >= keep) continue
        const x = side ? 262 + j * 14 : 44 - j * 14
        const up = k < 2
        const bounce = up ? Math.abs(Math.sin(t / 170 + i * 1.7)) * 3 : 0
        const y = Math.round(top - bounce)
        const f = cast[i]
        drawPerson(c, f, 'down', 0, { x, y, scale: 1 })
        if (up) {
          // Both arms over the head, one a beat behind the other.
          const sk = f.look.skin
          const sh = f.look.shirt
          const lag = Math.floor(t / 150 + i) % 2
          fillRect(c, '#05040a', x - 1, y - 8 - lag * 2, 5, 15)
          fillRect(c, '#05040a', x + 12, y - 8 - (1 - lag) * 2, 5, 15)
          fillRect(c, sk, x, y - 7 - lag * 2, 3, 6)
          fillRect(c, sh, x, y - 1 - lag * 2, 3, 7)
          fillRect(c, sk, x + 13, y - 7 - (1 - lag) * 2, 3, 6)
          fillRect(c, sh, x + 13, y - 1 - (1 - lag) * 2, 3, 7)
        } else if (k < 4 && i % 3 === 0) {
          // Clapping slowly, hands together at the chest.
          const clap = Math.floor(t / 400 + i) % 2
          fillRect(c, f.look.skin, x + 6 - clap, y + 12, 4 + clap * 2, 2)
        }
        // The rail in front of them covers the legs.
        fillRect(c, '#181430', x - 1, y + 15, 18, 7)
      }
      c.fillStyle = `rgba(0,0,10,${1 - dim})`
      c.fillRect(x0, top - 6, 58, 28)
    }
  }
  // A banner across each block.
  for (const x0 of [0, 262]) {
    fillRect(c, '#241e48', x0, 98, 58, 3)
    fillRect(c, '#c9a14a', x0, 98, 58, 1)
  }
}

function drawStageShot(c: Ctx, t: number, beat: number, since: number) {
  const k = Math.min(beat, 5)
  fillRect(c, '#06050c', 0, 0, VIEW_W, VIEW_H)
  // The big screen over the table: the winner, then an advert. It lights the stage.
  glow(c, 160, 84, 130, k < 4 ? '120,150,255' : '90,130,200', 0.13 * Math.max(0.4, 1 - k * 0.1))
  fillRect(c, '#05050c', 59, 9, 202, 62)
  fillRect(c, '#2e2e58', 60, 10, 200, 60)
  fillRect(c, '#46467a', 60, 10, 200, 1)
  fillRect(c, '#1c1c38', 62, 12, 196, 56)
  fillRect(c, '#0b0d22', 64, 14, 192, 52)
  fillRect(c, '#7a7aa8', 157, 69, 6, 2)
  c.save()
  c.beginPath()
  c.rect(64, 14, 192, 52)
  c.clip()
  if (k < 4) {
    fillRect(c, '#1a1c48', 64, 14, 192, 52)
    fillRect(c, '#241f5a', 64, 14, 192, 16)
    label(c, 'LEGENDS INVITATIONAL', 160, 18, '#c9a14a', 'centre')
    fillRect(c, '#c9a14a', 80, 28, 160, 1)
    // The winner, in close-up, with the trophy.
    fillRect(c, '#2a2e6a', 72, 32, 40, 26)
    fillRect(c, '#c9a14a', 72, 32, 40, 1)
    fillRect(c, '#c9a14a', 72, 57, 40, 1)
    c.save()
    c.beginPath()
    c.rect(73, 33, 38, 24)
    c.clip()
    drawPerson(c, HERO_FIGURE, 'down', 0, { x: 84, y: 30, scale: 1 })
    c.restore()
    label(c, 'WINNER', 190, 34, '#e8e4d8', 'centre')
    label(c, money(750000), 190, 45, '#f2d27a', 'centre')
    if (Math.floor(t / 500) % 2) {
      fillRect(c, '#e0402f', 68, 17, 22, 9)
      label(c, 'LIVE', 71, 18, '#ffffff')
    }
    // The ticker.
    fillRect(c, '#c9a14a', 64, 58, 192, 8)
    const tape = 'HEADS-UP FINAL  *  750,000 TO FIRST  *  THE CROWD IS ON ITS FEET  *  '
    const tx = -((t / 28) % measureText(tape))
    for (let i = 0; i < 3; i++) label(c, tape, 64 + tx + i * measureText(tape), 59, '#1a1428')
  } else {
    fillRect(c, '#14305a', 64, 14, 192, 52)
    fillRect(c, '#e8e4d8', 148, 26, 24, 14)
    fillRect(c, '#14305a', 152, 30, 16, 2)
    label(c, 'FIRST FEDERAL', 160, 46, '#e8e4d8', 'centre')
    label(c, 'BACK AFTER THESE MESSAGES', 160, 56, '#8aa0c8', 'centre')
  }
  // Scanlines, and a sheen across the glass.
  for (let y = 14; y < 66; y += 2) fillRect(c, 'rgba(0,0,0,0.18)', 64, y, 192, 1)
  c.fillStyle = 'rgba(255,255,255,0.05)'
  c.beginPath()
  c.moveTo(64, 14)
  c.lineTo(110, 14)
  c.lineTo(80, 66)
  c.lineTo(64, 66)
  c.fill()
  c.restore()
  drawStands(c, t, k)
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
  // The table: wood rail, padded leather, felt with its betting line, and the last hand.
  c.fillStyle = 'rgba(0,0,0,0.5)'
  c.beginPath()
  c.ellipse(160, 150, 100, 12, 0, 0, Math.PI * 2)
  c.fill()
  fillRect(c, '#1c0f07', 66, 134, 188, 12)
  fillRect(c, '#2e1a0c', 66, 134, 188, 2)
  for (const x of [84, 150, 216]) fillRect(c, '#140b05', x, 140, 3, 6)
  c.fillStyle = '#2e1a0c'
  c.beginPath()
  c.ellipse(160, 130, 96, 23, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#6a4224'
  c.beginPath()
  c.ellipse(160, 128, 94, 21, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#2e1a0c'
  c.beginPath()
  c.ellipse(160, 129, 90, 19, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#1a1a26'
  c.beginPath()
  c.ellipse(160, 129, 86, 17, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#0f5a34'
  c.beginPath()
  c.ellipse(160, 129, 82, 15, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#146e40'
  c.beginPath()
  c.ellipse(160, 126, 66, 10, 0, 0, Math.PI * 2)
  c.fill()
  c.strokeStyle = '#2f9a62'
  c.lineWidth = 1
  c.beginPath()
  c.ellipse(160, 129.5, 56, 11, 0, 0, Math.PI * 2)
  c.stroke()
  label(c, 'LEGENDS', 160, 133, '#2a8a56', 'centre')
  const board = [['9', 0], ['5', 1], ['2', 2], ['J', 3], ['7', 0]] as const
  board.forEach(([r, s], i) => card(c, 127 + i * 14, 116, r, s))
  // Her two, turned over; yours, still face down.
  card(c, 204, 128, 'K', 0)
  card(c, 214, 129, 'Q', 0)
  card(c, 98, 130, '', -1)
  card(c, 106, 131, '', -1)
  // The stack that was hers, pushed to the middle; and the one that was yours.
  chips(c, 116, 146, 4, '#c8402f')
  chips(c, 129, 147, 3, '#2a4aa8')
  chips(c, 142, 146, 5, '#f2c14e')
  chips(c, 176, 147, 4, '#3ac87a')
  chips(c, 189, 146, 5, '#14141c')
  fillRect(c, '#e8e4d8', 158, 140, 7, 4)
  label(c, 'D', 160, 139, '#14141c')
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

// ---------------------------------------------------------------------------
// The montage: the rise, and what the rise was made of.
// ---------------------------------------------------------------------------

const WIFE: Figure = { role: 'local', look: { skin: '#f0c8a0', hair: '#2a1410', hairStyle: 'bob', shirt: '#b8283f', accessory: 'none' } }

function bottle(c: Ctx, x: number, y: number, color: string, h = 16) {
  fillRect(c, '#05050a', x - 1, y - h, 6, h)
  fillRect(c, color, x, y - h + 1, 4, h - 2)
  fillRect(c, color, x + 1, y - h - 5, 2, 5)
  fillRect(c, '#05050a', x + 1, y - h - 6, 2, 1)
  fillRect(c, 'rgba(255,255,255,0.35)', x + 1, y - h + 3, 1, h - 7)
}

function bill(c: Ctx, x: number, y: number, tilt: number) {
  fillRect(c, '#1f5a34', x, y, 9, 5)
  fillRect(c, '#3a9a5a', x + 1, y + 1, 7, 3)
  fillRect(c, '#d8f0c0', x + 4 - tilt, y + 2, 1, 1)
}

function sparkle(c: Ctx, x: number, y: number, a: number) {
  c.fillStyle = `rgba(255,248,210,${a})`
  c.fillRect(x - 3, y, 7, 1)
  c.fillRect(x, y - 3, 1, 7)
  c.fillRect(x - 1, y - 1, 3, 3)
}

function drawMontageShot(c: Ctx, t: number, beat: number, since: number) {
  const ease = Math.min(1, since / 1800)
  switch (Math.min(beat, 7)) {
    case 0: {
      // The win: a spotlit stage, the trophy over your head, flashbulbs.
      fillRect(c, '#07060e', 0, 0, VIEW_W, VIEW_H)
      c.fillStyle = 'rgba(255,230,160,0.16)'
      c.beginPath()
      c.moveTo(150, 0)
      c.lineTo(170, 0)
      c.lineTo(240, 150)
      c.lineTo(80, 150)
      c.fill()
      fillRect(c, '#1a1426', 0, 140, VIEW_W, 40)
      for (let y = 144; y < 180; y += 8) fillRect(c, '#241c34', 0, y, VIEW_W, 1)
      for (let i = 0; i < 40; i++) fillRect(c, '#0a0914', (i * 37) % 330 - 6, 150 + (i % 5) * 7, 10, 24)
      const lift = Math.sin(Math.min(1, since / 700) * Math.PI / 2)
      const hx = 144
      c.fillStyle = 'rgba(0,0,0,0.45)'
      c.beginPath()
      c.ellipse(hx + 24, 150, 22, 4, 0, 0, Math.PI * 2)
      c.fill()
      drawPerson(c, HERO_FIGURE, 'down', 0, { x: hx, y: 78, scale: 3 })
      // Both arms up, and the cup in them.
      const handY = 106 - lift * 44
      for (const ax of [hx + 3, hx + 39]) {
        fillRect(c, HERO_FIGURE.look.shirt, ax, handY + 8, 6, 108 - handY - 8)
        fillRect(c, HERO_FIGURE.look.skin, ax, handY, 6, 8)
      }
      const ty = 34 - lift * 6 + (1 - lift) * 20
      fillRect(c, '#8a6a22', hx + 18, ty + 28, 12, 4)
      fillRect(c, '#c9a14a', hx + 21, ty + 18, 6, 10)
      fillRect(c, '#f2d27a', hx + 12, ty, 24, 18)
      fillRect(c, '#c9a14a', hx + 12, ty + 12, 24, 6)
      fillRect(c, '#c9a14a', hx + 8, ty + 2, 4, 8)
      fillRect(c, '#c9a14a', hx + 36, ty + 2, 4, 8)
      fillRect(c, '#fff4c8', hx + 15, ty + 2, 3, 10)
      sparkle(c, hx + 24, ty + 6, 0.6 + 0.4 * Math.sin(t / 120))
      for (let i = 0; i < 6; i++) {
        const on = Math.floor(t / 90 + i * 3) % 11 === 0
        if (on) {
          c.fillStyle = 'rgba(255,255,255,0.28)'
          c.fillRect(0, 0, VIEW_W, VIEW_H)
          sparkle(c, 20 + i * 52, 140 + (i % 2) * 14, 1)
        }
      }
      for (let i = 0; i < 90; i++) {
        const x = noise(i, 1, 9) * VIEW_W + Math.sin(t / 600 + i) * 8
        const y = (t / (14 + (i % 6) * 5) + noise(i, 2, 9) * VIEW_H * 2) % VIEW_H
        fillRect(c, CONFETTI[i % 5], x, y, 2, i % 3 ? 1 : 2)
      }
      label(c, 'CHAMPION', 160, 14, '#f2d27a', 'centre')
      break
    }
    case 1: {
      // Dusk, and a street of string lights. She walks up to you.
      const sky = ['#3a2a5a', '#6a3a6a', '#a8506a', '#e0785a', '#f2a65a', '#f8d490']
      sky.forEach((col, i) => fillRect(c, col, 0, i * 18, VIEW_W, 19))
      for (let i = 0; i < 16; i++) {
        const bh = 40 + Math.floor(noise(i, 3, 61) * 50)
        fillRect(c, '#2e2038', i * 21 - 4, 130 - bh, 20, bh)
        for (let wy = 130 - bh + 5; wy < 124; wy += 9) for (let wx = i * 21; wx < i * 21 + 14; wx += 6) fillRect(c, noise(wx, wy, 62) > 0.4 ? '#f8d070' : '#5a4258', wx, wy, 3, 4)
      }
      fillRect(c, '#241a2e', 0, 130, VIEW_W, 50)
      fillRect(c, '#3a2c44', 0, 130, VIEW_W, 2)
      for (let x = 0; x < VIEW_W; x += 8) {
        const y = 22 + Math.round(Math.sin(x / 19) * 6)
        fillRect(c, '#1a1020', x, y, 8, 1)
        glow(c, x + 4, y + 3, 7, '255,232,160', 0.35)
        fillRect(c, '#fff6c8', x + 3, y + 2, 2, 2)
      }
      const walk = Math.min(1, since / 3000)
      const wx = 250 - walk * 82
      const frame = (Math.floor(t / 170) % 3) as WalkFrame
      c.fillStyle = 'rgba(0,0,0,0.4)'
      c.beginPath()
      c.ellipse(96 + 24, 168, 22, 4, 0, 0, Math.PI * 2)
      c.ellipse(wx + 24, 168, 22, 4, 0, 0, Math.PI * 2)
      c.fill()
      drawPerson(c, HERO_FIGURE, 'right', 0, { x: 96, y: 96, scale: 3 })
      drawPerson(c, WIFE, 'left', walk < 1 ? frame : 0, { x: wx, y: 96, scale: 3 })
      if (walk >= 1) {
        for (let i = 0; i < 4; i++) {
          const hy = 90 - ((t / 40 + i * 22) % 70)
          fillRect(c, '#e8506a', 148 + i * 9 + Math.sin(t / 300 + i) * 4, hy, 3, 3)
          fillRect(c, '#e8506a', 150 + i * 9 + Math.sin(t / 300 + i) * 4, hy, 3, 3)
          fillRect(c, '#e8506a', 149 + i * 9 + Math.sin(t / 300 + i) * 4, hy + 3, 3, 1)
        }
      }
      break
    }
    case 2: {
      // The money arrives.
      fillRect(c, '#06140c', 0, 0, VIEW_W, VIEW_H)
      glow(c, 160, 90, 150, '60,200,110', 0.14)
      for (let i = 0; i < 70; i++) {
        const x = noise(i, 1, 21) * 300 + Math.sin(t / 500 + i) * 6
        const y = (t / (10 + (i % 5) * 4) + noise(i, 2, 21) * 400) % 200 - 10
        bill(c, x, y, i % 2)
      }
      for (const [bx, n] of [[16, 7], [250, 9]] as const) {
        for (let i = 0; i < n; i++) {
          fillRect(c, '#0f3a20', bx, 168 - i * 8, 54, 8)
          fillRect(c, '#2a7a46', bx + 1, 169 - i * 8, 52, 5)
          fillRect(c, '#c9a14a', bx + 24, 168 - i * 8, 6, 8)
        }
      }
      const amount = Math.round(750000 * Math.min(1, since / 2400))
      fillRect(c, '#05100a', 90, 66, 140, 40)
      fillRect(c, '#c9a14a', 90, 66, 140, 1)
      fillRect(c, '#c9a14a', 90, 105, 140, 1)
      label(c, 'FIRST PRIZE', 160, 74, '#8ad0a0', 'centre')
      label(c, money(amount), 160, 90, '#f2d27a', 'centre')
      break
    }
    case 3: {
      // The nice things: a car with no roof, a boat, a house on the hill, a watch.
      const sky = ['#6ab0ec', '#8cc4f2', '#b0d8f6', '#d4ecfa']
      sky.forEach((col, i) => fillRect(c, col, 0, i * 24, VIEW_W, 25))
      fillRect(c, '#fff4c8', 270, 16, 20, 20)
      fillRect(c, '#2e78c0', 0, 92, VIEW_W, 28)
      for (let x = 0; x < VIEW_W; x += 12) fillRect(c, '#6aa8e0', x + ((t / 120) % 12), 100 + (x % 3) * 6, 5, 1)
      // The yacht.
      const bx = 40 + ((t / 90) % 40)
      fillRect(c, '#f0ece0', bx, 80, 48, 10)
      fillRect(c, '#c8402f', bx, 88, 48, 3)
      fillRect(c, '#f0ece0', bx + 14, 72, 22, 8)
      fillRect(c, '#2a4aa8', bx + 16, 74, 18, 3)
      // The house on the hill.
      c.fillStyle = '#4a8a4a'
      c.beginPath()
      c.moveTo(180, 120)
      c.lineTo(250, 60)
      c.lineTo(320, 120)
      c.fill()
      fillRect(c, '#f0ece0', 230, 54, 40, 22)
      fillRect(c, '#c9a14a', 226, 50, 48, 4)
      for (let i = 0; i < 4; i++) fillRect(c, '#4a78b8', 234 + i * 9, 60, 6, 10)
      // The road, and the car.
      fillRect(c, '#34343e', 0, 120, VIEW_W, 60)
      fillRect(c, '#f2c14e', 0, 148, VIEW_W, 2)
      for (let x = -((t / 8) % 40); x < VIEW_W; x += 40) fillRect(c, '#d8d8e0', x, 148, 20, 1)
      const cx = -90 + ((since / 6) % 440)
      fillRect(c, 'rgba(0,0,0,0.35)', cx + 4, 160, 82, 5)
      fillRect(c, '#c8281f', cx, 138, 86, 16)
      fillRect(c, '#e8483a', cx, 138, 86, 3)
      fillRect(c, '#c8281f', cx + 22, 128, 38, 10)
      fillRect(c, '#9ad4f4', cx + 26, 130, 12, 7)
      fillRect(c, '#14141c', cx, 150, 86, 4)
      for (const wx of [cx + 10, cx + 62]) {
        fillRect(c, '#0a0a10', wx, 148, 16, 12)
        fillRect(c, '#c8c8d0', wx + 5, 152, 6, 5)
      }
      drawPerson(c, HERO_FIGURE, 'right', 0, { x: cx + 28, y: 115, scale: 1 })
      drawPerson(c, WIFE, 'right', 0, { x: cx + 44, y: 115, scale: 1 })
      fillRect(c, '#c8281f', cx + 26, 134, 34, 8)
      // The price tags.
      const tags = [['THE HOUSE', 230, 40], ['THE BOAT', 62, 58], ['THE CAR', 100, 120], ['THE WATCH', 230, 150]] as const
      tags.forEach(([txt, x, y], i) => {
        if (since < 500 + i * 650) return
        fillRect(c, '#05040a', x - 28, y - 3, 56, 11)
        fillRect(c, '#c9a14a', x - 28, y - 3, 56, 1)
        label(c, txt, x, y, '#f2d27a', 'centre')
      })
      // A watch, at the corner.
      if (since > 500 + 3 * 650) {
        fillRect(c, '#0a0a10', 276, 132, 10, 6)
        fillRect(c, '#c9a14a', 272, 138, 18, 18)
        fillRect(c, '#f0ece0', 275, 141, 12, 12)
        fillRect(c, '#14141c', 281, 143, 1, 5)
        fillRect(c, '#14141c', 281, 147, 4, 1)
        sparkle(c, 290, 138, 0.5 + 0.5 * Math.sin(t / 150))
      }
      break
    }
    case 4: {
      // The nights: neon, a table of bottles, you in the middle of it.
      fillRect(c, '#080410', 0, 0, VIEW_W, VIEW_H)
      for (let i = 0; i < 6; i++) {
        const a = Math.sin(t / 700 + i) * 0.5
        c.fillStyle = `rgba(${['255,60,160', '60,200,255', '170,90,255'][i % 3]},0.16)`
        c.beginPath()
        c.moveTo(20 + i * 56, 0)
        c.lineTo(30 + i * 56, 0)
        c.lineTo(160 + a * 140, 150)
        c.lineTo(100 + a * 140, 150)
        c.fill()
      }
      // The ball.
      fillRect(c, '#4a4a5a', 160, 0, 1, 14)
      c.fillStyle = '#c8c8d8'
      c.beginPath()
      c.arc(160, 20, 8, 0, Math.PI * 2)
      c.fill()
      for (let i = 0; i < 14; i++) sparkle(c, 10 + ((i * 53 + t / 30) % 300), 20 + ((i * 41) % 110), 0.5)
      fillRect(c, '#14101e', 0, 120, VIEW_W, 60)
      // Strangers, dancing.
      for (let i = 0; i < 16; i++) {
        const x = 8 + i * 20
        const y = 108 - Math.abs(Math.sin(t / 180 + i)) * 4
        fillRect(c, '#0a0612', x, y, 10, 40)
        fillRect(c, '#0a0612', x + 1, y - 7, 8, 8)
        fillRect(c, '#0a0612', x - 3, y - 6 - (i % 2) * 4, 2, 10)
        fillRect(c, '#0a0612', x + 11, y - 6 - ((i + 1) % 2) * 4, 2, 10)
      }
      // The table, and what is on it.
      fillRect(c, '#05030a', 70, 138, 180, 8)
      fillRect(c, '#ff3ca0', 70, 138, 180, 1)
      fillRect(c, '#2a1a3a', 80, 146, 160, 34)
      const cols = ['#2a8a4a', '#c9a14a', '#3a5ac8', '#c8402f']
      for (let i = 0; i < 12; i++) bottle(c, 84 + i * 14, 138, cols[i % 4], 12 + (i % 3) * 3)
      // You, up on the couch with a glass, swaying.
      drawPerson(c, HERO_FIGURE, 'down', 0, { x: 130 + Math.round(Math.sin(t / 500) * 3), y: 76, scale: 3 })
      fillRect(c, '#f0ece0', 120, 100, 4, 8)
      fillRect(c, '#f2d27a', 120, 100, 4, 4)
      // And her, at the edge of it, looking at the door.
      drawPerson(c, WIFE, 'right', 0, { x: 4, y: 108, scale: 2 })
      break
    }
    case 5: {
      // Four in the morning, at any table that will have you.
      fillRect(c, '#05080a', 0, 0, VIEW_W, VIEW_H)
      glow(c, 160, 70, 140, '255,226,150', 0.1)
      fillRect(c, '#0a3a22', 0, 90, VIEW_W, 90)
      fillRect(c, '#0f5a34', 0, 96, VIEW_W, 84)
      fillRect(c, '#2e1a0c', 0, 88, VIEW_W, 8)
      for (let i = 0; i < 5; i++) chips(c, 40 + i * 20, 150 + (i % 2) * 6, 16 - i * 2 + (i % 2) * 5, ['#c8402f', '#2a4aa8', '#f2c14e', '#3ac87a', '#14141c'][i])
      for (let i = 0; i < 5; i++) chips(c, 200 + i * 16, 156 - (i % 2) * 4, 5 + i * 2, ['#c8402f', '#2a4aa8', '#f2c14e', '#3ac87a', '#14141c'][(i + 2) % 5])
      card(c, 128, 110, 'A', 2)
      card(c, 142, 110, 'A', 3)
      card(c, 156, 110, '8', 0)
      bottle(c, 18, 110, '#2a8a4a', 20)
      bottle(c, 296, 106, '#c9a14a', 20)
      // The ashtray, and its smoke.
      fillRect(c, '#4a4a56', 268, 124, 20, 6)
      for (let i = 0; i < 8; i++) fillRect(c, 'rgba(200,200,210,0.25)', 276 + Math.sin(t / 400 + i) * 4, 120 - i * 7 - ((t / 60) % 7), 4, 3)
      // The clock, and the phone face-up, lit, unanswered.
      fillRect(c, '#05040a', 126, 8, 68, 20)
      fillRect(c, '#c9a14a', 126, 8, 68, 1)
      label(c, `${3 + Math.min(1, Math.floor(since / 4000))}:${String(10 + Math.floor(since / 700) % 50).padStart(2, '0')} AM`, 160, 15, '#e8e4d8', 'centre')
      const buzz = Math.floor(t / 200) % 2
      fillRect(c, '#05040a', 206 + buzz, 108, 56, 52)
      fillRect(c, '#d8e4f4', 208 + buzz, 111, 52, 46)
      label(c, 'HER', 234 + buzz, 116, '#a8281f', 'centre')
      label(c, 'MISSED', 234 + buzz, 127, '#14141c', 'centre')
      label(c, `${Math.min(14, 3 + Math.floor(since / 600))} CALLS`, 234 + buzz, 138, '#c8402f', 'centre')
      drawPerson(c, HERO_FIGURE, 'down', 0, { x: 100, y: 32, scale: 3 })
      break
    }
    case 6: {
      // A dinner for two. The candle outlasts it.
      fillRect(c, '#0c0810', 0, 0, VIEW_W, VIEW_H)
      glow(c, 160, 100, 90, '255,190,100', 0.1 + Math.sin(t / 130) * 0.015)
      // The window, and a city that did not wait.
      fillRect(c, '#10122a', 28, 14, 90, 70)
      fillRect(c, '#05050c', 31, 17, 84, 64)
      for (let i = 0; i < 40; i++) fillRect(c, noise(i, 4, 33) > 0.5 ? '#f8d070' : '#3a4a8a', 34 + (i * 13) % 78, 40 + (i * 7) % 38, 2, 2)
      fillRect(c, '#10122a', 72, 17, 2, 64)
      fillRect(c, '#4a2c1c', 0, 120, VIEW_W, 60)
      fillRect(c, '#6a4228', 0, 120, VIEW_W, 2)
      fillRect(c, '#e8e4d8', 60, 118, 200, 6)
      fillRect(c, '#c8c0b0', 60, 124, 200, 30)
      // Two plates, one eaten at, one not.
      for (const px of [100, 200]) {
        fillRect(c, '#f0ece0', px, 126, 34, 8)
        fillRect(c, '#c8c0b0', px + 4, 128, 26, 4)
      }
      fillRect(c, '#8a5a2a', 106, 127, 14, 3)
      // Her chair, pulled out; yours, never sat in.
      fillRect(c, '#2e1a14', 64, 132, 24, 5)
      fillRect(c, '#2e1a14', 66, 100, 4, 34)
      fillRect(c, '#2e1a14', 232, 132, 24, 5)
      // The candle.
      fillRect(c, '#e8e4d8', 158, 106, 5, 16)
      fillRect(c, '#f8d070', 159, 99 - (Math.floor(t / 130) % 2), 3, 6)
      fillRect(c, '#fff6c8', 160, 101, 1, 3)
      label(c, `${9 + Math.floor(since / 3500)}:${String(10 + Math.floor(since / 90) % 50).padStart(2, '0')} PM`, 160, 14, '#8a8aa8', 'centre')
      // A figure at the window who has stopped checking.
      drawPerson(c, WIFE, 'up', 0, { x: 52, y: 52, scale: 2 })
      break
    }
    default: {
      // First light, where you stopped.
      const sky = ['#1a1830', '#2a2848', '#4a3a5a', '#8a5a5a']
      sky.forEach((col, i) => fillRect(c, col, 0, i * 20, VIEW_W, 21))
      c.fillStyle = `rgba(255,190,130,${0.1 + 0.2 * ease})`
      c.beginPath()
      c.moveTo(0, 40)
      c.lineTo(110, 40)
      c.lineTo(220, 180)
      c.lineTo(60, 180)
      c.fill()
      fillRect(c, '#1c1620', 0, 118, VIEW_W, 62)
      fillRect(c, '#05040a', 120, 14, 80, 86)
      fillRect(c, '#2a2848', 124, 18, 72, 78)
      fillRect(c, '#f2a65a', 124, 78 - ease * 14, 72, 18 + ease * 14)
      // Bottles on their sides, chips left where they fell.
      for (let i = 0; i < 6; i++) {
        fillRect(c, '#0a0a10', 24 + i * 44, 150 + (i % 2) * 10, 16, 5)
        fillRect(c, i % 2 ? '#2a8a4a' : '#c9a14a', 25 + i * 44, 151 + (i % 2) * 10, 11, 3)
      }
      for (let i = 0; i < 30; i++) fillRect(c, ['#c8402f', '#2a4aa8', '#f2c14e', '#14141c'][i % 4], 10 + noise(i, 1, 71) * 290, 124 + noise(i, 2, 71) * 50, 6, 3)
      // You, slumped, with the one tidy stack.
      chips(c, 186, 146, 12, '#f2c14e')
      c.fillStyle = 'rgba(0,0,0,0.4)'
      c.beginPath()
      c.ellipse(126, 150, 26, 5, 0, 0, Math.PI * 2)
      c.fill()
      drawPerson(c, HERO_FIGURE, 'down', 0, { x: 100, y: 94, scale: 2 })
      fillRect(c, '#1c1620', 94, 126, 64, 10)
      fillRect(c, HERO_FIGURE.look.shirt, 100, 124, 52, 6)
      break
    }
  }
  // Fewer colours as it goes on; the warm years first, then the film goes cold.
  if (beat >= 4) {
    c.fillStyle = `rgba(20,24,60,${Math.min(0.32, (beat - 3) * 0.08)})`
    c.fillRect(0, 0, VIEW_W, VIEW_H)
  }
  // Film bars, and the cut in.
  fillRect(c, '#000', 0, 0, VIEW_W, 5)
  fillRect(c, '#000', 0, VIEW_H - 5, VIEW_W, 5)
  for (let x = 4; x < VIEW_W; x += 12) {
    fillRect(c, '#2a2a34', x, 1, 5, 3)
    fillRect(c, '#2a2a34', x, VIEW_H - 4, 5, 3)
  }
  vignette(c, 0.5)
  const fade = 1 - Math.min(1, since / 450)
  if (fade > 0) {
    c.fillStyle = `rgba(${beat === 0 ? '255,255,255' : '0,0,0'},${fade})`
    c.fillRect(0, 0, VIEW_W, VIEW_H)
  }
}

function drawLedgerShot(c: Ctx, t: number, since: number) {
  const L = LEDGER
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

export function EndingFilm({ onDone, startAt = 'stage', debt }: { onDone: (skipped?: boolean) => void; startAt?: EndingShot; debt?: PenthouseDebt }) {
  LEDGER = ledgerFor(debt)
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
    if (s === 'montage') setLine(FILM.montage[0])
    if (s === 'ledger') setLine(LEDGER.lines[0])
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
      if (next >= FILM.stage.length) return cutTo('montage', 900)
      beat.current = next
      beatT0.current = performance.now()
      setLine(FILM.stage[next])
    } else if (s === 'montage') {
      if (next >= FILM.montage.length) return cutTo('walk', 900)
      beat.current = next
      beatT0.current = performance.now()
      setLine(FILM.montage[next])
    } else if (s === 'ledger') {
      if (next >= LEDGER.lines.length) return cutTo('phone')
      beat.current = next
      setLine(LEDGER.lines[next])
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
        } else if (s === 'montage') {
          drawMontageShot(c, t, beat.current, now - beatT0.current)
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
