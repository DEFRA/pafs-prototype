//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const sessionManager = require('./middleware/session-manager')

// Apply session manager to all routes
router.use(sessionManager)

// Journey selection - set as homepage
router.get('/', function (req, res) {
  res.redirect('/journey-selection')
})

router.get('/journey-selection', function (req, res) {
  res.render('journey-selection')
})

router.post('/journey-selection', function (req, res) {
  const journey = req.body.journey
  
  if (journey === 'general') {
    res.redirect('/general/login')
  } else if (journey === 'admin') {
    res.redirect('/admin/login')
  } else {
    res.redirect('/journey-selection')
  }
})

// General user journey routes
router.get('/general/start', function (req, res) {
  // Redirect to login page
  res.redirect('/general/login')
})

// General user login
router.get('/general/login', function (req, res) {
  res.render('general/login/index', {
    journeyData: req.journeyData
  })
})

router.post('/general/login', function (req, res) {
  req.saveJourneyData({
    journeyType: 'general',
    userName: 'John Smith',
    userEmail: req.body.email || 'john.smith@example.gov.uk',
    isLoggedIn: true
  })
  res.redirect('/general/proposals?variant=1')
})

// Forgot password
router.get('/general/forgot-password', function (req, res) {
  res.render('general/forgot-password', {
    journeyData: req.journeyData
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
  res.render('general/request-account/details', {
    journeyData: req.journeyData
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
  res.render('general/request-account/ea-main-area', {
    journeyData: req.journeyData
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
  res.render('general/request-account/pso-ea-areas', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/pso-ea-areas', function (req, res) {
  res.redirect('/general/request-account/pso-main-area')
})

router.get('/general/request-account/pso-main-area', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/pso-main-area', {
    journeyData: req.journeyData
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
  res.render('general/request-account/rma-ea-areas', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/rma-ea-areas', function (req, res) {
  res.redirect('/general/request-account/rma-pso-areas')
})

router.get('/general/request-account/rma-pso-areas', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/rma-pso-areas', {
    journeyData: req.journeyData
  })
})

router.post('/general/request-account/rma-pso-areas', function (req, res) {
  res.redirect('/general/request-account/rma-main-area')
})

router.get('/general/request-account/rma-main-area', function (req, res) {
  req.session.data = req.session.data || {}
  req.session.data.areasData = loadAreasData()
  res.render('general/request-account/rma-main-area', {
    journeyData: req.journeyData
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
  
  req.saveJourneyData({
    journeyType: 'general',
    userName: 'John Smith'
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
  res.redirect('/journey-selection')
})

router.get('/general/create-proposal', function (req, res) {
  res.redirect('/general/proposals')
})

// Admin journey routes
router.get('/admin/start', function (req, res) {
  res.redirect('/admin/login')
})

// Admin login page
router.get('/admin/login', function (req, res) {
  res.render('admin/login', {
    journeyData: req.journeyData
  })
})

router.post('/admin/login', function (req, res) {
  req.saveJourneyData({
    journeyType: 'admin',
    userName: 'Admin User',
    isLoggedIn: true
  })
  res.redirect('/admin/user-management-pending')
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
    userName: 'Admin User'
  })
  res.render('admin/user-management-pending', {
    journeyData: req.journeyData
  })
})

router.get('/admin/user-management-active', function (req, res) {
  req.saveJourneyData({
    journeyType: 'admin',
    userName: 'Admin User'
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
    userName: 'Admin User'
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
