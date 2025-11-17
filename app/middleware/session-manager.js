// Session manager middleware to support separate sessions for different journeys
// This allows running General and Admin journeys in separate tabs

function sessionManager(req, res, next) {
  // Initialize session data structure if it doesn't exist
  if (!req.session.data) {
    req.session.data = {}
  }

  // Create separate session stores for each journey
  if (!req.session.data.journeys) {
    req.session.data.journeys = {
      general: {},
      admin: {}
    }
  }

  // Determine which journey we're in based on the URL
  let currentJourney = null
  if (req.path.startsWith('/general')) {
    currentJourney = 'general'
  } else if (req.path.startsWith('/admin')) {
    currentJourney = 'admin'
  }

  // Store the current journey in the request for easy access
  req.currentJourney = currentJourney

  // If we're in a specific journey, make that journey's data available
  // as req.journeyData for easy access in routes
  if (currentJourney) {
    req.journeyData = req.session.data.journeys[currentJourney]
  }

  // Helper function to save journey-specific data
  req.saveJourneyData = function (data) {
    if (currentJourney) {
      Object.assign(req.session.data.journeys[currentJourney], data)
    }
  }

  // Helper function to clear journey-specific data
  req.clearJourneyData = function () {
    if (currentJourney) {
      req.session.data.journeys[currentJourney] = {}
    }
  }

  next()
}

module.exports = sessionManager
