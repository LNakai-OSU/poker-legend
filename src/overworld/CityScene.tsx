import { OverworldScene, type ChaserConfig, type Interactable } from './OverworldScene'
import { CITIES, MISSIONS } from '../world/content'
import { missionStatus } from '../game/progression'
import { daysUntilDue, totalOwed, type GameState } from '../game/state'
import type { PoiAction, PoiDef } from '../world/types'

interface CitySceneProps {
  state: GameState
  onAction: (action: PoiAction, poi: PoiDef) => void
  onCaught: () => void
}

export function CityScene({ state, onAction, onCaught }: CitySceneProps) {
  const city = CITIES[state.cityId]
  const hunted = state.huntedInCityId === state.cityId

  const interactables: Interactable[] = city.pois.map((poi) => ({
    id: poi.id,
    name: poi.name,
    col: poi.col,
    row: poi.row,
    color: poi.color,
    lines: linesFor(state, poi),
    onFinish: poi.action.kind === 'flavor' ? undefined : () => onAction(poi.action, poi),
  }))

  // Collectors start from the far corner so there's room to run for the exit.
  const chaser: ChaserConfig | undefined = hunted
    ? {
        name: 'Collector',
        col: Math.max(1, city.playerStart.col > city.map[0].length / 2 ? 2 : city.map[0].length - 3),
        row: Math.max(1, Math.min(city.map.length - 2, city.playerStart.row)),
        stepMs: 430,
      }
    : undefined

  const owed = totalOwed(state)
  const due = daysUntilDue(state)

  return (
    <OverworldScene
      key={`${state.cityId}-${hunted}`}
      map={city.map}
      playerStart={city.playerStart}
      interactables={interactables}
      background={city.background}
      chaser={chaser}
      onCaught={onCaught}
      hud={
        <>
          <div>{city.name} &middot; Day {state.day}</div>
          <div>Cash: ${state.cash.toLocaleString()}</div>
          {owed > 0 && (
            <div style={{ color: due !== null && due < 0 ? '#e05a5a' : '#f2c14e' }}>
              Owed: ${owed.toLocaleString()}
              {due !== null && (due < 0 ? ' — OVERDUE' : ` — due in ${due} day${due === 1 ? '' : 's'}`)}
            </div>
          )}
          {hunted && (
            <div style={{ color: '#e05a5a' }}>
              They sent someone. Get out of town or pay up.
            </div>
          )}
        </>
      }
    />
  )
}

function linesFor(state: GameState, poi: PoiDef): string[] {
  if (poi.action.kind !== 'mission') return poi.lines

  const mission = MISSIONS[poi.action.missionId]
  if (!mission) return poi.lines

  switch (missionStatus(state, mission.id)) {
    case 'unseen':
      return mission.brief
    case 'active':
      return [`${poi.name}: Not yet. ${mission.goalText}.`]
    case 'ready':
      return mission.doneText
    case 'done':
      return [`${poi.name}: Good to see you again.`]
  }
}
