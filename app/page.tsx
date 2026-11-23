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
      setError('This room is no longer available.')
      setRoomCode('')
      setScreen('home')
    }
  }, [room, roomCode])

  async function act(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong. Try again.') }
    finally { setBusy(false) }
  }

  function saveName() {
    const clean = name.trim().slice(0, 20)
    if (!clean) { setError('Add your name to join the table.'); return '' }
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
    if (!clean || !code || !playerId) { if (!code) setError('Enter a room code first.'); return }
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
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setScreen('home') }} aria-label="The Gang home">
          <span className="brand-mark"><Spade size={19} fill="currentColor" /></span>
          <span>the gang<span className="brand-period">.</span></span>
        </a>
        <div className="top-right"><span className="online-dot" /> <span>the table is open</span><span className="top-divider"/><button className="rules-link" onClick={() => document.getElementById('how-to-play')?.scrollIntoView({ behavior: 'smooth' })}>How to play <ChevronDown size={14}/></button></div>
      </header>

      {screen === 'home' ? <section className="landing">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> A COOPERATIVE CARD GAME <span className="eyebrow-line"/></div>
          <h1>Good cards.<br/><em>Better friends.</em></h1>
          <p className="hero-subtitle">Read the table. Trust your people. Get your cards in order — without saying a word.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={create} disabled={busy || !playerId}>{busy ? <LoaderCircle className="spin" size={17}/> : <Spade size={16}/>} Create a room <ArrowRight size={16}/></button>
            <span className="free-note"><span className="tiny-check"><Check size={10}/></span> Free to play, always</span>
          </div>
          <div className="join-card">
            <div className="join-heading"><div className="join-icon"><DoorOpen size={17}/></div><div><strong>Joining your crew?</strong><span>Enter the code your friend sent you.</span></div></div>
            <div className="join-fields"><input aria-label="Your name" placeholder="Your name" maxLength={20} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void join() }}/><div className="code-input"><input aria-label="Room code" placeholder="ROOM CODE" maxLength={4} value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) void join() }}/><button className="join-submit" onClick={join} disabled={busy || !playerId}>Join <ArrowRight size={15}/></button></div></div>
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
          <div className="player-note"><div className="avatar-stack"><span className="mini-avatar avatar-sage">M</span><span className="mini-avatar avatar-clay">J</span><span className="mini-avatar avatar-blue">A</span><span className="mini-avatar avatar-gold">+</span></div><span>Best with <strong>3–6 players</strong></span></div>
        </div>
        <div className="table-art" aria-label="Illustration of cards on a green felt table">
          <div className="felt-oval"><div className="felt-inner"><div className="table-wordmark">THE GANG</div><div className="table-submark">A GAME OF SHARED INSTINCT</div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="table-cards"><div className="playing-card card-back"><span className="back-pattern">✳</span></div><div className="playing-card card-front card-ace"><small>A</small><span>♠</span><small className="card-bottom">A</small></div><div className="playing-card card-front card-seven"><small>7</small><span>♥</span><small className="card-bottom">7</small></div></div><div className="table-chip chip-left"><span>♣</span></div><div className="table-chip chip-right"><span>♥</span></div><div className="sparkle sparkle-a">✳</div><div className="sparkle sparkle-b">✦</div><div className="table-label label-top"><span className="label-dot"/> YOUR TABLE, YOUR RULES</div><div className="table-label label-bottom"><span className="label-dash"/> DEALING IN TRUST SINCE NOW</div></div></div>
          <div className="art-caption"><span>♠</span> One table. One team. <span>♥</span></div>
        </div>
        <div id="how-to-play" className="how-section"><div className="how-intro"><span className="section-kicker">THE SHORT VERSION</span><h2>Easy to learn.<br/><em>Hard to read.</em></h2></div><div className="how-steps"><article><span className="step-num">01</span><h3>Gather your gang</h3><p>Make a room, share the code, and wait for your people to pull up a chair.</p></article><article><span className="step-num">02</span><h3>Read the room</h3><p>Everyone gets a hand. Figure out where your cards belong without giving it away.</p></article><article><span className="step-num">03</span><h3>Trust your gut</h3><p>Put your cards in order together. The table wins — or loses — as one.</p></article></div></div>
        <footer className="footer"><span>Made for game night, wherever you are.</span><span>♥ &nbsp;PLAY NICE, PLAY TOGETHER</span></footer>
      </section> : <section className="room-page">
        <button className="back-button" onClick={exitRoom}><ArrowLeft size={15}/> Leave table</button>
        {!room ? <div className="loading-room"><LoaderCircle className="spin" size={22}/> Pulling up a chair…</div> : <>
          <div className="room-heading"><div><div className="eyebrow room-eyebrow"><span className="eyebrow-line"/> {room.status === 'lobby' ? 'THE LOBBY' : room.phase === 'challenge' ? 'SECURITY CHECK' : room.phase === 'reveal' ? 'THE SHOWDOWN' : room.phase === 'result' ? 'HEIST RESULT' : 'ROUND ' + room.round} <span className="eyebrow-line"/></div><h1>{room.status === 'lobby' ? <>The table is <em>yours.</em></> : room.phase === 'reveal' ? <>Trust the <em>order.</em></> : room.phase === 'result' ? <>One team. One <em>outcome.</em></> : <>Eyes on your <em>hand.</em></>}</h1><p>{room.status === 'lobby' ? 'Get your crew in. The game starts when everyone is ready.' : room.phase === 'reveal' ? 'Hands turn over from the lowest token to the highest.' : room.phase === 'result' ? 'The table has made its move. See what comes next.' : 'Your cards are yours alone. Find your place in the team.'}</p></div><div className="room-code-card"><span>ROOM CODE</span><strong>{room.code}</strong><button onClick={copyInvite} aria-label="Copy invite link">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy invite'}</button></div></div>
          <div className="room-main">
            <section className="players-panel"><div className="panel-title"><span><Users size={16}/> The crew</span><span className="player-count">{room.players.length} / 6</span></div><div className="players-list">{room.players.map((player, index) => <div className="player-row" key={player.id}><span className={`player-avatar avatar-${['sage','clay','blue','gold','plum','slate'][index % 6]}`}>{player.name.charAt(0).toUpperCase()}</span><span className="player-name">{player.name}{player.id === playerId && <small>YOU</small>}</span>{player.id === room.hostId && <span className="host-tag"><Crown size={12}/> HOST</span>}<span className={`ready-state ${room.status !== 'lobby' || player.ready ? 'is-ready' : ''}`}>{room.status === 'lobby' ? player.ready ? <><Check size={13}/> Ready</> : 'Getting settled' : player.tokenPicks?.some((pick) => pick.round === room.round) ? <><Check size={13}/> Ranked</> : 'Choosing token'}</span></div>)}</div><div className="room-share"><Link2 size={15}/><span>Send the room code to your friends so they can join.</span></div>{error && <p className="error-message" role="alert">{error}</p>}
              {room.status === 'lobby' && <div className="lobby-actions">{room.hostId === playerId ? <button className="button button-primary full-button" disabled={busy || !everyoneReady || room.players.length < 2} onClick={() => void act(() => startGame({ code: room.code, playerId }))}><Spade size={16}/> {room.players.length < 2 ? 'Waiting for your crew' : !everyoneReady ? 'Waiting for everyone' : 'Deal the cards'} <ArrowRight size={16}/></button> : <button className={`button ${me?.ready ? 'button-ready' : 'button-primary'} full-button`} disabled={busy} onClick={() => void act(() => setReady({ code: room.code, playerId, ready: !me?.ready }))}>{me?.ready ? <><Check size={16}/> You’re ready</> : <>I’m in <ArrowRight size={16}/></>}</button>}<span className="host-hint">{room.hostId === playerId ? 'You can start when everyone has checked in.' : 'Your host will deal when the gang is ready.'}</span></div>}
            </section>
            <GameFlow room={room} playerId={playerId} />
          </div><div className="room-footer"><span><span className="online-dot"/> {room.status === 'lobby' ? 'Room is live' : 'Game in progress'}</span><span>THE GANG <span className="brand-period">.</span> &nbsp;PLAY NICE, PLAY TOGETHER</span></div>
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
          <a className="brand" href="/" aria-label="The Gang home">
            <span className="brand-mark"><Spade size={19} fill="currentColor" /></span>
            <span>the gang<span className="brand-period">.</span></span>
          </a>
        </header>
        <section className="service-message" role="status">
          <span className="section-kicker">ONE QUICK SETUP</span>
          <h1>The table is almost <em>ready.</em></h1>
          <p>Set <code>NEXT_PUBLIC_CONVEX_URL</code> to <code>https://clever-ram-410.convex.cloud</code> in the Vercel project environment, then redeploy.</p>
        </section>
      </main>
    )
  }

  return <GamePage />
}
