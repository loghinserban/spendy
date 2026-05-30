import Cookies from 'js-cookie'

interface ActivityCookiePayload {
  last_visited_view: string
  last_activity_timestamp: string
}

const ACTIVITY_COOKIE_KEY = 'spendy_activity'
const COOKIE_OPTIONS: Cookies.CookieAttributes = {
  expires: 7,
  sameSite: 'Lax',
  path: '/',
}

function nowIsoTimestamp(): string {
  return new Date().toISOString()
}

function readActivityCookie(): Partial<ActivityCookiePayload> {
  const raw = Cookies.get(ACTIVITY_COOKIE_KEY)

  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ActivityCookiePayload>
    return parsed
  } catch {
    return {}
  }
}

function writeActivityCookie(next: Partial<ActivityCookiePayload>): void {
  const previous = readActivityCookie()

  const payload: ActivityCookiePayload = {
    last_visited_view: next.last_visited_view ?? previous.last_visited_view ?? '/',
    last_activity_timestamp:
      next.last_activity_timestamp ?? previous.last_activity_timestamp ?? nowIsoTimestamp(),
  }

  Cookies.set(ACTIVITY_COOKIE_KEY, JSON.stringify(payload), COOKIE_OPTIONS)
}

export function trackVisitedView(viewPath: string): void {
  writeActivityCookie({
    last_visited_view: viewPath,
    last_activity_timestamp: nowIsoTimestamp(),
  })
}

export function trackActivity(viewPath?: string): void {
  writeActivityCookie({
    last_visited_view: viewPath,
    last_activity_timestamp: nowIsoTimestamp(),
  })
}

export function getActivityCookieSnapshot(): Partial<ActivityCookiePayload> {
  return readActivityCookie()
}

