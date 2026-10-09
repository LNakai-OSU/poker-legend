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

/** A point of interest a stamp brought with it, to be created on save. */
export interface NewPoi {
  id: string
  name: string
  col: number
  row: number
  /** A PoiAction kind, plus whatever that kind needs to point at. */
  action: string
  target?: string
}

/** A doorway a stamp brought with it, to be created on save. */
export interface NewExit {
  col: number
  row: number
  toAreaId: string
  toCol: number
  toRow: number
  label: string
}

export interface MapEdit {
  areaId: string
  /** The ASCII map, exactly as `parseMap` would read it. */
  sketch?: string
  markers?: MarkerEdits
  /** The objects standing on this map, replacing whatever was recorded before. */
  stamps?: Array<{ stampId: string; col: number; row: number }>
  addPois?: NewPoi[]
  addExits?: NewExit[]
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

/**
 * Records which objects stand on a map, in the AREA_STAMPS block.
 *
 * Replaces this area's entry outright rather than merging, because the editor
 * always sends the whole list: a merge would make deleting an object impossible.
 */
function setStamps(
  source: string,
  areaId: string,
  stamps: Array<{ stampId: string; col: number; row: number }>,
): PatchResult {
  const open = /export const AREA_STAMPS: Record<string, PlacedStamp\[\]> = \{/.exec(source)
  if (!open) throw new PatchError('cannot find where objects are recorded')

  const key = /^[a-z][a-z0-9]*$/.test(areaId) ? areaId : `'${areaId}'`
  const body =
    stamps.length === 0
      ? ''
      : `\n  ${key}: [\n` +
        stamps
          .map((s) => `    { stampId: '${s.stampId}', col: ${s.col}, row: ${s.row} },`)
          .join('\n') +
        '\n  ],'

  // An entry for this area already? Replace it, brackets and all.
  const existing = new RegExp(`\n  ${escapeForRegExp(key)}: \\[[\\s\\S]*?\n  \\],`).exec(source)
  if (existing) {
    const next = source.slice(0, existing.index) + body + source.slice(existing.index + existing[0].length)
    return { source: next, notes: [stamps.length === 0 ? `cleared the objects on ${areaId}` : `${stamps.length} object(s) on ${areaId}`] }
  }

  const at = open.index + open[0].length
  // An empty record is written `= {}`, so the entry needs a line of its own
  // before the brace that is already sitting there.
  const tail = source[at] === '}' ? '\n' : ''
  return {
    source: source.slice(0, at) + body + tail + source.slice(at),
    notes: [`${stamps.length} object(s) on ${areaId}`],
  }
}

/** Adds entries to one of the arrays inside an `area(...)` call. */
function appendToArray(call: string, which: 'pois' | 'exits', entries: string[]): string {
  if (entries.length === 0) return call
  // The POI list is the sixth argument and the exits the seventh; both are the
  // only `[` at their depth, so they are found by counting them in order.
  const starts: number[] = []
  let depth = 0
  for (let i = 0; i < call.length; i++) {
    const ch = call[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      i++
      while (i < call.length && call[i] !== quote) {
        if (call[i] === '\\') i++
        i++
      }
      continue
    }
    if (ch === '(' || ch === '{') depth++
    else if (ch === ')' || ch === '}') depth--
    else if (ch === '[' && depth === 1) starts.push(i)
  }
  const index = which === 'pois' ? 0 : 1
  const open = starts[index]
  if (open === undefined) throw new PatchError(`cannot find the ${which} of this area`)

  let level = 0
  let close = -1
  for (let i = open; i < call.length; i++) {
    const ch = call[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      i++
      while (i < call.length && call[i] !== quote) {
        if (call[i] === '\\') i++
        i++
      }
      continue
    }
    if (ch === '[') level++
    else if (ch === ']') {
      level--
      if (level === 0) {
        close = i
        break
      }
    }
  }
  if (close === -1) throw new PatchError(`the ${which} list is not closed`)

  const addition = entries.map((entry) => `        ${entry}`).join('\n')
  if (call.slice(open + 1, close).trim().length === 0) {
    return `${call.slice(0, open + 1)}\n${addition}\n      ${call.slice(close)}`
  }
  // In after the last entry, not in front of the closing bracket — otherwise the
  // bracket's own indentation gets counted twice and every added line is skewed.
  const lastLine = call.lastIndexOf('\n', close)
  return `${call.slice(0, lastLine)}\n${addition}${call.slice(lastLine)}`
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

/** Which field a PoiAction of this kind points at. */
function argumentFor(kind: string): string {
  switch (kind) {
    case 'table':
      return 'tableId'
    case 'shop':
      return 'shopId'
    case 'venue':
      return 'venueId'
    case 'sponsor':
      return 'sponsorId'
    case 'mission':
      return 'missionId'
    default:
      return 'id'
  }
}

function escapeForQuotes(text: string): string {
  return text.replace(/'/g, "\\'")
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

  // New fixtures and doorways, which stamps bring with them.
  if ((edit.addPois?.length ?? 0) > 0 || (edit.addExits?.length ?? 0) > 0) {
    const { start, end } = findAreaCall(next, edit.areaId)
    let call = next.slice(start, end)

    call = appendToArray(
      call,
      'pois',
      (edit.addPois ?? []).map((poi) => {
        const action = poi.target
          ? `{ kind: '${poi.action}', ${argumentFor(poi.action)}: '${poi.target}' }`
          : `{ kind: '${poi.action}' }`
        return (
          `{ id: '${poi.id}', name: '${escapeForQuotes(poi.name)}', col: ${poi.col}, row: ${poi.row}, ` +
          `color: COLORS.dealer, lines: ['${escapeForQuotes(poi.name)}: Right this way.'], action: ${action} },`
        )
      }),
    )
    call = appendToArray(
      call,
      'exits',
      (edit.addExits ?? []).map(
        (exit) =>
          `{ col: ${exit.col}, row: ${exit.row}, toAreaId: '${exit.toAreaId}', ` +
          `toCol: ${exit.toCol}, toRow: ${exit.toRow}, label: '${escapeForQuotes(exit.label)}' },`,
      ),
    )

    next = next.slice(0, start) + call + next.slice(end)
    for (const poi of edit.addPois ?? []) notes.push(`added ${poi.name} at (${poi.col},${poi.row})`)
    for (const exit of edit.addExits ?? []) notes.push(`added the ${exit.label} doorway`)
  }

  if (edit.stamps) {
    const result = setStamps(next, edit.areaId, edit.stamps)
    next = result.source
    notes.push(...result.notes)
  }

  // A save that writes the same bytes back is worth saying plainly, rather than
  // reporting the work it thought it was doing.
  if (next === source) return { source: next, notes: ['nothing changed'] }
  return { source: next, notes }
}
