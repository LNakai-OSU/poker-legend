import { useState } from 'react'
import { ApartmentScene } from '../overworld/ApartmentScene'
import { PokerNightScene } from './PokerNightScene'

type Scene = 'apartment' | 'pokerNight'

export function GameApp() {
  const [scene, setScene] = useState<Scene>('apartment')

  if (scene === 'pokerNight') {
    return <PokerNightScene onWin={() => setScene('apartment')} />
  }
  return <ApartmentScene onStartPokerNight={() => setScene('pokerNight')} />
}
