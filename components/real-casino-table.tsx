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
}

const roundColors = ['white', 'yellow', 'orange', 'red']

function CardBack() {
  return <div className="casino-card-back" aria-label="Face-down card"><span>✳</span></div>
}

export function RealCasinoTable({ players, board, playerId, round, phase, reveals, burningCard }: RealCasinoTableProps) {
  const color = roundColors[round - 1] ?? 'red'

  return <section className="real-table-stage" aria-label="Live casino table">
    <div className="casino-table-felt" aria-hidden="true" />
    {players.map((player, index) => {
      const angle = (index / players.length) * Math.PI * 2 - Math.PI / 2
      const left = 50 + Math.cos(angle) * 42
      const top = 50 + Math.sin(angle) * 34
      const pick = player.tokenPicks?.find((entry) => entry.round === round)
      const cardsAreVisible = player.id === playerId || phase === 'result' || phase === 'reveal' && reveals.some((reveal) => reveal.playerId === player.id)

      return <article className={`casino-seat ${player.id === playerId ? 'casino-seat-you' : ''}`} key={player.id} style={{ left: `${left}%`, top: `${top}%` }} aria-label={`${player.name}${player.id === playerId ? ', you' : ''}`}>
        <div className={`casino-seat-avatar avatar-${['sage', 'clay', 'blue', 'gold', 'plum', 'slate'][index % 6]}`}>{player.name.charAt(0).toUpperCase()}</div>
        <div className="casino-seat-name">{player.name}{player.id === playerId && <span>YOU</span>}</div>
        {pick ? <div className={`casino-chip chip-${color}`} key={`${round}-${pick.value}`} aria-label={`Token ${pick.value}`}><span>{pick.value}</span></div> : <span className="casino-seat-waiting">{player.id === playerId ? 'Your seat' : 'Ready to rank'}</span>}
        <div className="casino-pocket-cards" aria-label={cardsAreVisible ? `${player.name}'s cards` : `${player.name}'s face-down cards`}>
          {(cardsAreVisible ? player.cards : [0, 1]).map((value, cardIndex) => {
            if (!cardsAreVisible) return <CardBack key={`${player.id}-back-${cardIndex}`}/>
            return <Card key={`${player.id}-card-${cardIndex}-${value}`} value={value} small/>
          })}
        </div>
      </article>
    })}

    <div className="casino-board-center">
      <span className="casino-board-kicker">THE SHARED BOARD</span>
      <div className="casino-board-cards" aria-label={`Shared board, ${board.length} of 5 cards`}>
        {board.length ? board.map((card, index) => <div className="casino-dealt-card" key={card} style={{ animationDelay: `${index * 85}ms` }}><Card value={card} small/></div>) : <span className="casino-board-empty">{phase === 'ranking' ? 'The first cards are about to hit the felt' : 'The board will appear here'}</span>}
      </div>
      <span className="casino-board-count">{board.length} / 5 CARDS</span>
      {burningCard && <div className="casino-burn-card" aria-hidden="true"><CardBack/></div>}
    </div>
  </section>
}
