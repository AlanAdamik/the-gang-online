'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { ChevronDown, ChevronUp, ClipboardCheck, ClipboardCopy, History, LockKeyhole } from 'lucide-react'
import { api } from '../convex/_generated/api'
import { Card } from './playing-card'

type GameLogEvent = {
  _id: string
  sequence: number
  type: 'game_started' | 'heist_started' | 'token_picked' | 'board_revealed' | 'challenge_resolved' | 'hand_revealed' | 'heist_outcome' | 'game_finished'
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
  }
}

const challengeNames = ['Quick Access', 'Noise Sensors', 'Motion Detector', 'Retina Scan', 'Hasty Getaway', 'Ventilation Shaft', 'Laser Tripwires', 'Blackout', 'Fingerprint Scan', 'Security Cameras']
const specialistNames = ['Informant', 'Getaway Driver', 'Investor', 'Mastermind', 'Hacker', 'Coordinator', 'Jack', 'Math Whiz', 'Con Artist', 'Muscle']

function eventTitle(event: GameLogEvent) {
  const details = event.details
  switch (event.type) {
    case 'game_started':
      return `Game started · ${details.mode === 'master-thief' ? 'Master Thief' : details.mode === 'professional' ? 'Professional' : 'Advanced'}`
    case 'heist_started':
      return `Heist ${details.round ?? ''} began${details.specialistCard ? ` · ${specialistNames[details.specialistCard - 1]}` : ''}`
    case 'token_picked':
      return `${details.playerName ?? 'A player'} ranked ${details.value ?? '—'}${details.displacedPlayerName ? `, taking it from ${details.displacedPlayerName}` : ''}`
    case 'board_revealed':
      return `Round ${details.round ?? ''} · shared cards revealed`
    case 'challenge_resolved':
      return `${challengeNames[(details.challengeCard ?? 1) - 1]} · ${details.correct ? 'passed' : 'failed'}${details.guess ? ` · guessed ${details.guess}` : ''}`
    case 'hand_revealed':
      return `${details.playerName ?? 'A player'} revealed ${details.category ?? 'their hand'}`
    case 'heist_outcome':
      return `Heist ${details.round ?? ''} ${details.outcome === 'success' ? 'cleared' : 'failed'}${details.alarms ? ` · ${details.alarms} alarm${details.alarms === 1 ? '' : 's'}` : ''}`
    case 'game_finished':
      return `Game over · ${details.alarms ?? 0} alarms`
  }
}

export function GameLogEventCard({ event, active = false, onSelect }: { event: GameLogEvent; active?: boolean; onSelect?: () => void }) {
  const details = event.details
  const cardContent = <>
    <span className="game-log-event-meta">{details.round ? `ROUND ${details.round}` : 'THE TABLE'} <time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></span>
    <strong>{eventTitle(event)}</strong>
    {details.activeChallengeCards?.length ? <span className="game-log-event-note">Challenges: {details.activeChallengeCards.map((id) => challengeNames[id - 1]).join(', ')}</span> : null}
    {details.cards?.length ? <span className="game-log-cards" aria-label={`${details.cards.length} revealed cards`}>{details.cards.map((value, index) => <Card value={value} small key={`${value}-${index}`} />)}</span> : null}
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
      setSaveError(cause instanceof Error ? cause.message : 'Could not save this replay. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="game-log-panel">
    <button className="game-log-toggle" type="button" aria-expanded={open} aria-controls={open ? 'game-log-events' : undefined} onClick={() => setOpen((value) => !value)}>
      <span><History size={16} /> Game log {log && <small>{log.events.length} events</small>}</span>
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    {open && <div className="game-log-body" id="game-log-events">
      <div className="game-log-heading"><div><span className="section-kicker">THE RECORD</span><h3>Every move, in order.</h3><p>Shared cards, rankings, reveals, and the result are recorded for the whole crew.</p></div>
        {finished && !shareKey && <button className="game-log-save" type="button" onClick={() => void saveReplay()} disabled={saving}>{saving ? 'Saving…' : <><LockKeyhole size={14} /> Save & share replay</>}</button>}
      </div>
      {shareKey && <div className="game-log-saved" role="status"><span><ClipboardCheck size={15} /> Replay saved. Anyone with this link can watch it.</span><a href={replayUrl} target="_blank" rel="noreferrer">Open replay</a><button type="button" aria-label="Copy replay link" onClick={async () => { try { await navigator.clipboard.writeText(replayUrl); setCopied(true) } catch { setCopied(false) } }}>{copied ? <ClipboardCheck size={14} /> : <ClipboardCopy size={14} />}{copied ? 'Copied' : 'Copy link'}</button></div>}
      {saveError && <p className="error-message" role="alert">{saveError}</p>}
      {!log ? <p className="game-log-empty">Loading the table record…</p> : log.events.length ? <ol className="game-log-events">{log.events.map((event) => <li key={event._id}><GameLogEventCard event={event} /></li>)}</ol> : <p className="game-log-empty">No moves have been recorded yet.</p>}
    </div>}
  </section>
}
