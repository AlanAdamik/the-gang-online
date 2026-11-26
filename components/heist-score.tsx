'use client'

import { useQuery } from 'convex/react'
import { LockOpen, Siren } from 'lucide-react'
import { api } from '../convex/_generated/api'

type HeistScoreProps = {
  code: string
  playerId: string
  round: number
  phase?: 'ranking' | 'challenge' | 'reveal' | 'result'
  alarms: number
  alarmLimit: number
  variant: 'table' | 'panel'
}

const roundColors = ['white', 'yellow', 'orange', 'red']

export function HeistScore({ code, playerId, round, phase, alarms, alarmLimit, variant }: HeistScoreProps) {
  const log = useQuery(api.rooms.getGameLog, { code, playerId })
  const outcomes = (log?.events ?? []).filter((event) => event.type === 'heist_outcome')
  const wins = outcomes.filter((event) => event.details.outcome === 'success').length
  const losses = Math.max(alarms, outcomes.length - wins)
  const heistNumber = wins + losses + (phase === 'result' ? 0 : 1)
  const phaseLabel = phase === 'reveal' ? 'Abattage' : phase === 'challenge' ? 'Contrôle' : phase === 'result' ? 'Résultat' : `Manche ${round} / 4`

  return <section className={`heist-score heist-score-${variant}`} aria-label={`Casse numéro ${heistNumber}, ${phaseLabel}. ${wins} casse${wins > 1 ? 's' : ''} réussi${wins > 1 ? 's' : ''}, ${losses} alarme${losses > 1 ? 's' : ''} sur ${alarmLimit}.`}>
    <div className="heist-score-stage" aria-hidden="true">
      <strong>Casse {heistNumber}</strong>
      <span>{phaseLabel}</span>
      {phase !== 'result' && phase !== 'reveal' && phase !== 'challenge' && <span className="heist-score-rounds">
        {roundColors.map((color, index) => <i key={color} className={`chip-${color} ${index + 1 < round ? 'is-done' : index + 1 === round ? 'is-current' : ''}`} />)}
      </span>}
    </div>
    <div className="heist-score-tally" aria-hidden="true">
      <span className="heist-score-wins" title="Casses réussis"><LockOpen size={13} />{wins}</span>
      <span className="heist-score-alarms" title={`Alarmes (${alarmLimit} = partie perdue)`}>
        <Siren size={13} />
        {Array.from({ length: alarmLimit }, (_, index) => <i key={index} className={index < losses ? 'is-on' : ''} />)}
      </span>
    </div>
  </section>
}
