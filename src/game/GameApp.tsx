import { useState } from 'react'
import { ApartmentScene } from '../overworld/ApartmentScene'
import { CasinoLobbyScene } from '../overworld/CasinoLobbyScene'
import { PokerNightScene } from './PokerNightScene'
import { BusTransition } from './BusTransition'
import { CashGameScene, BUY_IN } from './CashGameScene'

type Scene = 'apartment' | 'pokerNight' | 'busTransition' | 'casinoLobby' | 'lowStakesTable'

export function GameApp() {
  const [scene, setScene] = useState<Scene>('apartment')
  const [cash, setCash] = useState(0)

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
