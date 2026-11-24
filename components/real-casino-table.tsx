'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Maximize, Minimize } from 'lucide-react'
import { Card } from './playing-card'

type CasinoPlayer = {
  id: string
  name: string
  cards: number[]
  tokenPicks?: { round: number; value: number }[]
}

type RealCasinoTableProps = {
  players: CasinoPlayer[]
  board: number[]
  playerId: string
  phase?: 'ranking' | 'challenge' | 'reveal' | 'result'
  reveals: { playerId: string }[]
  nextPlayerId?: string
  burningCard: boolean
  tokenPicker?: ReactNode
  revealBusy: boolean
  onRevealHand: () => void
}

const roundColors = ['white', 'yellow', 'orange', 'red']
const opponentSeats = [
  { left: 50, top: 9 },
  { left: 78, top: 24 },
  { left: 84, top: 50 },
  { left: 22, top: 24 },
  { left: 16, top: 50 },
]

function CardBack() {
  return <div className="casino-card-back" aria-label="Face-down card"><span>✳</span></div>
}

export function RealCasinoTable({ players, board, playerId, phase, reveals, nextPlayerId, burningCard, tokenPicker, revealBusy, onRevealHand }: RealCasinoTableProps) {
  const stageRef = useRef<HTMLElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === stageRef.current?.closest('.game-shell'))
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  async function toggleFullscreen() {
    const gameShell = stageRef.current?.closest<HTMLElement>('.game-shell')
    if (!gameShell) return
    if (document.fullscreenElement === gameShell) await document.exitFullscreen()
    else await gameShell.requestFullscreen()
  }

  const opponents = players.filter((player) => player.id !== playerId)

  return <section ref={stageRef} className="real-table-stage" aria-label="Live casino table">
    <button type="button" className="table-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'} title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>
      {isFullscreen ? <Minimize size={17}/> : <Maximize size={17}/>}
    </button>
    <div className={`casino-table-surface ${tokenPicker ? 'casino-table-surface-picking' : ''}`}>
      <div className="casino-table-felt" aria-hidden="true" />
      {opponents.map((player, index) => {
        const position = opponentSeats[Math.floor(index * opponentSeats.length / Math.max(opponents.length, 1))]
        const hasRevealed = reveals.some((reveal) => reveal.playerId === player.id)
        const cardsAreVisible = phase === 'result' || phase === 'reveal' && hasRevealed
        const isTheirTurn = phase === 'reveal' && nextPlayerId === player.id

        return <article key={player.id} className="casino-seat" style={{ left: `${position.left}%`, top: `${position.top}%` }} aria-label={`${player.name}${isTheirTurn ? ', it is your turn to reveal' : ''}`}>
          <div className="casino-seat-name">{player.name}</div>
          {!player.tokenPicks?.length && <span className="casino-seat-waiting">{phase === 'reveal' ? isTheirTurn ? 'Their reveal' : 'Waiting to reveal' : 'Ready to rank'}</span>}
          <div className={`casino-pocket-cards ${hasRevealed ? 'casino-pocket-cards-revealed' : ''}`} aria-label={cardsAreVisible ? `${player.name}'s cards` : `${player.name}'s face-down cards`}>
            {(cardsAreVisible ? player.cards : [0, 1]).map((value, cardIndex) => cardsAreVisible
              ? <Card key={`${player.id}-card-${cardIndex}-${value}`} value={value} small/>
              : <CardBack key={`${player.id}-back-${cardIndex}`}/>
            )}
          </div>
          <div className="casino-seat-token-history" aria-label={`${player.name}'s tokens by round`}>
            {(player.tokenPicks ?? []).slice().sort((a, b) => a.round - b.round).map((token) => <span className={`casino-seat-history-chip chip-${roundColors[token.round - 1] ?? 'red'}`} key={`${player.id}-${token.round}`} aria-label={`Round ${token.round}, token ${token.value}`} title={`Round ${token.round}`}>
              {token.value}
            </span>)}
          </div>
        </article>
      })}

      {(() => {
        const me = players.find((player) => player.id === playerId)
        if (!me) return null
        const hasRevealed = reveals.some((reveal) => reveal.playerId === me.id)

        return <article className="casino-seat casino-seat-you" aria-label={`${me.name}, you`}>
          <div className="casino-seat-name">{me.name}<span>YOU</span></div>
          <div className={`casino-pocket-cards casino-pocket-cards-own ${hasRevealed ? 'casino-pocket-cards-revealed' : ''}`} aria-label="Your private cards">
            {me.cards.map((value, cardIndex) => <Card key={`${me.id}-card-${cardIndex}-${value}`} value={value} small/>)}
          </div>
          <div className="casino-seat-token-history" aria-label="Your tokens by round">
            {(me.tokenPicks ?? []).slice().sort((a, b) => a.round - b.round).map((token) => <span className={`casino-seat-history-chip chip-${roundColors[token.round - 1] ?? 'red'}`} key={`${me.id}-${token.round}`} aria-label={`Round ${token.round}, token ${token.value}`} title={`Round ${token.round}`}>
              {token.value}
            </span>)}
          </div>
          {phase === 'reveal' && nextPlayerId === me.id && <button type="button" className="casino-reveal-button" disabled={revealBusy} onClick={onRevealHand}>
            {revealBusy ? 'Revealing…' : 'Reveal hand'}
          </button>}
        </article>
      })()}

      <div className={`casino-board-center ${tokenPicker ? 'casino-board-center-picking' : ''}`}>
        <span className="casino-board-kicker">THE SHARED BOARD</span>
        <div className="casino-board-cards" aria-label={`Shared board, ${board.length} of 5 cards`}>
          {board.length ? board.map((card, index) => <div className="casino-dealt-card" key={card} style={{ animationDelay: `${index * 85}ms` }}><Card value={card} small/></div>) : <span className="casino-board-empty">{phase === 'ranking' ? 'The first cards are about to hit the felt' : 'The board will appear here'}</span>}
        </div>
        <span className="casino-board-count">{board.length} / 5 CARDS</span>
        {burningCard && <div className="casino-burn-card" aria-hidden="true"><CardBack/></div>}
      </div>
      {tokenPicker && <div className="casino-table-token-picker">{tokenPicker}</div>}
    </div>
  </section>
}
