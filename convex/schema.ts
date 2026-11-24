import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const tokenPick = v.object({
  round: v.number(),
  value: v.number(),
})

const tokenHistoryEntry = v.object({
  round: v.number(),
  playerId: v.string(),
  value: v.number(),
})

const player = v.object({
  id: v.string(),
  name: v.string(),
  ready: v.boolean(),
  cards: v.array(v.number()),
  tokenPicks: v.optional(v.array(tokenPick)),
})

const reveal = v.object({
  playerId: v.string(),
  cards: v.array(v.number()),
  category: v.string(),
  score: v.number(),
})

const tokenStealNotice = v.object({
  targetPlayerId: v.string(),
  thiefName: v.string(),
  value: v.number(),
  createdAt: v.number(),
})

const gameLogEventDetails = v.object({
  round: v.optional(v.number()),
  playerId: v.optional(v.string()),
  playerName: v.optional(v.string()),
  value: v.optional(v.number()),
  previousValue: v.optional(v.number()),
  displacedPlayerName: v.optional(v.string()),
  cards: v.optional(v.array(v.number())),
  category: v.optional(v.string()),
  mode: v.optional(v.string()),
  activeChallengeCards: v.optional(v.array(v.number())),
  specialistCard: v.optional(v.number()),
  challengeCard: v.optional(v.number()),
  guess: v.optional(v.string()),
  correct: v.optional(v.boolean()),
  outcome: v.optional(v.union(v.literal('success'), v.literal('failed'))),
  alarms: v.optional(v.number()),
})

export default defineSchema({
  gameLogs: defineTable({
    code: v.string(),
    players: v.array(v.object({ id: v.string(), name: v.string() })),
    mode: v.union(v.literal('advanced'), v.literal('professional'), v.literal('master-thief')),
    createdAt: v.number(),
    eventCount: v.number(),
    shareKey: v.optional(v.string()),
    savedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    outcome: v.optional(v.union(v.literal('success'), v.literal('failed'))),
  })
    .index('by_share_key', ['shareKey'])
    .index('by_created_at', ['createdAt']),
  gameLogEvents: defineTable({
    gameLogId: v.id('gameLogs'),
    sequence: v.number(),
    type: v.union(
      v.literal('game_started'),
      v.literal('heist_started'),
      v.literal('token_picked'),
      v.literal('board_revealed'),
      v.literal('challenge_resolved'),
      v.literal('hand_revealed'),
      v.literal('heist_outcome'),
      v.literal('game_finished'),
    ),
    createdAt: v.number(),
    details: gameLogEventDetails,
  })
    .index('by_game_and_sequence', ['gameLogId', 'sequence']),
  rooms: defineTable({
    code: v.string(),
    gameLogId: v.optional(v.id('gameLogs')),
    hostId: v.string(),
    players: v.array(player),
    status: v.union(v.literal('lobby'), v.literal('playing'), v.literal('finished')),
    round: v.number(),
    createdAt: v.number(),
    phase: v.optional(v.union(v.literal('ranking'), v.literal('challenge'), v.literal('reveal'), v.literal('result'))),
    mode: v.optional(v.union(v.literal('advanced'), v.literal('professional'), v.literal('master-thief'))),
    deck: v.optional(v.array(v.number())),
    communityCards: v.optional(v.array(v.number())),
    revealOrder: v.optional(v.array(v.string())),
    reveals: v.optional(v.array(reveal)),
    outcome: v.optional(v.union(v.literal('success'), v.literal('failed'))),
    alarms: v.optional(v.number()),
    activeChallengeCards: v.optional(v.array(v.number())),
    permanentChallengeCard: v.optional(v.number()),
    pendingChallengeCard: v.optional(v.number()),
    activeSpecialistCard: v.optional(v.number()),
    pendingSpecialistCard: v.optional(v.number()),
    challengeDeck: v.optional(v.array(v.number())),
    specialistDeck: v.optional(v.array(v.number())),
    challengeChecks: v.optional(v.array(v.number())),
    completedChallengeChecks: v.optional(v.array(v.number())),
    tokenStealNotice: v.optional(tokenStealNotice),
    tokenHistory: v.optional(v.array(tokenHistoryEntry)),
  })
    .index('by_code', ['code'])
    .index('by_created_at', ['createdAt']),
})
