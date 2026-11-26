'use client'

import { useSyncExternalStore } from 'react'

export type CardTheme = 'minimal' | 'classic'

const storageKey = 'gang-card-theme'
const listeners = new Set<() => void>()

function readTheme(): CardTheme {
  return window.localStorage.getItem(storageKey) === 'classic' ? 'classic' : 'minimal'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function setCardTheme(theme: CardTheme) {
  window.localStorage.setItem(storageKey, theme)
  listeners.forEach((listener) => listener())
}

export function useCardTheme() {
  return useSyncExternalStore(subscribe, readTheme, () => 'minimal' as CardTheme)
}

export function CardThemeToggle() {
  const theme = useCardTheme()
  return <div className="game-view-toggle" role="group" aria-label="Choisir le style des cartes">
    <span>CARTES</span>
    <button type="button" aria-pressed={theme === 'minimal'} onClick={() => setCardTheme('minimal')}>Épurées</button>
    <button type="button" aria-pressed={theme === 'classic'} onClick={() => setCardTheme('classic')}>Classiques</button>
  </div>
}
