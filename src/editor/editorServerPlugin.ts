import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { PatchError, applyEdit, areasSharing, mapConstantOf, type MapEdit } from './patchSource.js'

/**
 * Lets the map editor write back to `cities.ts`.
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
    },
  }
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
