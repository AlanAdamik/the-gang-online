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

  if (replay === undefined) return <main className="replay-shell"><div className="replay-loading"><LoaderCircle className="spin" size={22} /> Ouverture de la rediffusion…</div></main>
  if (!replay) return <main className="replay-shell"><div className="replay-missing"><CircleAlert size={22} /><span className="section-kicker">REDIFFUSION INDISPONIBLE</span><h1>Ce lien de rediffusion n’est <em>pas actif.</em></h1><p>La partie n’a peut-être pas été enregistrée, ou le lien est incomplet.</p><Link className="button button-primary" href="/">Retour à The Gang</Link></div></main>

  const events = replay.events
  const currentStep = Math.min(step, Math.max(0, events.length - 1))
  const currentEvent = events[currentStep]
  const modeName = replay.mode === 'master-thief' ? 'Maître voleur' : replay.mode === 'professional' ? 'Professionnel' : 'Avancé'

  return <main className="replay-shell">
    <header className="replay-header"><Link className="brand" href="/" aria-label="Accueil The Gang"><span className="brand-mark"><Spade size={19} fill="currentColor" /></span><span>the gang<span className="brand-period">.</span></span></Link><span className="replay-header-label">REDIFFUSION DE PARTIE</span></header>
    <div className="replay-content">
      <Link href="/" className="replay-back"><ArrowLeft size={15} /> Retour à la table</Link>
      <section className="replay-intro"><div><span className="eyebrow"><span className="eyebrow-line" /> REGISTRE DE LA TABLE <span className="eyebrow-line" /></span><h1>Une bande.<br /><em>Chaque coup.</em></h1><p>Salle {replay.code} · {modeName} · {new Date(replay.createdAt).toLocaleDateString('fr-FR')}</p></div><div className={`replay-outcome ${replay.outcome === 'success' ? 'is-success' : 'is-failed'}`}><span>RÉSULTAT FINAL</span><strong>{replay.outcome === 'success' ? 'Casse réussi' : replay.outcome === 'failed' ? 'Fin de partie' : 'En cours'}</strong></div></section>
      <section className="replay-player-list" aria-label="Joueurs de cette partie">{replay.players.map((player) => <span key={player.id}>{player.name}</span>)}</section>
      <section className="replay-player" aria-label="Commandes de lecture">
        <div className="replay-player-top"><div><span className="section-kicker">LECTURE</span><h2>{currentEvent ? `Coup ${currentStep + 1} sur ${events.length}` : 'Aucun coup enregistré'}</h2></div><div className="replay-controls"><button type="button" className="replay-control" aria-label="Coup précédent" disabled={currentStep === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft size={17} /></button><button type="button" className="replay-control" aria-label="Coup suivant" disabled={currentStep >= events.length - 1} onClick={() => setStep((value) => Math.min(events.length - 1, value + 1))}><ArrowRight size={17} /></button></div></div>
        <input className="replay-scrubber" type="range" min={0} max={Math.max(0, events.length - 1)} value={currentStep} aria-label="Coup de la rediffusion" onChange={(event) => setStep(Number(event.target.value))} />
        <div className="replay-step-labels"><span>DÉBUT</span><span>{currentStep + 1} / {events.length}</span><span>FIN</span></div>
        {currentEvent && <GameLogEventCard event={currentEvent} active />}
      </section>
      <section className="replay-timeline"><div className="replay-timeline-heading"><div><span className="section-kicker">CHRONOLOGIE COMPLÈTE</span><h2>Journal de partie</h2></div><span>{events.length} événements enregistrés</span></div><ol className="game-log-events replay-events">{events.map((event, index) => <li key={event._id}><GameLogEventCard event={event} active={index === currentStep} onSelect={() => setStep(index)} /></li>)}</ol></section>
      <footer className="replay-footer"><span>THE GANG <span className="brand-period">.</span></span><span>Les rediffusions enregistrées sont visibles par toute personne disposant du lien.</span><span className="footer-credit"><em>The Gang</em> de John Cooper &amp; Kory Heath, édité par KOSMOS. Adaptation non officielle.</span></footer>
    </div>
  </main>
}
