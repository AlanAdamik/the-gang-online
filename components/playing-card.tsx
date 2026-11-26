'use client'

import Image from 'next/image'
import { useCardTheme } from './card-theme'

const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const suits = ['♠', '♥', '♣', '♦']
const suitNames = ['pique', 'cœur', 'trèfle', 'carreau']
const rankNames = ['As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi']
const faceArt: Record<string, string> = { J: '/cards/jack.png', Q: '/cards/queen.png', K: '/cards/king.png' }

const L = 28
const C = 50
const R = 72
const pipLayouts: Record<string, [number, number][]> = {
  '2': [[C, 14], [C, 86]],
  '3': [[C, 14], [C, 50], [C, 86]],
  '4': [[L, 14], [R, 14], [L, 86], [R, 86]],
  '5': [[L, 14], [R, 14], [C, 50], [L, 86], [R, 86]],
  '6': [[L, 14], [R, 14], [L, 50], [R, 50], [L, 86], [R, 86]],
  '7': [[L, 14], [R, 14], [C, 32], [L, 50], [R, 50], [L, 86], [R, 86]],
  '8': [[L, 14], [R, 14], [C, 32], [L, 50], [R, 50], [C, 68], [L, 86], [R, 86]],
  '9': [[L, 14], [R, 14], [L, 38], [R, 38], [C, 50], [L, 62], [R, 62], [L, 86], [R, 86]],
  '10': [[L, 14], [R, 14], [C, 26], [L, 38], [R, 38], [L, 62], [R, 62], [C, 74], [L, 86], [R, 86]],
}

function ClassicFace({ rank, suit }: { rank: string; suit: string }) {
  const art = faceArt[rank]
  if (art) {
    return <span className="card-face-art" aria-hidden="true">
      <Image src={art} alt="" fill sizes="80px" />
      <span className="card-face-suit">{suit}</span>
    </span>
  }
  if (rank === 'A') return <span className="card-pips card-pips-ace" aria-hidden="true"><span style={{ left: '50%', top: '50%' }}>{suit}</span></span>
  return <span className="card-pips" aria-hidden="true">
    {pipLayouts[rank].map(([x, y], index) => <span key={index} className={y > 50 ? 'is-flipped' : undefined} style={{ left: `${x}%`, top: `${y}%` }}>{suit}</span>)}
  </span>
}

export function Card({ value, small = false }: { value: number; small?: boolean }) {
  const theme = useCardTheme()
  const normalized = (value - 1) % 52
  const rankIndex = normalized % 13
  const suitIndex = Math.floor(normalized / 13)
  const rank = ranks[rankIndex]
  const suit = suits[suitIndex]
  const red = suitIndex === 1 || suitIndex === 3

  return <div className={`hand-card ${small ? 'mini-hand-card' : ''} ${red ? 'red-card' : ''} ${theme === 'classic' ? 'card-classic' : ''}`} role="img" aria-label={`${rankNames[rankIndex]} de ${suitNames[suitIndex]}`}>
    <span className="card-corner">{rank}<small>{suit}</small></span>
    {theme === 'classic' ? <ClassicFace rank={rank} suit={suit} /> : <span className="card-suit">{suit}</span>}
    <span className="card-corner card-corner-bottom">{rank}<small>{suit}</small></span>
  </div>
}
