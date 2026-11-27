'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'
import { Card } from './playing-card'
import { RealCasinoTable } from './real-casino-table'
import { GameLogPanel } from './game-log'
import { ShowdownHands } from './showdown-hands'
import { CardThemeToggle } from './card-theme'
import { HeistScore } from './heist-score'
import { Check, Eye, Flame, LoaderCircle, Lock, RotateCcw, Shield, Sparkles, X } from 'lucide-react'
import { centerAnchor } from './token-flights'

type GameFlowProps = {
  room: {
    code: string
    hostId: string
    status: 'lobby' | 'playing' | 'finished'
    round: number
    phase?: 'ranking' | 'challenge' | 'reveal' | 'result'
    mode?: 'advanced' | 'professional' | 'master-thief'
    communityCards?: number[]
    revealOrder?: string[]
    reveals?: { playerId: string; cards: number[]; category: string; score: number }[]
    outcome?: 'success' | 'failed'
    alarms?: number
    activeChallengeCards?: number[]
    permanentChallengeCard?: number
    pendingChallengeCard?: number
    activeSpecialistCard?: number
    pendingSpecialistCard?: number
    challengeChecks?: number[]
    completedChallengeChecks?: number[]
    tokenStealNotice?: { targetPlayerId: string; thiefName: string; value: number; createdAt: number }
    tokenHistory?: { round: number; playerId: string; value: number }[]
    specialistUse?: { card: number; playerId: string; playerName: string; round: number; category: string }
    players: { id: string; name: string; cards: number[]; tokenPicks?: { round: number; value: number }[] }[]
  }
  playerId: string
}

const challengeNames = ['Accès rapide', 'Capteurs sonores', 'Détecteur de mouvement', 'Scanner rétinien', 'Fuite précipitée', 'Conduit d’aération', 'Rayons laser', 'Panne de courant', 'Scanner d’empreintes', 'Caméras de surveillance']
const challengeRules = [
  'La manche des jetons blancs est sautée et le flop est révélé immédiatement.',
  'Un jeton 1 choisi est verrouillé pendant les manches 1 à 3.',
  'Une figure sur le flop fait repiocher le joueur au plus petit jeton blanc.',
  'Avant l’abattage, l’équipe doit deviner une carte du joueur au plus haut jeton rouge.',
  'Le choix des jetons orange est sauté ; la turn et la river sont tout de même révélées.',
  'Le plus haut jeton des manches 1 à 3 est verrouillé dès qu’il est pris.',
  'Si le flop ne contient aucune figure, le joueur au plus haut jeton blanc repioche.',
  'Les jetons de la manche précédente sont retirés au début de la manche suivante.',
  'Avant l’abattage, l’équipe doit deviner la combinaison du joueur au plus haut jeton rouge.',
  'Trois cartes privées sont distribuées ; formez la meilleure main de cinq cartes avec elles et le tableau.',
]
const specialistNames = ['Informateur', 'Chauffeur', 'Investisseur', 'Cerveau', 'Hacker', 'Coordinateur', 'Valet', 'Matheux', 'Escroc', 'Gros bras']
const specialistRules = [
  'Un joueur montre secrètement une carte privée à un autre.',
  'Un joueur révèle la combinaison actuelle de sa main.',
  'Chacun annonce combien de figures il possède.',
  'Un joueur révèle combien de cartes d’une valeur choisie il possède.',
  'Un joueur pioche une carte, puis en défausse une.',
  'Chacun passe une carte privée à son voisin de gauche.',
  'Remplacez une carte privée par un Valet.',
  'Chacun annonce la somme des valeurs de ses cartes privées.',
  'Toutes les cartes privées sont mélangées et redistribuées.',
  'Ce joueur l’emporte en cas d’égalité avec une main de même rang.',
]
const roundColors = ['white', 'yellow', 'orange', 'red']
const roundNames = ['blancs', 'jaunes', 'orange', 'rouges']
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function modeCopy(mode: GameFlowProps['room']['mode']) {
  if (mode === 'professional') return 'Un Défi permanent reste actif. Un casse réussi ajoute un Défi temporaire ; un casse raté rapporte un Spécialiste.'
  if (mode === 'master-thief') return 'Deux Défis restent actifs, aucun Spécialiste n’est distribué et deux alarmes mettent fin à la partie.'
  return 'Aucun modificateur au départ. Une victoire ajoute un Défi au prochain casse ; une défaite rapporte un Spécialiste.'
}

function ActiveChallengeFab({ cards }: { cards: number[] }) {
  const [open, setOpen] = useState(false)
  if (!cards.length) return null

  return <div className={`challenge-fab ${open ? 'is-open' : ''}`}>
    <button type="button" className="challenge-fab-trigger" aria-label="Voir le défi actif" aria-expanded={open} aria-controls="active-challenge-details" onClick={() => setOpen((value) => !value)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
      <Flame size={18}/><span className="sr-only">Défi actif</span>
    </button>
    <div id="active-challenge-details" className="challenge-fab-details" role="status">
      <span className="section-kicker">{cards.length > 1 ? 'DÉFIS ACTIFS' : 'DÉFI ACTIF'}</span>
      {cards.map((id) => <article key={id}><strong>{challengeNames[id - 1]}</strong><p>{challengeRules[id - 1]}</p></article>)}
    </div>
  </div>
}

function TableModifiers({ room, busy, onUseGetawayDriver }: { room: GameFlowProps['room']; busy: boolean; onUseGetawayDriver: () => void }) {
  const challenges = room.activeChallengeCards ?? []
  const specialist = room.activeSpecialistCard
  const use = room.specialistUse
  const showPending = room.phase === 'result'
  const pendingChallenge = showPending ? room.pendingChallengeCard : undefined
  const pendingSpecialist = showPending ? room.pendingSpecialistCard : undefined
  if (!challenges.length && !specialist && !pendingChallenge && !pendingSpecialist) return null
  const canUseGetawayDriver = specialist === 2 && room.phase === 'ranking' && !use

  return <div className="table-modifiers" role="region" aria-label="Modificateurs actifs">
    {challenges.map((id) => <details className="table-modifier table-modifier-challenge" key={`challenge-${id}`}>
      <summary><Flame size={13} aria-hidden="true"/><span className="table-modifier-kind">Défi</span><strong>{challengeNames[id - 1]}</strong></summary>
      <p>{challengeRules[id - 1]}</p>
    </details>)}
    {specialist && <details className="table-modifier table-modifier-specialist" open={specialist === 2 ? true : undefined}>
      <summary><Shield size={13} aria-hidden="true"/><span className="table-modifier-kind">Spécialiste</span><strong>{specialistNames[specialist - 1]}</strong></summary>
      <p>{specialist === 2 ? 'Une fois par casse, pendant le classement, un joueur peut révéler à l’équipe la combinaison actuelle de sa main.' : specialistRules[specialist - 1]}</p>
      {specialist === 2 && (use
        ? <p className="table-modifier-result" role="status"><strong>{use.playerName}</strong> a <strong>{use.category}</strong> <span>(manche {use.round})</span></p>
        : canUseGetawayDriver
          ? <button type="button" className="table-modifier-action" disabled={busy} onClick={onUseGetawayDriver}>Révéler ma combinaison</button>
          : <p className="table-modifier-muted">Disponible pendant une manche de classement.</p>)}
    </details>}
    {pendingChallenge && <details className="table-modifier table-modifier-challenge is-pending">
      <summary><Flame size={13} aria-hidden="true"/><span className="table-modifier-kind">Prochain casse</span><strong>{challengeNames[pendingChallenge - 1]}</strong></summary>
      <p>{challengeRules[pendingChallenge - 1]}</p>
    </details>}
    {pendingSpecialist && <details className="table-modifier table-modifier-specialist is-pending">
      <summary><Shield size={13} aria-hidden="true"/><span className="table-modifier-kind">Prochain casse</span><strong>{specialistNames[pendingSpecialist - 1]}</strong></summary>
      <p>{specialistRules[pendingSpecialist - 1]}</p>
    </details>}
  </div>
}

export function lockedTokenForRound(room: Pick<GameFlowProps['room'], 'activeChallengeCards' | 'players'>, round: number) {
  if (round > 3) return null
  if (room.activeChallengeCards?.includes(2)) return 1
  if (room.activeChallengeCards?.includes(6)) return room.players.length
  return null
}

function TokenHistory({ room }: { room: GameFlowProps['room'] }) {
  const history = room.tokenHistory ?? room.players.flatMap((player) =>
    (player.tokenPicks ?? []).map((pick) => ({ ...pick, playerId: player.id })),
  )

  return <section className="token-history" aria-label="Jetons choisis par manche et par joueur">
    <div className="token-history-heading"><strong>Historique des jetons</strong><span>Mis à jour quand un jeton est volé.</span></div>
    <table>
      <caption className="sr-only">Jeton final de chaque joueur par manche, de gauche à droite</caption>
      <thead><tr><th scope="col">Joueur</th>{[1, 2, 3, 4].map((round) => <th scope="col" key={round}>Manche {round}</th>)}</tr></thead>
      <tbody>{room.players.map((player) => <tr key={player.id}>
        <th scope="row">{player.name}</th>
        {[1, 2, 3, 4].map((round) => {
          const pick = history.find((entry) => entry.round === round && entry.playerId === player.id)
          const locked = pick && pick.value === lockedTokenForRound(room, round)
          return <td key={round}>{pick ? <span className={`token-history-token ${locked ? 'is-locked' : ''}`} title={locked ? 'Jeton verrouillé' : undefined}>{pick.value}</span> : <span className="token-history-empty" aria-label="Aucun jeton choisi">—</span>}</td>
        })}
      </tr>)}</tbody>
    </table>
  </section>
}

export function GameFlow({ room, playerId }: GameFlowProps) {
  const [busy, setBusy] = useState(false)
  const [displayMode, setDisplayMode] = useState<'text' | 'real'>('real')
  const [burningCard, setBurningCard] = useState(false)
  const previousBoardLength = useRef(room.communityCards?.length ?? 0)
  const [error, setError] = useState('')
  const [guess, setGuess] = useState('')
  const [dismissedStealNoticeAt, setDismissedStealNoticeAt] = useState<number | null>(null)
  const [ownSteal, setOwnSteal] = useState<{ value: number; victimName: string; at: number } | null>(null)
  const chooseMode = useMutation(api.rooms.chooseMode)
  const pickToken = useMutation(api.rooms.pickToken)
  const revealNextHand = useMutation(api.rooms.revealNextHand)
  const submitChallengeGuess = useMutation(api.rooms.submitChallengeGuess)
  const startNextHeist = useMutation(api.rooms.startNextHeist)
  const revealHandRanking = useMutation(api.rooms.revealHandRanking)
  const restartGame = useMutation(api.rooms.restartGame)
  const isHost = room.hostId === playerId
  const me = room.players.find((player) => player.id === playerId)
  const currentPick = me?.tokenPicks?.find((pick) => pick.round === room.round)
  const availableTokens = Array.from({ length: room.players.length }, (_, index) => index + 1)
  const tokenHolders = new Map(room.players.flatMap((player) => {
    const pick = player.tokenPicks?.find((token) => token.round === room.round)
    return pick ? [[pick.value, player] as const] : []
  }))
  const stealNotice = room.tokenStealNotice?.targetPlayerId === playerId ? room.tokenStealNotice : undefined
  const lockedToken = lockedTokenForRound(room, room.round)
  const revealOrder = room.revealOrder ?? []
  const reveals = room.reveals ?? []
  const nextPlayer = room.players.find((player) => player.id === revealOrder[reveals.length])
  const board = room.communityCards ?? []
  const activeChallenges = room.activeChallengeCards ?? []

  useEffect(() => {
    const cardsWereDealt = board.length > previousBoardLength.current
    previousBoardLength.current = board.length
    if (!cardsWereDealt) return
    setBurningCard(true)
    const timeout = window.setTimeout(() => setBurningCard(false), 650)
    return () => window.clearTimeout(timeout)
  }, [board.length])

  useEffect(() => {
    if (!ownSteal) return
    const timeout = window.setTimeout(() => setOwnSteal(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [ownSteal])

  const viewModeToggle = <div className="game-toggle-row">
    <div className="game-view-toggle" role="group" aria-label="Choisir l’affichage de la partie">
      <span>AFFICHAGE</span>
      <button type="button" aria-pressed={displayMode === 'text'} onClick={() => setDisplayMode('text')}>Texte</button>
      <button type="button" aria-pressed={displayMode === 'real'} onClick={() => setDisplayMode('real')}>Table réelle</button>
    </div>
    <CardThemeToggle/>
  </div>
  const showStealNotice = room.phase === 'ranking' && stealNotice && dismissedStealNoticeAt !== stealNotice.createdAt
  const colorName = roundColors[room.round - 1] ?? 'red'
  const tokenToasts = <>
    {showStealNotice && <div className="token-stolen-toast" role="alert" aria-live="assertive">
      <span className={`token-toast-chip chip-${colorName}`} aria-hidden="true">{stealNotice.value}</span>
      <span className="token-toast-copy"><span>Votre jeton {stealNotice.value} a été pris par</span><strong>{stealNotice.thiefName}</strong><small>Choisissez-en un autre.</small></span>
      <button type="button" aria-label="Fermer la notification de jeton volé" onClick={() => setDismissedStealNoticeAt(stealNotice.createdAt)}><X size={14} aria-hidden="true"/></button>
    </div>}
    {ownSteal && <div className={`token-stolen-toast token-steal-success-toast ${showStealNotice ? 'is-stacked' : ''}`} role="status" aria-live="polite">
      <span className={`token-toast-chip chip-${colorName}`} aria-hidden="true">{ownSteal.value}</span>
      <span className="token-toast-copy"><span>Vous avez pris le jeton {ownSteal.value} de</span><strong>{ownSteal.victimName}</strong></span>
      <button type="button" aria-label="Fermer la notification" onClick={() => setOwnSteal(null)}><X size={14} aria-hidden="true"/></button>
    </div>}
  </>
  function chooseToken(value: number) {
    const victim = room.players.find((player) => player.id !== playerId && player.tokenPicks?.some((pick) => pick.round === room.round && pick.value === value))
    void run(async () => {
      await pickToken({ code: room.code, playerId, value })
      if (victim) setOwnSteal({ value, victimName: victim.name, at: Date.now() })
    })
  }
  const alarmLimit = room.mode === 'master-thief' ? 2 : 3
  const heistScore = (variant: 'table' | 'panel') => <HeistScore code={room.code} playerId={playerId} round={room.round} phase={room.phase} alarms={room.alarms ?? 0} alarmLimit={alarmLimit} variant={variant}/>
  const tokenPicker = room.phase === 'ranking' ? <div className={`token-picker token-picker-${colorName}`}>
    <div className="token-picker-heading"><strong>Où vous situez-vous ?</strong><span>1 = le plus faible · {room.players.length} = le plus fort</span></div>
    <div className="token-options">{availableTokens.map((value) => {
      const holder = tokenHolders.get(value)
      const selected = holder?.id === playerId
      const taken = Boolean(holder) && !selected
      const locked = (value === lockedToken && taken) || (currentPick?.value === lockedToken && currentPick.value !== value)
      const isLockedToken = value === lockedToken && (taken || selected)
      const hint = value === 1 ? 'Plus faible' : value === room.players.length ? 'Plus fort' : 'Libre'
      const holderLabel = selected ? 'Vous' : holder?.name
      const description = `Jeton ${value}, ${holder ? selected ? 'votre choix' : `détenu par ${holder.name}` : 'libre'}${isLockedToken ? ', verrouillé' : ''}`
      return <button key={value} data-token-anchor={centerAnchor(value)} className={`rank-token ${selected ? 'is-selected' : ''} ${taken ? 'is-taken' : ''} ${isLockedToken ? 'is-locked' : ''}`} aria-pressed={selected} aria-label={description} title={description} disabled={busy || locked} onClick={() => chooseToken(value)}>
        {selected ? <Check size={14} aria-hidden="true"/> : value}
        <span className={holderLabel ? 'rank-token-holder' : 'rank-token-hint'}>{isLockedToken && <Lock size={8} aria-hidden="true"/>}{holderLabel ?? hint}</span>
      </button>
    })}</div>
    <p className="token-note">{currentPick ? `Vous avez le jeton ${currentPick.value}. Vous pouvez changer tant que tout le monde n’a pas classé.` : 'Choisissez un jeton libre, ou prenez-en un à son détenteur : il devra en choisir un autre.'}</p>
  </div> : null
  const canRevealHand = room.phase === 'reveal' && nextPlayer?.id === playerId
  const tableModifiers = <TableModifiers room={room} busy={busy} onUseGetawayDriver={() => void run(() => revealHandRanking({ code: room.code, playerId }))}/>
  const isReal = displayMode === 'real'
  const nextHeistButton = room.phase === 'result' && room.status === 'playing'
    ? <button className="button button-primary full-button next-heist-button" disabled={!isHost || busy} onClick={() => void run(() => startNextHeist({ code: room.code, playerId }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {isHost ? 'Distribuer le prochain casse' : 'En attente de l’hôte'} </button>
    : null
  const restartButton = room.status === 'finished'
    ? <button className="button button-primary full-button next-heist-button" disabled={!isHost || busy} onClick={() => void run(() => restartGame({ code: room.code, playerId }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <RotateCcw size={16}/>} {isHost ? 'Nouvelle partie' : 'En attente de l’hôte pour rejouer'}</button>
    : null
  const realTable = isReal ? <RealCasinoTable round={room.round} notices={tokenToasts} scoreboard={heistScore('table')} lockedTokenForRound={(round) => lockedTokenForRound(room, round)} players={room.players} board={board} playerId={playerId} phase={room.phase} reveals={reveals} outcome={room.outcome} gameOver={room.status === 'finished'} nextPlayerId={nextPlayer?.id} burningCard={burningCard} tokenPicker={tokenPicker} modifiers={tableModifiers} tableAction={nextHeistButton ?? restartButton} revealBusy={busy} onRevealHand={() => void run(() => revealNextHand({ code: room.code, playerId }))}/> : null
  const completedChecks = room.completedChallengeChecks ?? []
  const currentChallengeCheck = (room.challengeChecks ?? []).find((id) => !completedChecks.includes(id))

  async function run(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Une erreur est survenue. Réessayez.') }
    finally { setBusy(false) }
  }

  const stageMessage = room.round === 1
    ? 'Utilisez vos deux cartes privées pour décider de votre place.'
    : room.round === 2
      ? 'Le flop est sorti. Reconsidérez votre place avec trois cartes communes.'
      : room.round === 3
        ? 'La turn est sortie. Affinez votre classement avec quatre cartes communes.'
        : 'La river est sortie. Faites votre classement final avant la révélation.'

  if (room.status === 'lobby') {
    return <section className="hand-panel">
      <div className="table-waiting">
        <div className="waiting-icon"><Sparkles size={24}/></div>
        <span className="section-kicker">CHOISISSEZ VOTRE CASSE</span>
        <h2>Choisissez une difficulté<br/>pour la <em>bande.</em></h2>
        {isHost ? <label className="mode-picker">Mode de jeu
          <select value={room.mode ?? 'advanced'} disabled={busy} onChange={(event) => void run(() => chooseMode({ code: room.code, playerId, mode: event.target.value as 'advanced' | 'professional' | 'master-thief' }))}>
            <option value="advanced">Avancé</option>
            <option value="professional">Professionnel</option>
            <option value="master-thief">Maître voleur</option>
          </select>
        </label> : <strong className="mode-name">Mode {room.mode === 'master-thief' ? 'Maître voleur' : room.mode === 'professional' ? 'Professionnel' : 'Avancé'}</strong>}
        <p>{modeCopy(room.mode)}</p>
        {room.mode === 'master-thief' && <span className="mode-warning"><Flame size={14}/> Deux alarmes et la partie est terminée.</span>}
      </div>
    </section>
  }

  if (room.phase === 'result') {
    const failed = room.outcome === 'failed'
    return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
      {viewModeToggle}
      {!isReal && <ActiveChallengeFab cards={activeChallenges}/>}
      {!isReal && heistScore('panel')}
      {realTable}
      <div className={`heist-result ${failed ? 'result-failed' : 'result-success'}`}>
        <span className="section-kicker">{failed ? 'CASSE RATÉ' : 'CASSE RÉUSSI'}</span>
        <h2>{failed ? <>L’alarme <em>retentit.</em></> : <>Coffre <em>ouvert.</em></>}</h2>
        <p>{failed ? `L’ordre des mains est rompu. ${room.alarms ?? 0} alarme${(room.alarms ?? 0) > 1 ? 's' : ''} jusqu’ici.` : 'Chaque main était plus forte que la précédente.'}</p>
        {room.status === 'finished' && <p className="game-over-note">La bande a atteint la limite d’alarmes. La partie est terminée.</p>}
        {!isReal && <div className="modifier-draws">
          {room.pendingSpecialistCard && <div className="modifier-card specialist-card"><span><Shield size={15}/> SPÉCIALISTE ROUGE</span><strong>{specialistNames[room.pendingSpecialistCard - 1]}</strong><p>{specialistRules[room.pendingSpecialistCard - 1]}</p></div>}
          {room.pendingChallengeCard && <div className="modifier-card challenge-card"><span><Flame size={15}/> DÉFI VERT</span><strong>{challengeNames[room.pendingChallengeCard - 1]}</strong><p>{challengeRules[room.pendingChallengeCard - 1]}</p></div>}
          {room.activeSpecialistCard && <div className="modifier-card specialist-card"><span><Shield size={15}/> SPÉCIALISTE ACTIF</span><strong>{specialistNames[room.activeSpecialistCard - 1]}</strong><p>{specialistRules[room.activeSpecialistCard - 1]}</p></div>}
        </div>}
        {!isReal && (nextHeistButton ?? restartButton)}
      </div>
      {!isReal && <div className="reveal-history">
        <div className="hand-topline"><span><Eye size={15}/> Mains révélées</span><span>{reveals.length} / {room.players.length}</span></div>
        <ShowdownHands reveals={reveals} players={room.players} boardSize={board.length} variant="panel"/>
      </div>}
      <div className="showdown-board"><span>TABLEAU COMMUN</span>{board.map((card) => <Card value={card} small key={`board-${card}`}/>)}</div>
      <TokenHistory room={room}/>
      <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  }

  if (room.phase === 'challenge') {
    const highestPlayer = room.players.find((player) => player.tokenPicks?.some((pick) => pick.round === 4 && pick.value === room.players.length))
    const isRankCheck = currentChallengeCheck === 4
    const categories = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush']
    return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
      {viewModeToggle}
      {!isReal && <ActiveChallengeFab cards={activeChallenges}/>}
      {!isReal && heistScore('panel')}
      {realTable}
      <div className="hand-topline"><span><Eye size={15}/> Contrôle de sécurité</span><span>{completedChecks.length + 1} / {(room.challengeChecks ?? []).length}</span></div>
      <div className="scanner-check">
        <span className="section-kicker">{challengeNames[(currentChallengeCheck ?? 4) - 1]}</span>
        <h2>{isRankCheck ? <>Déjouez le <em>scanner rétinien.</em></> : <>Déjouez le <em>scanner d’empreintes.</em></>}</h2>
        <p>{isRankCheck ? `Quelle valeur de carte se trouve dans la main privée ${highestPlayer ? 'de ' + highestPlayer.name : 'du joueur au plus haut jeton rouge'} ?` : `Quelle est la meilleure combinaison ${highestPlayer ? 'de ' + highestPlayer.name : 'du joueur au plus haut jeton rouge'} ?`}</p>
        <label className="guess-picker">La proposition de la bande
          <select value={guess} onChange={(event) => setGuess(event.target.value)}>
            <option value="">Choisissez une réponse</option>
            {isRankCheck
              ? Array.from({ length: 13 }, (_, index) => index + 2).map((value) => <option value={value} key={value}>{value === 14 ? 'As' : value === 13 ? 'Roi' : value === 12 ? 'Dame' : value === 11 ? 'Valet' : ranks[value - 1]}</option>)
              : categories.map((category, index) => <option value={index} key={category}>{category}</option>)}
          </select>
        </label>
        <button className="button button-primary full-button" disabled={!isHost || busy || guess === ''} onClick={() => void run(() => submitChallengeGuess({ code: room.code, playerId, guess: Number(guess) }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <Check size={16}/>} {isHost ? 'Valider la proposition' : 'En attente de l’hôte'}</button>
        <p className="guess-hint">Discutez-en ensemble, puis l’hôte valide une réponse. Une mauvaise réponse déclenche une alarme.</p>
      </div>
      <div className="showdown-board"><span>TABLEAU COMMUN</span>{board.map((card) => <Card value={card} small key={`board-${card}`}/>)}</div>
      <TokenHistory room={room}/>
      <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  }

  if (room.phase === 'reveal') {
    return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
      {viewModeToggle}
      {!isReal && <ActiveChallengeFab cards={activeChallenges}/>}
      {!isReal && heistScore('panel')}
      {realTable}
      <div className="hand-topline"><span><Eye size={15}/> L’abattage</span><span>Du plus petit jeton au plus grand</span></div>
      <div className="community-row" aria-label="Cartes communes">{board.map((card) => <Card value={card} small key={card}/>)}</div>
      <div className="reveal-next-card">
        {nextPlayer ? <><span className="section-kicker">AU SUIVANT · {reveals.length + 1} SUR {room.players.length}</span><h2>{canRevealHand ? <>À vous de <em>jouer.</em></> : <>Au tour de <em>{nextPlayer.name}.</em></>}</h2><p>Révélez dans l’ordre des jetons. Chaque main doit être plus forte.</p></> : <><span className="section-kicker">ABATTAGE TERMINÉ</span><h2>L’ordre est <em>établi.</em></h2></>}
        {!isReal && <ShowdownHands reveals={reveals} players={room.players} boardSize={board.length} variant="panel"/>}
        {nextPlayer && displayMode === 'text' && <button className="button button-primary full-button" disabled={!canRevealHand || busy} onClick={() => void run(() => revealNextHand({ code: room.code, playerId }))}>{busy ? <LoaderCircle className="spin" size={16}/> : <Eye size={16}/>} {canRevealHand ? 'Révéler votre main' : `En attente de la révélation de ${nextPlayer.name}`}</button>}
      </div>
      <div className="showdown-board"><span>TABLEAU COMMUN</span>{board.map((card) => <Card value={card} small key={`board-${card}`}/>)}</div>
      <TokenHistory room={room}/>
      <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  }

  return <section className={`hand-panel game-flow-panel ${displayMode === 'real' ? 'real-mode' : 'text-mode'}`}>
    {viewModeToggle}
    {!isReal && <ActiveChallengeFab cards={activeChallenges}/>}
      {!isReal && heistScore('panel')}
    {realTable}
    <div className="hand-topline"><span><Sparkles size={15}/> Manche {room.round} · jetons {roundNames[room.round - 1] ?? 'rouges'}</span><span>{room.players.filter((player) => player.tokenPicks?.some((pick) => pick.round === room.round)).length} / {room.players.length} classés</span></div>
    {!isReal && room.activeSpecialistCard === 2 && tableModifiers}
    {!isReal && room.activeSpecialistCard && room.activeSpecialistCard !== 2 && <div className="active-modifier-strip"><Shield size={14}/><span>Spécialiste actif :</span><span className="active-card-rule"><strong className="active-specialist-name">{specialistNames[room.activeSpecialistCard - 1]}</strong><small>{specialistRules[room.activeSpecialistCard - 1]}</small></span></div>}
    {!isReal && tokenToasts}
    <p className="round-guidance">{stageMessage}</p>
    <div className="game-table-row">
      {me?.cards.length ? <div className="private-hand"><span>VOS CARTES PRIVÉES <small>gardez-les pour vous</small></span><div>{me.cards.map((card) => <Card value={card} key={card}/>)}</div></div> : <div className="private-hand private-hand-empty"><span>VOS CARTES PRIVÉES</span><span>Les cartes sont distribuées au début du casse.</span></div>}
      <div className="public-board">
        <div className="board-caption"><span>TABLEAU COMMUN</span><span>{board.length ? `${board.length} cartes sur 5` : 'Le flop arrive après cette manche'}</span></div>
        <div className="community-row">{board.length ? board.map((card) => <Card value={card} small key={card}/>) : <span className="board-placeholder">Les cartes communes apparaissent ici pour tout le monde.</span>}</div>
      </div>
    </div>
    {displayMode === 'text' && tokenPicker}
    <TokenHistory room={room}/>
    <GameLogPanel code={room.code} playerId={playerId} finished={room.status === 'finished'} />
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="mode-footnote">{modeCopy(room.mode)}</div>
  </section>
}
