import { fetchActionFeedSnapshot } from './actionFeed'
import type { FeedAction } from '../types/actionEngine'

/** @deprecated Today Feed는 actionFeed를 사용합니다. */
export type { FeedAction as TodayAction } from '../types/actionEngine'

export type TodayOpsSnapshot = {
  dateLabel: string
  actions: FeedAction[]
  generatedAt: string
}

export async function fetchTodayOpsSnapshot(options?: {
  includeClass?: boolean
  trainerId?: string | null
}): Promise<TodayOpsSnapshot> {
  const snapshot = await fetchActionFeedSnapshot(options)
  return {
    dateLabel: snapshot.dateLabel,
    actions: snapshot.actions,
    generatedAt: snapshot.generatedAt,
  }
}
