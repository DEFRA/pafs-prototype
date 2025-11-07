//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const sessionManager = require('./middleware/session-manager')

// Apply session manager to all routes
router.use(sessionManager)

// Homepage - redirect to unified login
router.get('/', function (req, res) {
  res.redirect('/general/login')
})

// Unified catalogue with tabs
router.get('/catalogue', function (req, res) {
  res.render('catalogue')
})

// General user journey routes
router.get('/general/start', function (req, res) {
  // Redirect to login page
  res.redirect('/general/login')
})

// General user login
router.get('/general/login', function (req, res) {
  const error = req.query.error
  res.render('general/login/index', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/login', function (req, res) {
  const email = req.body.email
  
  // Check if admin user
  if (email === 'admin@environment-agency.gov.uk') {
    req.saveJourneyData({
      journeyType: 'admin',
      userName: 'Admin User',
      userEmail: email,
      isLoggedIn: true,
      isAdmin: true
    })
    // Also set in session data for template access
    req.session.data.isAdmin = true
    req.session.data.userName = 'Admin User'
    // Redirect to journey selection for admin
    res.redirect('/admin/journey-selection')
  } else {
    // Regular user login
    req.saveJourneyData({
      journeyType: 'general',
      userName: 'John Smith',
      userEmail: email || 'user@example.com',
      isLoggedIn: true,
      isAdmin: false
    })
    // Set in session data
    req.session.data.isAdmin = false
    req.session.data.userName = 'John Smith'
    res.redirect('/general/proposals?variant=1')
  }
})

// Forgot password
router.get('/general/forgot-password', function (req, res) {
  const error = req.query.error
  res.render('general/forgot-password', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/forgot-password', function (req, res) {
  // Save email for confirmation page
  req.session.data.resetEmail = req.body.email
  res.redirect('/general/forgot-password/confirmation')
})

router.get('/general/forgot-password/confirmation', function (req, res) {
  res.render('general/forgot-password/confirmation', {
    journeyData: req.journeyData
  })
})

// Reset password
router.get('/general/reset-password', function (req, res) {
  const error = req.query.error
  res.render('general/reset-password/index', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/reset-password', function (req, res) {
  res.redirect('/general/reset-password/success')
})

router.get('/general/reset-password/token-expired', function (req, res) {
  res.render('general/reset-password/token-expired', {
    journeyData: req.journeyData
  })
})

// Set password link expired
router.get('/general/set-password/link-expired', function (req, res) {
  res.render('general/set-password/link-expired', {
    journeyData: req.journeyData
  })
})

// Unlock account link expired
router.get('/general/unlock-account/link-expired', function (req, res) {
  res.render('general/unlock-account/link-expired', {
    journeyData: req.journeyData
  })
})

// Email template routes
router.get('/email-templates/account-approved-set-password', function (req, res) {
  res.render('email-templates/account-approved-set-password', {
    journeyData: req.journeyData
  })
})

router.get('/email-templates/account-unlock', function (req, res) {
  res.render('email-templates/account-unlock', {
    journeyData: req.journeyData
  })
})

// Request account - start page
router.get('/general/request-account', function (req, res) {
  // Clear all previous form data when starting a new request
  const authenticated = req.session.data.authenticated
  req.session.data = {
    authenticated: authenticated
  }
  
  res.render('general/request-account/index', {
    journeyData: req.journeyData
  })
})

// Request account - details form
router.get('/general/request-account/details', function (req, res) {
  const error = req.query.error
  res.render('general/request-account/details', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/details', function (req, res) {
  const responsibility = req.body.responsibility
  
  // Redirect based on responsibility type
  if (responsibility === 'ea') {
    res.redirect('/general/request-account/ea-main-area')
  } else if (responsibility === 'pso') {
    res.redirect('/general/request-account/pso-ea-areas')
  } else if (responsibility === 'rma') {
    res.redirect('/general/request-account/rma-ea-areas')
  } else {
    // If no responsibility selected, stay on details page
    res.redirect('/general/request-account/details')
  }
})

// Load areas data for all area selection routes
const fs = require('fs')
const path = require('path')
const areasDataPath = path.join(__dirname, 'data', 'areas.json')

// Function to load areas data
function loadAreasData() {
  try {
    const rawData = fs.readFileSync(areasDataPath, 'utf8')
    return JSON.parse(rawData)
  } catch (error) {
    console.error('Error loading areas data:', error)
    return { ea_areas: [] }
  }
}

// EA user area selection routes
router.get('/general/request-account/ea-main-area', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  const error = req.query.error
  res.render('general/request-account/ea-main-area', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/ea-main-area', function (req, res) {
  res.redirect('/general/request-account/ea-additional-areas')
})

router.get('/general/request-account/ea-additional-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/ea-additional-areas', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/ea-additional-areas', function (req, res) {
  res.redirect('/general/request-account/check-answers')
})

// PSO user area selection routes
router.get('/general/request-account/pso-ea-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  const error = req.query.error
  res.render('general/request-account/pso-ea-areas', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/pso-ea-areas', function (req, res) {
  res.redirect('/general/request-account/pso-main-area')
})

router.get('/general/request-account/pso-main-area', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  const error = req.query.error
  res.render('general/request-account/pso-main-area', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/pso-main-area', function (req, res) {
  res.redirect('/general/request-account/pso-additional-areas')
})

router.get('/general/request-account/pso-additional-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/pso-additional-areas', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/pso-additional-areas', function (req, res) {
  res.redirect('/general/request-account/check-answers')
})

// RMA user area selection routes
router.get('/general/request-account/rma-ea-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  const error = req.query.error
  res.render('general/request-account/rma-ea-areas', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/rma-ea-areas', function (req, res) {
  res.redirect('/general/request-account/rma-pso-areas')
})

router.get('/general/request-account/rma-pso-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  const error = req.query.error
  res.render('general/request-account/rma-pso-areas', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/rma-pso-areas', function (req, res) {
  res.redirect('/general/request-account/rma-main-area')
})

router.get('/general/request-account/rma-main-area', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  const error = req.query.error
  res.render('general/request-account/rma-main-area', {
    journeyData: req.journeyData,
    error: error
  })
})

router.post('/general/request-account/rma-main-area', function (req, res) {
  res.redirect('/general/request-account/rma-additional-areas')
})

router.get('/general/request-account/rma-additional-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/rma-additional-areas', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/rma-additional-areas', function (req, res) {
  res.redirect('/general/request-account/check-answers')
})

// Check answers page
router.get('/general/request-account/check-answers', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/check-answers', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/check-answers', function (req, res) {
  // Store email temporarily for confirmation page
  req.session.data.submittedEmail = req.session.data.email
  
  // Clear all form data except the submitted email
  const submittedEmail = req.session.data.submittedEmail
  req.session.data = {
    submittedEmail: submittedEmail,
    authenticated: req.session.data.authenticated
  }
  
  // Account request submitted - redirect to confirmation
  res.redirect('/general/request-account/confirmation')
})

// Confirmation page
router.get('/general/request-account/confirmation', function (req, res) {
  // Use submittedEmail for display, then clear it
  const email = req.session.data.submittedEmail
  
  res.render('general/request-account/confirmation', {
    journeyData: req.journeyData,
    data: { email: email }
  })
  
  // Clear the submitted email after rendering
  delete req.session.data.submittedEmail
})

// Layout catalogue page
router.get('/general/catalogue', function (req, res) {
  req.saveJourneyData({
    journeyType: 'general',
    startedAt: new Date().toISOString(),
    userName: 'John Smith'
  })
  res.render('general/catalogue', {
    journeyData: req.journeyData
  })
})

// Proposals page with variant support
router.get('/general/proposals', function (req, res) {
  const variant = req.query.variant || '1'
  
  // Preserve isAdmin flag if it exists, otherwise set to false
  const isAdmin = req.journeyData.isAdmin || false
  const userName = isAdmin ? 'Admin User' : 'John Smith'
  
  req.saveJourneyData({
    journeyType: 'general',
    userName: userName,
    isAdmin: isAdmin,
    isLoggedIn: true
  })
  
  // Render different templates based on variant
  if (variant === '2') {
    res.render('general/proposals-variant2', {
      journeyData: req.journeyData
    })
  } else if (variant === '3') {
    res.render('general/proposals-variant3', {
      journeyData: req.journeyData
    })
  } else {
    res.render('general/proposals', {
      journeyData: req.journeyData
    })
  }
})

// Placeholder routes for navigation links
router.get('/general/download-all', function (req, res) {
  res.redirect('/general/proposals')
})

router.get('/general/archive', function (req, res) {
  res.redirect('/general/proposals')
})

router.get('/general/signout', function (req, res) {
  req.clearJourneyData()
  res.redirect('/general/login')
})

router.get('/admin/signout', function (req, res) {
  req.clearJourneyData()
  res.redirect('/general/login')
})

router.get('/general/create-proposal', function (req, res) {
  res.redirect('/general/proposals')
})

// Admin journey routes
router.get('/admin/start', function (req, res) {
  res.redirect('/general/login')
})

// Admin journey selection (after admin login)
router.get('/admin/journey-selection', function (req, res) {
  res.render('admin/journey-selection', {
    journeyData: req.journeyData
  })
})

router.post('/admin/journey-selection', function (req, res) {
  const journey = req.body.journey
  
  if (journey === 'user') {
    // Admin exploring user journey - ensure isAdmin flag is set
    req.saveJourneyData({
      journeyType: 'general',
      userName: 'Admin User',
      userEmail: req.journeyData.userEmail || 'admin@environment-agency.gov.uk',
      isLoggedIn: true,
      isAdmin: true
    })
    // Also set in session data for template access
    req.session.data.isAdmin = true
    req.session.data.userName = 'Admin User'
    res.redirect('/general/proposals?variant=1')
  } else if (journey === 'admin') {
    // Admin exploring admin portal
    req.saveJourneyData({
      journeyType: 'admin',
      userName: 'Admin User',
      userEmail: req.journeyData.userEmail || 'admin@environment-agency.gov.uk',
      isLoggedIn: true,
      isAdmin: true
    })
    // Also set in session data for template access
    req.session.data.isAdmin = true
    req.session.data.userName = 'Admin User'
    res.redirect('/admin/user-management-pending')
  } else {
    res.redirect('/admin/journey-selection')
  }
})

// Admin catalogue page
router.get('/admin/catalogue', function (req, res) {
  req.saveJourneyData({
    journeyType: 'admin',
    userName: 'Admin User'
  })
  res.render('admin/catalogue', {
    journeyData: req.journeyData
  })
})

// Admin user management pages
router.get('/admin/user-management-pending', function (req, res) {
  req.saveJourneyData({
    journeyType: 'admin',
    userName: 'Admin User',
    isAdmin: true,
    isLoggedIn: true
  })
  res.render('admin/user-management-pending', {
    journeyData: req.journeyData
  })
})

router.get('/admin/user-management-active', function (req, res) {
  req.saveJourneyData({
    journeyType: 'admin',
    userName: 'Admin User',
    isAdmin: true,
    isLoggedIn: true
  })
  res.render('admin/user-management-active', {
    journeyData: req.journeyData
  })
})

// Admin users page with variant support
router.get('/admin/users', function (req, res) {
  const variant = req.query.variant || '1'
  
  req.saveJourneyData({
    journeyType: 'admin',
    userName: 'Admin User',
    isAdmin: true,
    isLoggedIn: true
  })
  
  // Render different templates based on variant
  if (variant === '2') {
    res.render('admin/users-variant2', {
      journeyData: req.journeyData
    })
  } else if (variant === '3') {
    res.render('admin/users-variant3', {
      journeyData: req.journeyData
    })
  } else {
    res.render('admin/users', {
      journeyData: req.journeyData
    })
  }
})

// Admin navigation pages (all use Variant 1)
router.get('/admin/projects', function (req, res) {
  res.render('admin/projects', {
    journeyData: req.journeyData
  })
})

router.get('/admin/submissions', function (req, res) {
  res.render('admin/submissions', {
    journeyData: req.journeyData
  })
})

router.get('/admin/organisations', function (req, res) {
  res.render('admin/organisations', {
    journeyData: req.journeyData
  })
})

router.get('/admin/download-projects', function (req, res) {
  res.render('admin/download-projects', {
    journeyData: req.journeyData
  })
})

router.get('/admin/download-rma', function (req, res) {
  res.render('admin/download-rma', {
    journeyData: req.journeyData
  })
})

router.get('/admin/signout', function (req, res) {
  req.clearJourneyData()
  res.redirect('/journey-selection')
})

// Add your routes here
