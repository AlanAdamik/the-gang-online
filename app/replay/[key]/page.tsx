import type { Metadata } from 'next'
import { ReplayPage } from '../../../components/replay-page'

export const metadata: Metadata = {
  title: 'Saved Game Replay | The Gang',
  description: 'Replay every move from a saved game of The Gang.',
}

export default async function SavedReplayRoute({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  return <ReplayPage shareKey={key} />
}
