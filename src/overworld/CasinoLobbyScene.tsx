import type { TileGrid } from './tileRenderer'
import { OverworldScene, type Interactable } from './OverworldScene'

const LOBBY_MAP: TileGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 2, 2, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

const BUY_IN = 100

interface CasinoLobbySceneProps {
  cash: number
  onEnterLowStakesTable: () => void
}

export function CasinoLobbyScene({ cash, onEnterLowStakesTable }: CasinoLobbySceneProps) {
  const canAfford = cash >= BUY_IN
  const interactables: Interactable[] = [
    {
      id: 'slots',
      name: 'Slot Row',
      col: 3,
      row: 2,
      color: 0xc084fc,
      lines: [
        "The machines blink and chime for no one in particular.",
        "Not tonight — you didn't come here to feed a machine.",
      ],
    },
    {
      id: 'craps',
      name: 'Craps Table',
      col: 12,
      row: 4,
      color: 0xe05a5a,
      lines: [
        "A small crowd groans as the shooter sevens out.",
        "Maybe another time.",
      ],
    },
    {
      id: 'pitboss',
      name: 'Pit Boss',
      col: 9,
      row: 3,
      color: 0x6ea8fe,
      lines: canAfford
        ? [
            "Pit Boss: Low-stakes table's got an open seat. Dollar-two blinds.",
            `Pit Boss: Buy-in's ${BUY_IN} bucks. Sit down whenever you're ready.`,
          ]
        : [
            "Pit Boss: Low-stakes table's got an open seat. Dollar-two blinds.",
            `Pit Boss: Buy-in's ${BUY_IN} bucks, though. Come back when you've got it.`,
          ],
      onFinish: canAfford ? onEnterLowStakesTable : undefined,
    },
  ]

  return (
    <OverworldScene
      map={LOBBY_MAP}
      playerStart={{ col: 9, row: 9 }}
      interactables={interactables}
      background="#161018"
      hud={`Cash: $${cash}`}
    />
  )
}
