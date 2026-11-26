const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const suits = ['♠', '♥', '♣', '♦']

export function Card({ value, small = false }: { value: number; small?: boolean }) {
  const normalized = (value - 1) % 52
  const rank = ranks[normalized % 13]
  const suit = suits[Math.floor(normalized / 13)]
  const red = normalized >= 13 && normalized < 26 || normalized >= 39

  return <div className={`hand-card ${small ? 'mini-hand-card' : ''} ${red ? 'red-card' : ''}`} role="img" aria-label={`${rank} de ${suit}`}>
    <span className="card-corner">{rank}<small>{suit}</small></span>
    <span className="card-suit">{suit}</span>
    <span className="card-corner card-corner-bottom">{rank}<small>{suit}</small></span>
  </div>
}
