import { Container, Sprite, Text } from 'pixi.js'
import { TILE_SIZE } from './tileRenderer'
import { characterTextures, paletteFromColor, propTexture, type PropKind } from './sprites'

export type NpcArt = 'person' | PropKind

export interface NpcConfig {
  id: string
  name: string
  col: number
  row: number
  color?: number
  art?: NpcArt
}

export class Npc {
  config: NpcConfig
  sprite: Container

  constructor(config: NpcConfig) {
    this.config = config
    const art = config.art ?? 'person'
    const texture =
      art === 'person'
        ? characterTextures(paletteFromColor(config.color ?? 0x6ea8fe)).down[0]
        : propTexture(art)

    const body = new Sprite(texture)
    const label = new Text({
      text: config.name,
      style: { fill: '#ffffff', fontSize: 10, fontFamily: 'monospace' },
    })
    label.anchor.set(0.5, 1)
    label.position.set(TILE_SIZE / 2, -2)

    this.sprite = new Container()
    this.sprite.addChild(body, label)
    this.sprite.position.set(config.col * TILE_SIZE, config.row * TILE_SIZE)
  }
}
