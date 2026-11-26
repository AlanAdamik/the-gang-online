import { BellRing } from 'lucide-react'
import { Card } from './playing-card'

export type ShowdownReveal = {
  playerId: string
  cards: number[]
  category: string
  score: number
  bestCards?: number[]
  tripped?: boolean
  afterAlarm?: boolean
}

type ShowdownHandsProps = {
  reveals: ShowdownReveal[]
  players: { id: string; name: string }[]
  boardSize: number
  variant: 'table' | 'panel'
}

export function ShowdownHands({ reveals, players, boardSize, variant }: ShowdownHandsProps) {
  if (!reveals.length) return null

  return <div className={`showdown-hands showdown-hands-${variant}`} role="table" aria-label="Mains révélées, dans l’ordre des jetons">
    <div className="showdown-row showdown-row-head" role="row">
      <span role="columnheader">Joueur</span>
      <span role="columnheader">Combinaison</span>
      <span role="columnheader">Main</span>
      <span role="columnheader">5 meilleures cartes</span>
    </div>
    {reveals.map((reveal, index) => {
      const name = players.find((player) => player.id === reveal.playerId)?.name ?? 'Joueur'
      const pocketCards = reveal.cards.slice(0, Math.max(reveal.cards.length - boardSize, 0))
      const bestCards = reveal.bestCards ?? []
      const status = reveal.tripped ? 'is-tripped' : reveal.afterAlarm ? 'is-after-alarm' : ''

      return <div className={`showdown-row ${status}`} role="row" key={reveal.playerId} style={{ animationDelay: `${reveal.afterAlarm ? (index % 6) * 90 : 0}ms` }}>
        <span className="showdown-name" role="cell">
          <span className="showdown-order">{index + 1}</span>
          <span className="showdown-player">{name}</span>
          {reveal.tripped && <span className="showdown-tag showdown-tag-alarm"><BellRing size={10} aria-hidden="true"/> Alarme</span>}
          {reveal.afterAlarm && <span className="showdown-tag">Après l’alarme</span>}
        </span>
        <strong className="showdown-category" role="cell">{reveal.category}</strong>
        <span className="showdown-cards showdown-pocket" role="cell" aria-label={`Main de ${name}`}>
          {pocketCards.map((card) => <span className={`showdown-card ${bestCards.length && !bestCards.includes(card) ? 'is-unused' : ''}`} key={card}><Card value={card} small/></span>)}
        </span>
        <span className="showdown-cards showdown-best" role="cell" aria-label={`Cinq meilleures cartes de ${name}`}>
          {bestCards.length
            ? bestCards.map((card) => <span className={`showdown-card ${pocketCards.includes(card) ? 'is-pocket' : ''}`} key={card}><Card value={card} small/></span>)
            : <span className="showdown-missing">—</span>}
        </span>
      </div>
    })}
  </div>
}
