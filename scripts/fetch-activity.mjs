import { readFile, writeFile } from 'node:fs/promises'

const cacheUrl = new URL('../src/data/activity-cache.json', import.meta.url)
const config = JSON.parse(await readFile(new URL('../src/config/site-data.json', import.meta.url), 'utf8'))
const cache = JSON.parse(await readFile(cacheUrl, 'utf8'))
const now = new Date()
const from = new Date(now)
from.setUTCFullYear(from.getUTCFullYear() - 1)

const levelMap = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
}

async function requestJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return response.json()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchGithub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_STATS_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not available')
  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`
  const payload = await requestJson('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: config.githubUsername, from: from.toISOString(), to: now.toISOString() } }),
  })
  if (payload.errors?.length || !payload.data?.user) throw new Error(payload.errors?.[0]?.message || 'GitHub user was not found')
  const calendar = payload.data.user.contributionsCollection.contributionCalendar
  return {
    username: config.githubUsername,
    profileUrl: `https://github.com/${config.githubUsername}`,
    updatedAt: now.toISOString(),
    status: 'fresh',
    totals: { contributions: calendar.totalContributions },
    days: calendar.weeks.flatMap((week) => week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: levelMap[day.contributionLevel] ?? 0,
    }))),
  }
}

async function fetchLeetcode() {
  if (!config.leetcodeUsername) return null
  const query = `query userProfileCalendar($username:String!){matchedUser(username:$username){submitStatsGlobal{acSubmissionNum{difficulty count submissions}}submissionCalendar}}`
  const payload = await requestJson('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: `https://leetcode.com/u/${config.leetcodeUsername}/` },
    body: JSON.stringify({ query, variables: { username: config.leetcodeUsername } }),
  })
  const user = payload.data?.matchedUser
  if (!user) throw new Error('LeetCode user was not found')
  const calendar = JSON.parse(user.submissionCalendar || '{}')
  const values = Object.values(calendar).map(Number)
  const max = Math.max(1, ...values)
  const totals = Object.fromEntries(user.submitStatsGlobal.acSubmissionNum.map((item) => [item.difficulty.toLowerCase(), item.count]))
  return {
    username: config.leetcodeUsername,
    profileUrl: `https://leetcode.com/u/${config.leetcodeUsername}/`,
    updatedAt: now.toISOString(),
    status: 'fresh',
    totals,
    days: Object.entries(calendar).map(([timestamp, count]) => ({
      date: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
      count: Number(count),
      level: Number(count) === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((Number(count) / max) * 4))),
    })),
  }
}

for (const [key, fetcher] of [['github', fetchGithub], ['leetcode', fetchLeetcode]]) {
  try {
    cache[key] = await fetcher()
  } catch (error) {
    console.warn(`${key} activity refresh failed: ${error.message}`)
    if (cache[key]) cache[key].status = cache[key].days?.length ? 'stale' : 'unavailable'
  }
}

await writeFile(cacheUrl, `${JSON.stringify(cache, null, 2)}\n`)
console.log('Activity cache refreshed')
