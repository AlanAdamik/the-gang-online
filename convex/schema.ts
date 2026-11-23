import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const player = v.object({
  id: v.string(),
  name: v.string(),
  ready: v.boolean(),
  cards: v.array(v.number()),
})

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    players: v.array(player),
    status: v.union(v.literal('lobby'), v.literal('playing'), v.literal('finished')),
    round: v.number(),
    createdAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_created_at', ['createdAt']),
})
