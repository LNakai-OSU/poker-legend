import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import ts from 'typescript'
import { PatchError, applyEdit, areasSharing, mapConstantOf, type MapEdit } from './patchSource.js'
import { PatchError as ContentPatchError, saveCharacter, saveEvent, type EntryEdit } from './patchContent.js'

/**
 * Lets the editor write back to `cities.ts`, `characters.ts` and `events.ts`.
 *
 * Dev only — `apply: 'serve'` means it is never part of a build, so nothing
 * shipped to a browser can reach it. It writes one file and no other: the path
 * is fixed here rather than taken from the request, because a save endpoint that
 * accepts a path is a save endpoint that writes anywhere.
 *
 * There is no undo. Git is the undo, which is worth knowing before painting over
 * an hour of work.
 */

const CITIES = 'src/world/cities.ts'
const CHARACTERS = 'src/world/characters.ts'
const EVENTS = 'src/world/events.ts'

/** The parts of `contentRules.ts` the endpoints call, loaded fresh through Vite on every save. */
interface Rules {
  gameWorld: () => unknown
  characterProblems: (id: string, character: unknown, world: unknown) => string[]
  eventProblems: (event: unknown, originalId: string | null, world: unknown) => string[]
}

export function editorServer(): Plugin {
  return {
    name: 'poker-legend-map-editor',
    apply: 'serve',
    configureServer(server) {
      const file = resolve(server.config.root, CITIES)

      server.middlewares.use('/__editor/area', (req, res) => {
        const areaId = new URL(req.url ?? '', 'http://x').searchParams.get('id')
        if (!areaId) return send(res, 400, { error: 'which area?' })
        try {
          const source = readFileSync(file, 'utf8')
          const constant = mapConstantOf(source, areaId)
          const sharedWith = areasSharing(source, constant).filter((id: string) => id !== areaId)
          return send(res, 200, { constant, sharedWith })
        } catch (error) {
          return send(res, error instanceof PatchError ? 404 : 500, { error: String(error) })
        }
      })

      server.middlewares.use('/__editor/save', (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          try {
            const edit = JSON.parse(body) as MapEdit
            if (typeof edit?.areaId !== 'string') return send(res, 400, { error: 'no area given' })
            if (edit.sketch !== undefined) {
              const problem = badSketch(edit.sketch)
              // A ragged or unknown-character map would throw on load and take
              // the whole game down, so it never reaches the file.
              if (problem) return send(res, 400, { error: problem })
            }

            const source = readFileSync(file, 'utf8')
            const result = applyEdit(source, edit)
            if (result.source !== source) writeFileSync(file, result.source)
            return send(res, 200, { ok: true, notes: result.notes })
          } catch (error) {
            const status = error instanceof PatchError ? 400 : 500
            return send(res, status, { error: error instanceof Error ? error.message : String(error) })
          }
        })
      })

      // One character, or one event, written back into its file. Checked three
      // ways before anything is written: the content rules (the same ones the
      // tests enforce, run against the world as it is on disk right now), the
      // patcher's own read-back, and TypeScript's parser over the whole file.
      server.middlewares.use('/__editor/character', (req, res) =>
        saveContent(server, req, res, resolve(server.config.root, CHARACTERS), (rules, edit) => ({
          problems: rules.characterProblems(edit.id, edit.after, rules.gameWorld()),
          patch: (source) => saveCharacter(source, edit),
        })),
      )
      server.middlewares.use('/__editor/event', (req, res) =>
        saveContent(server, req, res, resolve(server.config.root, EVENTS), (rules, edit) => ({
          problems: rules.eventProblems(edit.after, edit.before === undefined ? null : edit.id, rules.gameWorld()),
          patch: (source) => saveEvent(source, edit),
        })),
      )
    },
  }
}

async function saveContent(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
  file: string,
  prepare: (
    rules: Rules,
    edit: EntryEdit,
  ) => { problems: string[]; patch: (source: string) => { source: string; notes: string[] } },
) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
  try {
    const edit = (await readJson(req)) as EntryEdit
    if (typeof edit?.id !== 'string' || typeof edit.after !== 'object' || edit.after === null) {
      return send(res, 400, { error: 'send { id, before?, after }' })
    }
    const rules = (await server.ssrLoadModule('/src/editor/contentRules.ts')) as unknown as Rules
    const { problems, patch } = prepare(rules, edit)
    if (problems.length > 0) {
      return send(res, 400, { error: `not saved: ${problems.length} problem(s)`, problems })
    }
    const source = readFileSync(file, 'utf8')
    const result = patch(source)
    const broken = syntaxErrors(result.source)
    if (broken.length > 0) {
      return send(res, 500, { error: `the result would not parse, so nothing was written: ${broken[0]}` })
    }
    if (result.source !== source) writeFileSync(file, result.source)
    return send(res, 200, { ok: true, notes: result.notes })
  } catch (error) {
    const status = error instanceof ContentPatchError || error instanceof SyntaxError ? 400 : 500
    return send(res, status, { error: error instanceof Error ? error.message : String(error) })
  }
}

/** Reads a JSON body, refusing anything larger than a content entry could be. */
function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((done, fail) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        fail(new SyntaxError('that is far too large to be one entry'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        done(JSON.parse(body))
      } catch (error) {
        fail(error)
      }
    })
    req.on('error', fail)
  })
}

/** What TypeScript's parser would say about this text, before it goes anywhere near the file. */
function syntaxErrors(source: string): string[] {
  const out = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext } })
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

/** The checks `parseMap` would make, made before writing rather than after. */
function badSketch(sketch: string): string | null {
  const rows = sketch.split('\n').filter((row) => row.trim().length > 0)
  if (rows.length < 2) return 'that map has no rows'
  const width = rows[0].length
  const ragged = rows.findIndex((row) => row.length !== width)
  if (ragged !== -1) return `row ${ragged} is ${rows[ragged].length} wide, expected ${width}`
  const known = new Set('.#F,~=-"DT:*+o')
  for (const row of rows) {
    for (const char of row) {
      if (!known.has(char)) return `"${char}" is not a tile`
    }
  }
  return null
}

function send(res: { setHeader: (k: string, v: string) => void; statusCode: number; end: (s: string) => void }, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
