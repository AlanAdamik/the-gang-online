import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const playerValidator = v.object({
  id: v.string(),
  name: v.string(),
  ready: v.boolean(),
  cards: v.array(v.number()),
})

const roomValidator = v.object({
  _id: v.id('rooms'),
  _creationTime: v.number(),
  code: v.string(),
  hostId: v.string(),
  players: v.array(playerValidator),
  status: v.union(v.literal('lobby'), v.literal('playing'), v.literal('finished')),
  round: v.number(),
  createdAt: v.number(),
})

function makeCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

export const getRoom = query({
  args: { code: v.string(), playerId: v.string() },
  returns: v.union(roomValidator, v.null()),
  handler: async (ctx, { code, playerId }) => {
    const room = await ctx.db
      .query('rooms')
      .withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase()))
      .unique()
    if (!room || !room.players.some((player) => player.id === playerId)) return null
    return {
      ...room,
      players: room.players.map((player) => ({
        ...player,
        cards: player.id === playerId ? player.cards : [],
      })),
    }
  },
})

export const createRoom = mutation({
  args: { playerId: v.string(), name: v.string() },
  returns: v.string(),
  handler: async (ctx, { playerId, name }) => {
    let code = makeCode()
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const exists = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code)).unique()
      if (!exists) break
      code = makeCode()
    }
    await ctx.db.insert('rooms', {
      code,
      hostId: playerId,
      players: [{ id: playerId, name: name.trim().slice(0, 20), ready: true, cards: [] }],
      status: 'lobby',
      round: 1,
      createdAt: Date.now(),
    })
    return code
  },
})

export const joinRoom = mutation({
  args: { code: v.string(), playerId: v.string(), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId, name }) => {
    const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase())).unique()
    if (!room) throw new Error('We couldn’t find a room with that code.')
    if (room.status !== 'lobby') throw new Error('This game has already started.')
    if (room.players.some((player) => player.id === playerId)) return null
    if (room.players.length >= 6) throw new Error('This room is full. The Gang plays with up to 6 players.')
    await ctx.db.patch(room._id, {
      players: [...room.players, { id: playerId, name: name.trim().slice(0, 20), ready: false, cards: [] }],
    })
    return null
  },
})

export const setReady = mutation({
  args: { code: v.string(), playerId: v.string(), ready: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { code, playerId, ready }) => {
    const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code)).unique()
    if (!room || room.status !== 'lobby') throw new Error('This room is no longer in the lobby.')
    if (!room.players.some((player) => player.id === playerId)) throw new Error('You’re not in this room.')
    await ctx.db.patch(room._id, { players: room.players.map((player) => player.id === playerId ? { ...player, ready } : player) })
    return null
  },
})

export const startGame = mutation({
  args: { code: v.string(), playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId }) => {
    const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code)).unique()
    if (!room || room.hostId !== playerId) throw new Error('Only the host can start this game.')
    if (room.players.length < 2) throw new Error('Invite at least one more player to start.')
    if (!room.players.every((player) => player.ready)) throw new Error('Everyone needs to be ready first.')
    const deck = Array.from({ length: 52 }, (_, index) => index + 1)
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    let cursor = 0
    const players = room.players.map((player) => ({
      ...player,
      cards: deck.slice(cursor, cursor += 4).sort((a, b) => a - b),
    }))
    await ctx.db.patch(room._id, { players, status: 'playing' })
    return null
  },
})

export const leaveRoom = mutation({
  args: { code: v.string(), playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId }) => {
    const room = await ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code)).unique()
    if (!room) return null
    const players = room.players.filter((player) => player.id !== playerId)
    if (players.length === 0) await ctx.db.delete(room._id)
    else await ctx.db.patch(room._id, { players, hostId: room.hostId === playerId ? players[0].id : room.hostId })
    return null
  },
})
