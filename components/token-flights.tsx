'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

type AnchorRect = { x: number; y: number; size: number }

export type TokenFlight = {
  id: string
  value: number
  color: string
  from: AnchorRect
  to: AnchorRect
  targetKey: string
  receiverId?: string
}

type FlightPlayer = { id: string; tokenPicks?: { round: number; value: number }[] }

const RECEIVER_HIGHLIGHT_MS = 2400
const FLIGHT_DURATION_MS = 860

export const seatAnchor = (playerId: string, round?: number) => round ? `seat:${playerId}:${round}` : `seat:${playerId}`
export const centerAnchor = (value: number) => `center:${value}`

function findAnchor(surface: HTMLElement, key: string) {
  return surface.querySelector<HTMLElement>(`[data-token-anchor="${CSS.escape(key)}"]`)
}

function measureAnchors(surface: HTMLElement) {
  const origin = surface.getBoundingClientRect()
  const rects = new Map<string, AnchorRect>()
  surface.querySelectorAll<HTMLElement>('[data-token-anchor]').forEach((element) => {
    const rect = element.getBoundingClientRect()
    if (!rect.width && !rect.height) return
    rects.set(element.dataset.tokenAnchor!, {
      x: rect.left - origin.left + rect.width / 2,
      y: rect.top - origin.top + rect.height / 2,
      size: Math.min(rect.width, rect.height),
    })
  })
  return rects
}

function ownersForRound(players: FlightPlayer[], round: number) {
  const owners = new Map<number, string>()
  for (const player of players) {
    const pick = player.tokenPicks?.find((token) => token.round === round)
    if (pick) owners.set(pick.value, player.id)
  }
  return owners
}

export function useTokenFlights({ surfaceRef, players, round, active, color }: {
  surfaceRef: RefObject<HTMLElement | null>
  players: FlightPlayer[]
  round?: number
  active: boolean
  color: string
}) {
  const [flights, setFlights] = useState<TokenFlight[]>([])
  const [receivingSeats, setReceivingSeats] = useState<Record<string, number>>({})
  const previous = useRef<{ round: number; owners: Map<number, string> } | null>(null)
  const lastRects = useRef(new Map<string, AnchorRect>())
  const timers = useRef<number[]>([])

  const ownershipKey = active && round
    ? players.map((player) => `${player.id}:${player.tokenPicks?.find((token) => token.round === round)?.value ?? ''}`).join('|')
    : ''

  const highlightReceiver = useCallback((playerId: string) => {
    const stamp = Date.now() + Math.random()
    setReceivingSeats((seats) => ({ ...seats, [playerId]: stamp }))
    timers.current.push(window.setTimeout(() => {
      setReceivingSeats((seats) => {
        if (seats[playerId] !== stamp) return seats
        const next = { ...seats }
        delete next[playerId]
        return next
      })
    }, RECEIVER_HIGHLIGHT_MS))
  }, [])

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    const before = previous.current
    previous.current = active && round ? { round, owners: ownersForRound(players, round) } : null
    if (!surface || !before || !previous.current || before.round !== round) return

    const now = measureAnchors(surface)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const launched: TokenFlight[] = []

    for (let value = 1; value <= players.length; value += 1) {
      const fromOwner = before.owners.get(value)
      const toOwner = previous.current.owners.get(value)
      if (fromOwner === toOwner) continue

      const targetKey = toOwner ? seatAnchor(toOwner, round) : centerAnchor(value)
      const from = fromOwner
        ? lastRects.current.get(seatAnchor(fromOwner, round)) ?? now.get(seatAnchor(fromOwner))
        : now.get(centerAnchor(value)) ?? lastRects.current.get(centerAnchor(value))
      const to = now.get(targetKey)

      if (reduceMotion || !from || !to) {
        if (toOwner) highlightReceiver(toOwner)
        continue
      }
      launched.push({ id: `${round}-${value}-${Date.now()}-${launched.length}`, value, color, from, to, targetKey, receiverId: toOwner })
    }

    if (!launched.length) return
    for (const flight of launched) {
      const target = findAnchor(surface, flight.targetKey)
      if (target) target.style.visibility = 'hidden'
    }
    setFlights((current) => [...current, ...launched])
  }, [ownershipKey, active, round])

  useLayoutEffect(() => {
    const surface = surfaceRef.current
    if (surface) lastRects.current = measureAnchors(surface)
  })

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    const refresh = () => { lastRects.current = measureAnchors(surface) }
    window.addEventListener('resize', refresh)
    document.addEventListener('fullscreenchange', refresh)
    return () => {
      window.removeEventListener('resize', refresh)
      document.removeEventListener('fullscreenchange', refresh)
    }
  }, [surfaceRef])

  useEffect(() => () => { timers.current.forEach((timer) => window.clearTimeout(timer)) }, [])

  const completeFlight = useCallback((flight: TokenFlight) => {
    setFlights((current) => current.filter((item) => item.id !== flight.id))
    const surface = surfaceRef.current
    const target = surface ? findAnchor(surface, flight.targetKey) : null
    if (target) {
      target.style.visibility = ''
      target.classList.remove('token-landed')
      void target.offsetWidth
      target.classList.add('token-landed')
      timers.current.push(window.setTimeout(() => target.classList.remove('token-landed'), 700))
    }
    if (flight.receiverId) highlightReceiver(flight.receiverId)
  }, [surfaceRef, highlightReceiver])

  return { flights, receivingSeats, completeFlight }
}

function FlyingChip({ flight, onDone }: { flight: TokenFlight; onDone: (flight: TokenFlight) => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(onDone)
  done.current = onDone

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const dx = flight.from.x - flight.to.x
    const dy = flight.from.y - flight.to.y
    const startScale = flight.from.size / flight.to.size
    const lift = Math.min(80, Math.hypot(dx, dy) * 0.28)
    const animation = element.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${startScale}) rotate(0deg)`, opacity: 0.9 },
      { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(${((startScale + 1) / 2) * 1.18}) rotate(200deg)`, opacity: 1, offset: 0.5 },
      { transform: 'translate(0px, 0px) scale(1) rotate(360deg)', opacity: 1 },
    ], { duration: FLIGHT_DURATION_MS, easing: 'cubic-bezier(.5,.05,.25,1)', fill: 'forwards' })
    animation.onfinish = () => done.current(flight)
    return () => animation.cancel()
  }, [flight])

  return <span
    ref={ref}
    className={`casino-seat-history-chip chip-${flight.color} token-flight-chip`}
    style={{
      left: flight.to.x - flight.to.size / 2,
      top: flight.to.y - flight.to.size / 2,
      width: flight.to.size,
      height: flight.to.size,
      fontSize: Math.max(9, flight.to.size * 0.4),
    }}
  >
    {flight.value}
  </span>
}

export function TokenFlightLayer({ flights, onDone }: { flights: TokenFlight[]; onDone: (flight: TokenFlight) => void }) {
  if (!flights.length) return null
  return <div className="token-flight-layer" aria-hidden="true">
    {flights.map((flight) => <FlyingChip key={flight.id} flight={flight} onDone={onDone}/>)}
  </div>
}
