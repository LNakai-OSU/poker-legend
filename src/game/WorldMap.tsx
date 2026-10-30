import { createContext, useContext, useEffect, useMemo } from 'react'
import { CITIES } from '../world/cities'
import { TOWN_ORDER, type GameState } from './state'
import { useKeyLayer } from './keys'
import type { AreaDef, CityDef } from '../world/types'

/** Opens the map of the whole game; provided by the game, used by the street's corner map. */
export const OpenWorldMap = createContext<(() => void) | null>(null)
export const useOpenWorldMap = () => useContext(OpenWorldMap)

interface Place {
  area: AreaDef
  /** Rooms reached only through this one (a casino's private room). */
  rooms: AreaDef[]
}

interface TownLayout {
  city: CityDef
  /** The streets, in the order you meet them walking in, including the road in. */
  streets: AreaDef[]
  casino: Place | null
  others: AreaDef[]
}

/** Reads a town's shape from its data: streets are what join on foot; buildings hang off their doors. */
export function layoutOf(city: CityDef): TownLayout {
  const areas = city.areas
  const streets: AreaDef[] = []
  // Walk the town's own roads from its entry, west to east, never into another town.
  const seen = new Set<string>()
  const walk = (id: string) => {
    if (seen.has(id) || !areas[id]) return
    seen.add(id)
    const a = areas[id]
    if (a.edges && Object.keys(a.edges).length > 0) streets.push(a)
    for (const link of Object.values(a.edges ?? {})) if (link && !link.blocked) walk(link.toAreaId)
  }
  const road = Object.values(areas).find((a) => a.id.startsWith('road-'))
  // The street a town starts on may be a building (the flat), so start from any area that has a way along.
  const joined = Object.values(areas).find((a) => Object.values(a.edges ?? {}).some((l) => l && areas[l.toAreaId]))
  walk(road?.id ?? joined?.id ?? city.entryAreaId)
  streets.sort((a, b) => Number(b.id.startsWith('road-')) - Number(a.id.startsWith('road-')))

  const buildings = new Map<string, AreaDef>()
  for (const s of streets) for (const e of s.exits) if (areas[e.toAreaId] && !seen.has(e.toAreaId)) buildings.set(e.toAreaId, areas[e.toAreaId])
  const all = [...buildings.values()]
  const casino = all.find((b) => b.crowd !== undefined) ?? null
  const rooms = casino
    ? casino.exits.map((e) => areas[e.toAreaId]).filter((a): a is AreaDef => !!a && !seen.has(a.id) && !buildings.has(a.id))
    : []
  const others = all.filter((b) => b !== casino)
  return { city, streets, casino: casino ? { area: casino, rooms } : null, others }
}

const INK = '#e8e8f0'
const DIM = '#8d93ab'
const GOLD = '#f0d27a'

export function WorldMap({ state, onClose }: { state: GameState; onClose: () => void }) {
  const isTop = useKeyLayer(true, 5)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'm') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isTop, onClose])

  const towns = useMemo(() => TOWN_ORDER.map((id) => layoutOf(CITIES[id])), [])
  const here = state.areaId

  const chip = (a: AreaDef, tone: 'street' | 'casino' | 'room' | 'shop') => {
    const you = a.id === here
    const colours = {
      street: ['#2b3446', '#6f86b8'],
      casino: ['#3a2a12', GOLD],
      room: ['#2a1a30', '#c084fc'],
      shop: ['#1c2230', '#4b5470'],
    }[tone]
    return (
      <div
        key={a.id}
        data-testid={`map-place-${a.id}`}
        data-here={you || undefined}
        style={{
          padding: '4px 8px',
          borderRadius: 4,
          background: colours[0],
          border: `1px solid ${you ? '#fff' : colours[1]}`,
          color: tone === 'casino' ? GOLD : INK,
          fontSize: 12,
          boxShadow: you ? '0 0 0 2px #f2c14e' : undefined,
        }}
      >
        {tone === 'casino' ? '♠ ' : tone === 'room' ? '🔒 ' : ''}
        {a.name}
        {you && <span style={{ color: '#f2c14e' }}> ◀ you</span>}
      </div>
    )
  }

  return (
    <div
      data-testid="world-map"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: 'rgba(5,6,12,0.94)',
        color: INK,
        fontFamily: 'monospace',
        overflow: 'auto',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: GOLD, fontSize: 18 }}>The road to the penthouse</h2>
        <button
          type="button"
          data-testid="world-map-close"
          onClick={onClose}
          style={{ minHeight: 40, minWidth: 40, border: '1px solid #4a4a66', background: '#10101a', color: INK, fontFamily: 'monospace', fontSize: 16, cursor: 'pointer' }}
          aria-label="Close map"
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', minWidth: 'min-content' }}>
        {towns.map((t, i) => {
          const visited = state.unlockedCityIds.includes(t.city.id) || t.city.id === state.cityId
          return (
            <div key={t.city.id} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div style={{ color: DIM, fontSize: 11, textAlign: 'center', width: 54 }}>
                  ── bus ──▶
                </div>
              )}
              <section
                data-testid={`map-town-${t.city.id}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 230,
                  alignSelf: 'stretch',
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${t.city.id === state.cityId ? '#f2c14e' : '#2c3352'}`,
                  background: '#0d0f1a',
                  opacity: visited ? 1 : 0.55,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, color: visited ? GOLD : DIM }}>
                  {i + 1}. {t.city.name}
                </h3>
                <div style={{ fontSize: 11, color: DIM }}>
                  {[visited ? 'Reached' : 'Not reached yet', t.city.unlockCash > 0 ? `$${t.city.unlockCash.toLocaleString()} to get in` : 'free to enter'].join(' · ')}
                </div>
                <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>STREETS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {t.streets.map((s, j) => (
                    <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {j > 0 && <div style={{ color: DIM, textAlign: 'center', fontSize: 10, lineHeight: '8px' }}>│</div>}
                      {chip(s, 'street')}
                    </div>
                  ))}
                </div>
                {t.casino && (
                  <>
                    <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>CASINO</div>
                    {chip(t.casino.area, 'casino')}
                    {t.casino.rooms.map((r) => chip(r, 'room'))}
                  </>
                )}
                {t.others.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: DIM, marginTop: 4 }}>{t.casino ? 'ALSO HERE' : 'PLACES'}</div>
                    {t.others.map((a) => chip(a, 'shop'))}
                  </>
                )}
              </section>
            </div>
          )
        })}
      </div>
    </div>
  )
}
