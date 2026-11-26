'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronUp, ClipboardCheck, ClipboardCopy, History, LockKeyhole } from 'lucide-react'
import { api } from '../convex/_generated/api'
import { Card } from './playing-card'

type GameLogEvent = {
  _id: string
  sequence: number
  type: 'game_started' | 'heist_started' | 'token_picked' | 'board_revealed' | 'challenge_resolved' | 'hand_revealed' | 'specialist_used' | 'modifier_triggered' | 'heist_outcome' | 'game_finished'
  createdAt: number
  details: {
    round?: number
    playerId?: string
    playerName?: string
    value?: number
    previousValue?: number
    displacedPlayerName?: string
    cards?: number[]
    category?: string
    mode?: string
    activeChallengeCards?: number[]
    specialistCard?: number
    challengeCard?: number
    guess?: string
    correct?: boolean
    outcome?: 'success' | 'failed'
    alarms?: number
    note?: string
  }
}

const challengeNames = ['Accès rapide', 'Capteurs sonores', 'Détecteur de mouvement', 'Scanner rétinien', 'Fuite précipitée', 'Conduit d’aération', 'Rayons laser', 'Panne de courant', 'Scanner d’empreintes', 'Caméras de surveillance']
const specialistNames = ['Informateur', 'Chauffeur', 'Investisseur', 'Cerveau', 'Hacker', 'Coordinateur', 'Valet', 'Matheux', 'Escroc', 'Gros bras']

function alarmCount(alarms: number) {
  return `${alarms} alarme${alarms > 1 ? 's' : ''}`
}

function eventTitle(event: GameLogEvent) {
  const details = event.details
  switch (event.type) {
    case 'game_started':
      return `Partie lancée · ${details.mode === 'master-thief' ? 'Maître voleur' : details.mode === 'professional' ? 'Professionnel' : 'Avancé'}`
    case 'heist_started':
      return `Le casse ${details.round ?? ''} commence${details.specialistCard ? ` · ${specialistNames[details.specialistCard - 1]}` : ''}`
    case 'token_picked':
      return `${details.playerName ?? 'Un joueur'} a pris le jeton ${details.value ?? '—'}${details.displacedPlayerName ? `, volé à ${details.displacedPlayerName}` : ''}`
    case 'board_revealed':
      return `Manche ${details.round ?? ''} · cartes communes révélées`
    case 'challenge_resolved':
      return `${challengeNames[(details.challengeCard ?? 1) - 1]} · ${details.correct ? 'réussi' : 'échoué'}${details.guess ? ` · proposition : ${details.guess}` : ''}`
    case 'hand_revealed':
      return `${details.playerName ?? 'Un joueur'} a révélé ${details.category ?? 'sa main'}`
    case 'specialist_used':
      return `${specialistNames[(details.specialistCard ?? 2) - 1]} utilisé par ${details.playerName ?? 'un joueur'} · sa main : ${details.category ?? 'inconnue'}`
    case 'modifier_triggered':
      return `${details.specialistCard ? specialistNames[details.specialistCard - 1] : challengeNames[(details.challengeCard ?? 1) - 1]} déclenché · ${details.note ?? 'son effet s’applique'}`
    case 'heist_outcome':
      return `Casse ${details.round ?? ''} ${details.outcome === 'success' ? 'réussi' : 'raté'}${details.alarms ? ` · ${alarmCount(details.alarms)}` : ''}`
    case 'game_finished':
      return `Fin de partie · ${alarmCount(details.alarms ?? 0)}`
  }
}

export function GameLogEventCard({ event, active = false, onSelect }: { event: GameLogEvent; active?: boolean; onSelect?: () => void }) {
  const details = event.details
  const cardContent = <>
    <span className="game-log-event-meta">{details.round ? `MANCHE ${details.round}` : 'LA TABLE'} <time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' })}</time></span>
    <strong>{eventTitle(event)}</strong>
    {details.activeChallengeCards?.length ? <span className="game-log-event-note">Défis : {details.activeChallengeCards.map((id) => challengeNames[id - 1]).join(', ')}</span> : null}
    {details.cards?.length ? <span className="game-log-cards" aria-label={`${details.cards.length} cartes révélées`}>{details.cards.map((value, index) => <Card value={value} small key={`${value}-${index}`} />)}</span> : null}
  </>

  return onSelect
    ? <button className={`game-log-event ${active ? 'is-active' : ''}`} type="button" onClick={onSelect}>{cardContent}</button>
    : <article className={`game-log-event ${active ? 'is-active' : ''}`}>{cardContent}</article>
}

export function GameLogPanel({ code, playerId, finished }: { code: string; playerId: string; finished: boolean }) {
  const [open, setOpen] = useState(false)
  const [savedKey, setSavedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)
  const log = useQuery(api.rooms.getGameLog, open ? { code, playerId } : 'skip')
  const saveGameLog = useMutation(api.rooms.saveGameLog)
  const shareKey = log?.shareKey ?? savedKey
  const replayUrl = shareKey ? `${typeof window === 'undefined' ? '' : window.location.origin}/replay/${shareKey}` : ''

  async function saveReplay() {
    setSaving(true)
    setSaveError('')
    try {
      const key = await saveGameLog({ code, playerId, shareKey: crypto.randomUUID() })
      setSavedKey(key)
      const url = `${window.location.origin}/replay/${key}`
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      } catch {
        setCopied(false)
      }
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer cette rediffusion. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="game-log-panel">
    <button className="game-log-toggle" type="button" aria-expanded={open} aria-controls={open ? 'game-log-events' : undefined} onClick={() => setOpen((value) => !value)}>
      <span><History size={16} /> Journal de partie {log && <small>{log.events.length} événements</small>}</span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div className="game-log-body" id="game-log-events">
      <div className="game-log-heading"><div><span className="section-kicker">LE REGISTRE</span><h3>Chaque coup, dans l’ordre.</h3><p>Cartes communes, classements, révélations et résultats sont enregistrés pour toute l’équipe.</p></div>
        {finished && !shareKey && <button className="game-log-save" type="button" onClick={() => void saveReplay()} disabled={saving}>{saving ? 'Enregistrement…' : <><LockKeyhole size={14} /> Enregistrer et partager</>}</button>}
      </div>
      {shareKey && <div className="game-log-saved" role="status"><span><ClipboardCheck size={15} /> Rediffusion enregistrée. Toute personne disposant du lien peut la regarder.</span><a href={replayUrl} target="_blank" rel="noreferrer">Ouvrir la rediffusion</a><button type="button" aria-label="Copier le lien de la rediffusion" onClick={async () => { try { await navigator.clipboard.writeText(replayUrl); setCopied(true) } catch { setCopied(false) } }}>{copied ? <ClipboardCheck size={14} /> : <ClipboardCopy size={14} />}{copied ? 'Copié' : 'Copier le lien'}</button></div>}
      {saveError && <p className="error-message" role="alert">{saveError}</p>}
      {!log ? <p className="game-log-empty">Chargement du registre…</p> : log.events.length ? <ol className="game-log-events">{log.events.map((event) => <li key={event._id}><GameLogEventCard event={event} /></li>)}</ol> : <p className="game-log-empty">Aucun coup enregistré pour l’instant.</p>}
    </div>}
  </section>
}
