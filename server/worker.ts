/**
 * The account server: a Cloudflare Worker holding one KV namespace (`SAVES`).
 *
 * It exists so a name + password can follow a player to another device. It knows
 * nothing about the game: a save is an opaque JSON blob it stores and returns,
 * so a new build of the game never needs a new build of this. The client merges
 * an old blob over fresh state (`reconcile` in src/game/save.ts), which is what
 * lets a run carry on after the game is updated.
 *
 *   POST /account   {name, password}  -> {token}   create; 409 if the name is taken
 *   POST /session   {name, password}  -> {token}   log in; 401 if wrong
 *   GET  /save      Bearer token      -> {save, savedAt} | {save: null}
 *   PUT  /save      Bearer token      {save, savedAt}
 *
 * Deploy: see server/README.md.
 */

interface KV {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}
export interface Env {
  SAVES: KV
  /** Comma-separated origins allowed to call this; `*` when unset. */
  ALLOWED_ORIGINS?: string
}

interface Account {
  salt: string
  hash: string
}

const MAX_SAVE_BYTES = 200_000
const slugOf = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24)

const hex = (bytes: ArrayBuffer | Uint8Array): string =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 },
    key,
    256,
  )
  return hex(bits)
}

function cors(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim())
  const ok = allowed.includes('*') || allowed.includes(origin)
  return {
    'Access-Control-Allow-Origin': ok ? (allowed.includes('*') ? '*' : origin) : 'null',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    Vary: 'Origin',
  }
}

const json = (body: unknown, status: number, headers: Record<string, string>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })

async function newToken(env: Env, slug: string): Promise<string> {
  const token = hex(crypto.getRandomValues(new Uint8Array(24)))
  await env.SAVES.put(`token:${token}`, slug)
  return token
}

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text()
    if (text.length > MAX_SAVE_BYTES) return null
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const h = cors(req, env)
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
    const path = new URL(req.url).pathname

    if (path === '/account' || path === '/session') {
      if (req.method !== 'POST') return json({ error: 'method' }, 405, h)
      const body = await readBody(req)
      const name = typeof body?.name === 'string' ? body.name : ''
      const password = typeof body?.password === 'string' ? body.password : ''
      const slug = slugOf(name)
      if (!slug || password.length < 6 || password.length > 100) return json({ error: 'bad-credentials-format' }, 400, h)
      const raw = await env.SAVES.get(`user:${slug}`)
      if (path === '/account') {
        if (raw) return json({ error: 'name-taken' }, 409, h)
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
        const account: Account = { salt, hash: await hashPassword(password, salt) }
        await env.SAVES.put(`user:${slug}`, JSON.stringify(account))
        return json({ token: await newToken(env, slug) }, 201, h)
      }
      if (!raw) return json({ error: 'wrong-login' }, 401, h)
      const account = JSON.parse(raw) as Account
      if ((await hashPassword(password, account.salt)) !== account.hash) return json({ error: 'wrong-login' }, 401, h)
      return json({ token: await newToken(env, slug) }, 200, h)
    }

    if (path === '/save') {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const slug = token ? await env.SAVES.get(`token:${token}`) : null
      if (!slug) return json({ error: 'unauthorised' }, 401, h)
      if (req.method === 'GET') {
        const raw = await env.SAVES.get(`save:${slug}`)
        return json(raw ? JSON.parse(raw) : { save: null }, 200, h)
      }
      if (req.method === 'PUT') {
        const body = await readBody(req)
        if (!body || typeof body.save !== 'object' || body.save === null) return json({ error: 'bad-save' }, 400, h)
        const savedAt = typeof body.savedAt === 'number' ? body.savedAt : Date.now()
        await env.SAVES.put(`save:${slug}`, JSON.stringify({ save: body.save, savedAt }))
        return json({ ok: true }, 200, h)
      }
    }
    return json({ error: 'not-found' }, 404, h)
  },
}
