/**
 * Edits `cities.ts` in place, as text.
 *
 * The editor writes back to the source the maps actually live in, rather than
 * asking you to copy a block out of a textarea and find the right place to paste
 * it. That means patching TypeScript as text, which is only safe because the
 * shapes it touches are small and regular: a `parseMap` template literal, two
 * numbers in a `local(...)` call, a `{ col, row }` pair.
 *
 * Everything here is pure — source in, source out — so it can be tested properly
 * rather than tested by running it on the real file and looking.
 */

export interface MarkerEdits {
  start?: { col: number; row: number }
  pois?: Array<{ id: string; col: number; row: number }>
  exits?: Array<{ label: string; col: number; row: number }>
}

export interface MapEdit {
  areaId: string
  /** The ASCII map, exactly as `parseMap` would read it. */
  sketch?: string
  markers?: MarkerEdits
  /**
   * Give this area a map of its own instead of editing the one it shares.
   *
   * Eleven areas are drawn from SHOP_ROOM and six from DINING_ROOM, so editing
   * "the bodega" otherwise silently redraws ten other shops. Splitting is how
   * a room stops being a palette swap.
   */
  split?: boolean
}

export interface PatchResult {
  source: string
  /** What changed, in words, for the editor to show and for a human to check. */
  notes: string[]
}

export class PatchError extends Error {}

/** Walks from the `(` at `open` to its matching `)`, skipping strings and comments. */
function matchParen(source: string, open: number): number {
  let depth = 0
  let i = open
  while (i < source.length) {
    const ch = source[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      i++
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') i++
        i++
      }
    } else if (ch === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i)
      if (i === -1) return -1
    } else if (ch === '/' && source[i + 1] === '*') {
      i = source.indexOf('*/', i) + 1
    } else if (ch === '(') {
      depth++
    } else if (ch === ')') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

/** The span of the `area(...)` call that defines this area. */
function findAreaCall(source: string, areaId: string): { start: number; end: number } {
  const marker = new RegExp(`area\\(\\s*'${areaId}',`).exec(source)
  if (!marker) throw new PatchError(`no area called "${areaId}" in the source`)
  const open = source.indexOf('(', marker.index)
  const end = matchParen(source, open)
  if (end === -1) throw new PatchError(`the area("${areaId}") call is not closed`)
  return { start: marker.index, end }
}

/** The name of the map constant an area is drawn from. */
export function mapConstantOf(source: string, areaId: string): string {
  const { start, end } = findAreaCall(source, areaId)
  const call = source.slice(start, end)
  // Third positional argument: id, name, MAP.
  const match = /area\(\s*'[^']*',\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),\s*([A-Z][A-Z0-9_]*)\s*,/.exec(call)
  if (!match) throw new PatchError(`cannot tell which map "${areaId}" is drawn from`)
  return match[1]
}

/** Every area drawn from the same map constant, this one included. */
export function areasSharing(source: string, constant: string): string[] {
  const found: string[] = []
  const pattern = new RegExp(`area\\(\\s*'([a-z0-9-]+)',\\s*(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"),\\s*${constant}\\s*,`, 'g')
  for (const match of source.matchAll(pattern)) found.push(match[1])
  return found
}

/** Replaces the body of `const NAME = parseMap(\`...\`)`. */
function replaceMapBody(source: string, constant: string, sketch: string): string {
  const declaration = new RegExp(`const ${constant} = parseMap\\(\``).exec(source)
  if (!declaration) throw new PatchError(`cannot find the map "${constant}"`)
  const bodyStart = declaration.index + declaration[0].length
  const bodyEnd = source.indexOf('`)', bodyStart)
  if (bodyEnd === -1) throw new PatchError(`the map "${constant}" is not closed`)
  return `${source.slice(0, bodyStart)}\n${sketch}\n${source.slice(bodyEnd)}`
}

/** A constant name for an area's own map: `marcus-house` becomes `MARCUS_HOUSE_MAP`. */
export function ownMapName(areaId: string, taken: string[]): string {
  const base = `${areaId.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}_MAP`
  if (!taken.includes(base)) return base
  for (let n = 2; ; n++) {
    if (!taken.includes(`${base}${n}`)) return `${base}${n}`
  }
}

/**
 * Gives an area its own copy of the map it was sharing.
 *
 * The new constant goes directly after the one it was copied from, so related
 * maps stay together in the file rather than collecting at the bottom.
 */
function splitMap(source: string, areaId: string, constant: string, sketch: string): PatchResult {
  const taken = [...source.matchAll(/const ([A-Z][A-Z0-9_]*) = parseMap\(/g)].map((m) => m[1])
  const name = ownMapName(areaId, taken)

  const declaration = new RegExp(`const ${constant} = parseMap\\(\``).exec(source)
  if (!declaration) throw new PatchError(`cannot find the map "${constant}"`)
  const after = source.indexOf('`)', declaration.index)
  if (after === -1) throw new PatchError(`the map "${constant}" is not closed`)
  const insertAt = source.indexOf('\n', after) + 1

  const block =
    `\n/** ${areaId}: its own room, split off from ${constant} so it can differ. */\n` +
    `const ${name} = parseMap(\`\n${sketch}\n\`)\n`

  let next = source.slice(0, insertAt) + block + source.slice(insertAt)

  // Point just this area at the new map, leaving everyone else on the old one.
  const { start, end } = findAreaCall(next, areaId)
  const call = next.slice(start, end)
  const repointed = call.replace(
    new RegExp(`(area\\(\\s*'${areaId}',\\s*(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"),\\s*)${constant}(\\s*,)`),
    `$1${name}$2`,
  )
  if (repointed === call) throw new PatchError(`could not point "${areaId}" at its new map`)
  next = next.slice(0, start) + repointed + next.slice(end)

  return {
    source: next,
    notes: [`${areaId} now has its own map, ${name}, split from ${constant}`],
  }
}

/** Patches the coordinates of the things standing on a map. */
function patchMarkers(source: string, areaId: string, markers: MarkerEdits): PatchResult {
  const { start, end } = findAreaCall(source, areaId)
  let call = source.slice(start, end)
  const notes: string[] = []

  if (markers.start) {
    const { col, row } = markers.start
    // Fourth positional argument, the only bare `{ col, row }` before the POI list.
    const pattern = /(area\(\s*'[^']*',\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"),\s*[A-Z][A-Z0-9_]*,\s*)\{ col: \d+, row: \d+ \}/
    const next = call.replace(pattern, `$1{ col: ${col}, row: ${row} }`)
    if (next === call) throw new PatchError(`cannot find where the player starts in "${areaId}"`)
    if (next !== call) notes.push(`the player now arrives at (${col},${row})`)
    call = next
  }

  for (const poi of markers.pois ?? []) {
    const before = call
    // `local('id', 'Name', col, row, ...)` — the two numbers after the name.
    const positional = new RegExp(`(local\\(\\s*'${poi.id}',\\s*(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"),\\s*)\\d+,(\\s*)\\d+,`)
    call = call.replace(positional, `$1${poi.col},$2${poi.row},`)
    if (call === before) {
      // The object form: find this POI's literal and patch inside it.
      const anchor = new RegExp(`id: '${poi.id}',`).exec(call)
      if (!anchor) throw new PatchError(`no point of interest called "${poi.id}" in "${areaId}"`)
      const tail = call.slice(anchor.index)
      const patched = tail
        .replace(/col: \d+,/, `col: ${poi.col},`)
        .replace(/row: \d+,/, `row: ${poi.row},`)
      call = call.slice(0, anchor.index) + patched
    }
    if (call !== before) notes.push(`${poi.id} moved to (${poi.col},${poi.row})`)
  }

  for (const exit of markers.exits ?? []) {
    const before = call
    // Identified by its label, which is what the signpost over the door says.
    const anchor = new RegExp(`\\{ col: \\d+, row: \\d+,([^}]*?)label: '${escapeForRegExp(exit.label)}' \\}`).exec(call)
    if (!anchor) throw new PatchError(`no doorway labelled "${exit.label}" in "${areaId}"`)
    call =
      call.slice(0, anchor.index) +
      `{ col: ${exit.col}, row: ${exit.row},${anchor[1]}label: '${exit.label}' }` +
      call.slice(anchor.index + anchor[0].length)
    if (call !== before) notes.push(`the ${exit.label} doorway moved to (${exit.col},${exit.row})`)
  }

  return { source: source.slice(0, start) + call + source.slice(end), notes }
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Applies one area's edit to the source of `cities.ts`.
 *
 * Refuses rather than guesses: an area, map, point of interest or doorway it
 * cannot find with certainty raises instead of writing something approximate
 * into a file the whole game is built from.
 */
export function applyEdit(source: string, edit: MapEdit): PatchResult {
  const notes: string[] = []
  let next = source

  if (edit.sketch !== undefined) {
    const constant = mapConstantOf(next, edit.areaId)
    const sharing = areasSharing(next, constant)

    if (edit.split) {
      const result = splitMap(next, edit.areaId, constant, edit.sketch)
      next = result.source
      notes.push(...result.notes)
    } else {
      next = replaceMapBody(next, constant, edit.sketch)
      notes.push(
        sharing.length > 1
          ? `redrew ${constant}, which is also ${sharing.filter((id) => id !== edit.areaId).join(', ')}`
          : `redrew ${constant}`,
      )
    }
  }

  if (edit.markers) {
    const result = patchMarkers(next, edit.areaId, edit.markers)
    next = result.source
    notes.push(...result.notes)
  }

  // A save that writes the same bytes back is worth saying plainly, rather than
  // reporting the work it thought it was doing.
  if (next === source) return { source: next, notes: ['nothing changed'] }
  return { source: next, notes }
}
