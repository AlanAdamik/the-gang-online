'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Card } from './playing-card'
import { RealCasinoTable } from './real-casino-table'
import { GameLogPanel } from './game-log'
import { Check, Eye, Flame, LoaderCircle, Shield, Sparkles } from 'lucide-react'

type GameFlowProps = {
  room: {
    code: string
    hostId: string
    status: 'lobby' | 'playing' | 'finished'
    round: number
    phase?: 'ranking' | 'challenge' | 'reveal' | 'result'
    mode?: 'advanced' | 'professional' | 'master-thief'
    communityCards?: number[]
    revealOrder?: string[]
    reveals?: { playerId: string; cards: number[]; category: string; score: number }[]
    outcome?: 'success' | 'failed'
    alarms?: number
    activeChallengeCards?: number[]
    permanentChallengeCard?: number
    pendingChallengeCard?: number
    activeSpecialistCard?: number
    pendingSpecialistCard?: number
    challengeChecks?: number[]
    completedChallengeChecks?: number[]
    tokenStealNotice?: { targetPlayerId: string; thiefName: string; value: number; createdAt: number }
    tokenHistory?: { round: number; playerId: string; value: number }[]
    players: { id: string; name: string; cards: number[]; tokenPicks?: { round: number; value: number }[] }[]
  }
  playerId: string
}

const challengeNames = ['Quick Access', 'Noise Sensors', 'Motion Detector', 'Retina Scan', 'Hasty Getaway', 'Ventilation Shaft', 'Laser Tripwires', 'Blackout', 'Fingerprint Scan', 'Security Cameras']
const challengeRules = [
  'Skip the white-token round and reveal the flop immediately.',
  'A picked 1 token is locked for the rest of the heist in rounds 1–3.',
  'A face card on the flop triggers a redraw for the lowest white-token player.',
  'Before the showdown, the crew must guess a card held by the highest red-token player.',
  'Skip orange-token selection; the turn and river are still revealed.',
  'The highest token in rounds 1–3 locks as soon as it is taken.',
  'If the flop has no face card, the highest white-token player redraws.',
  'Earlier-round tokens are removed as the next round begins.',
  'Before the showdown, the crew must guess the highest red-token player’s hand category.',
  'Deal three private cards; build the best five-card hand from those and the board.',
]
const specialistNames = ['Informant', 'Getaway Driver', 'Investor', 'Mastermind', 'Hacker', 'Coordinator', 'Jack', 'Math Whiz', 'Con Artist', 'Muscle']
const specialistRules = [
  'One player privately shows a pocket card to another.',
  'One player reveals their current hand ranking.',
  'Everyone declares how many face cards they hold.',
  'One player reveals how many cards of a chosen value they hold.',
  'One player draws a card, then discards one.',
  'Everyone passes one pocket card to the left.',
  'Replace one pocket card with a Jack.',
  'Everyone declares the sum of their pocket-card values.',
  'Shuffle and redistribute all pocket cards.',
  'This player wins ties against other hands of the same rank.',
]
const roundColors = ['white', 'yellow', 'orange', 'red']
const roundNames = ['White', 'Yellow', 'Orange', 'Red']
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function modeCopy(mode: GameFlowProps['room']['mode']) {
  if (mode === 'professional') return 'One permanent Challenge stays active. Successful heists add a temporary Challenge; a failed heist earns a Specialist.'
  if (mode === 'master-thief') return 'Two Challenges stay active, no Specialists are dealt, and two alarms end the game.'
  return 'Start with no modifiers. A win adds a Challenge to the next heist; a loss earns a Specialist.'
}

function ActiveChallengeFab({ cards }: { cards: number[] }) {
  const [open, setOpen] = useState(false)
  if (!cards.length) return null

  return <div className={`challenge-fab ${open ? 'is-open' : ''}`}>
    <button type="button" className="challenge-fab-trigger" aria-label="View active challenge" aria-expanded={open} aria-controls="active-challenge-details" onClick={() => setOpen((value) => !value)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
      <Flame size={18}/><span className="sr-only">Active challenge</span>
    </button>
    <div id="active-challenge-details" className="challenge-fab-details" role="status">
      <span className="section-kicker">ACTIVE CHALLENGE{cards.length > 1 ? 'S' : ''}</span>
      {cards.map((id) => <article key={id}><strong>{challengeNames[id - 1]}</strong><p>{challengeRules[id - 1]}</p></article>)}
    </div>
  </div>
}

function TokenHistory({ room }: { room: GameFlowProps['room'] }) {
  const history = room.tokenHistory ?? room.players.flatMap((player) =>
    (player.tokenPicks ?? []).map((pick) => ({ ...pick, playerId: player.id })),
  )

  return <section className="token-history" aria-label="Token picks by round and player">
    <div className="token-history-heading"><strong>Token history</strong><span>Assignments update when a token is stolen.</span></div>
    <table>
      <caption className="sr-only">Each player’s final token assignment across rounds, from left to right</caption>
      <thead><tr><th scope="col">Player</th>{[1, 2, 3, 4].map((round) => <th scope="col" key={round}>Round {round}</th>)}</tr></thead>
      <tbody>{room.players.map((player) => <tr key={player.id}>
        <th scope="row">{player.name}</th>
        {[1, 2, 3, 4].map((round) => {
          const pick = history.find((entry) => entry.round === round && entry.playerId === player.id)
          return <td key={round}>{pick ? <span className="token-history-token">{pick.value}</span> : <span className="token-history-empty" aria-label="No token picked">—</span>}</td>
        })}
      </tr>)}</tbody>
    </table>
  </section>
}

export function GameFlow({ room, playerId }: GameFlowProps) {
  const [busy, setBusy] = useState(false)
  const [displayMode, setDisplayMode] = useState<'text' | 'real'>('real')
  const [burningCard, setBurningCard] = useState(false)
  const previousBoardLength = useRef(room.communityCards?.length ?? 0)
  const [error, setError] = useState('')
  const [guess, setGuess] = useState('')
  const [dismissedStealNoticeAt, setDismissedStealNoticeAt] = useState<number | null>(null)
  const chooseMode = useMutation(api.rooms.chooseMode)
  const pickToken = useMutation(api.rooms.pickToken)
  const revealNextHand = useMutation(api.rooms.revealNextHand)
  const submitChallengeGuess = useMutation(api.rooms.submitChallengeGuess)
  const startNextHeist = useMutation(api.rooms.startNextHeist)
  const isHost = room.hostId === playerId
  const me = room.players.find((player) => player.id === playerId)
  const currentPick = me?.tokenPicks?.find((pick) => pick.round === room.round)
  const availableTokens = Array.from({ length: room.players.length }, (_, index) => index + 1)
  const takenTokens = room.players.flatMap((player) => player.id === playerId ? [] : (player.tokenPicks ?? []).filter((pick) => pick.round === room.round).map((pick) => pick.value))
  const stealNotice = room.tokenStealNotice?.targetPlayerId === playerId ? room.tokenStealNotice : undefined
  const lockedToken = room.activeChallengeCards?.includes(2) && room.round <= 3 ? 1 : room.activeChallengeCards?.includes(6) && room.round <= 3 ? room.players.length : null
  const revealOrder = room.revealOrder ?? []
  const reveals = room.reveals ?? []
  const nextPlayer = room.players.find((player) => player.id === revealOrder[reveals.length])
  const board = room.communityCards ?? []
  const activeChallenges = room.activeChallengeCards ?? []

  useEffect(() => {
    const cardsWereDealt = board.length > previousBoardLength.current
    previousBoardLength.current = board.length
    if (!cardsWereDealt) return
    setBurningCard(true)
    const timeout = window.setTimeout(() => setBurningCard(false), 650)
    return () => window.clearTimeout(timeout)
  }, [board.length])

  const viewModeToggle = <div className="game-view-toggle" role="group" aria-label="Choose game display mode">
    <span>TABLE VIEW</span>
    <button type="button" aria-pressed={displayMode === 'text'} onClick={() => setDisplayMode('text')}>Text</button>
    <button type="button" aria-pressed={displayMode === 'real'} onClick={() => setDisplayMode('real')}>Real table</button>
  </div>
  const colorName = roundColors[room.round - 1] ?? 'red'
  const tokenPicker = room.phase === 'ranking' ? <div className={`token-picker token-picker-${colorName}`}>
    <div className="token-picker-heading"><strong>Where do you rank?</strong><span>1 is lowest · {room.players.length} is highest</span></div>
    <div className="token-options">{availableTokens.map((value) => {
      const taken = takenTokens.includes(value)
      const locked = (value === lockedToken && taken) || (currentPick?.value === lockedToken && currentPick.value !== value)
      const selected = currentPick?.value === value
      return <button key={value} className={`rank-token ${selected ? 'is-selected' : ''} ${taken ? 'is-taken' : ''}`} aria-pressed={selected} disabled={busy || locked} onClick={() => void run(() => pickToken({ code: room.code, playerId, value }))}>
        {selected ? <Check size={14}/> : value}<span>{selected ? 'Your pick' : taken ? 'Steal' : value === 1 ? 'Lowest' : value === room.players.length ? 'Highest' : 'Rank'}</span>
      </button>
    })}</div>
    <p className="token-note">{currentPick ? `You chose token ${currentPick.value}. You can change it until everyone has ranked.` : 'Choose a token. You can take one from another player, who will need to choose again.'}</p>
  </div> : null
  const canRevealHand = room.phase === 'reveal' && nextPlayer?.id === playerId
  const realTable = displayMode === 'real' ? <RealCasinoTable players={room.players} board={board} playerId={playerId} phase={room.phase} reveals={reveals} nextPlayerId={nextPlayer?.id} burningCard={burningCard} tokenPicker={tokenPicker} revealBusy={busy} onRevealHand={() => void run(() => revealNextHand({ code: room.code, playerId }))}/> : null
  const completedChecks = room.completedChallengeChecks ?? []
  const currentChallengeCheck = (room.challengeChecks ?? []).find((id) => !completedChecks.includes(id))

  async function run(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.') }
    finally { setBusy(false) }
  }

  const stageMessage = room.round === 1
    ? 'Use your two private cards to decide where you belong.'
    : room.round === 2
      ? 'The flop is out. Reconsider your place with three shared cards.'
      : room.round === 3
        ? 'The turn is out. Refine your ranking with four shared cards.'
        : 'The river is out. Make your final ranking before the reveal.'

  if (room.status === 'lobby') {
    return <section className="hand-panel">
      <div className="table-waiting">
        <div className="waiting-icon"><Sparkles size={24}/></div>
        <span className="section-kicker">CHOOSE YOUR HEIST</span>
        <h2>Pick a difficulty<br/>for the <em>crew.</em></h2>
        {isHost ? <label className="mode-picker">Game mode
          <select value={room.mode ?? 'advanced'} disabled={busy} onChange={(event) => void run(() => chooseMode({ code: room.code, playerId, mode: event.target.value as 'advanced' | 'professional' | 'master-thief' }))}>
            <option value="advanced">Advanced</option>
            <option value="professional">Professional</option>
            <option value="master-thief">Master Thief</option>
          </select>
        </label> : <strong className="mode-name">{room.mode === 'master-thief' ? 'Master Thief' : room.mode === 'professional' ? 'Professional' : 'Advanced'} mode</strong>}
        <p>{modeCopy(room.mode)}</p>
        {room.mode === 'master-thief' && <span className="mode-warning"><Flame size={14}/> Two alarms and the game is over.</span>}
      </div>
    </section>
  }

  if (room.phase === 'result') {
    const failed = room.outcome === 'failed'
    return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
      {viewModeToggle}
      <ActiveChallengeFab cards={activeChallenges}/>
      {realTable}
      <div className={`heist-result ${failed ? 'result-failed' : 'result-success'}`}>
        <span className="section-kicker">HEIST {failed ? 'FAILED' : 'CLEARED'}</span>
        <h2>{failed ? <>The alarm is <em>ringing.</em></> : <>Vault <em>opened.</em></>}</h2>
        <p>{failed ? `The hand order broke. ${room.alarms ?? 0} alarm${room.alarms === 1 ? '' : 's'} so far.` : 'Every hand rose higher than the one before it.'}</p>
        {room.status === 'finished' && <p className="game-over-note">The crew hit the alarm limit. This game is over.</p>}
        <div className="modifier-draws">
          {room.pendingSpecialistCard && <div className="modifier-card specialist-card"><span><Shield size={15}/> RED SPECIALIST</span><strong>{specialistNames[room.pendingSpecialistCard - 1]}</strong><p>{specialistRules[room.pendingSpecialistCard - 1]}</p></div>}
          {room.pendingChallengeCard && <div className="modifier-card challenge-card"><span><Flame size={15}/> GREEN CHALLENGE</span><strong>{challengeNames[room.pendingChallengeCard - 1]}</strong><p>{challengeRules[room.pendingChallengeCard - 1]}</p></div>}
          {room.activeSpecialistCard && <div className="modifier-card specialist-card"><span><Shield size={15}/> ACTIVE SPECIALIST</span><strong>{specialistNames[room.activeSpecialistCard - 1]}</strong><p>{specialistRules[room.activeSpecialistCard - 1]}</p></div>}
        </div>
        {room.status === 'playing' ? <button className="button button-primary full-button next-heist-button" disabled={!isHost || busy} onClick={() => void run(() => startNextHeist({ code: room.code, playerId }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {isHost ? 'Deal the next heist' : 'Waiting for the host'} </button> : null}
      </div>
      <div className="reveal-history">
        <div className="hand-topline"><span><Eye size={15}/> Revealed hands</span><span>{reveals.length} / {room.players.length}</span></div>
        {reveals.map((reveal, index) => {
          const player = room.players.find((candidate) => candidate.id === reveal.playerId)
          const privateCards = player?.cards ?? reveal.cards.slice(0, reveal.cards.length - board.length)
          return <div className="revealed-hand" key={`${reveal.playerId}-${index}`}>
            <span className="revealed-player">{index + 1}. {player?.name ?? 'Player'} <strong>{reveal.category}</strong></span>
            <div className="reveal-cards">{privateCards.map((card) => <Card value={card} small key={card}/>)}</div>
          </div>
        })}
      </div>
      <div className="showdown-board"><span>SHARED BOARD</span>{board.map((card) => <Card value={card} small key={`board-${card}`}/>)}</div>
      <TokenHistory room={room}/>
      <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  }

  if (room.phase === 'challenge') {
    const highestPlayer = room.players.find((player) => player.tokenPicks?.some((pick) => pick.round === 4 && pick.value === room.players.length))
    const isRankCheck = currentChallengeCheck === 4
    const categories = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush']
    return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
      {viewModeToggle}
      <ActiveChallengeFab cards={activeChallenges}/>
      {realTable}
      <div className="hand-topline"><span><Eye size={15}/> Security check</span><span>{completedChecks.length + 1} / {(room.challengeChecks ?? []).length}</span></div>
      <div className="scanner-check">
        <span className="section-kicker">{challengeNames[(currentChallengeCheck ?? 4) - 1]}</span>
        <h2>{isRankCheck ? <>Beat the <em>retina scan.</em></> : <>Beat the <em>fingerprint scan.</em></>}</h2>
        <p>{isRankCheck ? `Which card value is in ${highestPlayer?.name ?? 'the highest red-token player’s'} private hand?` : `What is ${highestPlayer?.name ?? 'the highest red-token player’s'} best poker hand?`}</p>
        <label className="guess-picker">The crew’s guess
          <select value={guess} onChange={(event) => setGuess(event.target.value)}>
            <option value="">Choose an answer</option>
            {isRankCheck
              ? Array.from({ length: 13 }, (_, index) => index + 2).map((value) => <option value={value} key={value}>{value === 14 ? 'Ace' : ranks[value - 1]}</option>)
              : categories.map((category, index) => <option value={index} key={category}>{category}</option>)}
          </select>
        </label>
        <button className="button button-primary full-button" disabled={!isHost || busy || guess === ''} onClick={() => void run(() => submitChallengeGuess({ code: room.code, playerId, guess: Number(guess) }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>} {isHost ? 'Lock in the crew’s guess' : 'Waiting for the host'}</button>
        <p className="guess-hint">Talk it through together, then the host locks in one answer. A wrong guess triggers an alarm.</p>
      </div>
      <div className="showdown-board"><span>SHARED BOARD</span>{board.map((card) => <Card value={card} small key={`board-${card}`}/>)}</div>
      <TokenHistory room={room}/>
      <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  }

  if (room.phase === 'reveal') {
    return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
      {viewModeToggle}
      <ActiveChallengeFab cards={activeChallenges}/>
      {realTable}
      <div className="hand-topline"><span><Eye size={15}/> The showdown</span><span>Lowest token first</span></div>
      <div className="community-row" aria-label="Community cards">{board.map((card) => <Card value={card} small key={card}/>)}</div>
      <div className="reveal-next-card">
        {nextPlayer ? <><span className="section-kicker">NEXT UP · {reveals.length + 1} OF {room.players.length}</span><h2>{canRevealHand ? <>Your hand is <em>up.</em></> : <>{nextPlayer.name} is <em>up.</em></>}</h2><p>Reveal in token order. The table must climb every time.</p></> : <><span className="section-kicker">SHOWDOWN COMPLETE</span><h2>The order is <em>set.</em></h2></>}
        {reveals.map((reveal, index) => {
          const player = room.players.find((candidate) => candidate.id === reveal.playerId)
          const pocketCards = player?.cards ?? reveal.cards.slice(0, reveal.cards.length - board.length)
          return <div className="revealed-hand" key={`${reveal.playerId}-${index}`}>
            <span className="revealed-player">{index + 1}. {player?.name ?? 'Player'} <strong>{reveal.category}</strong></span>
            <div className="reveal-cards">{pocketCards.map((card) => <Card value={card} small key={card}/>)}</div>
          </div>
        })}
        {nextPlayer && displayMode === 'text' && <button className="button button-primary full-button" disabled={!canRevealHand || busy} onClick={() => void run(() => revealNextHand({ code: room.code, playerId }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <Eye size={16}/>} {canRevealHand ? 'Reveal your hand' : `Waiting for ${nextPlayer.name} to reveal`}</button>}
      </div>
      <div className="showdown-board"><span>SHARED BOARD</span>{board.map((card) => <Card value={card} small key={`board-${card}`}/>)}</div>
      <TokenHistory room={room}/>
      <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  }

  return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
    {viewModeToggle}
    <ActiveChallengeFab cards={activeChallenges}/>
    {realTable}
    <div className="hand-topline"><span><Sparkles size={15}/> Round {room.round} · {roundNames[room.round - 1] ?? 'Red'} tokens</span><span>{room.players.filter((player) => player.tokenPicks?.some((pick) => pick.round === room.round)).length} / {room.players.length} ranked</span></div>
    {room.activeSpecialistCard && <div className="active-modifier-strip"><Shield size={14}/><span>Active Specialist:</span><span className="active-card-rule"><strong className="active-specialist-name">{specialistNames[room.activeSpecialistCard - 1]}</strong><small>{specialistRules[room.activeSpecialistCard - 1]}</small></span></div>}
    {stealNotice && dismissedStealNoticeAt !== stealNotice.createdAt && <div className="token-stolen-toast" role="alert" aria-live="assertive">
      <span><strong>Your token was stolen</strong>Token {stealNotice.value} was taken by {stealNotice.thiefName}. Choose another to stay in the round.</span>
      <button type="button" aria-label="Dismiss token stolen notification" onClick={() => setDismissedStealNoticeAt(stealNotice.createdAt)}>×</button>
    </div>}
    <p className="round-guidance">{stageMessage}</p>
    <div className="game-table-row">
      {me?.cards.length ? <div className="private-hand"><span>YOUR PRIVATE CARDS <small>keep these to yourself</small></span><div>{me.cards.map((card) => <Card value={card} key={card}/>)}</div></div> : <div className="private-hand private-hand-empty"><span>YOUR PRIVATE CARDS</span><span>Cards are dealt at the start of the heist.</span></div>}
      <div className="public-board">
        <div className="board-caption"><span>SHARED BOARD</span><span>{board.length ? `${board.length} of 5 cards` : 'The flop is coming after this round'}</span></div>
        <div className="community-row">{board.length ? board.map((card) => <Card value={card} small key={card}/>) : <span className="board-placeholder">Community cards appear here for everyone.</span>}</div>
      </div>
    </div>
    {displayMode === 'text' && tokenPicker}
    <TokenHistory room={room}/>
    <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="mode-footnote">{modeCopy(room.mode)}</div>
  </section>
}
