// Shared coordination between the full-screen ad formats.
//
// Showing a full-screen ad (Interstitial or App Open) launches a separate
// native activity, which backgrounds the app and then fires an AppState
// "active" event when it closes. Without coordination the App Open manager
// mistakes that for a genuine user resume and stacks a second ad on top of
// the one the user just dismissed. This module lets the App Open manager
// tell "the app came back because an ad closed" apart from "the user
// actually returned to the app."

let openCount = 0        // how many full-screen ads are currently displayed
let lastClosedAt = 0     // timestamp of the most recent full-screen ad close

export const markFullScreenOpened = () => {
  openCount += 1
}

export const markFullScreenClosed = () => {
  openCount = Math.max(0, openCount - 1)
  lastClosedAt = Date.now()
}

// True if a full-screen ad is on screen right now, or one closed so recently
// that the incoming "active" event is almost certainly from that ad rather
// than a real user resume.
export const isResumeFromAd = (graceMs = 3000) =>
  openCount > 0 || Date.now() - lastClosedAt < graceMs
