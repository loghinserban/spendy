import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { trackVisitedView } from '../tracker'

export function RouteActivityTracker() {
  const location = useLocation()

  useEffect(() => {
    const viewPath = `${location.pathname}${location.search}`
    trackVisitedView(viewPath)
  }, [location.pathname, location.search])

  return null
}

