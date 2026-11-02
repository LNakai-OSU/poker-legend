import { describe, expect, it } from 'vitest'
import { TABLE_HINTS } from './tableHints'
import { TABLES } from './content'
import { EVENTS } from './events'
import { STORY_FLAG_IDS } from './flags'

describe('table hints', () => {
  it('are said by somebody who is seated there, about something that exists', () => {
    for (const hint of TABLE_HINTS) {
      const table = TABLES[hint.tableId]
      expect(table, hint.id).toBeDefined()
      const seated = table.opponents.map((o) => (typeof o === 'string' ? o : o.character))
      expect(seated, `${hint.id}: ${hint.speaker} is not at ${hint.tableId}`).toContain(hint.speaker)
      for (const c of hint.when) {
        if (c.kind === 'flag') expect(STORY_FLAG_IDS).toContain(c.flag)
        if (c.kind === 'eventDone') expect(EVENTS.some((e) => e.id === c.eventId), `${hint.id}: ${c.eventId}`).toBe(true)
      }
      expect(hint.lines.length).toBeGreaterThan(0)
    }
  })
})
