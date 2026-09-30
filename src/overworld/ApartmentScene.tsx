import type { TileGrid } from './tileRenderer'
import { OverworldScene, type Interactable } from './OverworldScene'

const APARTMENT_MAP: TileGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

interface ApartmentSceneProps {
  onStartPokerNight: () => void
}

export function ApartmentScene({ onStartPokerNight }: ApartmentSceneProps) {
  const interactables: Interactable[] = [
    {
      id: 'marcus',
      name: 'Marcus',
      col: 8,
      row: 3,
      color: 0x6ea8fe,
      lines: [
        "Marcus: Hey! You still coming through tonight?",
        "Marcus: Bring what you can — winner takes the whole table.",
        "Marcus: Come by around 8. You in?",
      ],
      onFinish: onStartPokerNight,
    },
  ]

  return <OverworldScene map={APARTMENT_MAP} playerStart={{ col: 2, row: 5 }} interactables={interactables} />
}
