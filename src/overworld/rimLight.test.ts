import { describe, expect, it } from 'vitest'
import { rimMask } from './rimLight'

/** A figure as rows of '#', and its rim drawn back as rows: 'o' rim, '#' figure, '.' clear. */
function rimOf(rows: string[]): string[] {
  const width = rows[0].length
  const height = rows.length
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && rows[y][x] === '#'
  const mask = rimMask(opaque, width, height)
  const out: string[] = []
  for (let y = -1; y <= height; y++) {
    let line = ''
    for (let x = -1; x <= width; x++) {
      line += opaque(x, y) ? '#' : mask[(y + 1) * (width + 2) + (x + 1)] ? 'o' : '.'
    }
    out.push(line)
  }
  return out
}

describe('the rim of moonlight round a figure at night', () => {
  it('runs over the head and down both sides, and never under the feet', () => {
    expect(rimOf(['.#.', '###', '#.#'])).toEqual([
      '..o..',
      '.o#o.',
      'o###o',
      'o#o#o',
      '.....',
    ])
  })

  it('leaves a figure with nothing round it unlit', () => {
    expect(rimOf(['...', '...']).join('')).not.toContain('o')
  })
})
