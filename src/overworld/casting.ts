import type { AvatarLook } from '../game/avatars'
import type { CharacterDef } from '../world/characters'
import type { PoiDef } from '../world/types'
import type { Sitter } from '../world/seating'
import type { NpcArt } from './Npc'
import { visualKey, type Figure, type NpcRole, type PersonHairStyle, type PersonLook } from './characterArt'

/**
 * Who looks like what.
 *
 * The art module can draw anybody; this decides who everybody *is* — which
 * clothes the pit boss wears, what the neighbour's hair is, that Marcus on the
 * street is the Marcus from across the felt. Content can say all of it outright
 * (`role`, `look`, `art` on a POI; `role` and `look` on a character's
 * `overworld`). Everything here is the default for when it does not.
 */

/** The hero. One design, never recoloured: you should find yourself on any screen at a glance. */
export const HERO_FIGURE: Figure = {
  role: 'player',
  look: { skin: '#eab88c', hair: '#4a2a18', hairStyle: 'short', shirt: '#e9a630', accessory: 'none' },
}

/** The man the sponsors send when a debt runs out. */
export const COLLECTOR_FIGURE: Figure = {
  role: 'collector',
  look: { skin: '#c8956a', hair: '#1c1612', hairStyle: 'buzz', shirt: '#1c1c24', accessory: 'shades' },
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Jobs named in a POI's name, for people whose action does not say what they
 * do — a flavour line from a "Patrol Officer" is still a police officer.
 *
 * A fallback, not the source of truth: a POI with `role` set is dressed as
 * that, whatever it is called. Order matters; the first match wins.
 */
const ROLE_WORDS: Array<[RegExp, NpcRole]> = [
  [/\b(officer|police|cop|patrol|sheriff)\b/i, 'officer'],
  [/\b(security|guard|bouncer)\b/i, 'security'],
  [/\b(doorman|valet|bellhop|porter|attendant)\b/i, 'bellhop'],
  [/\b(croupier|pit boss)\b/i, 'dealer'],
  [/\b(bartender|barman|barmaid)\b/i, 'bartender'],
  [/\b(waiter|waitress|server)\b/i, 'waiter'],
  [/\b(chef|cook)\b/i, 'chef'],
  [/\b(clerk|shopkeeper|cashier|seamstress)\b/i, 'clerk'],
  [/\b(tourist)\b/i, 'tourist'],
  [/\b(suit|broker|banker|fixer)\b/i, 'suit'],
  [/\b(deckhand|sailor|fisherman|angler)\b/i, 'sailor'],
  [/\b(kid|child)\b/i, 'kid'],
]

function roleFromName(name: string): NpcRole | undefined {
  return ROLE_WORDS.find(([pattern]) => pattern.test(name))?.[1]
}

/**
 * What somebody standing at a POI is dressed as.
 *
 * The action says most of it: whoever seats you at a table is a dealer, whoever
 * sells you something is behind a counter in an apron, a sponsor wears a suit.
 */
export function roleForPoi(poi: PoiDef): NpcRole {
  if (poi.role) return poi.role
  const { name } = poi
  switch (poi.action.kind) {
    case 'table':
    case 'craps':
    case 'slots':
      return 'dealer'
    case 'penthouse':
      return 'bellhop'
    case 'sponsor':
      return 'suit'
    case 'shop':
      // Car and boat dealers sell in a suit; everybody else in an apron.
      return /\b(salesman|dealer|broker)\b/i.test(name) ? 'suit' : 'clerk'
    case 'venue':
      return /\bdoor\b/i.test(name) ? 'security' : /\b(host|maitre)/i.test(name) ? 'suit' : 'waiter'
    default:
      return roleFromName(name) ?? 'local'
  }
}

// ---------------------------------------------------------------------------
// Art
// ---------------------------------------------------------------------------

/**
 * Things that are not people, recognised by name.
 *
 * Every POI used to be drawn as a person unless told otherwise, so a note on
 * a table and a mile marker were people standing on the floor. `none` is for an
 * interaction point on a piece of furniture the map already draws — a bank of
 * dryers needs nobody standing in front of it.
 */
const OBJECT_WORDS: Array<[RegExp, NpcArt]> = [
  [/\bnote\b/i, 'note'],
  [/\b(sign|billboard)\b/i, 'sign'],
  [/\bgull\b/i, 'gull'],
  [/\bstall\b/i, 'stall'],
  [/\b(viewpoint|binoculars)\b/i, 'viewer'],
  [/\b(dryers?|washers?|cooler|fridge|machines?)\b/i, 'none'],
]

/** How a POI is drawn: as a person unless it is plainly a thing. */
export function artForPoi(poi: PoiDef): NpcArt {
  if (poi.art) return poi.art
  if (poi.action.kind === 'travel') return 'sign'
  if (poi.action.kind === 'flavor') {
    const object = OBJECT_WORDS.find(([pattern]) => pattern.test(poi.name))
    if (object) return object[1]
  }
  return 'person'
}

// ---------------------------------------------------------------------------
// Looks
// ---------------------------------------------------------------------------

const SKINS = [
  '#f4d4b4', '#ecc6a2', '#e2b48c', '#d8a87a', '#cc9a6c', '#c08654',
  '#a9743f', '#8d5a3b', '#74482c', '#5e3a22',
]
const HAIR_COLORS = [
  '#141414', '#1f1712', '#2e2018', '#4a2e1c', '#6a4426', '#8a5a2b',
  '#b07a3a', '#d4b060', '#b8482a', '#8a8a90', '#d8d4cc',
]
const SHIRTS = [
  '#c84a4a', '#e07a3a', '#e0b040', '#7aa83a', '#3a9d5c', '#2f9a8e',
  '#3a8ac8', '#4a62c8', '#7a5ac0', '#b05aa8', '#d86a8a', '#8a5a3a',
  '#5a6a7a', '#e8e4d8', '#3a4a5a', '#a83a5a',
]
const TROUSERS = [
  '#3a4a6a', '#2c3550', '#4a4a54', '#26262e', '#6a5a44', '#4a4a36',
  '#5a4434', '#2a3a5c', '#7a6a58',
]
const SHOES = ['#4a3426', '#2a2228', '#6a4a30', '#3a3a46', '#a83232', '#dcdce2']

const ANY_HAIR: PersonHairStyle[] = ['short', 'short', 'long', 'tied', 'bald', 'bob', 'curly', 'spiky', 'bun', 'buzz', 'buzz']
const HIS_HAIR: PersonHairStyle[] = ['short', 'short', 'short', 'bald', 'curly', 'spiky', 'buzz', 'buzz', 'tied']
const HER_HAIR: PersonHairStyle[] = ['long', 'long', 'tied', 'tied', 'bob', 'bob', 'bun', 'curly', 'short']
const ACCESSORIES: AvatarLook['accessory'][] = [
  'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  'glasses', 'glasses', 'cap', 'cap', 'shades', 'earring', 'visor',
]

/** A small seeded generator, so a stranger looks the same every time you pass them. */
function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FEMININE = /\b(woman|women|waitress|madame|mrs|ms|miss|lady|girl|seamstress)\b/i
const MASCULINE = /\b(man|men|mr|sir|guy|boy|gentleman)\b/i

/**
 * A stranger's look, made up from their id.
 *
 * The same id always gives the same person, and two ids almost never give the
 * same one. The name is read for one thing only: whether to dress somebody
 * called "Woman with Shopping" like a woman.
 */
export function lookFromId(id: string, name = '', role: NpcRole = 'local'): PersonLook {
  const next = seeded(id)
  const choose = <T,>(list: T[]): T => list[Math.floor(next() * list.length)]
  const feminine = FEMININE.test(name)
  const masculine = !feminine && MASCULINE.test(name)
  const child = role === 'kid'
  let hairStyle = choose(feminine ? HER_HAIR : masculine ? HIS_HAIR : ANY_HAIR)
  const skin = choose(SKINS)
  let hair = choose(HAIR_COLORS)
  // Children are not bald and not grey.
  if (child && hairStyle === 'bald') hairStyle = 'short'
  if (child && (hair === '#8a8a90' || hair === '#d8d4cc')) hair = '#6a4426'
  const shirt = choose(SHIRTS)
  const trousers = choose(TROUSERS)
  const shoes = choose(SHOES)
  const accessory = choose(ACCESSORIES)
  const skirt = feminine && next() < 0.5
  const sleeves = next() < 0.4 ? 'short' : 'long'
  return {
    skin,
    hair,
    hairStyle,
    shirt,
    // A visor on a bald head shows nothing of the baldness; let him keep it bare.
    accessory: hairStyle === 'bald' && accessory === 'visor' ? 'none' : accessory,
    trousers,
    shoes,
    lower: skirt ? 'skirt' : 'trousers',
    sleeves,
  }
}

/** Legs, shoes and sleeves for a character whose table look stops at the collar. */
function dressed(id: string, look: PersonLook): PersonLook {
  const next = seeded(`${id}:legs`)
  const trousers = TROUSERS[Math.floor(next() * TROUSERS.length)]
  const shoes = SHOES[Math.floor(next() * (SHOES.length - 1))]
  const sleeves = next() < 0.4 ? 'short' : 'long'
  return {
    ...look,
    trousers: look.trousers ?? trousers,
    shoes: look.shoes ?? shoes,
    sleeves: look.sleeves ?? sleeves,
  }
}

/** A named character in the street: their own face, their own clothes. */
export function figureForCharacter(id: string, character: CharacterDef): Figure {
  const look = dressed(id, { ...character.look, ...character.overworld?.look })
  return { role: character.overworld?.role ?? 'local', look }
}

/**
 * Everybody at the POIs of one area, made distinct.
 *
 * A POI that *is* a character — Deb at the diner, Nadia at her table — is drawn
 * as that character. Anybody else gets a role from their job and a look from
 * their id; if two of them would come out identical, the second is reshuffled,
 * because a street of twins is the palette-swap problem again.
 */
export function figuresForPois(
  pois: PoiDef[],
  characters: Record<string, CharacterDef>,
  taken: Iterable<Figure> = [],
): Map<string, Figure> {
  const seen = new Set<string>([...taken].map(visualKey))
  const figures = new Map<string, Figure>()
  const byName = new Map(Object.entries(characters).map(([id, c]) => [c.name, { id, character: c }]))
  for (const poi of pois) {
    // The same person, by id or by name: the "Dana" at Marcus's table is Dana.
    const match = characters[poi.id] ? { id: poi.id, character: characters[poi.id] } : byName.get(poi.name)
    if (match) {
      // Keyed by the character, not the POI, so Dana's trousers are the same
      // wherever she is standing.
      const figure = figureForCharacter(match.id, match.character)
      const cast = { ...figure, role: poi.role ?? figure.role }
      figures.set(poi.id, cast)
      seen.add(visualKey(cast))
      continue
    }
    const role = roleForPoi(poi)
    let figure: Figure = { role, look: { ...lookFromId(poi.id, poi.name, role), ...poi.look } }
    for (let attempt = 1; seen.has(visualKey(figure)) && attempt < 8; attempt++) {
      figure = { role, look: { ...lookFromId(`${poi.id}#${attempt}`, poi.name, role), ...poi.look } }
    }
    seen.add(visualKey(figure))
    figures.set(poi.id, figure)
  }
  return figures
}

/**
 * Everybody sitting at the tables of one area, keyed by sitter id.
 *
 * Somebody the table's game seats is drawn as themselves, so the faces at the
 * rail are the faces across the felt. A stranger is made up from their chair —
 * mostly in their own clothes, now and then in a jacket and tie — and is not
 * the double of anybody else in the room.
 */
export function figuresForSitters(
  sitters: Sitter[],
  characters: Record<string, CharacterDef>,
  taken: Iterable<Figure> = [],
): Map<string, Figure> {
  const seen = new Set<string>([...taken].map(visualKey))
  const figures = new Map<string, Figure>()
  for (const sitter of sitters) {
    const character = sitter.characterId ? characters[sitter.characterId] : undefined
    if (character && sitter.characterId) {
      const figure = figureForCharacter(sitter.characterId, character)
      figures.set(sitter.id, figure)
      seen.add(visualKey(figure))
      continue
    }
    const role: NpcRole = seeded(`${sitter.id}:role`)() < 0.2 ? 'suit' : 'local'
    let figure: Figure = { role, look: lookFromId(sitter.id, '', role) }
    for (let attempt = 1; seen.has(visualKey(figure)) && attempt < 8; attempt++) {
      figure = { role, look: lookFromId(`${sitter.id}#${attempt}`, '', role) }
    }
    seen.add(visualKey(figure))
    figures.set(sitter.id, figure)
  }
  return figures
}
