import { useEffect, useState } from 'react'
import { ApartmentScene } from '../overworld/ApartmentScene'
import { CasinoLobbyScene } from '../overworld/CasinoLobbyScene'
import { PokerNightScene } from './PokerNightScene'
import { BusTransition } from './BusTransition'
import { CashGameScene, BUY_IN } from './CashGameScene'
import { CHECKPOINT_SCENES, loadGame, saveGame, type CheckpointScene } from './save'

type Scene = 'apartment' | 'pokerNight' | 'busTransition' | 'casinoLobby' | 'lowStakesTable'

function isCheckpoint(scene: Scene): scene is CheckpointScene {
  return (CHECKPOINT_SCENES as readonly string[]).includes(scene)
}

export function GameApp() {
  const [scene, setScene] = useState<Scene>(() => loadGame()?.scene ?? 'apartment')
  const [cash, setCash] = useState(() => loadGame()?.cash ?? 0)

  useEffect(() => {
    if (isCheckpoint(scene)) saveGame({ scene, cash })
  }, [scene, cash])

  switch (scene) {
    case 'pokerNight':
      return (
        <PokerNightScene
          onWin={(winnings) => {
            setCash(winnings)
            setScene('busTransition')
          }}
        />
      )
    case 'busTransition':
      return <BusTransition onArrive={() => setScene('casinoLobby')} />
    case 'casinoLobby':
      return (
        <CasinoLobbyScene
          cash={cash}
          onEnterLowStakesTable={() => {
            if (cash < BUY_IN) return
            setCash((c) => c - BUY_IN)
            setScene('lowStakesTable')
          }}
        />
      )
    case 'lowStakesTable':
      return (
        <CashGameScene
          wallet={cash}
          onRebuy={() => setCash((c) => c - BUY_IN)}
          onLeaveTable={(chipsCashedOut) => {
            setCash((c) => c + chipsCashedOut)
            setScene('casinoLobby')
          }}
        />
      )
    default:
      return <ApartmentScene onStartPokerNight={() => setScene('pokerNight')} />
  }
}
