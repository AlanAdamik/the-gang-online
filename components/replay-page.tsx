'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { ArrowLeft, ArrowRight, CircleAlert, LoaderCircle, Spade } from 'lucide-react'
import { api } from '../convex/_generated/api'
import { GameLogEventCard } from './game-log'

export function ReplayPage({ shareKey }: { shareKey: string }) {
  const [step, setStep] = useState(0)
  const replay = useQuery(api.rooms.getSavedReplay, { shareKey })

  if (replay === undefined) return <main className="replay-shell"><div className="replay-loading"><LoaderCircle className="spin" size={22} /> Opening the replay…</div></main>
  if (!replay) return <main className="replay-shell"><div className="replay-missing"><CircleAlert size={22} /><span className="section-kicker">REPLAY UNAVAILABLE</span><h1>This replay link is <em>not active.</em></h1><p>The owner may not have saved the game, or the link may be incomplete.</p><Link className="button button-primary" href="/">Back to The Gang</Link></div></main>

  const events = replay.events
  const currentStep = Math.min(step, Math.max(0, events.length - 1))
  const currentEvent = events[currentStep]
  const modeName = replay.mode === 'master-thief' ? 'Master Thief' : replay.mode === 'professional' ? 'Professional' : 'Advanced'

  return <main className="replay-shell">
    <header className="replay-header"><Link className="brand" href="/" aria-label="The Gang home"><span className="brand-mark"><Spade size={19} fill="currentColor" /></span><span>the gang<span className="brand-period">.</span></span></Link><span className="replay-header-label">SAVED GAME REPLAY</span></header>
    <div className="replay-content">
      <Link href="/" className="replay-back"><ArrowLeft size={15} /> Back to the table</Link>
      <section className="replay-intro"><div><span className="eyebrow"><span className="eyebrow-line" /> TABLE RECORD <span className="eyebrow-line" /></span><h1>One crew.<br /><em>Every move.</em></h1><p>Room {replay.code} · {modeName} · {new Date(replay.createdAt).toLocaleDateString()}</p></div><div className={`replay-outcome ${replay.outcome === 'success' ? 'is-success' : 'is-failed'}`}><span>FINAL OUTCOME</span><strong>{replay.outcome === 'success' ? 'Heist cleared' : replay.outcome === 'failed' ? 'Game over' : 'In progress'}</strong></div></section>
      <section className="replay-player-list" aria-label="Players in this game">{replay.players.map((player) => <span key={player.id}>{player.name}</span>)}</section>
      <section className="replay-player" aria-label="Replay controls">
        <div className="replay-player-top"><div><span className="section-kicker">PLAYBACK</span><h2>{currentEvent ? `Move ${currentStep + 1} of ${events.length}` : 'No recorded moves'}</h2></div><div className="replay-controls"><button type="button" className="replay-control" aria-label="Previous move" disabled={currentStep === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft size={17} /></button><button type="button" className="replay-control" aria-label="Next move" disabled={currentStep >= events.length - 1} onClick={() => setStep((value) => Math.min(events.length - 1, value + 1))}><ArrowRight size={17} /></button></div></div>
        <input className="replay-scrubber" type="range" min={0} max={Math.max(0, events.length - 1)} value={currentStep} aria-label="Replay move" onChange={(event) => setStep(Number(event.target.value))} />
        <div className="replay-step-labels"><span>START</span><span>{currentStep + 1} / {events.length}</span><span>FINISH</span></div>
        {currentEvent && <GameLogEventCard event={currentEvent} active />}
      </section>
      <section className="replay-timeline"><div className="replay-timeline-heading"><div><span className="section-kicker">FULL TIMELINE</span><h2>Game log</h2></div><span>{events.length} recorded events</span></div><ol className="game-log-events replay-events">{events.map((event, index) => <li key={event._id}><GameLogEventCard event={event} active={index === currentStep} onSelect={() => setStep(index)} /></li>)}</ol></section>
      <footer className="replay-footer"><span>THE GANG <span className="brand-period">.</span></span><span>Saved replays are viewable by anyone with this link.</span><span className="footer-credit"><em>The Gang</em> by John Cooper &amp; Kory Heath, published by KOSMOS. Unofficial fan adaptation.</span></footer>
    </div>
  </main>
}
