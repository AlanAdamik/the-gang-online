import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { v } from 'convex/values'

const tokenPickValidator = v.object({ round: v.number(), value: v.number() })
const playerValidator = v.object({
  id: v.string(),
  name: v.string(),
  ready: v.boolean(),
  cards: v.array(v.number()),
  tokenPicks: v.optional(v.array(tokenPickValidator)),
})
const revealValidator = v.object({
  playerId: v.string(),
  cards: v.array(v.number()),
  category: v.string(),
  score: v.number(),
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
  phase: v.optional(v.union(v.literal('ranking'), v.literal('challenge'), v.literal('reveal'), v.literal('result'))),
  mode: v.optional(v.union(v.literal('advanced'), v.literal('professional'), v.literal('master-thief'))),
  deck: v.optional(v.array(v.number())),
  communityCards: v.optional(v.array(v.number())),
  revealOrder: v.optional(v.array(v.string())),
  reveals: v.optional(v.array(revealValidator)),
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
})

const challengeNames = [
  'Quick Access', 'Noise Sensors', 'Motion Detector', 'Retina Scan', 'Hasty Getaway',
  'Ventilation Shaft', 'Laser Tripwires', 'Blackout', 'Fingerprint Scan', 'Security Cameras',
]
const specialistNames = [
  'Informant', 'Getaway Driver', 'Investor', 'Mastermind', 'Hacker',
  'Coordinator', 'Jack', 'Math Whiz', 'Con Artist', 'Muscle',
]

function makeCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

function shuffle<T>(items: T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function drawBoardCards(deck: number[], count: number, communityCards: number[]) {
  const drawn = deck.slice(1, count + 1)
  return { deck: deck.slice(count + 1), communityCards: [...communityCards, ...drawn] }
}

function challengePool(mode: 'advanced' | 'professional' | 'master-thief') {
  const ids = Array.from({ length: 10 }, (_, index) => index + 1)
  return shuffle(mode === 'advanced' ? ids : ids.filter((id) => id !== 1))
}

function drawChallengeCard(deck: number[] | undefined, mode: 'advanced' | 'professional' | 'master-thief', excluded: number[] = []) {
  const pile = deck?.length ? deck : challengePool(mode)
  const candidates = pile.filter((id) => !excluded.includes(id))
  const refill = candidates.length ? candidates : challengePool(mode).filter((id) => !excluded.includes(id))
  const card = refill[0]
  return { card, deck: pile.filter((id) => id !== card) }
}

function drawSpecialistCard(deck: number[] | undefined) {
  const pile = deck?.length ? deck : shuffle(Array.from({ length: 10 }, (_, index) => index + 1))
  return { card: pile[0], deck: pile.slice(1) }
}

function scoreFiveCards(cards: number[]) {
  const ranks = cards.map((card) => {
    const rank = ((card - 1) % 13) + 1
    return rank === 1 ? 14 : rank + 1
  })
  const suits = cards.map((card) => Math.floor((card - 1) / 13))
  const counts = new Map<number, number>()
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const uniqueRanks = [...counts.keys()].sort((a, b) => b - a)
  const flush = suits.every((suit) => suit === suits[0])
  const straightHigh = uniqueRanks.length === 5
    ? uniqueRanks[0] - uniqueRanks[4] === 4
      ? uniqueRanks[0]
      : uniqueRanks.join(',') === '14,5,4,3,2' ? 5 : 0
    : 0
  let category = 0
  let tieBreak: number[] = uniqueRanks
  if (flush && straightHigh) { category = 8; tieBreak = [straightHigh] }
  else if (groups[0][1] === 4) { category = 7; tieBreak = [groups[0][0], groups[1][0]] }
  else if (groups[0][1] === 3 && groups[1][1] === 2) { category = 6; tieBreak = [groups[0][0], groups[1][0]] }
  else if (flush) { category = 5; tieBreak = uniqueRanks }
  else if (straightHigh) { category = 4; tieBreak = [straightHigh] }
  else if (groups[0][1] === 3) { category = 3; tieBreak = [groups[0][0], ...groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a)] }
  else if (groups[0][1] === 2 && groups[1][1] === 2) { category = 2; tieBreak = [Math.max(groups[0][0], groups[1][0]), Math.min(groups[0][0], groups[1][0]), groups[2][0]] }
  else if (groups[0][1] === 2) { category = 1; tieBreak = [groups[0][0], ...groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a)] }
  const padded = [...tieBreak, 0, 0, 0, 0, 0].slice(0, 5)
  const score = category * 15 ** 5 + padded.reduce((value, rank) => value * 15 + rank, 0)
  const categories = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush']
  return { score, category: categories[category] }
}

function bestHand(cards: number[]) {
  let best = { score: -1, category: 'High card' }
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const result = scoreFiveCards([cards[a], cards[b], cards[c], cards[d], cards[e]])
            if (result.score > best.score) best = result
          }
        }
      }
    }
  }
  return best
}

function handSize(room: { activeChallengeCards?: number[] }) {
  return room.activeChallengeCards?.includes(10) ? 3 : 2
}

function drawPrivateCards(deck: number[], count: number) {
  return { cards: deck.slice(0, count), deck: deck.slice(count) }
}

function getRoomByCode(ctx: QueryCtx | MutationCtx, code: string) {
  return ctx.db.query('rooms').withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase())).unique()
}

export const getRoom = query({
  args: { code: v.string(), playerId: v.string() },
  returns: v.union(roomValidator, v.null()),
  handler: async (ctx, { code, playerId }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || !room.players.some((player: { id: string }) => player.id === playerId)) return null
    const revealedIds = new Set((room.reveals ?? []).map((reveal: { playerId: string }) => reveal.playerId))
    return {
      ...room,
      players: room.players.map((player) => ({
        ...player,
        cards: player.id === playerId || revealedIds.has(player.id) ? player.cards : [],
        tokenPicks: player.tokenPicks ?? [],
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
      const exists = await getRoomByCode(ctx, code)
      if (!exists) break
      code = makeCode()
    }
    await ctx.db.insert('rooms', {
      code,
      hostId: playerId,
      players: [{ id: playerId, name: name.trim().slice(0, 20), ready: true, cards: [], tokenPicks: [] }],
      status: 'lobby',
      round: 1,
      createdAt: Date.now(),
      alarms: 0,
      mode: 'advanced',
    })
    return code
  },
})

export const joinRoom = mutation({
  args: { code: v.string(), playerId: v.string(), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId, name }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room) throw new Error('We couldn’t find a room with that code.')
    if (room.status !== 'lobby') throw new Error('This game has already started.')
    if (room.players.some((player: { id: string }) => player.id === playerId)) return null
    if (room.players.length >= 6) throw new Error('This room is full. The Gang plays with up to 6 players.')
    await ctx.db.patch(room._id, {
      players: [...room.players, { id: playerId, name: name.trim().slice(0, 20), ready: false, cards: [], tokenPicks: [] }],
    })
    return null
  },
})

export const setReady = mutation({
  args: { code: v.string(), playerId: v.string(), ready: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { code, playerId, ready }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.status !== 'lobby') throw new Error('This room is no longer in the lobby.')
    if (!room.players.some((player: { id: string }) => player.id === playerId)) throw new Error('You’re not in this room.')
    await ctx.db.patch(room._id, { players: room.players.map((player: any) => player.id === playerId ? { ...player, ready } : player) })
    return null
  },
})

export const chooseMode = mutation({
  args: {
    code: v.string(),
    playerId: v.string(),
    mode: v.union(v.literal('advanced'), v.literal('professional'), v.literal('master-thief')),
  },
  returns: v.null(),
  handler: async (ctx, { code, playerId, mode }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.status !== 'lobby') throw new Error('Choose a mode before the game begins.')
    if (room.hostId !== playerId) throw new Error('Only the host can choose the game mode.')
    await ctx.db.patch(room._id, { mode })
    return null
  },
})

export const startGame = mutation({
  args: {
    code: v.string(),
    playerId: v.string(),
    mode: v.optional(v.union(v.literal('advanced'), v.literal('professional'), v.literal('master-thief'))),
  },
  returns: v.null(),
  handler: async (ctx, { code, playerId, mode: requestedMode }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.hostId !== playerId) throw new Error('Only the host can start this game.')
    if (room.status !== 'lobby') throw new Error('This game has already started.')
    if (room.players.length < 2) throw new Error('Invite at least one more player to start.')
    if (!room.players.every((player: { ready: boolean }) => player.ready)) throw new Error('Everyone needs to be ready first.')

    const mode = requestedMode ?? room.mode ?? 'advanced'
    const pool = challengePool(mode)
    const activeChallengeCards = mode === 'professional' ? [pool.pop()!] : mode === 'master-thief' ? [pool.pop()!, pool.pop()!] : []
    const permanentChallengeCard = mode === 'professional' ? activeChallengeCards[0] : undefined
    let deck = shuffle(Array.from({ length: 52 }, (_, index) => index + 1))
    const dealtPlayers = room.players.map((player: any) => {
      const deal = drawPrivateCards(deck, handSize({ activeChallengeCards }))
      deck = deal.deck
      return { ...player, cards: deal.cards.sort((a: number, b: number) => a - b), tokenPicks: [] }
    })
    let communityCards: number[] = []
    let round = 1
    if (activeChallengeCards.includes(1)) {
      const flop = drawBoardCards(deck, 3, communityCards)
      deck = flop.deck
      communityCards = flop.communityCards
      round = 2
    }
    await ctx.db.patch(room._id, {
      players: dealtPlayers,
      status: 'playing',
      mode,
      round,
      phase: 'ranking',
      deck,
      communityCards,
      revealOrder: [],
      reveals: [],
      outcome: undefined,
      alarms: room.alarms ?? 0,
      activeChallengeCards,
      permanentChallengeCard,
      challengeDeck: pool,
      specialistDeck: mode === 'master-thief' ? [] : shuffle(Array.from({ length: 10 }, (_, index) => index + 1)),
      activeSpecialistCard: undefined,
      pendingChallengeCard: undefined,
      pendingSpecialistCard: undefined,
      challengeChecks: [],
      completedChallengeChecks: [],
    })
    return null
  },
})

export const pickToken = mutation({
  args: { code: v.string(), playerId: v.string(), value: v.number() },
  returns: v.null(),
  handler: async (ctx, { code, playerId, value }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.status !== 'playing' || room.phase !== 'ranking') throw new Error('Token picks are closed for this round.')
    if (!room.players.some((player: { id: string }) => player.id === playerId)) throw new Error('You’re not in this room.')
    if (!Number.isInteger(value) || value < 1 || value > room.players.length) throw new Error('Choose one of the available ranking tokens.')
    const players = room.players.map((player: any) => ({ ...player, tokenPicks: player.tokenPicks ?? [] }))
    const player = players.find((item: any) => item.id === playerId)
    const picks = player.tokenPicks as { round: number; value: number }[]
    const currentPick = picks.find((pick) => pick.round === room.round)
    const active = room.activeChallengeCards ?? []
    const lockedValue = active.includes(2) && room.round <= 3 ? 1 : active.includes(6) && room.round <= 3 ? room.players.length : null
    if (currentPick && currentPick.value === lockedValue && currentPick.value !== value) throw new Error('This token is locked by the active challenge.')
    if (players.some((item: any) => item.id !== playerId && (item.tokenPicks ?? []).some((pick: any) => pick.round === room.round && pick.value === value))) {
      throw new Error('That token has already been taken this round.')
    }
    player.tokenPicks = currentPick
      ? picks.map((pick) => pick.round === room.round ? { ...pick, value } : pick)
      : [...picks, { round: room.round, value }]
    if (!players.every((item: any) => item.tokenPicks.some((pick: any) => pick.round === room.round))) {
      await ctx.db.patch(room._id, { players })
      return null
    }

    let deck = room.deck ?? []
    let communityCards = room.communityCards ?? []
    let round = room.round
    const activeChallengeCards = room.activeChallengeCards ?? []
    const addCommunity = (count: number) => {
      const draw = drawBoardCards(deck, count, communityCards)
      deck = draw.deck
      communityCards = draw.communityCards
    }
    if (round === 1) {
      addCommunity(3)
      const flopHasFaceCard = communityCards.slice(-3).some((card) => {
        const rank = ((card - 1) % 13) + 1
        return rank >= 11
      })
      const redrawLowest = activeChallengeCards.includes(3) && flopHasFaceCard
      const redrawHighest = activeChallengeCards.includes(7) && !flopHasFaceCard
      if (redrawLowest || redrawHighest) {
        const targetValue = redrawLowest ? 1 : players.length
        const target = players.find((item: any) => item.tokenPicks.some((pick: any) => pick.round === 1 && pick.value === targetValue))
        if (target) {
          const replacement = drawPrivateCards(deck, target.cards.length)
          deck = replacement.deck
          target.cards = replacement.cards.sort((a: number, b: number) => a - b)
        }
      }
      round = 2
    } else if (round === 2) {
      addCommunity(1)
      if (activeChallengeCards.includes(5)) {
        addCommunity(1)
        round = 4
      } else round = 3
    } else if (round === 3) {
      addCommunity(1)
      round = 4
    } else {
      const revealOrder = [...players]
        .sort((a: any, b: any) => (a.tokenPicks.find((pick: any) => pick.round === 4)?.value ?? 0) - (b.tokenPicks.find((pick: any) => pick.round === 4)?.value ?? 0))
        .map((item: any) => item.id)
      const challengeChecks = activeChallengeCards.filter((id) => id === 4 || id === 9)
      await ctx.db.patch(room._id, {
        players,
        phase: challengeChecks.length ? 'challenge' : 'reveal',
        revealOrder,
        deck,
        communityCards,
        challengeChecks,
        completedChallengeChecks: [],
      })
      return null
    }

    if (activeChallengeCards.includes(8)) {
      const previousRound = activeChallengeCards.includes(5) && room.round === 2 ? 2 : round - 1
      for (const item of players as any[]) item.tokenPicks = item.tokenPicks.filter((pick: any) => pick.round !== previousRound)
    }
    await ctx.db.patch(room._id, { players, round, phase: 'ranking', deck, communityCards })
    return null
  },
})

export const submitChallengeGuess = mutation({
  args: { code: v.string(), playerId: v.string(), guess: v.number() },
  returns: v.null(),
  handler: async (ctx, { code, playerId, guess }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.status !== 'playing' || room.phase !== 'challenge') throw new Error('There is no challenge check waiting.')
    if (room.hostId !== playerId) throw new Error('Only the host can submit the crew’s guess.')
    const completed = room.completedChallengeChecks ?? []
    const challengeId = (room.challengeChecks ?? []).find((id) => !completed.includes(id))
    if (challengeId === undefined) throw new Error('All challenge checks have already been completed.')
    const topTokenValue = room.players.length
    const target = room.players.find((player) => player.tokenPicks?.some((pick) => pick.round === 4 && pick.value === topTokenValue))
    if (!target) throw new Error('The highest red-token player could not be found.')
    let correct = false
    if (challengeId === 4) {
      if (!Number.isInteger(guess) || guess < 2 || guess > 14) throw new Error('Choose a card value from 2 through Ace.')
      correct = target.cards.some((card) => {
        const rank = ((card - 1) % 13) + 1
        return (rank === 1 ? 14 : rank + 1) === guess
      })
    } else {
      const categories = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush']
      if (!Number.isInteger(guess) || guess < 0 || guess >= categories.length) throw new Error('Choose a valid poker hand category.')
      const hand = bestHand([...(target.cards ?? []), ...(room.communityCards ?? [])])
      correct = categories[guess] === hand.category
    }
    if (correct) {
      const completedChallengeChecks = [...completed, challengeId]
      const checksFinished = completedChallengeChecks.length === (room.challengeChecks ?? []).length
      await ctx.db.patch(room._id, { completedChallengeChecks, phase: checksFinished ? 'reveal' : 'challenge' })
      return null
    }
    const alarms = (room.alarms ?? 0) + 1
    const limit = room.mode === 'master-thief' ? 2 : 3
    const challengeDraw = room.mode === 'master-thief' ? drawChallengeCard(room.challengeDeck, 'master-thief', room.activeChallengeCards ?? []) : null
    const specialistDraw = room.mode === 'master-thief' ? null : drawSpecialistCard(room.specialistDeck)
    await ctx.db.patch(room._id, {
      phase: 'result',
      outcome: 'failed',
      alarms,
      status: alarms >= limit ? 'finished' : 'playing',
      pendingChallengeCard: challengeDraw?.card,
      pendingSpecialistCard: specialistDraw?.card,
      challengeDeck: challengeDraw?.deck ?? room.challengeDeck,
      specialistDeck: specialistDraw?.deck ?? room.specialistDeck,
      activeSpecialistCard: undefined,
    })
    return null
  },
})

export const revealNextHand = mutation({
  args: { code: v.string(), playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.status !== 'playing' || room.phase !== 'reveal') throw new Error('There is no hand waiting to be revealed.')
    if (room.hostId !== playerId) throw new Error('Only the host can reveal the next hand.')
    const revealOrder = room.revealOrder ?? []
    const reveals = room.reveals ?? []
    const nextId = revealOrder[reveals.length]
    if (!nextId) throw new Error('Every hand has already been revealed.')
    const player = room.players.find((entry: { id: string }) => entry.id === nextId)
    if (!player) throw new Error('This player is no longer at the table.')
    const hand = bestHand([...(player.cards ?? []), ...(room.communityCards ?? [])])
    const reveal = { playerId: nextId, cards: [...(player.cards ?? []), ...(room.communityCards ?? [])], category: hand.category, score: hand.score }
    const updatedReveals = [...reveals, reveal]
    const previous = reveals[reveals.length - 1]
    if (previous && hand.score <= previous.score) {
      const alarms = (room.alarms ?? 0) + 1
      const limit = room.mode === 'master-thief' ? 2 : 3
      const challengeDraw = room.mode === 'master-thief' ? drawChallengeCard(room.challengeDeck, 'master-thief', room.activeChallengeCards ?? []) : null
      const specialistDraw = room.mode === 'master-thief' ? null : drawSpecialistCard(room.specialistDeck)
      await ctx.db.patch(room._id, {
        reveals: updatedReveals,
        phase: 'result',
        outcome: 'failed',
        alarms,
        status: alarms >= limit ? 'finished' : 'playing',
        pendingChallengeCard: challengeDraw?.card,
        pendingSpecialistCard: specialistDraw?.card,
        challengeDeck: challengeDraw?.deck ?? room.challengeDeck,
        specialistDeck: specialistDraw?.deck ?? room.specialistDeck,
        activeSpecialistCard: undefined,
      })
      return null
    }
    if (updatedReveals.length === revealOrder.length) {
      const mode = room.mode ?? 'advanced'
      const challengeDraw = drawChallengeCard(room.challengeDeck, mode, room.activeChallengeCards ?? [])
      await ctx.db.patch(room._id, {
        reveals: updatedReveals,
        phase: 'result',
        outcome: 'success',
        pendingChallengeCard: challengeDraw.card,
        challengeDeck: challengeDraw.deck,
        pendingSpecialistCard: undefined,
        activeSpecialistCard: undefined,
      })
      return null
    }
    await ctx.db.patch(room._id, { reveals: updatedReveals })
    return null
  },
})

export const startNextHeist = mutation({
  args: { code: v.string(), playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room || room.hostId !== playerId) throw new Error('Only the host can deal the next heist.')
    if (room.status !== 'playing' || room.phase !== 'result') throw new Error('The current heist is not ready to restart.')
    let activeChallengeCards = room.activeChallengeCards ?? []
    let activeSpecialistCard: number | undefined
    const mode = room.mode ?? 'advanced'
    if (mode === 'professional') {
      activeChallengeCards = room.permanentChallengeCard === undefined ? [] : [room.permanentChallengeCard]
      if (room.outcome === 'success' && room.pendingChallengeCard !== undefined) activeChallengeCards.push(room.pendingChallengeCard)
      if (room.outcome === 'failed') activeSpecialistCard = room.pendingSpecialistCard
    } else if (mode === 'master-thief') {
      const drawn = room.pendingChallengeCard
      if (drawn !== undefined) {
        const lowest = Math.min(...activeChallengeCards)
        activeChallengeCards = [...activeChallengeCards.filter((id) => id !== lowest), drawn]
      }
    } else if (room.outcome === 'success') {
      activeChallengeCards = room.pendingChallengeCard === undefined ? [] : [room.pendingChallengeCard]
    } else {
      activeChallengeCards = []
      activeSpecialistCard = room.pendingSpecialistCard
    }

    let deck = shuffle(Array.from({ length: 52 }, (_, index) => index + 1))
    const size = handSize({ activeChallengeCards })
    const players = room.players.map((player: any) => {
      const deal = drawPrivateCards(deck, size)
      deck = deal.deck
      return { ...player, cards: deal.cards.sort((a: number, b: number) => a - b), tokenPicks: [] }
    })
    let communityCards: number[] = []
    let round = 1
    if (activeChallengeCards.includes(1)) {
      const flop = drawBoardCards(deck, 3, communityCards)
      deck = flop.deck
      communityCards = flop.communityCards
      round = 2
    }
    await ctx.db.patch(room._id, {
      status: 'playing',
      phase: 'ranking',
      round,
      players,
      deck,
      communityCards,
      revealOrder: [],
      reveals: [],
      outcome: undefined,
      activeChallengeCards,
      activeSpecialistCard,
      pendingChallengeCard: undefined,
      pendingSpecialistCard: undefined,
      challengeChecks: [],
      completedChallengeChecks: [],
    })
    return null
  },
})

export const leaveRoom = mutation({
  args: { code: v.string(), playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, playerId }) => {
    const room = await getRoomByCode(ctx, code)
    if (!room) return null
    const players = room.players.filter((player: { id: string }) => player.id !== playerId)
    if (players.length === 0) await ctx.db.delete(room._id)
    else await ctx.db.patch(room._id, { players, hostId: room.hostId === playerId ? players[0].id : room.hostId })
    return null
  },
})
