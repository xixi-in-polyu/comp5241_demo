export type ActivityStatus = 'fresh' | 'stale' | 'unavailable'

export type ActivityDay = {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export type ActivitySource = {
  username: string
  profileUrl: string
  updatedAt: string
  status: ActivityStatus
  totals: Record<string, number>
  days: ActivityDay[]
}

export type ActivityCache = {
  github: ActivitySource
  leetcode: ActivitySource | null
}
