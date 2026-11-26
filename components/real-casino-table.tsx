'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { HelpCircle, Maximize, Minimize, X } from 'lucide-react'
import { Card } from './playing-card'

const handRankings: [string, string][] = [
  ['Quinte flush', '5 cartes qui se suivent, même couleur'],
  ['Carré', '4 cartes de même valeur'],
  ['Full', 'Un brelan + une paire'],
  ['Couleur', '5 cartes de même couleur'],
  ['Quinte', '5 cartes qui se suivent'],
  ['Brelan', '3 cartes de même valeur'],
  ['Double paire', '2 paires différentes'],
  ['Paire', '2 cartes de même valeur'],
  ['Carte haute', 'La plus haute carte seule'],
]

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
  reveals: { playerId: string; cards: number[]; category: string; score: number }[]
  nextPlayerId?: string
  burningCard: boolean
  tokenPicker?: ReactNode
  modifiers?: ReactNode
  tableAction?: ReactNode
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
  return <div className="casino-card-back" aria-label="Carte face cachée"><span>✳</span></div>
}

export function RealCasinoTable({ players, board, playerId, phase, reveals, nextPlayerId, burningCard, tokenPicker, modifiers, tableAction, revealBusy, onRevealHand }: RealCasinoTableProps) {
  const stageRef = useRef<HTMLElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRankings, setShowRankings] = useState(false)

  useEffect(() => {
    if (!showRankings) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowRankings(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [showRankings])

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  async function toggleFullscreen() {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement === stage) await document.exitFullscreen()
    else await stage.requestFullscreen()
  }

  const opponents = players.filter((player) => player.id !== playerId)
  const fullscreenLabel = isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'

  return <section ref={stageRef} className="real-table-stage" aria-label="Table de casino en direct">
    <button type="button" className="table-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={fullscreenLabel} title={fullscreenLabel}>
      {isFullscreen ? <Minimize size={17}/> : <Maximize size={17}/>}
    </button>
    <button type="button" className="table-fullscreen-button table-help-button" onClick={() => setShowRankings((open) => !open)} aria-expanded={showRankings} aria-controls="hand-rankings-panel" aria-label="Afficher la force des mains" title="Force des mains">
      <HelpCircle size={18}/>
    </button>
    {showRankings && <div id="hand-rankings-panel" className="hand-rankings-panel" role="dialog" aria-label="Force des mains">
      <div className="hand-rankings-header">
        <strong>Force des mains</strong>
        <button type="button" onClick={() => setShowRankings(false)} aria-label="Fermer la force des mains"><X size={14}/></button>
      </div>
      <ol>
        {handRankings.map(([name, example]) => <li key={name}><span>{name}</span><small>{example}</small></li>)}
      </ol>
      <p>La plus forte en haut. Les égalités se départagent par la valeur des cartes (kickers) ; deux mains égales peuvent être dans n’importe quel ordre.</p>
    </div>}
    <div className={`casino-table-surface ${tokenPicker ? 'casino-table-surface-picking' : ''}`}>
      <div className="casino-table-felt" aria-hidden="true" />
      {opponents.map((player, index) => {
        const position = opponentSeats[Math.floor(index * opponentSeats.length / Math.max(opponents.length, 1))]
        const hasRevealed = reveals.some((reveal) => reveal.playerId === player.id)
        const cardsAreVisible = phase !== 'reveal' && phase !== 'result' && hasRevealed
        const isTheirTurn = phase === 'reveal' && nextPlayerId === player.id

        return <article key={player.id} className="casino-seat" style={{ left: `${position.left}%`, top: `${position.top}%` }} aria-label={`${player.name}${isTheirTurn ? ', c’est à son tour de révéler' : ''}`}>
          <div className="casino-seat-name">{player.name}</div>
          {!player.tokenPicks?.length && <span className="casino-seat-waiting">{phase === 'reveal' ? isTheirTurn ? 'À son tour' : 'Attend de révéler' : 'Prêt à classer'}</span>}
          <div className={`casino-pocket-cards ${hasRevealed ? 'casino-pocket-cards-revealed' : ''}`} aria-label={cardsAreVisible ? `Cartes de ${player.name}` : `Cartes cachées de ${player.name}`}>
            {(cardsAreVisible ? player.cards : [0, 1]).map((value, cardIndex) => cardsAreVisible
              ? <Card key={`${player.id}-card-${cardIndex}-${value}`} value={value} small/>
              : <CardBack key={`${player.id}-back-${cardIndex}`}/>
            )}
          </div>
          <div className="casino-seat-token-history" aria-label={`Jetons de ${player.name} par manche`}>
            {(player.tokenPicks ?? []).slice().sort((a, b) => a.round - b.round).map((token) => <span className={`casino-seat-history-chip chip-${roundColors[token.round - 1] ?? 'red'}`} key={`${player.id}-${token.round}`} aria-label={`Manche ${token.round}, jeton ${token.value}`} title={`Manche ${token.round}`}>
              {token.value}
            </span>)}
          </div>
        </article>
      })}

      {(() => {
        const me = players.find((player) => player.id === playerId)
        if (!me) return null
        const hasRevealed = reveals.some((reveal) => reveal.playerId === me.id)

        return <article className="casino-seat casino-seat-you" aria-label={`${me.name}, vous`}>
          <div className="casino-seat-name">{me.name}<span>VOUS</span></div>
          <div className={`casino-pocket-cards casino-pocket-cards-own ${hasRevealed ? 'casino-pocket-cards-revealed' : ''}`} aria-label={hasRevealed ? 'Vos cartes sont affichées au centre de la table' : 'Vos cartes privées'}>
            {hasRevealed ? [0, 1].map((cardIndex) => <CardBack key={`${me.id}-back-${cardIndex}`}/>) : me.cards.map((value, cardIndex) => <Card key={`${me.id}-card-${cardIndex}-${value}`} value={value} small/>)}
          </div>
          <div className="casino-seat-token-history" aria-label="Vos jetons par manche">
            {(me.tokenPicks ?? []).slice().sort((a, b) => a.round - b.round).map((token) => <span className={`casino-seat-history-chip chip-${roundColors[token.round - 1] ?? 'red'}`} key={`${me.id}-${token.round}`} aria-label={`Manche ${token.round}, jeton ${token.value}`} title={`Manche ${token.round}`}>
              {token.value}
            </span>)}
          </div>
          {phase === 'reveal' && nextPlayerId === me.id && <button type="button" className="casino-reveal-button" disabled={revealBusy} onClick={onRevealHand}>
            {revealBusy ? 'Révélation…' : 'Révéler ma main'}
          </button>}
        </article>
      })()}

      <div className={`casino-board-center ${tokenPicker ? 'casino-board-center-picking' : ''} ${reveals.length && (phase === 'reveal' || phase === 'result') ? 'casino-board-center-revealing' : ''}`}>
        <span className="casino-board-kicker">LE TABLEAU COMMUN</span>
        <div className="casino-board-cards" aria-label={`Tableau commun, ${board.length} cartes sur 5`}>
          {board.length ? board.map((card, index) => <div className="casino-dealt-card" key={card} style={{ animationDelay: `${index * 85}ms` }}><Card value={card} small/></div>) : <span className="casino-board-empty">{phase === 'ranking' ? 'Les premières cartes vont bientôt tomber sur le tapis' : 'Le tableau apparaîtra ici'}</span>}
        </div>
        <span className="casino-board-count">{board.length} / 5 CARTES</span>
        {(phase === 'reveal' || phase === 'result') && reveals.length > 0 && <div className="casino-revealed-hands" aria-label={`${reveals.length} ${reveals.length === 1 ? 'main révélée' : 'mains révélées'}`}>
          {reveals.map((reveal, index) => {
            const player = players.find((candidate) => candidate.id === reveal.playerId)
            const privateCards = reveal.cards.slice(0, reveal.cards.length - board.length)
            return <article className="casino-revealed-hand" key={`${reveal.playerId}-${index}`} aria-label={`${player?.name ?? 'Joueur'}, ${reveal.category}`}>
              <div className="casino-revealed-hand-meta"><span>{player?.name ?? 'Joueur'}</span><strong>{reveal.category}</strong></div>
              <div className="casino-revealed-hand-cards">{privateCards.map((card, cardIndex) => <Card key={`${reveal.playerId}-${cardIndex}-${card}`} value={card} small/>)}</div>
            </article>
          })}
        </div>}
        {tableAction && <div className="casino-table-action">{tableAction}</div>}
        {burningCard && <div className="casino-burn-card" aria-hidden="true"><CardBack/></div>}
      </div>
      {tokenPicker && <div className="casino-table-token-picker">{tokenPicker}</div>}
      {modifiers && <div className="casino-table-modifiers">{modifiers}</div>}
    </div>
  </section>
}
