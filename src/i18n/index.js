import common from './common'
import home from './home'
import calendar from './calendar'
import track from './track'
import onboarding from './onboarding'
import profile from './profile'

// Area files are merged on top of the legacy locale files, so new keys can
// be added per feature without everyone editing the same giant file.
const AREAS = [common, home, calendar, track, onboarding, profile]

export const mergeAreas = (lang) =>
  AREAS.reduce((acc, area) => Object.assign(acc, area?.[lang] || {}), {})
