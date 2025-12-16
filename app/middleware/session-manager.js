// Session manager middleware to track login sessions and form data
// This allows managing separate sessions for different user journeys

function sessionManager(req, res, next) {
  // Initialize session data structure if it doesn't exist
  if (!req.session.data) {
    req.session.data = {}
  }

  // Initialize login session tracking
  if (!req.session.data.loginSession) {
    req.session.data.loginSession = {
      isAuthenticated: false,
      user: null,
      failedAttempts: 0,
      isAccountLocked: false,
      lockedAt: null,
      sessionExpired: false
    }
  }

  // Initialize form data for current journey
  if (!req.session.data.formData) {
    req.session.data.formData = {
      email: '',
      password: '',
      errors: {}
    }
  }

  // Check for cookie preferences from browser cookies
  // If cookies_preferences_set cookie exists, don't show banner
  if (!req.session.data.cookiesAccepted) {
    const cookiePreferencesSet = req.cookies.cookies_preferences_set === 'yes'
    if (cookiePreferencesSet) {
      req.session.data.cookiesAccepted = true
      const cookiePolicy = req.cookies.cookies_policy
      req.session.data.analyticsConsent = cookiePolicy === 'accepted'
    }
  }

  // Helper function to record failed login attempt
  req.recordFailedAttempt = function () {
    req.session.data.loginSession.failedAttempts =
      (req.session.data.loginSession.failedAttempts || 0) + 1

    // Lock account after 5 failed attempts
    if (req.session.data.loginSession.failedAttempts >= 5) {
      req.session.data.loginSession.isAccountLocked = true
      req.session.data.loginSession.lockedAt = new Date().toISOString()
    }
  }

  // Helper function to reset failed attempts
  req.resetFailedAttempts = function () {
    req.session.data.loginSession.failedAttempts = 0
  }

  // Helper function to unlock account
  req.unlockAccount = function () {
    req.session.data.loginSession.isAccountLocked = false
    req.session.data.loginSession.failedAttempts = 0
    req.session.data.loginSession.lockedAt = null
  }

  // Helper function to set user as authenticated
  req.setAuthenticated = function (user) {
    req.session.data.loginSession.isAuthenticated = true
    req.session.data.loginSession.user = user
    req.session.data.loginSession.failedAttempts = 0
  }

  // Helper function to clear all session data
  req.clearSession = function () {
    req.session.data.loginSession = {
      isAuthenticated: false,
      user: null,
      failedAttempts: 0,
      isAccountLocked: false,
      lockedAt: null,
      sessionExpired: false
    }
    req.session.data.formData = {
      email: '',
      password: '',
      errors: {}
    }
  }

  next()
}

module.exports = sessionManager
