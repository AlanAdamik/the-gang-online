'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { GameFlow } from '../components/game-flow'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Crown, DoorOpen, Heart, Link2, LoaderCircle, Spade, Users } from 'lucide-react'

type Screen = 'home' | 'room'
function GamePage() {
  const [screen, setScreen] = useState<Screen>('home')
  const [playerId, setPlayerId] = useState('')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const createRoom = useMutation(api.rooms.createRoom)
  const joinRoom = useMutation(api.rooms.joinRoom)
  const setReady = useMutation(api.rooms.setReady)
  const startGame = useMutation(api.rooms.startGame)
  const leaveRoom = useMutation(api.rooms.leaveRoom)
  const room = useQuery(api.rooms.getRoom, roomCode && playerId ? { code: roomCode, playerId } : 'skip')
  const isActiveGame = screen === 'room' && room?.status === 'playing'
  const me = room?.players.find((player) => player.id === playerId)
  const everyoneReady = !!room?.players.length && room.players.every((player) => player.ready)

  useEffect(() => {
    let id = sessionStorage.getItem('gang-player-id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('gang-player-id', id)
    }
    setPlayerId(id)
    setName(sessionStorage.getItem('gang-player-name') || '')
  }, [])

  useEffect(() => {
    if (roomCode && room === null) {
      setError('Cette salle n’est plus disponible.')
      setRoomCode('')
      setScreen('home')
    }
  }, [room, roomCode])

  async function act(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Une erreur est survenue. Réessayez.') }
    finally { setBusy(false) }
  }

  function saveName() {
    const clean = name.trim().slice(0, 20)
    if (!clean) { setError('Indiquez votre nom pour rejoindre la table.'); return '' }
    sessionStorage.setItem('gang-player-name', clean)
    setName(clean)
    return clean
  }

  async function create() {
    const clean = saveName()
    if (!clean || !playerId) return
    await act(async () => {
      const code = await createRoom({ playerId, name: clean })
      setRoomCode(code)
      setScreen('room')
    })
  }

  async function join() {
    const clean = saveName()
    const code = joinCode.trim().toUpperCase()
    if (!clean || !code || !playerId) { if (!code) setError('Saisissez d’abord un code de salle.'); return }
    await act(async () => {
      await joinRoom({ code, playerId, name: clean })
      setRoomCode(code)
      setScreen('room')
    })
  }

  async function exitRoom() {
    if (!roomCode || !playerId) return
    await act(async () => {
      await leaveRoom({ code: roomCode, playerId })
      setRoomCode('')
      setScreen('home')
    })
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}?room=${roomCode}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('room')
    if (code) setJoinCode(code.toUpperCase())
  }, [])

  return (
    <main className="game-shell">
      <header className={`topbar ${isActiveGame ? 'topbar-game' : ''}`}>
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setScreen('home') }} aria-label="Accueil The Gang">
          <span className="brand-mark"><Spade size={19} fill="currentColor" /></span>
          <span>the gang<span className="brand-period">.</span></span>
        </a>
        {isActiveGame && room ? <div className="top-right game-top-right">
          <span className="game-round-indicator">Manche {room.round} <span>·</span> {room.phase === 'reveal' ? 'Abattage' : room.phase === 'challenge' ? 'Contrôle de sécurité' : room.phase === 'result' ? 'Résultat du casse' : 'Classement des jetons'}</span>
          <span className="top-divider"/>
          <span className="game-room-code"><small>SALLE</small><strong>{room.code}</strong></span>
          <button className="game-invite-button" onClick={copyInvite} aria-label={copied ? 'Lien d’invitation copié' : 'Copier le lien d’invitation'}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copié' : 'Inviter'}</button>
          <span className="top-divider"/>
          <button className="game-leave-button" onClick={exitRoom} aria-label="Quitter la table"><ArrowLeft size={15}/> Quitter la table</button>
        </div> : <div className="top-right"><span className="online-dot" /> <span>la table est ouverte</span><span className="top-divider"/><button className="rules-link" onClick={() => document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' })}>Comment jouer <ChevronDown size={14}/></button></div>}
      </header>

      {screen === 'home' ? <section className="landing">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> UN JEU DE CARTES COOPÉRATIF <span className="eyebrow-line"/></div>
          <h1>Bonnes cartes.<br/><em>Meilleurs amis.</em></h1>
          <p className="hero-subtitle">Lisez la table. Faites confiance à votre équipe. Classez vos cartes — sans dire un mot.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={create} disabled={busy || !playerId}>{busy ? <LoaderCircle className="spin" size={17}/> : <Spade size={16}/>} Créer une salle <ArrowRight size={16}/></button>
            <span className="free-note"><span className="tiny-check"><Check size={10}/></span> Gratuit, pour toujours</span>
          </div>
          <div className="join-card">
            <div className="join-heading"><div className="join-icon"><DoorOpen size={17}/></div><div><strong>Vous rejoignez votre bande ?</strong><span>Saisissez le code envoyé par votre ami.</span></div></div>
            <div className="join-fields"><input aria-label="Votre nom" placeholder="Votre nom" maxLength={20} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void join() }}/><div className="code-input"><input aria-label="Code de la salle" placeholder="CODE" maxLength={4} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void join() }}/><button className="join-submit" onClick={join} disabled={busy || !playerId}>Rejoindre <ArrowRight size={15}/></button></div></div>
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <div className="player-note"><div className="avatar-stack"><span className="mini-avatar avatar-sage">M</span><span className="mini-avatar avatar-clay">J</span><span className="mini-avatar avatar-blue">A</span><span className="mini-avatar avatar-gold">+</span></div><span>Idéal de <strong>3 à 6 joueurs</strong></span></div>
        </div>
        <div className="table-art" aria-label="Illustration de cartes sur un tapis de jeu vert">
          <div className="felt-oval"><div className="felt-inner"><div className="table-wordmark">THE GANG</div><div className="table-submark">UN JEU D’INSTINCT PARTAGÉ</div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="table-cards"><div className="playing-card card-back"><span className="back-pattern">✳</span></div><div className="playing-card card-front card-ace"><small>A</small><span>♠</span><small className="card-bottom">A</small></div><div className="playing-card card-front card-seven"><small>7</small><span>♥</span><small className="card-bottom">7</small></div></div><div className="table-chip chip-left"><span>♣</span></div><div className="table-chip chip-right"><span>♥</span></div><div className="sparkle sparkle-a">✳</div><div className="sparkle sparkle-b">✦</div><div className="table-label label-top"><span className="label-dot"/> VOTRE TABLE, VOS RÈGLES</div><div className="table-label label-bottom"><span className="label-dash"/> LA CONFIANCE AU CŒUR DU JEU</div></div></div>
          <div className="art-caption"><span>♠</span> Une table. Une équipe. <span>♥</span></div>
        </div>
        <div id="how-to-play" className="how-section"><div className="how-intro"><span className="section-kicker">EN BREF</span><h2>Facile à apprendre.<br/><em>Difficile à lire.</em></h2></div><div className="how-steps"><article><span className="step-num">01</span><h3>Réunissez votre bande</h3><p>Créez une salle, partagez le code et attendez que tout le monde s’installe.</p></article><article><span className="step-num">02</span><h3>Lisez la table</h3><p>Chacun reçoit une main. Trouvez où se situent vos cartes sans rien dévoiler.</p></article><article><span className="step-num">03</span><h3>Suivez votre instinct</h3><p>Classez vos mains ensemble. La table gagne — ou perd — d’un seul bloc.</p></article></div></div>
        <footer className="footer"><span>Pensé pour les soirées jeux, où que vous soyez.</span><span className="footer-credit">Adaptation non officielle de <em>The Gang</em>, un jeu de cartes conçu par John Cooper &amp; Kory Heath et édité par KOSMOS. Sans lien avec les auteurs ou l’éditeur, ni approuvé par eux.</span><span>♥ &nbsp;JOUEZ FAIR-PLAY, JOUEZ ENSEMBLE</span></footer>
      </section> : <section className={`room-page ${isActiveGame ? 'room-page-active-game' : ''}`}>
        {!isActiveGame && <button className="back-button" onClick={exitRoom}><ArrowLeft size={15}/> Quitter la table</button>}
        {!room ? <div className="loading-room"><LoaderCircle className="spin" size={22}/> Installation à la table…</div> : <>
          {!isActiveGame && <div className="room-heading"><div><div className="eyebrow room-eyebrow"><span className="eyebrow-line"/> {room.status === 'lobby' ? 'LE SALON' : room.phase === 'challenge' ? 'CONTRÔLE DE SÉCURITÉ' : room.phase === 'reveal' ? 'L’ABATTAGE' : room.phase === 'result' ? 'RÉSULTAT DU CASSE' : 'MANCHE ' + room.round} <span className="eyebrow-line"/></div><h1>{room.status === 'lobby' ? <>La table est <em>à vous.</em></> : room.phase === 'reveal' ? <>Faites confiance à <em>l’ordre.</em></> : room.phase === 'result' ? <>Une équipe. Un seul <em>résultat.</em></> : <>Les yeux sur votre <em>main.</em></>}</h1><p>{room.status === 'lobby' ? 'Faites entrer votre bande. La partie commence quand tout le monde est prêt.' : room.phase === 'reveal' ? 'Les mains se révèlent du plus petit jeton au plus grand.' : room.phase === 'result' ? 'La table a joué. Voyons la suite.' : 'Vos cartes n’appartiennent qu’à vous. Trouvez votre place dans l’équipe.'}</p></div><div className="room-code-card"><span>CODE DE LA SALLE</span><strong>{room.code}</strong><button onClick={copyInvite} aria-label="Copier le lien d’invitation">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copié' : 'Copier l’invitation'}</button></div></div>}
          <div className={`room-main ${room.status === 'playing' ? 'game-active' : ''}`}>
            {room.status !== 'playing' && <section className="players-panel"><div className="panel-title"><span><Users size={16}/> La bande</span><span className="player-count">{room.players.length} / 6</span></div><div className="players-list">{room.players.map((player, index) => <div className="player-row" key={player.id}><span className={`player-avatar avatar-${['sage','clay','blue','gold','plum','slate'][index % 6]}`}>{player.name.charAt(0).toUpperCase()}</span><span className="player-name">{player.name}{player.id === playerId && <small>VOUS</small>}</span>{player.id === room.hostId && <span className="host-tag"><Crown size={12}/> HÔTE</span>}<span className={`ready-state ${room.status !== 'lobby' || player.ready ? 'is-ready' : ''}`}>{room.status === 'lobby' ? player.ready ? <><Check size={13}/> Prêt</> : 'S’installe' : player.tokenPicks?.some((pick) => pick.round === room.round) ? <><Check size={13}/> Classé</> : 'Choisit un jeton'}</span></div>)}</div><div className="room-share"><Link2 size={15}/><span>Envoyez le code de la salle à vos amis pour qu’ils vous rejoignent.</span></div>{error && <p className="error-message" role="alert">{error}</p>}
              {room.status === 'lobby' && <div className="lobby-actions">{room.hostId === playerId ? <button className="button button-primary full-button" disabled={busy || !everyoneReady || room.players.length < 2} onClick={() => void act(() => startGame({ code: room.code, playerId }))}><Spade size={16}/> {room.players.length < 2 ? 'En attente de votre bande' : !everyoneReady ? 'En attente de tout le monde' : 'Distribuer les cartes'} <ArrowRight size={16}/></button> : <button className={`button ${me?.ready ? 'button-ready' : 'button-primary'} full-button`} disabled={busy} onClick={() => void act(() => setReady({ code: room.code, playerId, ready: !me?.ready }))}>{me?.ready ? <><Check size={16}/> Vous êtes prêt</> : <>Je suis prêt <ArrowRight size={16}/></>}</button>}<span className="host-hint">{room.hostId === playerId ? 'Vous pourrez lancer la partie quand tout le monde sera prêt.' : 'L’hôte distribuera quand la bande sera prête.'}</span></div>}
            </section>}
            <GameFlow room={room} playerId={playerId} />
          </div>{!isActiveGame && <div className="room-footer"><span><span className="online-dot"/> {room.status === 'lobby' ? 'Salle ouverte' : 'Partie en cours'}</span><span>THE GANG <span className="brand-period">.</span> &nbsp;JOUEZ FAIR-PLAY, JOUEZ ENSEMBLE</span></div>}
        </>}
      </section>}
    </main>
  )
}

export default function Page() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  let hasValidConvexUrl = false
  if (convexUrl) {
    try {
      hasValidConvexUrl = new URL(convexUrl).protocol === 'https:'
    } catch {
      hasValidConvexUrl = false
    }
  }

  if (!hasValidConvexUrl) {
    return (
      <main className="game-shell">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Accueil The Gang">
            <span className="brand-mark"><Spade size={19} fill="currentColor" /></span>
            <span>the gang<span className="brand-period">.</span></span>
          </a>
        </header>
        <section className="service-message" role="status">
          <span className="section-kicker">UNE DERNIÈRE ÉTAPE</span>
          <h1>La table est presque <em>prête.</em></h1>
          <p>Définissez <code>NEXT_PUBLIC_CONVEX_URL</code> sur <code>https://clever-ram-410.convex.cloud</code> dans l’environnement du projet Vercel, puis redéployez.</p>
        </section>
      </main>
    )
  }

  return <GamePage />
}
