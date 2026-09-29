import { Container, Graphics, Text } from 'pixi.js'
import { TILE_SIZE } from './tileRenderer'

export interface NpcConfig {
  id: string
  name: string
  col: number
  row: number
  color?: number
}

export class Npc {
  config: NpcConfig
  sprite: Container

  constructor(config: NpcConfig) {
    this.config = config
    const body = new Graphics().rect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8).fill({ color: config.color ?? 0x6ea8fe })
    const label = new Text({ text: config.name, style: { fill: '#ffffff', fontSize: 10, fontFamily: 'monospace' } })
    label.anchor.set(0.5, 1)
    label.position.set(TILE_SIZE / 2, -2)
    this.sprite = new Container()
    this.sprite.addChild(body, label)
    this.sprite.position.set(config.col * TILE_SIZE, config.row * TILE_SIZE)
  }
}
