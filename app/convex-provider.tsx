'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ReactNode, useState } from 'react'

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) return null

    try {
      if (new URL(url).protocol !== 'https:') return null
      return new ConvexReactClient(url)
    } catch {
      return null
    }
  })

  if (!client) return <>{children}</>
  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
