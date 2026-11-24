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
  round: number
  phase?: 'ranking' | 'challenge' | 'reveal' | 'result'
  reveals: { playerId: string }[]
  burningCard: boolean
  tokenPicker?: ReactNode
}

const roundColors = ['white', 'yellow', 'orange', 'red']

function CardBack() {
  return <div className="casino-card-back" aria-label="Face-down card"><span>✳</span></div>
}

export function RealCasinoTable({ players, board, playerId, round, phase, reveals, burningCard, tokenPicker }: RealCasinoTableProps) {
  const color = roundColors[round - 1] ?? 'red'
  const stageRef = useRef<HTMLElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  async function toggleFullscreen() {
    if (!stageRef.current) return
    if (document.fullscreenElement === stageRef.current) await document.exitFullscreen()
    else await stageRef.current.requestFullscreen()
  }

  return <section ref={stageRef} className="real-table-stage" aria-label="Live casino table">
    <button type="button" className="table-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'} title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>
      {isFullscreen ? <Minimize size={17}/> : <Maximize size={17}/>}
    </button>
    <div className="casino-table-surface">
      <div className="casino-table-felt" aria-hidden="true" />
      {players.map((player, index) => {
      const angle = (index / players.length) * Math.PI * 2 - Math.PI / 2
      const left = 50 + Math.cos(angle) * 42
      const top = 50 + Math.sin(angle) * 34
      const pick = player.tokenPicks?.find((entry) => entry.round === round)
      const hasRevealed = reveals.some((reveal) => reveal.playerId === player.id)
      const cardsAreVisible = player.id === playerId || phase === 'result' || phase === 'reveal' && hasRevealed
      const tokenLeft = left + (50 - left) * 0.38
      const tokenTop = top + (50 - top) * 0.38

      return <div key={player.id}>
        <article className={`casino-seat ${player.id === playerId ? 'casino-seat-you' : ''}`} style={{ left: `${left}%`, top: `${top}%` }} aria-label={`${player.name}${player.id === playerId ? ', you' : ''}`}>
          <div className="casino-seat-name">{player.name}{player.id === playerId && <span>YOU</span>}</div>
          {!pick && <span className="casino-seat-waiting">{player.id === playerId ? 'Your seat' : 'Ready to rank'}</span>}
          <div className={`casino-pocket-cards ${hasRevealed ? 'casino-pocket-cards-revealed' : ''}`} aria-label={cardsAreVisible ? `${player.name}'s cards` : `${player.name}'s face-down cards`}>
            {(cardsAreVisible ? player.cards : [0, 1]).map((value, cardIndex) => {
              if (!cardsAreVisible) return <CardBack key={`${player.id}-back-${cardIndex}`}/>
              return <Card key={`${player.id}-card-${cardIndex}-${value}`} value={value} small/>
            })}
          </div>
        </article>
        {pick && <div className={`casino-chip casino-table-token chip-${color}`} style={{ left: `${tokenLeft}%`, top: `${tokenTop}%` }} key={`${player.id}-${round}-${pick.value}`} aria-label={`${player.name}'s token ${pick.value}`}><span>{pick.value}</span></div>}
      </div>
    })}

    <div className="casino-board-center">
      <span className="casino-board-kicker">THE SHARED BOARD</span>
      <div className="casino-board-cards" aria-label={`Shared board, ${board.length} of 5 cards`}>
        {board.length ? board.map((card, index) => <div className="casino-dealt-card" key={card} style={{ animationDelay: `${index * 85}ms` }}><Card value={card} small/></div>) : <span className="casino-board-empty">{phase === 'ranking' ? 'The first cards are about to hit the felt' : 'The board will appear here'}</span>}
      </div>
      <span className="casino-board-count">{board.length} / 5 CARDS</span>
      {burningCard && <div className="casino-burn-card" aria-hidden="true"><CardBack/></div>}
      </div>
    </div>
    {tokenPicker && <div className="casino-table-token-picker">{tokenPicker}</div>}
  </section>
}
