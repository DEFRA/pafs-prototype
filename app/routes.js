//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const sessionManager = require('./middleware/session-manager')
const config = require('./config.json')
const fs = require('fs')
const path = require('path')

// Data helpers (request-account journey and user management)
const areasDataPath = path.join(__dirname, 'data', 'areas.json')
const usersDataPath = path.join(__dirname, 'data', 'users.json')
const organisationsDataPath = path.join(__dirname, 'data', 'organisations.json')
const projectsDataPath = path.join(__dirname, 'data', 'projects.json')

function loadAreasData() {
  try {
    const raw = fs.readFileSync(areasDataPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Unable to load areas.json', error)
    return { ea_areas: [] }
  }
}

function loadUsersData() {
  try {
    const raw = fs.readFileSync(usersDataPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Unable to load users.json', error)
    return { pendingUsers: [], activeUsers: [] }
  }
}

function loadOrganisationsData() {
  try {
    const raw = fs.readFileSync(organisationsDataPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Unable to load organisations.json', error)
    return []
  }
}

function loadProjectsData() {
  try {
    const raw = fs.readFileSync(projectsDataPath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    console.error('Unable to load projects.json', error)
    return []
  }
}

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

// Funding helpers
function normaliseArray(value) {
  const arr = toArray(value)
  return arr.filter((item) => item && item !== '_unchecked')
}

function getFundingSourceLabel(key) {
  switch (key) {
    case 'grant-in-aid':
      return 'Grant in aid'
    case 'local-levy':
      return 'Local levy'
    case 'fcrm-grant':
      return 'Additional FCRM Grant-in-Aid'
    case 'public-sector':
      return 'Public sector contributions'
    case 'private-sector':
      return 'Private sector contributions'
    case 'ea-contributions':
      return 'Contributions from other Environment Agency functions or sources'
    case 'precept':
      return 'Funds recovered from an internal drainage board by the Environment Agency, known as a precept'
    case 'other':
      return 'Other funding sources not yet identified'

    // Additional FCRM GiA funding sources
    case 'asset-replacement-allowance':
      return 'Asset replacement allowance'
    case 'environment-statutory-funding':
      return 'Environment statutory funding'
    case 'frequently-flooded-communities':
      return 'Frequently flooded communities'
    case 'other-additional-grant-in-aid':
      return 'Other additional grant in aid'
    case 'other-government-department':
      return 'Other Government department'
    case 'recovery':
      return 'Recovery'
    case 'summer-economic-fund':
      return 'Summer economic fund'
    default:
      return key
  }
}

// Funding journey helpers
function hasBaseFundingSource(data, key) {
  const sources =
    data && Array.isArray(data['funding-sources'])
      ? data['funding-sources']
      : []
  return sources.includes(key)
}

function nextFundingStepAfterSources(data) {
  if (hasBaseFundingSource(data, 'fcrm-grant')) {
    return '/proposal/create-proposal/funding-fcrm-gia'
  }
  if (hasBaseFundingSource(data, 'public-sector')) {
    return '/proposal/create-proposal/funding/public-contributors'
  }
  if (hasBaseFundingSource(data, 'private-sector')) {
    return '/proposal/create-proposal/funding/private-contributors'
  }
  if (hasBaseFundingSource(data, 'ea-contributions')) {
    return '/proposal/create-proposal/funding/other-ea-contributors'
  }
  return '/proposal/create-proposal/funding-values'
}

function nextFundingStepAfterGia(data) {
  if (hasBaseFundingSource(data, 'public-sector')) {
    return '/proposal/create-proposal/funding/public-contributors'
  }
  if (hasBaseFundingSource(data, 'private-sector')) {
    return '/proposal/create-proposal/funding/private-contributors'
  }
  if (hasBaseFundingSource(data, 'ea-contributions')) {
    return '/proposal/create-proposal/funding/other-ea-contributors'
  }
  return '/proposal/create-proposal/funding-values'
}

function nextFundingStepAfterPublicValues(data) {
  if (hasBaseFundingSource(data, 'private-sector')) {
    return '/proposal/create-proposal/funding/private-contributors'
  }
  if (hasBaseFundingSource(data, 'ea-contributions')) {
    return '/proposal/create-proposal/funding/other-ea-contributors'
  }
  return '/proposal/create-proposal/funding-values'
}

function nextFundingStepAfterPrivateValues(data) {
  if (hasBaseFundingSource(data, 'ea-contributions')) {
    return '/proposal/create-proposal/funding/other-ea-contributors'
  }
  return '/proposal/create-proposal/funding-values'
}

function getFundingValueSources(data) {
  const base =
    data && Array.isArray(data['funding-sources'])
      ? data['funding-sources']
      : []
  const gia =
    data && Array.isArray(data['gia-funding-sources'])
      ? data['gia-funding-sources']
      : []

  const sources = []

  if (base.includes('grant-in-aid')) sources.push('grant-in-aid')
  if (base.includes('local-levy')) sources.push('local-levy')
  if (base.includes('precept')) sources.push('precept')
  if (base.includes('other')) sources.push('other')

  // Only include FCRM GIA sources if 'fcrm-grant' was selected
  if (base.includes('fcrm-grant')) {
    gia.forEach((g) => {
      if (!sources.includes(g)) {
        sources.push(g)
      }
    })
  }

  return sources
}

function getFundingYears(data) {
  const startYearRaw = data.financialYear || data.financialYearAfter
  const endYearRaw =
    data.financialYearSpending || data.financialYearSpendingAfter
  const startYear = Number(startYearRaw)
  const endYear = Number(endYearRaw)
  const years = []

  if (
    !Number.isNaN(startYear) &&
    !Number.isNaN(endYear) &&
    endYear >= startYear
  ) {
    for (let y = startYear; y <= endYear; y++) {
      years.push(y)
    }
  }

  return years
}

function findEaArea(areasData, id) {
  return (areasData.ea_areas || []).find((ea) => ea.id === id)
}

function findPsoArea(areasData, id) {
  for (const ea of areasData.ea_areas || []) {
    const match = (ea.pso_areas || []).find((pso) => pso.id === id)
    if (match) return match
  }
  return undefined
}

function findRmaArea(areasData, id) {
  for (const ea of areasData.ea_areas || []) {
    for (const pso of ea.pso_areas || []) {
      const match = (pso.rma_areas || []).find((rma) => rma.id === id)
      if (match) return match
    }
  }
  return undefined
}

function mapIdsToNames(ids, areasData, type) {
  const finder =
    type === 'ea'
      ? (id) => findEaArea(areasData, id)
      : type === 'pso'
        ? (id) => findPsoArea(areasData, id)
        : (id) => findRmaArea(areasData, id)
  return ids
    .map((id) => {
      const found = finder(id)
      return found ? found.name : undefined
    })
    .filter(Boolean)
}

// Make config available to views
router.use((req, res, next) => {
  res.locals.config = config
  next()
})

// Apply session manager to all routes
router.use(sessionManager)

// Home page - redirect to login
router.get('/', function (req, res) {
  res.redirect('/login')
})

// Catalogue page with tabs
router.get('/catalogue', function (req, res) {
  res.render('catalogue')
})

// Admin catalogue alias
router.get('/admin/catalogue', function (req, res) {
  res.render('catalogue')
})

// GET Login page - displays login form and error states via query string
router.get('/login', function (req, res) {
  const error = req.query.error

  res.render('login/index', {
    error: error
  })
})

// POST Login form submission - redirects to role selection
router.post('/login', function (req, res) {
  // No validation logic - prototype only
  // Just redirect to role selection page
  res.redirect('/role-selection')
})

// Validation demo route - displays different validation scenarios
router.get('/login/validate', function (req, res) {
  const error = req.query.error
  const variant = req.query.variant

  res.render('login/validate', {
    error: error,
    variant: variant
  })
})

// Role selection page
router.get('/role-selection', function (req, res) {
  res.render('role-selection')
})

// POST Role selection - set session and redirect based on role
router.post('/role-selection', function (req, res) {
  const role = req.body.role

  // Define profile names for each role
  const roleProfiles = {
    ea: { name: 'John Smith', label: 'EA Area Team' },
    pso: { name: 'Jane Cooper', label: 'EA Partnership Team' },
    rma: { name: 'David Jones', label: 'RMA User' },
    nfm: { name: 'Sarah Williams', label: 'NFM Team' },
    admin: { name: 'PAF Admin', label: 'Administrator' }
  }

  if (role === 'admin') {
    // Admin goes to journey selection with admin journey type set
    req.session.data.userType = 'admin'
    req.session.data.journeyType = 'admin'
    req.session.data.profile = roleProfiles['admin']
    res.redirect('/journey-selection')
  } else {
    // General user roles go straight to dashboard
    req.session.data.userType = role
    req.session.data.journeyType = 'general'
    req.session.data.profile = roleProfiles[role] || {
      name: 'User',
      label: 'General User'
    }
    res.redirect('/proposal/proposals')
  }
})

// Journey selection page (for admin)
router.get('/journey-selection', function (req, res) {
  res.render('journey-selection')
})

// POST Journey selection - set journey type in session
router.post('/journey-selection', function (req, res) {
  const journey = req.body.journey
  req.session.data.journeyType = journey
  res.redirect('/admin/user-management-active')
})

// Dashboard page
router.get('/dashboard', function (req, res) {
  res.render('dashboard')
})

// Sign out
router.get('/sign-out', function (req, res) {
  req.session.data = {}
  res.redirect('/login')
})

// Password recovery routes

// GET Forgot password page - displays email request form and error states via query string
router.get('/forgot-password', function (req, res) {
  const error = req.query.error

  res.render('password-recovery/forgot-password', {
    error: error
  })
})

// POST Forgot password form submission - redirects to confirmation
router.post('/forgot-password', function (req, res) {
  // No validation logic - prototype only
  // Just set session flag and redirect to confirmation page
  req.session.data.passwordResetRequested = true
  res.redirect('/password-recovery/confirmation')
})

// GET Reset password page - displays password form and error states via query string
router.get('/reset-password', function (req, res) {
  const error = req.query.error
  const variant = req.query.variant

  res.render('password-recovery/reset-password', {
    error: error,
    variant: variant,
    token: 'abc123def456' // Demo token
  })
})

// POST Reset password form submission - clears token and redirects to confirmation
router.post('/reset-password', function (req, res) {
  // No validation logic - prototype only
  // Just clear the reset token flag and redirect to confirmation
  req.session.data.passwordResetRequested = false
  res.redirect('/password-recovery/confirmation')
})

// Password recovery confirmation/success page
router.get('/password-recovery/confirmation', function (req, res) {
  res.render('password-recovery/confirmation')
})

// Password recovery validation demo route - displays different validation scenarios
router.get('/password-recovery/validate', function (req, res) {
  const error = req.query.error
  const variant = req.query.variant

  res.render('password-recovery/validate', {
    error: error,
    variant: variant
  })
})

// Account request journey (mirrors prototype-copy)

function getAccountRequest(req) {
  if (!req.session.data) req.session.data = {}
  if (!req.session.data.accountRequest) req.session.data.accountRequest = {}
  return req.session.data.accountRequest
}

function resetAccountRequest(req) {
  if (!req.session.data) req.session.data = {}
  req.session.data.accountRequest = {}
}

router.get('/request-account', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  req.session.data.accountRequestResult = undefined
  res.render('request-account/index', { data: accountRequest, isAdmin: false })
})

router.get('/admin/add-user', function (req, res) {
  // Clear any previous user creation data
  req.session.data.willBeAdmin = undefined
  req.session.data.firstName = undefined
  req.session.data.lastName = undefined
  req.session.data.email = undefined
  req.session.data.telephone = undefined
  req.session.data.organisation = undefined
  req.session.data.jobTitle = undefined
  req.session.data.responsibility = undefined
  req.session.data.nfmScreeningTeam = undefined
  req.session.data.mainArea = undefined
  req.session.data.mainAreaName = undefined
  req.session.data.additionalAreas = undefined
  req.session.data.additionalAreasNames = undefined
  req.session.data.psoEaAreas = undefined
  req.session.data.psoEaAreasNames = undefined
  req.session.data.rmaPsoAreas = undefined
  req.session.data.rmaPsoAreasNames = undefined
  req.session.data.rmaEaAreas = undefined
  req.session.data.rmaEaAreasNames = undefined
  req.session.data.userAddedNotification = undefined
  req.session.data.areasData = loadAreasData()

  res.render('request-account/index', { isAdmin: true })
})

router.get('/request-account/details', function (req, res) {
  const error = req.query.error
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  res.render('request-account/details', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/details', function (req, res) {
  const errors = []
  const accountRequest = getAccountRequest(req)
  const email = (req.body.email || '').trim()
  const firstName = (req.body.firstName || '').trim()
  const lastName = (req.body.lastName || '').trim()
  const telephone = (req.body.telephone || '').trim()
  const organisation = (req.body.organisation || '').trim()
  const jobTitle = (req.body.jobTitle || '').trim()
  const responsibility = req.body.responsibility

  accountRequest.firstName = firstName
  accountRequest.lastName = lastName
  accountRequest.email = email
  accountRequest.telephone = telephone
  accountRequest.organisation = organisation
  accountRequest.jobTitle = jobTitle
  accountRequest.responsibility = responsibility
  accountRequest.areasData = loadAreasData()

  if (errors.length > 0) {
    return res.redirect(
      `/request-account/details?error=${encodeURIComponent(errors.join(','))}`
    )
  }

  if (responsibility === 'ea') {
    return res.redirect('/request-account/ea-main-area')
  }
  if (responsibility === 'pso') {
    return res.redirect('/request-account/pso-ea-areas')
  }
  if (responsibility === 'rma') {
    return res.redirect('/request-account/rma-ea-areas')
  }

  return res.redirect('/request-account/details')
})

// EA flow
router.get('/request-account/ea-main-area', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  const error = req.query.error
  res.render('request-account/ea-main-area', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/ea-main-area', function (req, res) {
  const areasData = loadAreasData()
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  const mainArea = req.body.mainArea

  if (!mainArea) {
    return res.redirect('/request-account/ea-main-area?error=area-not-selected')
  }

  const area = findEaArea(areasData, mainArea)
  accountRequest.mainArea = mainArea
  accountRequest.mainAreaName = area ? area.name : ''
  res.redirect('/request-account/ea-additional-areas')
})

router.get('/request-account/ea-additional-areas', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  res.render('request-account/ea-additional-areas', { data: accountRequest })
})

router.post('/request-account/ea-additional-areas', function (req, res) {
  const areasData = loadAreasData()
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  const selections = toArray(req.body.additionalAreas)
  accountRequest.additionalAreas = selections
  accountRequest.additionalAreasNames = mapIdsToNames(
    selections,
    areasData,
    'ea'
  )
  res.redirect('/request-account/check-answers')
})

// PSO flow
router.get('/request-account/pso-ea-areas', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  const error = req.query.error
  res.render('request-account/pso-ea-areas', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/pso-ea-areas', function (req, res) {
  const areasData = loadAreasData()
  const selections = toArray(req.body.psoEaAreas)
  if (selections.length === 0) {
    return res.redirect(
      '/request-account/pso-ea-areas?error=regions-not-selected'
    )
  }
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.psoEaAreas = selections
  accountRequest.psoEaAreasNames = mapIdsToNames(selections, areasData, 'ea')
  res.redirect('/request-account/pso-main-area')
})

router.get('/request-account/pso-main-area', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  const error = req.query.error
  res.render('request-account/pso-main-area', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/pso-main-area', function (req, res) {
  const areasData = loadAreasData()
  const mainArea = req.body.mainArea
  if (!mainArea) {
    return res.redirect(
      '/request-account/pso-main-area?error=area-not-selected'
    )
  }
  const area = findPsoArea(areasData, mainArea)
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.mainArea = mainArea
  accountRequest.mainAreaName = area ? area.name : ''
  res.redirect('/request-account/pso-additional-areas')
})

router.get('/request-account/pso-additional-areas', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  res.render('request-account/pso-additional-areas', { data: accountRequest })
})

router.post('/request-account/pso-additional-areas', function (req, res) {
  const areasData = loadAreasData()
  const selections = toArray(req.body.additionalAreas)
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.additionalAreas = selections
  accountRequest.additionalAreasNames = mapIdsToNames(
    selections,
    areasData,
    'pso'
  )
  res.redirect('/request-account/check-answers')
})

// RMA flow
router.get('/request-account/rma-ea-areas', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  const error = req.query.error
  res.render('request-account/rma-ea-areas', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/rma-ea-areas', function (req, res) {
  const areasData = loadAreasData()
  const selections = toArray(req.body.rmaEaAreas)
  if (selections.length === 0) {
    return res.redirect(
      '/request-account/rma-ea-areas?error=regions-not-selected'
    )
  }
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.rmaEaAreas = selections
  accountRequest.rmaEaAreasNames = mapIdsToNames(selections, areasData, 'ea')
  res.redirect('/request-account/rma-pso-areas')
})

router.get('/request-account/rma-pso-areas', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  const error = req.query.error
  res.render('request-account/rma-pso-areas', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/rma-pso-areas', function (req, res) {
  const areasData = loadAreasData()
  const selections = toArray(req.body.rmaPsoAreas)
  if (selections.length === 0) {
    return res.redirect(
      '/request-account/rma-pso-areas?error=regions-not-selected'
    )
  }
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.rmaPsoAreas = selections
  accountRequest.rmaPsoAreasNames = mapIdsToNames(selections, areasData, 'pso')
  res.redirect('/request-account/rma-main-area')
})

router.get('/request-account/rma-main-area', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  const error = req.query.error
  res.render('request-account/rma-main-area', {
    error: error,
    data: accountRequest
  })
})

router.post('/request-account/rma-main-area', function (req, res) {
  const areasData = loadAreasData()
  const mainArea = req.body.mainArea
  if (!mainArea) {
    return res.redirect(
      '/request-account/rma-main-area?error=area-not-selected'
    )
  }
  const area = findRmaArea(areasData, mainArea)
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.mainArea = mainArea
  accountRequest.mainAreaName = area ? area.name : ''
  res.redirect('/request-account/rma-additional-areas')
})

router.get('/request-account/rma-additional-areas', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  res.render('request-account/rma-additional-areas', { data: accountRequest })
})

router.post('/request-account/rma-additional-areas', function (req, res) {
  const areasData = loadAreasData()
  const selections = toArray(req.body.additionalAreas)
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = areasData
  accountRequest.additionalAreas = selections
  accountRequest.additionalAreasNames = mapIdsToNames(
    selections,
    areasData,
    'rma'
  )
  res.redirect('/request-account/check-answers')
})

// Check answers
router.get('/request-account/check-answers', function (req, res) {
  const accountRequest = getAccountRequest(req)
  accountRequest.areasData = loadAreasData()
  res.render('request-account/check-answers', { data: accountRequest })
})

// Check answers with dummy data for EA user
router.get('/request-account/check-answers-ea-example', function (req, res) {
  const areasData = loadAreasData()
  const dummyData = {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@environment-agency.gov.uk',
    telephone: '07700 900123',
    organisation: 'Environment Agency',
    jobTitle: 'Flood Risk Manager',
    responsibility: 'ea',
    mainArea: 'ea-1',
    mainAreaName: 'Anglian',
    additionalAreas: ['ea-2', 'ea-3'],
    additionalAreasNames: ['Midlands', 'North East'],
    areasData: areasData
  }
  res.render('request-account/check-answers', { data: dummyData })
})

// Check answers with dummy data for PSO user
router.get('/request-account/check-answers-pso-example', function (req, res) {
  const areasData = loadAreasData()
  const dummyData = {
    firstName: 'Michael',
    lastName: 'Thompson',
    email: 'michael.thompson@example.com',
    telephone: '07700 900456',
    organisation: 'Thames Regional Flood and Coastal Committee',
    jobTitle: 'Project Manager',
    responsibility: 'pso',
    psoEaAreas: ['ea-1', 'ea-2'],
    psoEaAreasNames: ['Anglian', 'Midlands'],
    mainArea: 'pso-1',
    mainAreaName: 'Thames',
    additionalAreas: ['pso-2'],
    additionalAreasNames: ['Anglian Central'],
    areasData: areasData
  }
  res.render('request-account/check-answers', { data: dummyData })
})

// Check answers with dummy data for RMA user
router.get('/request-account/check-answers-rma-example', function (req, res) {
  const areasData = loadAreasData()
  const dummyData = {
    firstName: 'Emma',
    lastName: 'Williams',
    email: 'emma.williams@norfolk.gov.uk',
    telephone: '07700 900789',
    organisation: 'Norfolk County Council',
    jobTitle: 'Flood Risk Officer',
    responsibility: 'rma',
    rmaEaAreas: ['ea-1'],
    rmaEaAreasNames: ['Anglian'],
    rmaPsoAreas: ['pso-1', 'pso-2'],
    rmaPsoAreasNames: ['Thames', 'Anglian Central'],
    mainArea: 'rma-1',
    mainAreaName: 'Norfolk',
    additionalAreas: ['rma-2'],
    additionalAreasNames: ['Suffolk'],
    areasData: areasData
  }
  res.render('request-account/check-answers', { data: dummyData })
})

router.post('/request-account/check-answers', function (req, res) {
  const accountRequest = getAccountRequest(req)
  const email = (accountRequest.email || '').toLowerCase()
  const autoDomains = [
    '@environment-agency.gov.uk',
    '@environmet-agency.gov.uk'
  ]
  const isAutoApproved = autoDomains.some((d) => email.endsWith(d))
  req.session.data.accountRequestResult = {
    email: accountRequest.email,
    status: isAutoApproved ? 'approved' : 'pending'
  }
  resetAccountRequest(req)
  res.redirect('/request-account/confirmation')
})

router.get('/request-account/confirmation', function (req, res) {
  const result = req.session.data.accountRequestResult || {}
  if (!result.email) {
    return res.redirect('/request-account')
  }
  const view =
    result.status === 'approved'
      ? 'request-account/success-auto-approved'
      : 'request-account/success-pending-approval'

  res.render(view, { data: { email: result.email } })
})

// Admin user management routes
router.get('/admin/user-management-pending', function (req, res) {
  const usersData = loadUsersData()
  const areasData = loadAreasData()
  req.session.data.pendingUsers = usersData.pendingUsers
  req.session.data.activeUsers = usersData.activeUsers
  req.session.data.areasData = areasData
  req.session.data.search = req.query.search || ''
  req.session.data.area = req.query.area || ''
  delete req.session.data.userDeletedNotification
  delete req.session.data.userDeletedName
  res.render('admin/user-management-pending')
})

router.get('/admin/user-management-active', function (req, res) {
  const usersData = loadUsersData()
  const areasData = loadAreasData()
  req.session.data.pendingUsers = usersData.pendingUsers
  req.session.data.activeUsers = usersData.activeUsers
  req.session.data.areasData = areasData
  req.session.data.search = req.query.search || ''
  req.session.data.area = req.query.area || ''
  delete req.session.data.userAddedNotification
  delete req.session.data.userAddedName
  delete req.session.data.userDeletedNotification
  delete req.session.data.userDeletedName
  res.render('admin/user-management-active')
})

// Admin add user flow
router.get('/admin/add-user-admin-question', function (req, res) {
  // Clear any previous user creation data
  req.session.data.willBeAdmin = undefined
  req.session.data.firstName = undefined
  req.session.data.lastName = undefined
  req.session.data.email = undefined
  req.session.data.telephone = undefined
  req.session.data.organisation = undefined
  req.session.data.jobTitle = undefined
  req.session.data.responsibility = undefined
  req.session.data.nfmScreeningTeam = undefined
  req.session.data.mainArea = undefined
  req.session.data.mainAreaName = undefined
  req.session.data.additionalAreas = undefined
  req.session.data.additionalAreasNames = undefined
  req.session.data.psoEaAreas = undefined
  req.session.data.psoEaAreasNames = undefined
  req.session.data.rmaPsoAreas = undefined
  req.session.data.rmaPsoAreasNames = undefined
  req.session.data.rmaEaAreas = undefined
  req.session.data.rmaEaAreasNames = undefined
  req.session.data.userAddedNotification = undefined

  const error = req.query.error
  res.render('admin/add-user-admin-question', { error: error })
})

router.post('/admin/add-user-admin-question', function (req, res) {
  const willBeAdmin = req.body.willBeAdmin
  req.session.data.willBeAdmin = willBeAdmin

  if (!willBeAdmin) {
    return res.redirect('/admin/add-user-admin-question?error=true')
  }

  if (willBeAdmin === 'yes') {
    return res.redirect('/admin/add-user-admin-details')
  } else {
    return res.redirect('/admin/add-user-details')
  }
})

router.get('/admin/add-user-admin-details', function (req, res) {
  const error = req.query.error
  req.session.data.areasData = loadAreasData()
  res.render('admin/add-user-admin-details', { error: error })
})

router.post('/admin/add-user-admin-details', function (req, res) {
  const errors = []
  const email = (req.body.email || '').trim()
  const firstName = (req.body.firstName || '').trim()
  const lastName = (req.body.lastName || '').trim()

  req.session.data.firstName = firstName
  req.session.data.lastName = lastName
  req.session.data.email = email

  if (!firstName) errors.push('first-name-empty')
  if (!lastName) errors.push('last-name-empty')
  if (!email) errors.push('email-empty')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('email-invalid')

  if (errors.length > 0) {
    return res.redirect(
      `/admin/add-user-admin-details?error=${encodeURIComponent(errors.join(','))}`
    )
  }

  return res.redirect('/admin/add-user-check-answers')
})

router.get('/admin/add-user-details', function (req, res) {
  const error = req.query.error
  req.session.data.areasData = loadAreasData()
  req.session.data.isAdminContext = 'true'
  res.render('admin/add-user-details', { error: error })
})

router.post('/admin/add-user-details', function (req, res) {
  const errors = []
  const email = (req.body.email || '').trim()
  const firstName = (req.body.firstName || '').trim()
  const lastName = (req.body.lastName || '').trim()
  const telephone = (req.body.telephone || '').trim()
  const organisation = (req.body.organisation || '').trim()
  const jobTitle = (req.body.jobTitle || '').trim()
  const responsibility = req.body.responsibility

  req.session.data.firstName = firstName
  req.session.data.lastName = lastName
  req.session.data.email = email
  req.session.data.telephone = telephone
  req.session.data.organisation = organisation
  req.session.data.jobTitle = jobTitle
  req.session.data.responsibility = responsibility

  if (!firstName) errors.push('first-name-empty')
  if (!lastName) errors.push('last-name-empty')
  if (!email) errors.push('email-empty')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('email-invalid')
  if (telephone && !/^[\d\s+()-]+$/.test(telephone))
    errors.push('telephone-invalid')
  if (!responsibility) errors.push('responsibility-empty')

  if (errors.length > 0) {
    return res.redirect(
      `/admin/add-user-details?error=${encodeURIComponent(errors.join(','))}`
    )
  }

  if (responsibility === 'ea') {
    return res.redirect('/admin/add-user-ea-main-area')
  }
  if (responsibility === 'pso') {
    return res.redirect('/admin/add-user-pso-ea-areas')
  }
  if (responsibility === 'rma') {
    return res.redirect('/admin/add-user-rma-ea-areas')
  }

  return res.redirect('/admin/add-user-check-answers')
})

router.get('/admin/add-user-nfm-screening', function (req, res) {
  const error = req.query.error
  res.render('admin/add-user-nfm-screening', { error: error })
})

router.post('/admin/add-user-nfm-screening', function (req, res) {
  const nfmScreeningTeam = req.body.nfmScreeningTeam
  req.session.data.nfmScreeningTeam = nfmScreeningTeam

  if (!nfmScreeningTeam) {
    return res.redirect('/admin/add-user-nfm-screening?error=true')
  }

  return res.redirect('/admin/add-user-ea-main-area')
})

// Reuse existing area selection routes for admin flow by creating parallel routes
router.get('/admin/add-user-ea-main-area', function (req, res) {
  const error = req.query.error
  const areasData = loadAreasData()
  req.session.data.areasData = areasData
  req.session.data.isAdmin = true
  res.render('request-account/ea-main-area', {
    error: error,
    isAdmin: true,
    backLink: '/admin/add-user-details',
    data: req.session.data
  })
})

router.post('/admin/add-user-ea-main-area', function (req, res) {
  const mainArea = req.body.mainArea
  req.session.data.mainArea = mainArea

  if (!mainArea) {
    return res.redirect('/admin/add-user-ea-main-area?error=area-not-selected')
  }

  const areasData = loadAreasData()
  const area = findEaArea(areasData, mainArea)
  req.session.data.mainAreaName = area ? area.name : undefined

  return res.redirect('/admin/add-user-ea-additional-areas')
})

router.get('/admin/add-user-ea-additional-areas', function (req, res) {
  const areasData = loadAreasData()
  req.session.data.areasData = areasData
  req.session.data.isAdmin = true
  res.render('request-account/ea-additional-areas', {
    isAdmin: true,
    backLink: '/admin/add-user-ea-main-area',
    data: req.session.data
  })
})

router.post('/admin/add-user-ea-additional-areas', function (req, res) {
  const additionalAreas = toArray(req.body.additionalAreas)
  req.session.data.additionalAreas = additionalAreas

  const areasData = loadAreasData()
  req.session.data.additionalAreasNames = mapIdsToNames(
    additionalAreas,
    areasData,
    'ea'
  )

  return res.redirect('/admin/add-user-check-answers')
})

// PSO routes for admin
router.get('/admin/add-user-pso-ea-areas', function (req, res) {
  const error = req.query.error
  const areasData = loadAreasData()
  req.session.data.areasData = areasData
  req.session.data.isAdmin = true
  res.render('request-account/pso-ea-areas', {
    error: error,
    isAdmin: true,
    backLink: '/admin/add-user-details',
    data: req.session.data
  })
})

router.post('/admin/add-user-pso-ea-areas', function (req, res) {
  const psoEaAreas = toArray(req.body.psoEaAreas)
  req.session.data.psoEaAreas = psoEaAreas

  if (!psoEaAreas || psoEaAreas.length === 0) {
    return res.redirect(
      '/admin/add-user-pso-ea-areas?error=regions-not-selected'
    )
  }

  const areasData = loadAreasData()
  req.session.data.psoEaAreasNames = mapIdsToNames(psoEaAreas, areasData, 'ea')

  return res.redirect('/admin/add-user-pso-main-area')
})

router.get('/admin/add-user-pso-main-area', function (req, res) {
  const error = req.query.error
  const areasData = loadAreasData()
  const psoEaAreas = toArray(req.session.data.psoEaAreas)
  req.session.data.areasData = areasData
  req.session.data.psoEaAreas = psoEaAreas
  req.session.data.isAdmin = true
  res.render('request-account/pso-main-area', {
    error: error,
    isAdmin: true,
    backLink: '/admin/add-user-pso-ea-areas',
    data: req.session.data
  })
})

router.post('/admin/add-user-pso-main-area', function (req, res) {
  const mainArea = req.body.mainArea
  req.session.data.mainArea = mainArea

  if (!mainArea) {
    return res.redirect('/admin/add-user-pso-main-area?error=area-not-selected')
  }

  const areasData = loadAreasData()
  const area = findPsoArea(areasData, mainArea)
  req.session.data.mainAreaName = area ? area.name : undefined

  return res.redirect('/admin/add-user-pso-additional-areas')
})

router.get('/admin/add-user-pso-additional-areas', function (req, res) {
  const areasData = loadAreasData()
  const psoEaAreas = toArray(req.session.data.psoEaAreas)
  const mainArea = req.session.data.mainArea
  req.session.data.areasData = areasData
  req.session.data.psoEaAreas = psoEaAreas
  req.session.data.mainArea = mainArea
  req.session.data.isAdmin = true
  res.render('request-account/pso-additional-areas', {
    isAdmin: true,
    backLink: '/admin/add-user-pso-main-area',
    data: req.session.data
  })
})

router.post('/admin/add-user-pso-additional-areas', function (req, res) {
  const additionalAreas = toArray(req.body.additionalAreas)
  req.session.data.additionalAreas = additionalAreas

  const areasData = loadAreasData()
  req.session.data.additionalAreasNames = mapIdsToNames(
    additionalAreas,
    areasData,
    'pso'
  )

  return res.redirect('/admin/add-user-check-answers')
})

// RMA routes for admin
router.get('/admin/add-user-rma-ea-areas', function (req, res) {
  const error = req.query.error
  const areasData = loadAreasData()
  req.session.data.areasData = areasData
  req.session.data.isAdmin = true
  res.render('request-account/rma-ea-areas', {
    error: error,
    isAdmin: true,
    backLink: '/admin/add-user-details',
    data: req.session.data
  })
})

router.post('/admin/add-user-rma-ea-areas', function (req, res) {
  const rmaEaAreas = toArray(req.body.rmaEaAreas)
  req.session.data.rmaEaAreas = rmaEaAreas

  if (!rmaEaAreas || rmaEaAreas.length === 0) {
    return res.redirect(
      '/admin/add-user-rma-ea-areas?error=regions-not-selected'
    )
  }

  const areasData = loadAreasData()
  req.session.data.rmaEaAreasNames = mapIdsToNames(rmaEaAreas, areasData, 'ea')

  return res.redirect('/admin/add-user-rma-pso-areas')
})

router.get('/admin/add-user-rma-pso-areas', function (req, res) {
  const error = req.query.error
  const areasData = loadAreasData()
  const rmaEaAreas = toArray(req.session.data.rmaEaAreas)
  req.session.data.areasData = areasData
  req.session.data.rmaEaAreas = rmaEaAreas
  req.session.data.isAdmin = true
  res.render('request-account/rma-pso-areas', {
    error: error,
    isAdmin: true,
    backLink: '/admin/add-user-rma-ea-areas',
    data: req.session.data
  })
})

router.post('/admin/add-user-rma-pso-areas', function (req, res) {
  const rmaPsoAreas = toArray(req.body.rmaPsoAreas)
  req.session.data.rmaPsoAreas = rmaPsoAreas

  if (!rmaPsoAreas || rmaPsoAreas.length === 0) {
    return res.redirect(
      '/admin/add-user-rma-pso-areas?error=regions-not-selected'
    )
  }

  const areasData = loadAreasData()
  req.session.data.rmaPsoAreasNames = mapIdsToNames(
    rmaPsoAreas,
    areasData,
    'pso'
  )

  return res.redirect('/admin/add-user-rma-main-area')
})

router.get('/admin/add-user-rma-main-area', function (req, res) {
  const error = req.query.error
  const areasData = loadAreasData()
  const rmaPsoAreas = toArray(req.session.data.rmaPsoAreas)
  req.session.data.areasData = areasData
  req.session.data.rmaPsoAreas = rmaPsoAreas
  req.session.data.isAdmin = true
  res.render('request-account/rma-main-area', {
    error: error,
    isAdmin: true,
    backLink: '/admin/add-user-rma-pso-areas',
    data: req.session.data
  })
})

router.post('/admin/add-user-rma-main-area', function (req, res) {
  const mainArea = req.body.mainArea
  req.session.data.mainArea = mainArea

  if (!mainArea) {
    return res.redirect('/admin/add-user-rma-main-area?error=area-not-selected')
  }

  const areasData = loadAreasData()
  const area = findRmaArea(areasData, mainArea)
  req.session.data.mainAreaName = area ? area.name : undefined

  return res.redirect('/admin/add-user-rma-additional-areas')
})

router.get('/admin/add-user-rma-additional-areas', function (req, res) {
  const areasData = loadAreasData()
  const rmaPsoAreas = toArray(req.session.data.rmaPsoAreas)
  const mainArea = req.session.data.mainArea
  req.session.data.areasData = areasData
  req.session.data.rmaPsoAreas = rmaPsoAreas
  req.session.data.mainArea = mainArea
  req.session.data.isAdmin = true
  res.render('request-account/rma-additional-areas', {
    isAdmin: true,
    backLink: '/admin/add-user-rma-main-area',
    data: req.session.data
  })
})

router.post('/admin/add-user-rma-additional-areas', function (req, res) {
  const additionalAreas = toArray(req.body.additionalAreas)
  req.session.data.additionalAreas = additionalAreas

  const areasData = loadAreasData()
  req.session.data.additionalAreasNames = mapIdsToNames(
    additionalAreas,
    areasData,
    'rma'
  )

  return res.redirect('/admin/add-user-check-answers')
})

router.get('/admin/add-user-check-answers', function (req, res) {
  const areasData = loadAreasData()
  req.session.data.areasData = areasData
  res.render('admin/add-user-check-answers')
})

// Admin check answers with dummy data for EA user
router.get('/admin/add-user-check-answers-ea-example', function (req, res) {
  const areasData = loadAreasData()
  const dummyData = {
    firstName: 'James',
    lastName: 'Anderson',
    email: 'james.anderson@environment-agency.gov.uk',
    telephone: '07700 900321',
    organisation: 'Environment Agency',
    jobTitle: 'Senior Advisor',
    responsibility: 'ea',
    willBeAdmin: 'no',
    nfmScreeningTeam: 'yes',
    mainArea: 'ea-4',
    mainAreaName: 'North West',
    additionalAreas: ['ea-5'],
    additionalAreasNames: ['South West'],
    areasData: areasData
  }
  res.render('admin/add-user-check-answers', { data: dummyData })
})

// Admin check answers with dummy data for PSO user
router.get('/admin/add-user-check-answers-pso-example', function (req, res) {
  const areasData = loadAreasData()
  const dummyData = {
    firstName: 'Rachel',
    lastName: 'Davies',
    email: 'rachel.davies@example.com',
    telephone: '07700 900654',
    organisation: 'Severn Regional Flood and Coastal Committee',
    jobTitle: 'Technical Advisor',
    responsibility: 'pso',
    willBeAdmin: 'no',
    psoEaAreas: ['ea-3', 'ea-4'],
    psoEaAreasNames: ['North West', 'North East'],
    mainArea: 'pso-3',
    mainAreaName: 'Severn',
    additionalAreas: ['pso-4'],
    additionalAreasNames: ['Trent'],
    areasData: areasData
  }
  res.render('admin/add-user-check-answers', { data: dummyData })
})

// Admin check answers with dummy data for RMA user
router.get('/admin/add-user-check-answers-rma-example', function (req, res) {
  const areasData = loadAreasData()
  const dummyData = {
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@kent.gov.uk',
    telephone: '07700 900987',
    organisation: 'Kent County Council',
    jobTitle: 'Drainage Engineer',
    responsibility: 'rma',
    willBeAdmin: 'no',
    rmaEaAreasNames: ['Anglesey', 'Buckinghamshire'],
    rmaPsoAreasNames: ['North West', 'North East'],
    rmaEaAreas: ['ea-2'],
    rmaPsoAreas: ['pso-2'],
    mainArea: 'rma-3',
    mainAreaName: 'Kent',
    additionalAreas: ['rma-4'],
    additionalAreasNames: ['Essex'],
    areasData: areasData
  }
  res.render('admin/add-user-check-answers', { data: dummyData })
})

// Failed submissions routes
router.get('/admin/failed-submissions', function (req, res) {
  const projects = loadProjectsData()
  const failedSubmissions = projects.filter(p => p.failedSubmission === true)

  // Handle pagination (similar to user-management-active)
  const page = parseInt(req.query.page) || 1
  const limit = 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const results = failedSubmissions.slice(startIndex, endIndex)
  const totalPages = Math.ceil(failedSubmissions.length / limit)

  res.render('admin/failed-submissions', {
    projects: results,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: failedSubmissions.length,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, failedSubmissions.length)
    },
    successMessage: req.session.data.failedSubmissionNotification
  })
})

router.post('/admin/failed-submissions/:id/resend', function (req, res) {
  const id = parseInt(req.params.id)
  // In a real app, this would trigger the resend logic
  req.session.data.failedSubmissionNotification = 'resend'
  res.redirect('/admin/failed-submissions')
})

router.post('/admin/failed-submissions/:id/mark-submitted', function (req, res) {
  const id = parseInt(req.params.id)
  const projects = loadProjectsData()
  const projectIndex = projects.findIndex(p => p.id === id)

  if (projectIndex !== -1) {
    projects[projectIndex].failedSubmission = false
    fs.writeFileSync(projectsDataPath, JSON.stringify(projects, null, 2))
  }

  req.session.data.failedSubmissionNotification = 'marked'
  res.redirect('/admin/failed-submissions')
})

// Archive routes
router.get('/proposal/archive', function (req, res) {
  const projects = loadProjectsData()
  const archivedProjects = projects.filter(p => p.status === 'Archived')

  // Handle pagination
  const page = parseInt(req.query.page) || 1
  const limit = 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const results = archivedProjects.slice(startIndex, endIndex)
  const totalPages = Math.ceil(archivedProjects.length / limit)

  res.render('proposal/archive', {
    projects: results,
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: archivedProjects.length,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, archivedProjects.length)
    }
  })
})

router.get('/proposal/empty-archive', function (req, res) {
  const projects = loadProjectsData()
  const archivedProjects = projects.filter(p => p.status === 'Archived')

  // Handle pagination
  const page = parseInt(req.query.page) || 1
  const limit = 10
  const startIndex = (page - 1) * limit
  const endIndex = page * limit

  const results = archivedProjects.slice(startIndex, endIndex)
  const totalPages = Math.ceil(archivedProjects.length / limit)

  res.render('proposal/archive', {
    projects: [],
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: archivedProjects.length,
      startIndex: startIndex + 1,
      endIndex: Math.min(endIndex, archivedProjects.length)
    }
  })
})

router.get('/proposal/confirm-archive', function (req, res) {
  res.render('proposal/confirm-archive')
})

router.post('/admin/add-user-check-answers', function (req, res) {
  // Store user added notification data
  const firstName = req.session.data.firstName
  const lastName = req.session.data.lastName
  req.session.data.userAddedNotification = true
  req.session.data.userAddedName = `${firstName} ${lastName}`

  // Redirect to active users with notification banner
  return res.redirect('/admin/user-management-active')
})

router.post('/admin/clear-notification', function (req, res) {
  req.session.data.userAddedNotification = undefined
  req.session.data.userAddedName = undefined
  req.session.data.failedSubmissionNotification = undefined
  res.json({ success: true })
})

router.get('/admin/organisations/edit/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const org = organisations.find(o => o.id === orgId)

  if (!org) {
    return res.status(404).send('Organisation not found')
  }

  if (org.type === 'Authority') {
    return res.redirect(`/admin/organisations/edit-authority/${orgId}`)
  } else if (org.type === 'PSO') {
    return res.redirect(`/admin/organisations/edit-pso/${orgId}`)
  } else if (org.type === 'RMA') {
    return res.redirect(`/admin/organisations/edit-rma/${orgId}`)
  }

  return res.redirect('/admin/organisations')
})

router.get('/admin/organisations/edit-authority/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const org = organisations.find(o => o.id === orgId)

  if (!org) {
    return res.status(404).send('Organisation not found')
  }

  res.render('admin/edit-authority', { org: org })
})

router.post('/admin/organisations/edit-authority/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const orgIndex = organisations.findIndex(o => o.id === orgId)

  if (orgIndex === -1) {
    return res.status(404).send('Organisation not found')
  }

  organisations[orgIndex].name = req.body['organisation-name']
  organisations[orgIndex].identifierCode = req.body['identifier-code']
  organisations[orgIndex].authorityCode = req.body['authority-code']
  organisations[orgIndex].authorityType = req.body['authority-type']
  organisations[orgIndex].endDate = req.body['end-date'] || null

  fs.writeFileSync(organisationsDataPath, JSON.stringify(organisations, null, 2))

  req.session.data.organisationUpdatedNotification = true
  return res.redirect('/admin/organisations')
})

router.get('/admin/organisations/edit-pso/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const org = organisations.find(o => o.id === orgId)

  if (!org) {
    return res.status(404).send('Organisation not found')
  }

  const areasData = loadAreasData()
  res.render('admin/edit-pso', { org: org, areasData: areasData })
})

router.post('/admin/organisations/edit-pso/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const orgIndex = organisations.findIndex(o => o.id === orgId)

  if (orgIndex === -1) {
    return res.status(404).send('Organisation not found')
  }

  organisations[orgIndex].name = req.body['pso-name']
  organisations[orgIndex].identifierCode = req.body['identifier-code']
  organisations[orgIndex].associatedEaArea = req.body['ea-area']
  organisations[orgIndex].rfccCode = req.body['rfcc-code']
  organisations[orgIndex].endDate = req.body['end-date'] || null

  fs.writeFileSync(organisationsDataPath, JSON.stringify(organisations, null, 2))

  req.session.data.organisationUpdatedNotification = true
  return res.redirect('/admin/organisations')
})

router.get('/admin/organisations/edit-rma/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const org = organisations.find(o => o.id === orgId)

  if (!org) {
    return res.status(404).send('Organisation not found')
  }

  req.session.data.organisationsData = organisations
  res.render('admin/edit-rma', { org: org })
})

router.post('/admin/organisations/edit-rma/:id', function (req, res) {
  const orgId = parseInt(req.params.id)
  const organisations = loadOrganisationsData()
  const orgIndex = organisations.findIndex(o => o.id === orgId)

  if (orgIndex === -1) {
    return res.status(404).send('Organisation not found')
  }

  organisations[orgIndex].name = req.body['organisation-name']
  organisations[orgIndex].identifierCode = req.body['identifier-code']
  organisations[orgIndex].authorityCode = req.body['authority-code']
  organisations[orgIndex].associatedPso = req.body['associated-pso']
  organisations[orgIndex].endDate = req.body['end-date'] || null

  fs.writeFileSync(organisationsDataPath, JSON.stringify(organisations, null, 2))

  req.session.data.organisationUpdatedNotification = true
  return res.redirect('/admin/organisations')
})

router.post('/admin/clear-organisation-notification', function (req, res) {
  delete req.session.data.organisationAddedNotification
  delete req.session.data.organisationUpdatedNotification
  res.json({ success: true })
})

router.get('/admin/organisations', function (req, res) {
  const areasData = loadAreasData()
  let organisations = loadOrganisationsData()

  // Initialize filters from query
  const nameFilter = req.query['organisation-name']
  const typeFilter = req.query['organisation-type']

  // Filter by name if provided
  if (nameFilter && nameFilter.trim()) {
    organisations = organisations.filter((org) =>
      org.name.toLowerCase().includes(nameFilter.toLowerCase())
    )
  }

  // Filter by type if provided
  if (typeFilter && typeFilter.trim()) {
    organisations = organisations.filter((org) => org.type === typeFilter)
  }

  // Store in session data for template access
  req.session.data.organisations = organisations
  req.session.data.areasData = areasData
  req.session.data['organisation-name'] = nameFilter
  req.session.data['organisation-type'] = typeFilter

  res.render('admin/organisations')

  // Clear notifications after rendering
  delete req.session.data.organisationAddedNotification
  delete req.session.data.organisationUpdatedNotification
})

router.get('/admin/organisations/add', function (req, res) {
  res.render('admin/add-organisation')
})

router.post('/admin/organisations/add', function (req, res) {
  const orgType = req.body['organisation-type']

  if (!orgType) {
    return res.render('admin/add-organisation', { error: true })
  }

  // Route based on organisation type
  if (orgType === 'Authority') {
    return res.redirect('/admin/organisations/add-authority')
  } else if (orgType === 'PSO') {
    return res.redirect('/admin/organisations/add-pso')
  } else if (orgType === 'RMA') {
    return res.redirect('/admin/organisations/add-rma')
  }

  return res.redirect('/admin/organisations/add')
})

router.get('/admin/organisations/add-authority', function (req, res) {
  res.render('admin/add-authority')
})

router.post('/admin/organisations/add-authority', function (req, res) {
  const authorityCode = req.body['authority-code']
  const authorityType = req.body['authority-type']
  const endDate = req.body['end-date']

  let errors = []
  if (!authorityCode || !authorityCode.trim()) {
    errors.push('authority-code-empty')
  }
  if (!authorityType || !authorityType.trim()) {
    errors.push('authority-type-empty')
  }

  if (errors.length > 0) {
    return res.render('admin/add-authority', { error: errors.join(',') })
  }

  // In a real app, save to database
  req.session.data.organisationAddedNotification = true
  return res.redirect('/admin/organisations')
})

router.get('/admin/organisations/add-pso', function (req, res) {
  const areasData = loadAreasData()
  res.render('admin/add-pso', { areasData: areasData })
})

router.post('/admin/organisations/add-pso', function (req, res) {
  const psoName = req.body['pso-name']
  const eaArea = req.body['ea-area']
  const rfccCode = req.body['rfcc-code']
  const endDate = req.body['end-date']

  let errors = []
  if (!psoName || !psoName.trim()) {
    errors.push('pso-name-empty')
  }
  if (!eaArea || !eaArea.trim()) {
    errors.push('ea-area-empty')
  }
  if (!rfccCode || !rfccCode.trim()) {
    errors.push('rfcc-code-empty')
  }

  if (errors.length > 0) {
    const areasData = loadAreasData()
    return res.render('admin/add-pso', {
      error: errors.join(','),
      areasData: areasData
    })
  }

  // In a real app, save to database
  req.session.data.organisationAddedNotification = true
  return res.redirect('/admin/organisations')
})

router.get('/admin/organisations/add-rma', function (req, res) {
  res.render('admin/add-rma')
})

router.post('/admin/organisations/add-rma', function (req, res) {
  const orgName = req.body['organisation-name']
  const identifierCode = req.body['identifier-code']
  const authorityCode = req.body['authority-code']
  const associatedPso = req.body['associated-pso']
  const endDate = req.body['end-date']

  let errors = []
  if (!orgName || !orgName.trim()) {
    errors.push('organisation-name-empty')
  }
  if (!identifierCode || !identifierCode.trim()) {
    errors.push('identifier-code-empty')
  }
  if (!authorityCode || !authorityCode.trim()) {
    errors.push('authority-code-empty')
  }
  if (!associatedPso || !associatedPso.trim()) {
    errors.push('associated-pso-empty')
  }

  if (errors.length > 0) {
    return res.render('admin/add-rma', { error: errors.join(',') })
  }

  // In a real app, save to database
  req.session.data.organisationAddedNotification = true
  return res.redirect('/admin/organisations')
})

// Static pages routes
router.get('/pages/privacy-notice', function (req, res) {
  res.render('static/privacy-notice')
})

router.get('/pages/cookies', function (req, res) {
  res.render('static/cookies')
})

router.get('/pages/cookies/edit', function (req, res) {
  res.render('static/cookies-edit')
})

router.post('/pages/cookies/edit', function (req, res) {
  const analytics = req.body.analytics

  // Store cookie preference in session
  req.session.data.cookiesAccepted = true
  req.session.data.analyticsConsent = analytics === 'yes'
  req.session.data.cookieSettingsUpdated = true

  // Set cookie for persistence
  const cookieValue = analytics === 'yes' ? 'accepted' : 'rejected'
  res.cookie('cookies_policy', cookieValue, { maxAge: 31536000, path: '/' })
  res.cookie('cookies_preferences_set', 'yes', { maxAge: 31536000, path: '/' })

  res.redirect('/pages/cookies/edit')
})

router.get('/pages/accessibility', function (req, res) {
  res.render('static/accessibility')
})

// Cookie preference handling
router.post('/set-cookie-preference', function (req, res) {
  const accepted = req.body.accepted

  // Store cookie preference in session
  req.session.data.cookiesAccepted = true
  req.session.data.analyticsConsent = accepted

  res.json({ success: true })
})

// Projects management routes
router.get('/admin/projects', function (req, res) {
  let projects = loadProjectsData()
  const organisations = loadOrganisationsData()
  const areasData = loadAreasData()

  // Initialize filters from query
  const searchFilter = req.query.search || ''
  const rmaFilter = req.query.rma || ''

  // Filter by RMA if provided
  if (rmaFilter && rmaFilter.trim()) {
    projects = projects.filter((project) => project.assignedRMA === rmaFilter)
  }

  // Filter by search if provided
  if (searchFilter && searchFilter.trim()) {
    const search = searchFilter.toLowerCase()
    projects = projects.filter(
      (project) =>
        project.projectNumber.toLowerCase().includes(search) ||
        project.projectName.toLowerCase().includes(search) ||
        project.assignedRMA.toLowerCase().includes(search)
    )
  }

  // Store in session data for template access
  req.session.data.projectsData = projects
  req.session.data.organisationsData = organisations
  req.session.data.areasData = areasData
  req.session.data.search = searchFilter
  req.session.data.rma = rmaFilter

  // Get unique sorted list of all RMAs from areas data
  const allRmas = []
  if (areasData && areasData.ea_areas) {
    areasData.ea_areas.forEach(ea => {
      if (ea.pso_areas) {
        ea.pso_areas.forEach(pso => {
          if (pso.rma_areas) {
            pso.rma_areas.forEach(rma => {
              if (rma.name && !allRmas.includes(rma.name)) {
                allRmas.push(rma.name)
              }
            })
          }
        })
      }
    })
  }
  req.session.data.allRmas = allRmas.sort()

  res.render('admin/projects')

  // Clear notification after rendering
  delete req.session.data.projectRmaUpdatedNotification
  delete req.session.data.projectRmaUpdatedName
})

router.get('/admin/projects/:id/change-rma', function (req, res) {
  const projectId = parseInt(req.params.id)
  const projects = loadProjectsData()
  const organisations = loadOrganisationsData()

  const project = projects.find((p) => p.id === projectId)
  if (!project) {
    return res.status(404).render('error', { message: 'Project not found' })
  }

  req.session.data.currentProject = project
  req.session.data.organisationsData = organisations

  res.render('admin/projects-change-rma')
})

router.post('/admin/projects/:id/change-rma', function (req, res) {
  const projectId = parseInt(req.params.id)
  const newRma = req.body.rma

  let projects = loadProjectsData()
  const project = projects.find((p) => p.id === projectId)

  if (!project) {
    return res.status(404).render('error', { message: 'Project not found' })
  }

  if (!newRma || !newRma.trim()) {
    req.session.data.currentProject = project
    const organisations = loadOrganisationsData()
    req.session.data.organisationsData = organisations
    return res.render('admin/projects-change-rma', { error: 'rma-empty' })
  }

  // Update the project (in a real app, this would save to database)
  const projectIndex = projects.findIndex((p) => p.id === projectId)
  projects[projectIndex].assignedRMA = newRma

  // Write back to JSON file
  fs.writeFileSync(projectsDataPath, JSON.stringify(projects, null, 2))

  // Set success notification
  req.session.data.projectRmaUpdatedNotification = true
  req.session.data.projectRmaUpdatedName = project.projectName

  return res.redirect('/admin/projects')
})

// ============================================
// User View and Edit Routes
// ============================================

// Load users data helper
function loadUsersData() {
  const usersDataPath = path.join(__dirname, 'data', 'users.json')
  const usersData = JSON.parse(fs.readFileSync(usersDataPath, 'utf8'))
  return usersData
}

// User view page - GET /admin/users/:id/view
router.get('/admin/users/:id/view', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  // Capture and clear flash/simulation flags from session immediately
  // This ensures they don't persist to the next request (refresh or navigation)
  const simulatedApprovedUserId = req.session.data.simulatedApprovedUserId
  const userApprovedNotification = req.session.data.userApprovedNotification
  const userApprovedName = req.session.data.userApprovedName
  const userUpdatedNotification = req.session.data.userUpdatedNotification
  const userActionNotification = req.session.data.userActionNotification

  delete req.session.data.simulatedApprovedUserId
  delete req.session.data.userApprovedNotification
  delete req.session.data.userApprovedName
  delete req.session.data.userUpdatedNotification
  delete req.session.data.userActionNotification

  // Find user in either pending or active users
  let user = usersData.pendingUsers.find((u) => u.id === userId)
  let userType = 'pending'

  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
    userType = 'active'
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  // Create a copy of the user object to avoid mutating the original data
  const userCopy = JSON.parse(JSON.stringify(user))

  // Simulate approval for this request only
  if (simulatedApprovedUserId === userId) {
    userCopy.status = 'active'
    userCopy.invitationSentDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    userCopy.invitationSentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    userCopy.lastSignIn = 'Never'
  }

  // Store in session for edit pages and standard template access
  req.session.data.currentUser = userCopy
  req.session.data.currentUserType = userType

  // Set local variables for this render only, so the template can show the notification
  res.locals.data.userApprovedNotification = userApprovedNotification
  res.locals.data.userApprovedName = userApprovedName
  res.locals.data.userUpdatedNotification = userUpdatedNotification
  res.locals.data.userActionNotification = userActionNotification

  // Load organisations for area names
  const organisationsData = loadOrganisationsData()
  req.session.data.organisationsData = organisationsData

  // Load areas data for area names
  const areasData = loadAreasData()
  req.session.data.areasData = areasData

  return res.render('admin/user-view')
})

// Edit user details - GET /admin/users/:id/edit-details
router.get('/admin/users/:id/edit-details', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user

  return res.render('admin/user-edit-details', { isAdmin: user.isAdmin ?? false })
})

// Edit user details - POST /admin/users/:id/edit-details
router.post('/admin/users/:id/edit-details', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  // Check if responsibility changed
  const responsibilityChanged = currentUser.responsibility !== req.body.responsibility

  // Update session data instead of file
  currentUser.firstName = req.body.firstName
  currentUser.lastName = req.body.lastName
  currentUser.email = req.body.email
  currentUser.telephone = req.body.telephone || ''
  currentUser.organisation = req.body.organisation || ''
  currentUser.jobTitle = req.body.jobTitle || ''
  currentUser.responsibility = req.body.responsibility

  // If responsibility changed and user is not admin, they'll need to update areas
  if (responsibilityChanged && !currentUser.isAdmin) {
    if (currentUser.responsibility === 'ea') {
      return res.redirect(`/admin/users/${userId}/edit-main-ea-area`)
    } else if (currentUser.responsibility === 'pso') {
      return res.redirect(`/admin/users/${userId}/edit-pso-ea-areas`)
    } else if (currentUser.responsibility === 'rma') {
      return res.redirect(`/admin/users/${userId}/edit-rma-ea-areas`)
    }
  }

  return res.redirect(`/admin/users/${userId}/edit-check-answers`)
})

// Edit check answers - GET /admin/users/:id/edit-check-answers
router.get('/admin/users/:id/edit-check-answers', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  const areasData = loadAreasData()
  req.session.data.areasData = areasData

  return res.render('admin/user-edit-check-answers')
})

// Edit check answers - POST /admin/users/:id/edit-check-answers
router.post('/admin/users/:id/edit-check-answers', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  // Find user in the real data and update it
  let userArray = usersData.pendingUsers
  let userIndex = userArray.findIndex((u) => u.id === userId)

  if (userIndex === -1) {
    userArray = usersData.activeUsers
    userIndex = userArray.findIndex((u) => u.id === userId)
  }

  if (userIndex === -1) {
    return res.status(404).send('User not found in data')
  }

  // Update the user in the array with current session data
  userArray[userIndex] = { ...userArray[userIndex], ...currentUser }

  // Write back to file
  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  // Set notification
  req.session.data.userUpdatedNotification = true

  return res.redirect(`/admin/users/${userId}/view`)
})

// Edit admin status - GET /admin/users/:id/edit-admin
router.get('/admin/users/:id/edit-admin', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user

  return res.render('admin/user-edit-admin')
})

// Edit admin status - POST /admin/users/:id/edit-admin
router.post('/admin/users/:id/edit-admin', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  // Update session data
  const isAdmin = req.body.isAdmin === 'yes'
  currentUser.isAdmin = isAdmin

  // If user becomes admin, clear NFM screening team status
  if (isAdmin) {
    currentUser.nfmScreeningTeam = false
  } else {
    // If not admin, update NFM screening team status if provided
    if (req.body.nfmScreeningTeam !== undefined) {
      currentUser.nfmScreeningTeam = req.body.nfmScreeningTeam === 'yes'
    }
  }

  return res.redirect(`/admin/users/${userId}/edit-check-answers`)
})

// Edit NFM screening status - GET /admin/users/:id/edit-nfm
router.get('/admin/users/:id/edit-nfm', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user

  return res.render('admin/user-edit-nfm')
})

// Edit NFM screening status - POST /admin/users/:id/edit-nfm
router.post('/admin/users/:id/edit-nfm', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  // Update session data
  currentUser.nfmScreeningTeam = req.body.nfmScreeningTeam === 'yes'

  return res.redirect(`/admin/users/${userId}/edit-check-answers`)
})

// Edit Responsibility and Areas - GET /admin/users/:id/edit-areas
router.get('/admin/users/:id/edit-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user

  // Load areas and organisations data
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()

  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-areas')
})

// Edit Areas - POST /admin/users/:id/edit-areas
router.post('/admin/users/:id/edit-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  // Find user and update
  let user = usersData.pendingUsers.find((u) => u.id === userId)
  let userArray = usersData.pendingUsers

  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
    userArray = usersData.activeUsers
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  const userIndex = userArray.findIndex((u) => u.id === userId)
  const responsibility = userArray[userIndex].responsibility

  // Update based on responsibility type
  if (responsibility === 'ea') {
    // EA user: mainArea and additionalAreas
    userArray[userIndex].mainArea = req.body.mainArea

    // Handle additionalAreas (checkboxes return array or single value)
    let additionalAreas = req.body.additionalAreas || []
    if (!Array.isArray(additionalAreas)) {
      additionalAreas = [additionalAreas]
    }
    userArray[userIndex].additionalAreas = additionalAreas
  } else if (responsibility === 'pso') {
    // PSO user: eaArea, mainArea (PSO), additionalAreas (PSO)
    userArray[userIndex].eaArea = req.body.eaArea
    userArray[userIndex].mainArea = req.body.mainArea

    let additionalAreas = req.body.additionalAreas || []
    if (!Array.isArray(additionalAreas)) {
      additionalAreas = [additionalAreas]
    }
    userArray[userIndex].additionalAreas = additionalAreas
  } else if (responsibility === 'rma') {
    // RMA user: eaArea, psoArea, mainArea (RMA)
    userArray[userIndex].eaArea = req.body.eaArea
    userArray[userIndex].psoArea = req.body.psoArea
    userArray[userIndex].mainArea = req.body.mainArea
    // Allow optional additional RMAs
    let additionalAreas = req.body.additionalAreas || []
    if (!Array.isArray(additionalAreas)) {
      additionalAreas = [additionalAreas]
    }
    userArray[userIndex].additionalAreas = additionalAreas
  }

  // Write back to file
  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  // Set notification
  req.session.data.userUpdatedNotification = true

  return res.redirect(`/admin/users/${userId}/view`)
})

// Approve pending user - GET /admin/users/:id/approve (simulation for prototype)
router.get('/admin/users/:id/approve', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  // Find user in pending users
  const user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    return res.status(404).send('User not found')
  }

  // Set simulation flags in session
  req.session.data.simulatedApprovedUserId = userId
  req.session.data.userApprovedNotification = true
  req.session.data.userApprovedName = `${user.firstName} ${user.lastName}`

  // Redirect to the user view page to show the simulated active state
  return res.redirect(`/admin/users/${userId}/view`)
})

// Approve pending user - POST /admin/users/:id/approve
router.post('/admin/users/:id/approve', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  // Find user in pending users
  const userIndex = usersData.pendingUsers.findIndex((u) => u.id === userId)
  if (userIndex === -1) {
    return res.status(404).send('User not found')
  }

  const user = usersData.pendingUsers[userIndex]

  // Move to active users
  user.status = 'active'
  user.invitationSentDate = new Date().toISOString().split('T')[0]
  user.invitationSentTime = new Date()
    .toTimeString()
    .split(' ')[0]
    .substring(0, 5)
  user.invitationAccepted = false
  user.accountSuspended = false
  user.lastSignIn = 'Never'

  // Remove from pending, add to active
  usersData.pendingUsers.splice(userIndex, 1)
  usersData.activeUsers.push(user)

  // Write back to file
  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  // Set notification
  req.session.data.userApprovedNotification = true
  req.session.data.userApprovedName = `${user.firstName} ${user.lastName}`

  return res.redirect('/admin/user-management-pending')
})

// Confirm delete user - GET /admin/users/:id/delete
router.get('/admin/users/:id/delete', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  let userType = 'pending'

  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
    userType = 'active'
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  req.session.data.currentUserType = userType

  return res.render('admin/user-delete-confirm')
})

// Delete user - POST /admin/users/:id/delete
router.post('/admin/users/:id/delete', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  if (req.body.confirm !== 'yes') {
    return res.redirect(`/admin/users/${userId}/view`)
  }

  // Find and remove user from either array
  let pendingIndex = usersData.pendingUsers.findIndex((u) => u.id === userId)
  let userType = 'pending'
  let userName = ''

  if (pendingIndex !== -1) {
    userName = `${usersData.pendingUsers[pendingIndex].firstName} ${usersData.pendingUsers[pendingIndex].lastName}`
    usersData.pendingUsers.splice(pendingIndex, 1)
  } else {
    const activeIndex = usersData.activeUsers.findIndex((u) => u.id === userId)
    if (activeIndex !== -1) {
      userName = `${usersData.activeUsers[activeIndex].firstName} ${usersData.activeUsers[activeIndex].lastName}`
      usersData.activeUsers.splice(activeIndex, 1)
      userType = 'active'
    } else {
      return res.status(404).send('User not found')
    }
  }

  // Write back to file
  // fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  // Set notification and redirect to appropriate list
  req.session.data.userDeletedNotification = true
  req.session.data.userDeletedName = userName

  const redirectUrl =
    userType === 'pending'
      ? '/admin/user-management-pending'
      : '/admin/user-management-active'
  return res.redirect(redirectUrl)
})

// Resend invitation - POST /admin/users/:id/resend-invitation
router.post('/admin/users/:id/resend-invitation', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  // Find user in active users
  const userIndex = usersData.activeUsers.findIndex((u) => u.id === userId)
  if (userIndex === -1) {
    return res.status(404).send('User not found')
  }

  // Update invitation sent date/time
  usersData.activeUsers[userIndex].invitationSentDate = new Date()
    .toISOString()
    .split('T')[0]
  usersData.activeUsers[userIndex].invitationSentTime = new Date()
    .toTimeString()
    .split(' ')[0]
    .substring(0, 5)

  // Write back to file
  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  // Set notification
  req.session.data.userActionNotification = 'Invitation has been resent.'

  return res.redirect(`/admin/users/${userId}/view`)
})

// Reactivate account - POST /admin/users/:id/reactivate
router.post('/admin/users/:id/reactivate', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  // Find user in active users
  const userIndex = usersData.activeUsers.findIndex((u) => u.id === userId)
  if (userIndex === -1) {
    return res.status(404).send('User not found')
  }

  // Reactivate account
  usersData.activeUsers[userIndex].accountSuspended = false

  // Write back to file
  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  // Set notification
  req.session.data.userActionNotification = 'Account has been reactivated.'

  return res.redirect(`/admin/users/${userId}/view`)
})

// Individual area edit routes - GET
// EA routes
router.get('/admin/users/:id/edit-main-ea-area', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-main-ea-area')
})

router.get('/admin/users/:id/edit-ea-additional-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-ea-additional-areas')
})

// PSO routes
router.get('/admin/users/:id/edit-pso-ea-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-pso-ea-areas')
})

router.get('/admin/users/:id/edit-main-pso-area', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-main-pso-area')
})

router.get('/admin/users/:id/edit-pso-additional-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-pso-additional-areas')
})

router.get('/admin/users/:id/edit-rma-ea-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-rma-ea-areas')
})

router.get('/admin/users/:id/edit-rma-pso-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-rma-pso-areas')
})

router.get('/admin/users/:id/edit-main-rma-area', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-main-rma-area')
})

router.get('/admin/users/:id/edit-rma-additional-areas', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.pendingUsers.find((u) => u.id === userId)
  if (!user) {
    user = usersData.activeUsers.find((u) => u.id === userId)
  }

  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  const areasData = loadAreasData()
  const organisationsData = loadOrganisationsData()
  req.session.data.areasData = areasData
  req.session.data.organisationsData = organisationsData

  return res.render('admin/user-edit-rma-additional-areas')
})

// Permission edit routes
router.get('/admin/users/:id/edit-admin-status', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.activeUsers.find((u) => u.id === userId)
  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  return res.render('admin/user-edit-admin')
})

router.post('/admin/users/:id/edit-admin-status', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  const userIndex = usersData.activeUsers.findIndex((u) => u.id === userId)
  if (userIndex === -1) {
    return res.status(404).send('User not found')
  }

  usersData.activeUsers[userIndex].isAdmin = req.body.isAdmin === 'yes'

  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  req.session.data.userUpdatedNotification = true

  return res.redirect(`/admin/users/${userId}/view`)
})

router.get('/admin/users/:id/edit-nfm-screening', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()

  let user = usersData.activeUsers.find((u) => u.id === userId)
  if (!user) {
    return res.status(404).send('User not found')
  }

  req.session.data.currentUser = user
  return res.render('admin/user-edit-nfm')
})

router.post('/admin/users/:id/edit-nfm-screening', function (req, res) {
  const userId = req.params.id
  const usersData = loadUsersData()
  const usersDataPath = path.join(__dirname, 'data', 'users.json')

  const userIndex = usersData.activeUsers.findIndex((u) => u.id === userId)
  if (userIndex === -1) {
    return res.status(404).send('User not found')
  }

  usersData.activeUsers[userIndex].nfmScreeningTeam =
    req.body.nfmScreeningTeam === 'yes'

  fs.writeFileSync(usersDataPath, JSON.stringify(usersData, null, 2))

  req.session.data.userUpdatedNotification = true

  return res.redirect(`/admin/users/${userId}/view`)
})

// Post handlers for individual area routes
router.post('/admin/users/:id/edit-main-ea-area', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  currentUser.mainArea = req.body.mainArea
  const areasData = loadAreasData()
  const area = findEaArea(areasData, req.body.mainArea)
  currentUser.mainAreaName = area ? area.name : undefined

  return res.redirect(`/admin/users/${userId}/edit-ea-additional-areas`)
})

router.post('/admin/users/:id/edit-ea-additional-areas', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  let additionalAreas = req.body.additionalAreas || []
  if (!Array.isArray(additionalAreas)) {
    additionalAreas = [additionalAreas]
  }
  currentUser.additionalAreas = additionalAreas

  const areasData = loadAreasData()
  currentUser.additionalAreasNames = mapIdsToNames(additionalAreas, areasData, 'ea')

  return res.redirect(`/admin/users/${userId}/edit-check-answers`)
})

router.post('/admin/users/:id/edit-pso-ea-areas', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  let eaAreas = req.body.psoEaAreas || []
  if (!Array.isArray(eaAreas)) {
    eaAreas = [eaAreas]
  }
  currentUser.psoEaAreas = eaAreas

  const areasData = loadAreasData()
  currentUser.psoEaAreasNames = mapIdsToNames(eaAreas, areasData, 'ea')

  return res.redirect(`/admin/users/${userId}/edit-main-pso-area`)
})

router.post('/admin/users/:id/edit-main-pso-area', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  currentUser.mainArea = req.body.mainArea
  const areasData = loadAreasData()
  const area = findPsoArea(areasData, req.body.mainArea)
  currentUser.mainAreaName = area ? area.name : undefined

  return res.redirect(`/admin/users/${userId}/edit-pso-additional-areas`)
})

router.post('/admin/users/:id/edit-pso-additional-areas', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  let additionalAreas = req.body.additionalAreas || []
  if (!Array.isArray(additionalAreas)) {
    additionalAreas = [additionalAreas]
  }
  currentUser.additionalAreas = additionalAreas

  const areasData = loadAreasData()
  currentUser.additionalAreasNames = mapIdsToNames(additionalAreas, areasData, 'pso')

  return res.redirect(`/admin/users/${userId}/edit-check-answers`)
})

router.post('/admin/users/:id/edit-rma-ea-areas', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  let eaAreas = req.body.rmaEaAreas || []
  if (!Array.isArray(eaAreas)) {
    eaAreas = [eaAreas]
  }
  currentUser.rmaEaAreas = eaAreas

  const areasData = loadAreasData()
  currentUser.rmaEaAreasNames = mapIdsToNames(eaAreas, areasData, 'ea')

  return res.redirect(`/admin/users/${userId}/edit-rma-pso-areas`)
})

router.post('/admin/users/:id/edit-rma-pso-areas', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  let psoAreas = req.body.rmaPsoAreas || []
  if (!Array.isArray(psoAreas)) {
    psoAreas = [psoAreas]
  }
  currentUser.rmaPsoAreas = psoAreas

  const areasData = loadAreasData()
  currentUser.rmaPsoAreasNames = mapIdsToNames(psoAreas, areasData, 'pso')

  return res.redirect(`/admin/users/${userId}/edit-main-rma-area`)
})

router.post('/admin/users/:id/edit-main-rma-area', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  currentUser.mainArea = req.body.mainArea
  const areasData = loadAreasData()
  const area = findRmaArea(areasData, req.body.mainArea)
  currentUser.mainAreaName = area ? area.name : undefined

  return res.redirect(`/admin/users/${userId}/edit-rma-additional-areas`)
})

router.post('/admin/users/:id/edit-rma-additional-areas', function (req, res) {
  const userId = req.params.id
  const currentUser = req.session.data.currentUser

  if (!currentUser || currentUser.id !== userId) {
    return res.status(404).send('User session not found')
  }

  let additionalAreas = req.body.additionalAreas || []
  if (!Array.isArray(additionalAreas)) {
    additionalAreas = [additionalAreas]
  }
  currentUser.additionalAreas = additionalAreas

  const areasData = loadAreasData()
  currentUser.additionalAreasNames = mapIdsToNames(additionalAreas, areasData, 'rma')

  return res.redirect(`/admin/users/${userId}/edit-check-answers`)
})

// Proposal routes

// GET proposals list page
router.get('/proposal/proposals', function (req, res) {
  let projectsData = loadProjectsData()

  const searchFilter = (req.query.search || req.query.q || '').trim()
  const statusFilter = (req.query.status || '').trim()

  if (statusFilter) {
    const statusLower = statusFilter.toLowerCase()
    projectsData = projectsData.filter((project) => {
      const projectStatus = (project.status || '').toLowerCase()
      return projectStatus === statusLower
    })
  }

  if (searchFilter) {
    const search = searchFilter.toLowerCase()
    projectsData = projectsData.filter(
      (project) =>
        (project.projectNumber || '').toLowerCase().includes(search) ||
        (project.projectName || '').toLowerCase().includes(search)
    )
  }

  // Transform projects data to match template expectations
  const proposals = projectsData.map((project) => ({
    referenceNumber: project.projectNumber,
    name: project.projectName,
    areaName: project.createdBy,
    lastUpdated: project.lastUpdated,
    status: project.status,
    inProgramme: project.assignedRMA
  }))

  req.session.data.search = searchFilter
  req.session.data.status = statusFilter

  res.render('proposal/proposals', {
    data: req.session.data,
    proposals: proposals,
    hasProjects: proposals.length > 0
  })
})

// GET create proposal start page
router.get('/proposal/create-proposal/start', function (req, res) {
  const error = req.query.error
  res.render('proposal/create-proposal/start', {
    data: req.session.data,
    error: error
  })
})

// POST create proposal start
router.post('/proposal/create-proposal/start', function (req, res) {
  const confirm = req.body.confirm

  // Validation: confirm must be 'yes'
  if (confirm !== 'yes') {
    return res.redirect('/proposal/create-proposal/start?error=confirm-empty')
  }

  // Clear any previous proposal data
  req.session.data.proposalTitle = undefined
  req.session.data.selectedRma = undefined
  req.session.data.proposalLocation = undefined
  req.session.data.projectType = undefined
  req.session.data.primaryAsset = undefined
  req.session.data.assets = undefined
  req.session.data.fundingSources = undefined
  req.session.data.financialYear = undefined
  req.session.data.financialYearAfter = undefined

  // Validation passed, proceed to title page
  res.redirect('/proposal/create-proposal/title')
})

// GET proposal title page
router.get('/proposal/create-proposal/title', function (req, res) {
  const error = req.query.error
  const fromOverview = req.query.from === 'overview'
  let errorMessage = ''
  if (error === 'project-title-empty') {
    errorMessage = 'Enter a project name'
  }
  res.render('proposal/create-proposal/title', {
    data: req.session.data,
    errorMessage: errorMessage,
    formData: req.session.data,
    fromOverview: fromOverview
  })
})

// POST proposal title
router.post('/proposal/create-proposal/title', function (req, res) {
  const projectTitle = (req.body.projectTitle || '').trim()
  const fromOverview = req.body.fromOverview === 'true'

  // Validation: projectTitle must not be empty
  if (!projectTitle) {
    return res.redirect(
      `/proposal/create-proposal/title?error=project-title-empty${fromOverview ? '&from=overview' : ''}`
    )
  }

  req.session.data.proposalTitle = projectTitle
  req.session.data.projectTitle = projectTitle
  if (fromOverview) {
    return res.redirect('/proposal/create-proposal/check-answers')
  }
  res.redirect('/proposal/create-proposal/rma-selection')
})

// GET proposal title unique check page
router.get('/proposal/create-proposal/title-unique', function (req, res) {
  res.render('proposal/create-proposal/title-unique', {
    data: req.session.data,
    formData: req.session.data
  })
})

// POST proposal title unique check
router.post('/proposal/create-proposal/title-unique', function (req, res) {
  // In a real app, check if project name already exists
  // For now, just proceed to RMA selection
  res.redirect('/proposal/create-proposal/rma-selection')
})

// GET RMA selection page
router.get('/proposal/create-proposal/rma-selection', function (req, res) {
  const organisationsData = loadOrganisationsData()
  const error = req.query.error
  const fromOverview = req.query.from === 'overview'
  let errorMessage = ''
  if (error === 'rma-not-selected') {
    errorMessage = 'Select a lead risk management authority'
  }

  // Filter for RMA type organisations and format as options
  const rmaOptions = organisationsData
    .filter((org) => org.type === 'RMA')
    .map((org) => ({
      value: org.id.toString(),
      label: org.name
    }))

  res.render('proposal/create-proposal/rma-selection', {
    data: req.session.data,
    rmaOptions: rmaOptions,
    errorMessage: errorMessage,
    formData: req.session.data,
    fromOverview: fromOverview
  })
})

// POST RMA selection
router.post('/proposal/create-proposal/rma-selection', function (req, res) {
  const selectedRma = req.body.rmaName
  const fromOverview = req.body.fromOverview === 'true'

  // Validation: RMA must be selected
  if (!selectedRma) {
    return res.redirect(
      `/proposal/create-proposal/rma-selection?error=rma-not-selected${fromOverview ? '&from=overview' : ''}`
    )
  }

  // Store selected RMA id and label for later display
  const organisationsData = loadOrganisationsData()
  const selectedOrg = organisationsData.find(
    (org) => org.type === 'RMA' && String(org.id) === String(selectedRma)
  )

  req.session.data.selectedRma = selectedRma
  req.session.data.selectedRmaLabel = selectedOrg ? selectedOrg.name : undefined

  if (fromOverview) {
    return res.redirect('/proposal/create-proposal/check-answers')
  }
  res.redirect('/proposal/create-proposal/project-type')
})

// GET location page (kept for reference, but not in main flow)
router.get('/proposal/create-proposal/location', function (req, res) {
  const error = req.query.error
  let errorMessage = ''
  if (error === 'grid-ref-empty') {
    errorMessage = 'Enter a National Grid Reference'
  } else if (error === 'grid-ref-invalid') {
    errorMessage =
      'Enter a valid National Grid Reference in the format AA 12345 67890'
  }
  res.render('proposal/create-proposal/location', {
    data: req.session.data,
    errorMessage: errorMessage,
    formData: req.session.data
  })
})

// POST location
router.post('/proposal/create-proposal/location', function (req, res) {
  let gridReference = (req.body['grid-reference'] || '').trim()

  // Validation: grid reference must not be empty
  if (!gridReference) {
    return res.redirect(
      '/proposal/create-proposal/location?error=grid-ref-empty'
    )
  }

  // Normalise case and spacing (single spaces between parts)
  gridReference = gridReference.toUpperCase().replace(/\s+/g, ' ')

  // Strict validation: 2 letters, space, 5 digits, space, 5 digits (for example ST 58198 72725)
  const gridRefRegex = /^[A-Z]{2}\s\d{5}\s\d{5}$/
  if (!gridRefRegex.test(gridReference)) {
    return res.redirect(
      '/proposal/create-proposal/location?error=grid-ref-invalid'
    )
  }

  // Store the normalised grid reference for reuse on the overview page
  req.session.data['grid-reference'] = gridReference
  req.session.data.proposalLocation = gridReference

  // After capturing the grid reference, go to the project benefit area upload step
  res.redirect('/proposal/create-proposal/benefit-area-file')
})

// GET benefit area shapefile upload page
router.get('/proposal/create-proposal/benefit-area-file', function (req, res) {
  const validation = req.query.validation
  let errorMessage

  if (validation === 'required') {
    errorMessage =
      'Upload a shapefile that outlines the area the project is likely to benefit'
  } else if (validation === 'file-format') {
    errorMessage =
      'The selected file must be a zip file, containing the following mandatory files: dbf, shx, shp, prj.'
  } else if (validation === 'virus') {
    errorMessage = 'The file was rejected because it may contain a virus.'
  }

  res.render('proposal/create-proposal/benefit-area-file', {
    data: req.session.data,
    errorMessage: errorMessage
  })
})

// POST benefit area shapefile upload (prototype stub)
router.post('/proposal/create-proposal/benefit-area-file', function (req, res) {
  // The Prototype Kit does not parse multipart file uploads by default, so we
  // cannot reliably inspect the real file here. For the purposes of this
  // prototype, always treat a submission as a successful upload and store a
  // stub filename in the session.

  const uploadedFieldName = (req.body['benefit-area-file'] || '').trim()
  const uploadedName = uploadedFieldName || 'uploaded-shapefile.zip'

  req.session.data['benefit-area-file'] = uploadedName
  req.session.data['benefit-area-file-uploaded'] = true

  // Store a simple uploaded date for display (prototype – not timezone-precise)
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  req.session.data['benefit-area-uploaded-date'] = `${day}/${month}/${year}`

  return res.redirect('/proposal/create-proposal/benefit-area-file-uploaded')
})

// GET uploaded shapefile summary table
router.get(
  '/proposal/create-proposal/benefit-area-file-uploaded',
  function (req, res) {
    if (!req.session.data['benefit-area-file-uploaded']) {
      return res.redirect('/proposal/create-proposal/benefit-area-file')
    }

    res.render('proposal/create-proposal/benefit-area-file-uploaded', {
      data: req.session.data
    })
  }
)

// POST uploaded shapefile summary table – continue to check answers
router.post(
  '/proposal/create-proposal/benefit-area-file-uploaded',
  function (req, res) {
    return res.redirect('/proposal/create-proposal/check-answers')
  }
)

// GET delete confirmation for benefit area file
router.get(
  '/proposal/create-proposal/benefit-area-file-delete',
  function (req, res) {
    if (!req.session.data['benefit-area-file-uploaded']) {
      return res.redirect('/proposal/create-proposal/benefit-area-file')
    }

    res.render('proposal/create-proposal/benefit-area-file-delete', {
      data: req.session.data
    })
  }
)

// POST delete confirmation for benefit area file
router.post(
  '/proposal/create-proposal/benefit-area-file-delete',
  function (req, res) {
    const choice = req.body.confirmDelete

    if (choice === 'yes') {
      delete req.session.data['benefit-area-file']
      delete req.session.data['benefit-area-file-uploaded']
      delete req.session.data['benefit-area-uploaded-date']
      return res.redirect('/proposal/create-proposal/benefit-area-file')
    }

    return res.redirect('/proposal/create-proposal/benefit-area-file-uploaded')
  }
)

// GET project type page
// Question 1: Project Type
router.get('/proposal/create-proposal/project-type', function (req, res) {
  const error = req.query.error
  const fromOverview = req.query.from === 'overview'
  let errorMessage = ''
  if (error === 'project-type-empty') {
    errorMessage = 'Select a project type'
  }

  const projectTypeOptions = [
    {
      value: 'DEF',
      label:
        'Create a new flood and coastal erosion risk management asset, or change an existing approach to risk management in an area already with assets'
    },
    {
      value: 'REF',
      label:
        'Substantially renew or replace, one or more asset elements or components in an existing flood and coastal erosion risk management asset'
    },
    {
      value: 'REP',
      label:
        'Replace an existing flood and coastal erosion risk management asset that is at the end of its life with another asset which sustains the standard of service and the design performance on an equivalent basis'
    },
    {
      value: 'ELO',
      label:
        'Implement measures to address impacts arising from existing or historic flood or coastal erosion risk management assets or actions to comply with specified environmental legislation - Sites of Special Scientific Interest (SSSIs) and Water Environment Regulations (WER)'
    },
    {
      value: 'HCR',
      label:
        'Implement measures to protect, compensate or restore habitats and natural functions, to support coastal risk management legal compliance (Habitat Regulations) and wider environmental outcomes'
    },
    {
      value: 'STR',
      label:
        'Produce a strategy for complex flood or coastal erosion risk situations across several interconnected areas'
    },
    {
      value: 'STU',
      label:
        'To support the case that a project is needed to resolve a flood or coastal erosion risk problem – helping to define the scope, purpose, and viability of any future project(s)'
    }
  ]

  res.render('proposal/create-proposal/project-type', {
    data: req.session.data,
    projectTypeOptions: projectTypeOptions,
    errorMessage: errorMessage,
    formData: req.session.data,
    fromOverview: fromOverview
  })
})

// POST project type
router.post('/proposal/create-proposal/project-type', function (req, res) {
  const projectType = req.body.projectType
  const fromOverview = req.body.fromOverview === 'true'

  // Validation: project type must be selected
  if (!projectType) {
    return res.redirect(
      `/proposal/create-proposal/project-type?error=project-type-empty${fromOverview ? '&from=overview' : ''}`
    )
  }

  req.session.data.projectType = projectType
  if (fromOverview) {
    return res.redirect('/proposal/create-proposal/check-answers')
  }
  if (projectType === 'DEF' || projectType === 'REP' || projectType === 'REF') {
    return res.redirect('/proposal/create-proposal/project-type-assets')
  }
  return res.redirect('/proposal/create-proposal/financial-year')
})

// Question 2a: Asset Types (Interventions)
router.get(
  '/proposal/create-proposal/project-type-assets',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'assets-empty') {
      errorMessage = 'Select at least one intervention type'
    }

    const projectType = req.session.data.projectType

    // All intervention types
    const allInterventions = [
      { value: 'NFM', label: 'Natural Flood Management' },
      { value: 'PFE', label: 'Property Flood Resilience' },
      { value: 'SUD', label: 'Sustainable Drainage Systems' },
      { value: 'OTH', label: 'Other' }
    ]

    // Filter interventions based on project type
    let assetTypeOptions = []
    if (projectType === 'DEF') {
      // DEF can have: NFM, PFE, SUD, OTH
      assetTypeOptions = allInterventions
    } else if (projectType === 'REF') {
      // REF can have: NFM, SUD, OTH
      assetTypeOptions = allInterventions.filter((i) =>
        ['NFM', 'SUD', 'OTH'].includes(i.value)
      )
    } else if (projectType === 'REP') {
      // REP can have: NFM, PFE, SUD, OTH
      assetTypeOptions = allInterventions
    }

    res.render('proposal/create-proposal/project-type-assets', {
      data: req.session.data,
      assetTypeOptions: assetTypeOptions,
      errorMessage: errorMessage,
      formData: req.session.data,
      fromOverview: req.query.from === 'overview'
    })
  }
)

// POST Question 2a: Asset Types
router.post(
  '/proposal/create-proposal/project-type-assets',
  function (req, res) {
    let assetTypes = toArray(req.body.assetTypes)
    assetTypes = assetTypes.filter((type) => type && type !== '_unchecked')
    const fromOverview = req.body.fromOverview === 'true'

    // Validation: at least one asset type must be selected
    if (assetTypes.length === 0) {
      return res.redirect(
        `/proposal/create-proposal/project-type-assets?error=assets-empty${fromOverview ? '&from=overview' : ''}`
      )
    }

    req.session.data.assetTypes = assetTypes

    // If only one selection, automatically set it as primary benefit and skip to financial-year
    // If multiple selections, go to Question 2b (primary benefit)
    if (assetTypes.length === 1) {
      req.session.data.primaryBenefit = assetTypes[0]
      if (fromOverview) {
        return res.redirect('/proposal/create-proposal/check-answers')
      }
      return res.redirect('/proposal/create-proposal/financial-year')
    }
    return res.redirect(
      '/proposal/create-proposal/project-type-primary-benefit'
    )
  }
)

// Question 2b: Primary Benefit (only shown if multiple interventions selected)
router.get(
  '/proposal/create-proposal/project-type-primary-benefit',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'primary-benefit-empty') {
      errorMessage = 'Select which intervention will provide the most benefit'
    }

    // Generate options based on selected asset types in Question 2a
    const assetTypeMap = {
      NFM: { value: 'NFM', label: 'Natural Flood Management' },
      PFE: { value: 'PFE', label: 'Property Flood Resilience' },
      SUD: { value: 'SUD', label: 'Sustainable Drainage Systems' },
      OTH: { value: 'OTH', label: 'Other' }
    }

    // Only show options that are valid and were selected
    const selectedAssetTypes = (req.session.data.assetTypes || []).filter(
      (type) => assetTypeMap[type]
    )
    const primaryBenefitOptions = selectedAssetTypes.map(
      (type) => assetTypeMap[type]
    )

    res.render('proposal/create-proposal/project-type-primary-benefit', {
      data: req.session.data,
      primaryBenefitOptions: primaryBenefitOptions,
      errorMessage: errorMessage,
      formData: req.session.data,
      fromOverview: req.query.from === 'overview'
    })
  }
)

// POST Question 2b: Primary Benefit
router.post(
  '/proposal/create-proposal/project-type-primary-benefit',
  function (req, res) {
    const primaryBenefit = req.body.primaryBenefit
    const fromOverview = req.body.fromOverview === 'true'

    // Validation: primary benefit must be selected
    if (!primaryBenefit) {
      return res.redirect(
        `/proposal/create-proposal/project-type-primary-benefit?error=primary-benefit-empty${fromOverview ? '&from=overview' : ''}`
      )
    }

    req.session.data.primaryBenefit = primaryBenefit
    if (fromOverview) {
      return res.redirect('/proposal/create-proposal/check-answers')
    }
    res.redirect('/proposal/create-proposal/financial-year')
  }
)

// GET financial year start page
router.get('/proposal/create-proposal/financial-year', function (req, res) {
  const error = req.query.error
  const fromOverview = req.query.from === 'overview'
  let errorMessage = ''
  if (error === 'financial-year-empty') {
    errorMessage =
      'Select the financial year when the project first requires funding'
  }

  // Calculate current and next 5 financial years
  const now = new Date()
  let currentYear =
    now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const years = []
  for (let i = 0; i < 6; i++) {
    years.push({
      value: `${currentYear + i}`,
      label: `April ${currentYear + i} to March ${currentYear + i + 1}`
    })
  }
  const afterYear = currentYear + 5 + 1

  res.render('proposal/create-proposal/financial-year', {
    data: req.session.data,
    financialYearOptions: years,
    afterYear: afterYear,
    errorMessage: errorMessage,
    formData: req.session.data,
    fromOverview: fromOverview
  })
})

// POST financial year start page
router.post('/proposal/create-proposal/financial-year', function (req, res) {
  const selectedYear = req.body.financialYear
  const afterYear = req.body.afterYear
  const fromOverview = req.body.fromOverview === 'true'

  if (selectedYear) {
    req.session.data.financialYear = selectedYear
    const yearNumber = Number(selectedYear)
    if (!Number.isNaN(yearNumber)) {
      req.session.data.financialYearLabel = `April ${yearNumber} to March ${yearNumber + 1}`
    } else {
      req.session.data.financialYearLabel = selectedYear
    }
    // Clear the 'after' field since they're the same
    delete req.session.data.financialYearAfter
    if (fromOverview) {
      return res.redirect('/proposal/create-proposal/check-answers')
    }
    return res.redirect('/proposal/create-proposal/financial-year-spending')
  }
  if (afterYear) {
    return res.redirect('/proposal/create-proposal/financial-year-after')
  }
  return res.redirect(
    '/proposal/create-proposal/financial-year?error=financial-year-empty'
  )
})

router.get(
  '/proposal/create-proposal/financial-year-after',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'financial-year-after-empty') {
      errorMessage =
        'Enter the financial year when the project will begin spending funds'
    } else if (error === 'financial-year-after-invalid') {
      errorMessage = 'Enter a valid financial year'
    } else if (error === 'financial-year-after-past') {
      errorMessage = 'The financial year must be in the future'
    } else if (error === 'financial-year-after-future') {
      errorMessage = 'The financial year must be 2100 or earlier'
    }
    res.render('proposal/create-proposal/financial-year-after', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST financial year after page
router.post(
  '/proposal/create-proposal/financial-year-after',
  function (req, res) {
    const afterYearValue = (req.body.financialYearAfter || '').trim()

    // Calculate current financial year
    const now = new Date()
    const currentFinancialYear =
      now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1

    if (!afterYearValue) {
      return res.redirect(
        '/proposal/create-proposal/financial-year-after?error=financial-year-after-empty'
      )
    }

    const yearNumber = Number(afterYearValue)

    // Validate it's a number
    if (Number.isNaN(yearNumber)) {
      return res.redirect(
        '/proposal/create-proposal/financial-year-after?error=financial-year-after-invalid'
      )
    }

    // Validate it's current year or later
    if (yearNumber < currentFinancialYear) {
      return res.redirect(
        '/proposal/create-proposal/financial-year-after?error=financial-year-after-past'
      )
    }

    // Validate it's 2100 or earlier
    if (yearNumber > 2100) {
      return res.redirect(
        '/proposal/create-proposal/financial-year-after?error=financial-year-after-future'
      )
    }

    req.session.data.financialYear = afterYearValue
    req.session.data.financialYearLabel = `April ${yearNumber} to March ${yearNumber + 1}`
    // Keep afterYearValue for tracking that manual entry was used
    req.session.data.financialYearAfter = afterYearValue
    req.session.data.financialYearAfterLabel = `April ${yearNumber} to March ${yearNumber + 1}`

    return res.redirect('/proposal/create-proposal/financial-year-spending')
  }
)

router.get(
  '/proposal/create-proposal/financial-year-spending',
  function (req, res) {
    const error = req.query.error
    const fromOverview = req.query.from === 'overview'
    let errorMessage = ''
    if (error === 'financial-year-spending-empty') {
      errorMessage =
        'Select the financial year when the project will stop spending funds'
    } else if (error === 'financial-year-spending-before-start') {
      errorMessage = 'The end year must be after the start year'
    }

    // Calculate current and next 5 financial years
    // But start from the project start year if it's later
    const now = new Date()
    let currentYear =
      now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const startYear = Number(
      req.session.data.financialYear ||
      req.session.data.financialYearAfter ||
      currentYear
    )

    // Use the later of current year or start year
    const baseYear = Math.max(currentYear, startYear)

    const years = []
    for (let i = 0; i < 6; i++) {
      years.push({
        value: `${baseYear + i}`,
        label: `April ${baseYear + i} to March ${baseYear + i + 1}`
      })
    }
    const afterYear = baseYear + 5 + 1

    res.render('proposal/create-proposal/financial-year-spending', {
      data: req.session.data,
      financialYearOptions: years,
      afterYear: afterYear,
      errorMessage: errorMessage,
      formData: req.session.data,
      fromOverview: fromOverview
    })
  }
)

// POST financial year spending page
router.post(
  '/proposal/create-proposal/financial-year-spending',
  function (req, res) {
    const selectedYear = req.body.financialYearSpending
    const afterYear = req.body.afterYear
    const fromOverview = req.body.fromOverview === 'true'

    if (selectedYear) {
      const yearNumber = Number(selectedYear)
      const startYear = Number(
        req.session.data.financialYear || req.session.data.financialYearAfter
      )

      // Validate end year is after start year
      if (
        !Number.isNaN(yearNumber) &&
        !Number.isNaN(startYear) &&
        yearNumber <= startYear
      ) {
        return res.redirect(
          `/proposal/create-proposal/financial-year-spending?error=financial-year-spending-before-start${fromOverview ? '&from=overview' : ''}`
        )
      }

      req.session.data.financialYearSpending = selectedYear
      if (!Number.isNaN(yearNumber)) {
        req.session.data.financialYearSpendingLabel = `April ${yearNumber} to March ${yearNumber + 1}`
      } else {
        req.session.data.financialYearSpendingLabel = selectedYear
      }
      // Clear the 'after' field since they're the same
      delete req.session.data.financialYearSpendingAfter
      return res.redirect('/proposal/create-proposal/check-answers')
    }
    if (afterYear) {
      return res.redirect(
        `/proposal/create-proposal/financial-year-spending-after${fromOverview ? '?from=overview' : ''}`
      )
    }
    return res.redirect(
      `/proposal/create-proposal/financial-year-spending?error=financial-year-spending-empty${fromOverview ? '&from=overview' : ''}`
    )
  }
)

router.get(
  '/proposal/create-proposal/financial-year-spending-after',
  function (req, res) {
    const error = req.query.error
    const fromOverview = req.query.from === 'overview'
    let errorMessage = ''
    if (error === 'financial-year-spending-after-empty') {
      errorMessage =
        'Enter the financial year when the project will stop spending funds'
    } else if (error === 'financial-year-spending-after-invalid') {
      errorMessage = 'Enter a valid financial year'
    } else if (error === 'financial-year-spending-after-past') {
      errorMessage = 'The financial year must be in the future'
    } else if (error === 'financial-year-spending-after-future') {
      errorMessage = 'The financial year must be 2100 or earlier'
    } else if (error === 'financial-year-spending-after-before-start') {
      errorMessage = 'The end year must be after the start year'
    }
    res.render('proposal/create-proposal/financial-year-spending-after', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data,
      fromOverview: fromOverview
    })
  }
)

// POST financial year spending after page
router.post(
  '/proposal/create-proposal/financial-year-spending-after',
  function (req, res) {
    const afterYearValue = (req.body.financialYearSpendingAfter || '').trim()
    const fromOverview = req.body.fromOverview === 'true'

    // Calculate current financial year
    const now = new Date()
    const currentFinancialYear =
      now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    const startYear = Number(
      req.session.data.financialYear || req.session.data.financialYearAfter
    )

    console.log('DEBUG: Start year validation')
    console.log('  financialYear:', req.session.data.financialYear)
    console.log('  financialYearAfter:', req.session.data.financialYearAfter)
    console.log('  startYear (calculated):', startYear)
    console.log('  afterYearValue (end year):', afterYearValue)
    console.log('  yearNumber (end year as number):', Number(afterYearValue))

    if (!afterYearValue) {
      return res.redirect(
        `/proposal/create-proposal/financial-year-spending-after?error=financial-year-spending-after-empty${fromOverview ? '&from=overview' : ''}`
      )
    }

    const yearNumber = Number(afterYearValue)

    // Validate it's a number
    if (Number.isNaN(yearNumber)) {
      return res.redirect(
        `/proposal/create-proposal/financial-year-spending-after?error=financial-year-spending-after-invalid${fromOverview ? '&from=overview' : ''}`
      )
    }

    // Validate it's current year or later
    if (yearNumber < currentFinancialYear) {
      return res.redirect(
        `/proposal/create-proposal/financial-year-spending-after?error=financial-year-spending-after-past${fromOverview ? '&from=overview' : ''}`
      )
    }

    // Validate it's 2100 or earlier
    if (yearNumber > 2100) {
      return res.redirect(
        `/proposal/create-proposal/financial-year-spending-after?error=financial-year-spending-after-future${fromOverview ? '&from=overview' : ''}`
      )
    }

    // Validate it's after start year
    if (!Number.isNaN(startYear) && yearNumber <= startYear) {
      return res.redirect(
        `/proposal/create-proposal/financial-year-spending-after?error=financial-year-spending-after-before-start${fromOverview ? '&from=overview' : ''}`
      )
    }

    req.session.data.financialYearSpending = afterYearValue
    req.session.data.financialYearSpendingLabel = `April ${yearNumber} to March ${yearNumber + 1}`
    // Keep afterYearValue for tracking that manual entry was used
    req.session.data.financialYearSpendingAfter = afterYearValue
    req.session.data.financialYearSpendingAfterLabel = `April ${yearNumber} to March ${yearNumber + 1}`
    return res.redirect('/proposal/create-proposal/check-answers')
  }
)

// Important dates routes

const IMPORTANT_DATES_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

function parseMonthYear(monthStr, yearStr) {
  const month = Number((monthStr || '').trim())
  const year = Number((yearStr || '').trim())
  if (Number.isNaN(month) || Number.isNaN(year)) {
    return null
  }
  return { month, year }
}

function isMonthYearPlausible(date) {
  if (!date) return false
  return (
    date.month >= 1 &&
    date.month <= 12 &&
    date.year >= 2000 &&
    date.year <= 2100
  )
}

function isDateInFuture(date) {
  if (!date) return false
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  return (
    date.year > currentYear ||
    (date.year === currentYear && date.month > currentMonth)
  )
}

function isLaterThan(dateA, dateB) {
  if (!dateA || !dateB) return false
  if (dateA.year > dateB.year) return true
  if (dateA.year === dateB.year && dateA.month > dateB.month) return true
  return false
}

function formatMonthYear(date) {
  if (!date || !isMonthYearPlausible(date)) return null
  const monthName = IMPORTANT_DATES_MONTH_NAMES[date.month - 1]
  if (!monthName) return null
  return `${monthName} ${date.year}`
}

// GET OBC Start Date
router.get(
  '/proposal/create-proposal/important-dates/obc-start',
  function (req, res) {
    const error = req.query.error
    const fromOverview = req.query.from === 'overview'
    let errorMessage = ''
    if (error === 'obc-start-empty') {
      errorMessage =
        "Enter the date you expect to award the project's main contract"
    }
    res.render('proposal/create-proposal/obc-start-date', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data,
      fromOverview: fromOverview
    })
  }
)

// POST OBC Start Date
router.post(
  '/proposal/create-proposal/important-dates/obc-start',
  function (req, res) {
    const sessionData = req.session.data || {}
    const monthInput = (req.body['obc-start-month'] || '').trim()
    const yearInput = (req.body['obc-start-year'] || '').trim()

    sessionData['obc-start-month'] = monthInput
    sessionData['obc-start-year'] = yearInput

    const date = parseMonthYear(monthInput, yearInput)

    // Presence and plausibility (month 1-12, year 2000-2100)
    if (!monthInput || !yearInput || !isMonthYearPlausible(date)) {
      return res.render('proposal/create-proposal/obc-start-date', {
        data: sessionData,
        // From StartOutlineBusinessCaseDateStep
        errorMessage:
          'Enter the date you expect to start your outline business case',
        formData: sessionData
      })
    }

    // Must be in the future (cannot be in the past)
    if (!isDateInFuture(date)) {
      return res.render('proposal/create-proposal/obc-start-date', {
        data: sessionData,
        errorMessage: 'You cannot enter a date in the past',
        formData: sessionData
      })
    }

    req.session.data['obc-start-month'] = monthInput
    req.session.data['obc-start-year'] = yearInput
    res.redirect('/proposal/create-proposal/important-dates/obc-completion')
  }
)

// GET OBC Completion Date
router.get(
  '/proposal/create-proposal/important-dates/obc-completion',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'obc-completion-empty') {
      // From CompleteOutlineBusinessCaseDateStep
      errorMessage =
        'Enter the date you expect to complete the project’s outline business case'
    }
    res.render('proposal/create-proposal/obc-completion-date', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST OBC Completion Date
router.post(
  '/proposal/create-proposal/important-dates/obc-completion',
  function (req, res) {
    const sessionData = req.session.data || {}
    const monthInput = (req.body['obc-completion-month'] || '').trim()
    const yearInput = (req.body['obc-completion-year'] || '').trim()

    sessionData['obc-completion-month'] = monthInput
    sessionData['obc-completion-year'] = yearInput

    const completionDate = parseMonthYear(monthInput, yearInput)

    // Presence and plausibility
    if (!monthInput || !yearInput || !isMonthYearPlausible(completionDate)) {
      return res.render('proposal/create-proposal/obc-completion-date', {
        data: sessionData,
        errorMessage:
          'Enter the date you expect to complete the project’s outline business case',
        formData: sessionData
      })
    }

    // Must be after start of outline business case (if we have that date)
    const startDate = parseMonthYear(
      sessionData['obc-start-month'],
      sessionData['obc-start-year']
    )

    if (
      isMonthYearPlausible(startDate) &&
      isLaterThan(startDate, completionDate)
    ) {
      const startLabel =
        formatMonthYear(startDate) || `${startDate.month} ${startDate.year}`
      const message =
        'You expect to start your outline business case on ' +
        startLabel +
        '. The date you expect to complete your outline business case must come after this date.'

      return res.render('proposal/create-proposal/obc-completion-date', {
        data: sessionData,
        errorMessage: message,
        formData: sessionData
      })
    }

    req.session.data['obc-completion-month'] = monthInput
    req.session.data['obc-completion-year'] = yearInput
    res.redirect('/proposal/create-proposal/important-dates/contract-awarded')
  }
)

// GET Contract Awarded Date
router.get(
  '/proposal/create-proposal/important-dates/contract-awarded',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'contract-awarded-empty') {
      // From AwardContractDateStep
      errorMessage =
        "Enter the date you expect to award the project's main contract"
    }
    res.render('proposal/create-proposal/contract-awarded-date', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST Contract Awarded Date
router.post(
  '/proposal/create-proposal/important-dates/contract-awarded',
  function (req, res) {
    const sessionData = req.session.data || {}
    const monthInput = (req.body['contract-awarded-month'] || '').trim()
    const yearInput = (req.body['contract-awarded-year'] || '').trim()

    sessionData['contract-awarded-month'] = monthInput
    sessionData['contract-awarded-year'] = yearInput

    const awardDate = parseMonthYear(monthInput, yearInput)

    // Presence and plausibility
    if (!monthInput || !yearInput || !isMonthYearPlausible(awardDate)) {
      return res.render('proposal/create-proposal/contract-awarded-date', {
        data: sessionData,
        errorMessage:
          "Enter the date you expect to award the project's main contract",
        formData: sessionData
      })
    }

    // Must be after outline business case completion (if we have that date)
    const completionDate = parseMonthYear(
      sessionData['obc-completion-month'],
      sessionData['obc-completion-year']
    )

    if (
      isMonthYearPlausible(completionDate) &&
      isLaterThan(completionDate, awardDate)
    ) {
      const completionLabel =
        formatMonthYear(completionDate) ||
        `${completionDate.month} ${completionDate.year}`
      const message =
        'You expect to complete your outline business case on ' +
        completionLabel +
        ". The date you expect to award the project's main contract must come after this date."

      return res.render('proposal/create-proposal/contract-awarded-date', {
        data: sessionData,
        errorMessage: message,
        formData: sessionData
      })
    }

    req.session.data['contract-awarded-month'] = monthInput
    req.session.data['contract-awarded-year'] = yearInput
    res.redirect('/proposal/create-proposal/important-dates/start-construction')
  }
)

// GET Start Construction Date
router.get(
  '/proposal/create-proposal/important-dates/start-construction',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'start-construction-empty') {
      // From StartConstructionDateStep (reuses award_contract message)
      errorMessage =
        "Enter the date you expect to award the project's main contract"
    }
    res.render('proposal/create-proposal/start-construction-date', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST Start Construction Date
router.post(
  '/proposal/create-proposal/important-dates/start-construction',
  function (req, res) {
    const sessionData = req.session.data || {}
    const monthInput = (req.body['start-construction-month'] || '').trim()
    const yearInput = (req.body['start-construction-year'] || '').trim()

    sessionData['start-construction-month'] = monthInput
    sessionData['start-construction-year'] = yearInput

    const startConstructionDate = parseMonthYear(monthInput, yearInput)

    // Presence and plausibility
    if (
      !monthInput ||
      !yearInput ||
      !isMonthYearPlausible(startConstructionDate)
    ) {
      return res.render('proposal/create-proposal/start-construction-date', {
        data: sessionData,
        errorMessage:
          "Enter the date you expect to award the project's main contract",
        formData: sessionData
      })
    }

    // Must be after award of main contract (if we have that date)
    const awardDate = parseMonthYear(
      sessionData['contract-awarded-month'],
      sessionData['contract-awarded-year']
    )

    if (
      isMonthYearPlausible(awardDate) &&
      isLaterThan(awardDate, startConstructionDate)
    ) {
      const awardLabel =
        formatMonthYear(awardDate) || `${awardDate.month} ${awardDate.year}`
      const message =
        "You expect to award the project's main contract on " +
        awardLabel +
        '. The date you expect to start the work must come after this date.'

      return res.render('proposal/create-proposal/start-construction-date', {
        data: sessionData,
        errorMessage: message,
        formData: sessionData
      })
    }

    req.session.data['start-construction-month'] = monthInput
    req.session.data['start-construction-year'] = yearInput
    res.redirect('/proposal/create-proposal/important-dates/ready-for-service')
  }
)

// GET Ready for Service Date
router.get(
  '/proposal/create-proposal/important-dates/ready-for-service',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'ready-for-service-empty') {
      // From ReadyForServiceDateStep
      errorMessage =
        'Enter the date you expect the project to start achieving its benefits'
    }
    res.render('proposal/create-proposal/ready-for-service-date', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST Ready for Service Date
router.post(
  '/proposal/create-proposal/important-dates/ready-for-service',
  function (req, res) {
    const sessionData = req.session.data || {}
    const monthInput = (req.body['ready-for-service-month'] || '').trim()
    const yearInput = (req.body['ready-for-service-year'] || '').trim()

    sessionData['ready-for-service-month'] = monthInput
    sessionData['ready-for-service-year'] = yearInput

    const readyForServiceDate = parseMonthYear(monthInput, yearInput)

    // Presence and plausibility
    if (
      !monthInput ||
      !yearInput ||
      !isMonthYearPlausible(readyForServiceDate)
    ) {
      return res.render('proposal/create-proposal/ready-for-service-date', {
        data: sessionData,
        errorMessage:
          'Enter the date you expect the project to start achieving its benefits',
        formData: sessionData
      })
    }

    // Must be after start of construction (if we have that date)
    const startConstructionDate = parseMonthYear(
      sessionData['start-construction-month'],
      sessionData['start-construction-year']
    )

    if (
      isMonthYearPlausible(startConstructionDate) &&
      isLaterThan(startConstructionDate, readyForServiceDate)
    ) {
      const startLabel =
        formatMonthYear(startConstructionDate) ||
        `${startConstructionDate.month} ${startConstructionDate.year}`
      const message =
        'You expect to start the work on ' +
        startLabel +
        '. The date you expect the project to start achieving its benefits must come after this date.'

      return res.render('proposal/create-proposal/ready-for-service-date', {
        data: sessionData,
        errorMessage: message,
        formData: sessionData
      })
    }

    req.session.data['ready-for-service-month'] = monthInput
    req.session.data['ready-for-service-year'] = yearInput
    res.redirect(
      '/proposal/create-proposal/important-dates/could-start-earlier'
    )
  }
)

// GET Could Start Earlier
router.get(
  '/proposal/create-proposal/important-dates/could-start-earlier',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'could-start-earlier-empty') {
      errorMessage =
        'Select yes if the project could start earlier if Grant in Aid funding was made available'
    }
    res.render('proposal/create-proposal/could-start-earlier', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST Could Start Earlier
router.post(
  '/proposal/create-proposal/important-dates/could-start-earlier',
  function (req, res) {
    const couldStartEarlier = req.body['could-start-earlier']

    if (!couldStartEarlier) {
      return res.redirect(
        '/proposal/create-proposal/important-dates/could-start-earlier?error=could-start-earlier-empty'
      )
    }

    req.session.data['could-start-earlier'] = couldStartEarlier

    if (couldStartEarlier === 'yes') {
      return res.redirect(
        '/proposal/create-proposal/important-dates/earliest-with-gia'
      )
    }

    // If no, skip the date question and go to check answers
    req.session.data['important-dates-added'] = true
    res.redirect('/proposal/create-proposal/check-answers')
  }
)

// GET Earliest Start Date With GIA
router.get(
  '/proposal/create-proposal/important-dates/earliest-with-gia',
  function (req, res) {
    const error = req.query.error
    let errorMessage = ''
    if (error === 'earliest-with-gia-empty') {
      errorMessage = 'Tell us the earliest date the project can start'
    } else if (error === 'earliest-with-gia-invalid-month') {
      errorMessage = 'The month must be between 1 and 12'
    } else if (error === 'earliest-with-gia-invalid-year') {
      errorMessage = 'The year must be between 2000 and 2100'
    } else if (error === 'earliest-with-gia-past') {
      errorMessage = 'You cannot enter a date in the past'
    }
    res.render('proposal/create-proposal/earliest-with-gia-date', {
      data: req.session.data,
      errorMessage: errorMessage,
      formData: req.session.data
    })
  }
)

// POST Earliest Start Date With GIA
router.post(
  '/proposal/create-proposal/important-dates/earliest-with-gia',
  function (req, res) {
    const sessionData = req.session.data || {}
    const monthInput = (req.body['earliest-with-gia-month'] || '').trim()
    const yearInput = (req.body['earliest-with-gia-year'] || '').trim()

    sessionData['earliest-with-gia-month'] = monthInput
    sessionData['earliest-with-gia-year'] = yearInput

    const earliestDate = parseMonthYear(monthInput, yearInput)

    // Presence check
    if (!monthInput || !yearInput) {
      return res.redirect(
        '/proposal/create-proposal/important-dates/earliest-with-gia?error=earliest-with-gia-empty'
      )
    }

    // Month validation
    if (!earliestDate || earliestDate.month < 1 || earliestDate.month > 12) {
      return res.redirect(
        '/proposal/create-proposal/important-dates/earliest-with-gia?error=earliest-with-gia-invalid-month'
      )
    }

    // Year validation
    if (earliestDate.year < 2000 || earliestDate.year > 2100) {
      return res.redirect(
        '/proposal/create-proposal/important-dates/earliest-with-gia?error=earliest-with-gia-invalid-year'
      )
    }

    // Check if date is in future
    if (!isDateInFuture(earliestDate)) {
      return res.redirect(
        '/proposal/create-proposal/important-dates/earliest-with-gia?error=earliest-with-gia-past'
      )
    }

    req.session.data['earliest-with-gia-month'] = monthInput
    req.session.data['earliest-with-gia-year'] = yearInput
    req.session.data['important-dates-added'] = true
    res.redirect('/proposal/create-proposal/check-answers')
  }
)

// Funding sources routes
router.get('/proposal/create-proposal/funding-sources', function (req, res) {
  const data = req.session.data || {}
  res.render('proposal/create-proposal/funding-sources', {
    data: data
  })
})

router.post('/proposal/create-proposal/funding-sources', function (req, res) {
  const data = req.session.data || {}
  const selected = normaliseArray(req.body['funding-sources'])
  data['funding-sources'] = selected

  if (!selected || selected.length === 0) {
    data['funding-sources-error'] =
      'The project must have at least one funding source.'
    return res.render('proposal/create-proposal/funding-sources', {
      data: data
    })
  }

  delete data['funding-sources-error']
  data['funding-section-started'] = true
  const nextStep = nextFundingStepAfterSources(data)
  return res.redirect(nextStep)
})

// Additional FCRM Grant in Aid funding sources
router.get('/proposal/create-proposal/funding-fcrm-gia', function (req, res) {
  const data = req.session.data || {}

  // If growth funding (additional FCRM GiA) not selected, skip this step
  if (!hasBaseFundingSource(data, 'fcrm-grant')) {
    const nextStep = nextFundingStepAfterGia(data)
    return res.redirect(nextStep)
  }

  res.render('proposal/create-proposal/funding-fcrm-gia', {
    data: data
  })
})

router.post('/proposal/create-proposal/funding-fcrm-gia', function (req, res) {
  const data = req.session.data || {}
  const selected = normaliseArray(req.body['gia-funding-sources'])
  data['gia-funding-sources'] = selected

  if (!selected || selected.length === 0) {
    data['funding-fcrm-gia-error'] =
      'The project must have at least one additional FCRM Grant in aid funding source.'
    return res.render('proposal/create-proposal/funding-fcrm-gia', {
      data: data
    })
  }

  delete data['funding-fcrm-gia-error']
  const nextStep = nextFundingStepAfterGia(data)
  return res.redirect(nextStep)
})

// Public contributors
router.get(
  '/proposal/create-proposal/funding/public-contributors',
  function (req, res) {
    const data = req.session.data || {}

    if (!hasBaseFundingSource(data, 'public-sector')) {
      const nextStep = nextFundingStepAfterPublicValues(data)
      return res.redirect(nextStep)
    }

    data.publicContributors = data.publicContributors || ['']

    res.render('proposal/create-proposal/funding-public-contributors', {
      data: data
    })
  }
)

router.post(
  '/proposal/create-proposal/funding/public-contributors',
  function (req, res) {
    const data = req.session.data || {}
    const action = req.body.action
    const raw = toArray(req.body['public-contributors'])

    if (action === 'add') {
      data.publicContributors = raw.concat([''])
      delete data['public-contributors-error']
      return res.render(
        'proposal/create-proposal/funding-public-contributors',
        {
          data: data
        }
      )
    }

    const names = raw.map((n) => (n || '').trim()).filter((n) => n)

    if (names.length === 0) {
      data['public-contributors-error'] = 'Please add at least one contributor'
      data.publicContributors = raw
      return res.render(
        'proposal/create-proposal/funding-public-contributors',
        {
          data: data
        }
      )
    }

    const lower = names.map((n) => n.toLowerCase())
    const hasDuplicates = lower.some((n, idx) => lower.indexOf(n) !== idx)
    if (hasDuplicates) {
      data['public-contributors-error'] =
        'Please add each contributor only once'
      data.publicContributors = raw
      return res.render(
        'proposal/create-proposal/funding-public-contributors',
        {
          data: data
        }
      )
    }

    delete data['public-contributors-error']
    data.publicContributors = names
    return res.redirect(
      '/proposal/create-proposal/funding/public-contributor-values'
    )
  }
)

// Public contributor values
router.get(
  '/proposal/create-proposal/funding/public-contributor-values',
  function (req, res) {
    const data = req.session.data || {}

    if (
      !hasBaseFundingSource(data, 'public-sector') ||
      !Array.isArray(data.publicContributors) ||
      data.publicContributors.length === 0
    ) {
      const nextStep = nextFundingStepAfterPublicValues(data)
      return res.redirect(nextStep)
    }

    data.publicContributorValues = data.publicContributorValues || {}

    const fundingYears = getFundingYears(data)

    res.render('proposal/create-proposal/funding-public-contributor-values', {
      data: data,
      fundingYears: fundingYears
    })
  }
)

router.post(
  '/proposal/create-proposal/funding/public-contributor-values',
  function (req, res) {
    const data = req.session.data || {}
    const names = Array.isArray(data.publicContributors)
      ? data.publicContributors
      : []

    const years = getFundingYears(data)
    const values = {}
    let hasError = false

    names.forEach((name, index) => {
      let contributorTotal = 0
      const yearValues = {}

      years.forEach((year) => {
        const amountField = `public-contributor-amount-${index}-${year}`
        const securedField = `public-contributor-secured-${index}-${year}`
        const constrainedField = `public-contributor-constrained-${index}-${year}`

        const rawAmount = (req.body[amountField] || '')
          .toString()
          .replace(/,/g, '')
        const amount = rawAmount === '' ? 0 : Number(rawAmount)

        if (!Number.isNaN(amount)) {
          yearValues[year] = {
            amount: amount,
            secured: !!req.body[securedField],
            constrained: !!req.body[constrainedField]
          }
          contributorTotal += amount
        } else {
          yearValues[year] = {
            amount: 0,
            secured: !!req.body[securedField],
            constrained: !!req.body[constrainedField]
          }
        }
      })

      if (contributorTotal <= 0) {
        hasError = true
      }

      values[name] = yearValues
    })

    if (hasError) {
      data['public-contributor-values-error'] =
        'Please ensure you enter at least one value for every contributor'
      data.publicContributorValues = values
      return res.render(
        'proposal/create-proposal/funding-public-contributor-values',
        {
          data: data,
          fundingYears: years
        }
      )
    }

    delete data['public-contributor-values-error']
    data.publicContributorValues = values

    const nextStep = nextFundingStepAfterPublicValues(data)
    return res.redirect(nextStep)
  }
)

// Private contributors
router.get(
  '/proposal/create-proposal/funding/private-contributors',
  function (req, res) {
    const data = req.session.data || {}

    if (!hasBaseFundingSource(data, 'private-sector')) {
      const nextStep = nextFundingStepAfterPrivateValues(data)
      return res.redirect(nextStep)
    }

    data.privateContributors = data.privateContributors || ['']

    res.render('proposal/create-proposal/funding-private-contributors', {
      data: data
    })
  }
)

router.post(
  '/proposal/create-proposal/funding/private-contributors',
  function (req, res) {
    const data = req.session.data || {}
    const action = req.body.action
    const raw = toArray(req.body['private-contributors'])

    if (action === 'add') {
      data.privateContributors = raw.concat([''])
      delete data['private-contributors-error']
      return res.render(
        'proposal/create-proposal/funding-private-contributors',
        {
          data: data
        }
      )
    }

    const names = raw.map((n) => (n || '').trim()).filter((n) => n)

    if (names.length === 0) {
      data['private-contributors-error'] = 'Please add at least one contributor'
      data.privateContributors = raw
      return res.render(
        'proposal/create-proposal/funding-private-contributors',
        {
          data: data
        }
      )
    }

    const lower = names.map((n) => n.toLowerCase())
    const hasDuplicates = lower.some((n, idx) => lower.indexOf(n) !== idx)
    if (hasDuplicates) {
      data['private-contributors-error'] =
        'Please add each contributor only once'
      data.privateContributors = raw
      return res.render(
        'proposal/create-proposal/funding-private-contributors',
        {
          data: data
        }
      )
    }

    delete data['private-contributors-error']
    data.privateContributors = names
    return res.redirect(
      '/proposal/create-proposal/funding/private-contributor-values'
    )
  }
)

// Private contributor values
router.get(
  '/proposal/create-proposal/funding/private-contributor-values',
  function (req, res) {
    const data = req.session.data || {}

    if (
      !hasBaseFundingSource(data, 'private-sector') ||
      !Array.isArray(data.privateContributors) ||
      data.privateContributors.length === 0
    ) {
      const nextStep = nextFundingStepAfterPrivateValues(data)
      return res.redirect(nextStep)
    }

    data.privateContributorValues = data.privateContributorValues || {}

    const fundingYears = getFundingYears(data)

    res.render('proposal/create-proposal/funding-private-contributor-values', {
      data: data,
      fundingYears: fundingYears
    })
  }
)

router.post(
  '/proposal/create-proposal/funding/private-contributor-values',
  function (req, res) {
    const data = req.session.data || {}
    const names = Array.isArray(data.privateContributors)
      ? data.privateContributors
      : []

    const years = getFundingYears(data)
    const values = {}
    let hasError = false

    names.forEach((name, index) => {
      let contributorTotal = 0
      const yearValues = {}

      years.forEach((year) => {
        const amountField = `private-contributor-amount-${index}-${year}`
        const securedField = `private-contributor-secured-${index}-${year}`
        const constrainedField = `private-contributor-constrained-${index}-${year}`

        const rawAmount = (req.body[amountField] || '')
          .toString()
          .replace(/,/g, '')
        const amount = rawAmount === '' ? 0 : Number(rawAmount)

        if (!Number.isNaN(amount)) {
          yearValues[year] = {
            amount: amount,
            secured: !!req.body[securedField],
            constrained: !!req.body[constrainedField]
          }
          contributorTotal += amount
        } else {
          yearValues[year] = {
            amount: 0,
            secured: !!req.body[securedField],
            constrained: !!req.body[constrainedField]
          }
        }
      })

      if (contributorTotal <= 0) {
        hasError = true
      }

      values[name] = yearValues
    })

    if (hasError) {
      data['private-contributor-values-error'] =
        'Please ensure you enter at least one value for every contributor'
      data.privateContributorValues = values
      return res.render(
        'proposal/create-proposal/funding-private-contributor-values',
        {
          data: data,
          fundingYears: years
        }
      )
    }

    delete data['private-contributor-values-error']
    data.privateContributorValues = values

    const nextStep = nextFundingStepAfterPrivateValues(data)
    return res.redirect(nextStep)
  }
)

// Other EA contributors
router.get(
  '/proposal/create-proposal/funding/other-ea-contributors',
  function (req, res) {
    const data = req.session.data || {}

    if (!hasBaseFundingSource(data, 'ea-contributions')) {
      return res.redirect('/proposal/create-proposal/funding-values')
    }

    data.otherEaContributors = data.otherEaContributors || ['']

    res.render('proposal/create-proposal/funding-other-ea-contributors', {
      data: data
    })
  }
)

router.post(
  '/proposal/create-proposal/funding/other-ea-contributors',
  function (req, res) {
    const data = req.session.data || {}
    const action = req.body.action
    const raw = toArray(req.body['other-ea-contributors'])

    if (action === 'add') {
      data.otherEaContributors = raw.concat([''])
      delete data['other-ea-contributors-error']
      return res.render(
        'proposal/create-proposal/funding-other-ea-contributors',
        { data: data }
      )
    }

    const names = raw.map((n) => (n || '').trim()).filter((n) => n)

    if (names.length === 0) {
      data['other-ea-contributors-error'] =
        'Please add at least one contributor'
      data.otherEaContributors = raw
      return res.render(
        'proposal/create-proposal/funding-other-ea-contributors',
        { data: data }
      )
    }

    const lower = names.map((n) => n.toLowerCase())
    const hasDuplicates = lower.some((n, idx) => lower.indexOf(n) !== idx)
    if (hasDuplicates) {
      data['other-ea-contributors-error'] =
        'Please add each contributor only once'
      data.otherEaContributors = raw
      return res.render(
        'proposal/create-proposal/funding-other-ea-contributors',
        { data: data }
      )
    }

    delete data['other-ea-contributors-error']
    data.otherEaContributors = names
    return res.redirect(
      '/proposal/create-proposal/funding/other-ea-contributor-values'
    )
  }
)

// Other EA contributor values
router.get(
  '/proposal/create-proposal/funding/other-ea-contributor-values',
  function (req, res) {
    const data = req.session.data || {}

    if (
      !hasBaseFundingSource(data, 'ea-contributions') ||
      !Array.isArray(data.otherEaContributors) ||
      data.otherEaContributors.length === 0
    ) {
      return res.redirect('/proposal/create-proposal/funding-values')
    }

    data.otherEaContributorValues = data.otherEaContributorValues || {}

    const fundingYears = getFundingYears(data)

    res.render('proposal/create-proposal/funding-other-ea-contributor-values', {
      data: data,
      fundingYears: fundingYears
    })
  }
)

router.post(
  '/proposal/create-proposal/funding/other-ea-contributor-values',
  function (req, res) {
    const data = req.session.data || {}
    const names = Array.isArray(data.otherEaContributors)
      ? data.otherEaContributors
      : []

    const years = getFundingYears(data)
    const values = {}
    let hasError = false

    names.forEach((name, index) => {
      let contributorTotal = 0
      const yearValues = {}

      years.forEach((year) => {
        const amountField = `other-ea-contributor-amount-${index}-${year}`
        const securedField = `other-ea-contributor-secured-${index}-${year}`
        const constrainedField = `other-ea-contributor-constrained-${index}-${year}`

        const rawAmount = (req.body[amountField] || '')
          .toString()
          .replace(/,/g, '')
        const amount = rawAmount === '' ? 0 : Number(rawAmount)

        if (!Number.isNaN(amount)) {
          yearValues[year] = {
            amount: amount,
            secured: !!req.body[securedField],
            constrained: !!req.body[constrainedField]
          }
          contributorTotal += amount
        } else {
          yearValues[year] = {
            amount: 0,
            secured: !!req.body[securedField],
            constrained: !!req.body[constrainedField]
          }
        }
      })

      if (contributorTotal <= 0) {
        hasError = true
      }

      values[name] = yearValues
    })

    if (hasError) {
      data['other-ea-contributor-values-error'] =
        'Please ensure you enter at least one value for every contributor'
      data.otherEaContributorValues = values
      return res.render(
        'proposal/create-proposal/funding-other-ea-contributor-values',
        { data: data, fundingYears: years }
      )
    }

    delete data['other-ea-contributor-values-error']
    data.otherEaContributorValues = values

    return res.redirect('/proposal/create-proposal/funding-values')
  }
)

// Funding values
router.get('/proposal/create-proposal/funding-values', function (req, res) {
  const data = req.session.data || {}

  const sources = getFundingValueSources(data)
  if (!sources || sources.length === 0) {
    // No non-aggregated sources to enter values for; skip to summary
    return res.redirect('/proposal/create-proposal/funding-values-summary')
  }

  const startYearRaw = data.financialYear || data.financialYearAfter
  const endYearRaw =
    data.financialYearSpending || data.financialYearSpendingAfter
  const startYear = Number(startYearRaw)
  const endYear = Number(endYearRaw)
  const years = []
  if (
    !Number.isNaN(startYear) &&
    !Number.isNaN(endYear) &&
    endYear >= startYear
  ) {
    for (let y = startYear; y <= endYear; y++) {
      years.push(y)
    }
  }

  res.render('proposal/create-proposal/funding-values', {
    data: data,
    fundingSources: sources,
    fundingYears: years
  })
})

router.post('/proposal/create-proposal/funding-values', function (req, res) {
  const data = req.session.data || {}

  const sources = getFundingValueSources(data)
  if (!sources || sources.length === 0) {
    return res.redirect('/proposal/create-proposal/funding-values-summary')
  }

  const startYearRaw = data.financialYear || data.financialYearAfter
  const endYearRaw =
    data.financialYearSpending || data.financialYearSpendingAfter
  const startYear = Number(startYearRaw)
  const endYear = Number(endYearRaw)
  const years = []
  if (
    !Number.isNaN(startYear) &&
    !Number.isNaN(endYear) &&
    endYear >= startYear
  ) {
    for (let y = startYear; y <= endYear; y++) {
      years.push(y)
    }
  }

  const fundingValues = {}
  const totalsPerSource = {}

  years.forEach((year) => {
    fundingValues[year] = fundingValues[year] || {}
    sources.forEach((source) => {
      const fieldName = `funding-value-${year}-${source}`
      const rawAmount = (req.body[fieldName] || '').toString().replace(/,/g, '')
      const amount = rawAmount === '' ? 0 : Number(rawAmount)
      if (!Number.isNaN(amount)) {
        fundingValues[year][source] = amount
        totalsPerSource[source] = (totalsPerSource[source] || 0) + amount
      } else {
        fundingValues[year][source] = 0
      }
    })
  })

  const invalidSources = sources.filter(
    (s) => !totalsPerSource[s] || totalsPerSource[s] <= 0
  )

  if (invalidSources.length > 0) {
    data['funding-values-error'] =
      'Please ensure at least one value is added for each funding source'
    data['funding-values'] = fundingValues

    return res.render('proposal/create-proposal/funding-values', {
      data: data,
      fundingSources: sources,
      fundingYears: years
    })
  }

  delete data['funding-values-error']
  data['funding-values'] = fundingValues

  return res.redirect('/proposal/create-proposal/funding-values-summary')
})

// Funding values summary
router.get(
  '/proposal/create-proposal/funding-values-summary',
  function (req, res) {
    const data = req.session.data || {}

    const sources = getFundingValueSources(data)
    const fundingValues = data['funding-values'] || {}

    const fundingTotals = sources.map((source) => {
      let total = 0
      Object.keys(fundingValues).forEach((yearKey) => {
        const yearValues = fundingValues[yearKey] || {}
        const amount = Number(yearValues[source] || 0)
        if (!Number.isNaN(amount)) {
          total += amount
        }
      })
      return {
        key: source,
        label: getFundingSourceLabel(source),
        total: total
      }
    })

    const grandTotal = fundingTotals.reduce((sum, item) => sum + item.total, 0)

    res.render('proposal/create-proposal/funding-values-summary', {
      data: data,
      fundingTotals: fundingTotals,
      grandTotal: grandTotal
    })
  }
)

router.post(
  '/proposal/create-proposal/funding-values-summary',
  function (req, res) {
    return res.redirect('/proposal/create-proposal/check-answers')
  }
)

// GET check answers page
router.get('/proposal/create-proposal/check-answers', function (req, res) {
  const data = req.session.data

  let locationMapUrl
  const gridRef = data && data['grid-reference']
  if (gridRef) {
    const query = gridRef.toUpperCase().replace(/\s+/g, '+')
    locationMapUrl = `https://gridreferencefinder.com/?gr=${query}`
  }

  const importantDates = {
    obcStart: formatMonthYear(
      parseMonthYear(
        data && data['obc-start-month'],
        data && data['obc-start-year']
      )
    ),
    obcCompletion: formatMonthYear(
      parseMonthYear(
        data && data['obc-completion-month'],
        data && data['obc-completion-year']
      )
    ),
    contractAwarded: formatMonthYear(
      parseMonthYear(
        data && data['contract-awarded-month'],
        data && data['contract-awarded-year']
      )
    ),
    startConstruction: formatMonthYear(
      parseMonthYear(
        data && data['start-construction-month'],
        data && data['start-construction-year']
      )
    ),
    readyForService: formatMonthYear(
      parseMonthYear(
        data && data['ready-for-service-month'],
        data && data['ready-for-service-year']
      )
    ),
    couldStartEarlier: data && data['could-start-earlier'],
    earliestWithGia: formatMonthYear(
      parseMonthYear(
        data && data['earliest-with-gia-month'],
        data && data['earliest-with-gia-year']
      )
    )
  }

  const fundingSources = (data && data['funding-sources']) || []
  const giaFundingSources = (data && data['gia-funding-sources']) || []

  // Combine base funding sources and FCRM GIA sources
  const allSelectedSources = [...fundingSources, ...giaFundingSources]

  const fundingSummary = {
    selectedSources: allSelectedSources.map((key) => ({
      key: key,
      label: getFundingSourceLabel(key)
    }))
  }

  const fundingSectionStarted = !!(data && data['funding-section-started'])

  res.render('proposal/create-proposal/check-answers', {
    data: data,
    locationMapUrl: locationMapUrl,
    importantDates: importantDates,
    fundingSummary: fundingSummary,
    fundingSectionStarted: fundingSectionStarted
  })
})

// POST check answers - submit proposal
router.post('/proposal/create-proposal/check-answers', function (req, res) {
  // In a real application, save the proposal to database
  req.session.data.proposalSubmitted = true
  req.session.data.newProposalId = 'PROP-' + Date.now()
  res.redirect('/proposal/proposals')
})

// GET risks page
router.get('/proposal/create-proposal/risks', function (req, res) {
  const data = req.session.data
  const fundingYears = getFundingYears(data)

  res.render('proposal/create-proposal/risks', {
    data: data,
    fundingYears: fundingYears
  })
})

// POST risks page
router.post('/proposal/create-proposal/risks', function (req, res) {
  const data = req.session.data

  // Clear any previous error
  delete data['risks-error']

  // Helper to check if a checkbox is checked
  function isChecked(val) {
    if (!val) return false
    if (Array.isArray(val)) {
      return val.includes('true')
    }
    return val === 'true'
  }

  // Get checkbox values from the submitted form
  const fluvialFlooding = isChecked(req.body['fluvial-flooding'])
  const tidalFlooding = isChecked(req.body['tidal-flooding'])
  const groundwaterFlooding = isChecked(req.body['groundwater-flooding'])
  const surfaceWaterFlooding = isChecked(req.body['surface-water-flooding'])
  const seaFlooding = isChecked(req.body['sea-flooding'])
  const reservoirFlooding = isChecked(req.body['reservoir-flooding'])
  const coastalErosion = isChecked(req.body['coastal-erosion'])

  const selectedRisks = []
  if (fluvialFlooding) selectedRisks.push('fluvial-flooding')
  if (tidalFlooding) selectedRisks.push('tidal-flooding')
  if (groundwaterFlooding) selectedRisks.push('groundwater-flooding')
  if (surfaceWaterFlooding) selectedRisks.push('surface-water-flooding')
  if (seaFlooding) selectedRisks.push('sea-flooding')
  if (reservoirFlooding) selectedRisks.push('reservoir-flooding')
  if (coastalErosion) selectedRisks.push('coastal-erosion')

  if (selectedRisks.length === 0) {
    data['risks-error'] = 'Please select at least one risk'
    // Don't save any values, just redirect to show error
    return res.redirect('/proposal/create-proposal/risks')
  }

  // Clear previous risk selections first
  delete data['fluvial-flooding']
  delete data['tidal-flooding']
  delete data['groundwater-flooding']
  delete data['surface-water-flooding']
  delete data['sea-flooding']
  delete data['reservoir-flooding']
  delete data['coastal-erosion']

  // Save only the checked selections
  if (fluvialFlooding) data['fluvial-flooding'] = 'true'
  if (tidalFlooding) data['tidal-flooding'] = 'true'
  if (groundwaterFlooding) data['groundwater-flooding'] = 'true'
  if (surfaceWaterFlooding) data['surface-water-flooding'] = 'true'
  if (seaFlooding) data['sea-flooding'] = 'true'
  if (reservoirFlooding) data['reservoir-flooding'] = 'true'
  if (coastalErosion) data['coastal-erosion'] = 'true'

  data['risks-selected'] = true
  data['selected-risks'] = selectedRisks

  // If multiple risks selected, ask for main risk
  if (selectedRisks.length > 1) {
    res.redirect('/proposal/create-proposal/main-risk')
  } else {
    // Single risk selected, set it as main risk automatically
    data['main-risk'] = selectedRisks[0]
    res.redirect('/proposal/create-proposal/properties-affected-flooding')
  }
})

// GET main risk page
router.get('/proposal/create-proposal/main-risk', function (req, res) {
  const data = req.session.data

  res.render('proposal/create-proposal/main-risk', {
    data: data
  })
})

// POST main risk page
router.post('/proposal/create-proposal/main-risk', function (req, res) {
  const data = req.session.data

  // Clear any previous error
  delete data['main-risk-error']

  const mainRisk = req.body['main-risk']

  if (!mainRisk) {
    data['main-risk-error'] = 'Please select the main source of risk'
    return res.redirect('/proposal/create-proposal/main-risk')
  }

  // Save the main risk
  data['main-risk'] = mainRisk

  res.redirect('/proposal/create-proposal/properties-affected-flooding')
})

// GET properties affected by flooding
router.get(
  '/proposal/create-proposal/properties-affected-flooding',
  function (req, res) {
    const data = req.session.data
    res.render('proposal/create-proposal/properties-affected-flooding', {
      data: data
    })
  }
)

// POST properties affected by flooding
router.post(
  '/proposal/create-proposal/properties-affected-flooding',
  function (req, res) {
    const data = req.session.data
    delete data['properties-affected-flooding-error']

    // Helper to check if a checkbox is checked
    function isChecked(val) {
      if (!val) return false
      if (Array.isArray(val)) {
        return val.includes('true')
      }
      return val === 'true'
    }

    const noProperties = isChecked(req.body['no-properties-affected-flooding'])

    if (noProperties) {
      data['no-properties-affected-flooding'] = 'true'
      // Clear values
      delete data['properties-maintaining-protection']
      delete data['properties-reducing-risk-50-plus']
      delete data['properties-reducing-risk-less-50']
      delete data['properties-increasing-resilience']
    } else {
      delete data['no-properties-affected-flooding']

      const p1 = req.body['properties-maintaining-protection']
      const p2 = req.body['properties-reducing-risk-50-plus']
      const p3 = req.body['properties-reducing-risk-less-50']
      const p4 = req.body['properties-increasing-resilience']

      // Check if at least one value is provided
      if (!p1 && !p2 && !p3 && !p4) {
        data['properties-affected-flooding-error'] =
          'Enter the number of properties affected by flooding'
        return res.redirect(
          '/proposal/create-proposal/properties-affected-flooding'
        )
      }

      data['properties-maintaining-protection'] = p1
      data['properties-reducing-risk-50-plus'] = p2
      data['properties-reducing-risk-less-50'] = p3
      data['properties-increasing-resilience'] = p4
    }

    // Navigation logic
    if (data['coastal-erosion']) {
      res.redirect(
        '/proposal/create-proposal/properties-affected-coastal-erosion'
      )
    } else {
      res.redirect('/proposal/create-proposal/current-flood-risk')
    }
  }
)

// GET properties affected by coastal erosion
router.get(
  '/proposal/create-proposal/properties-affected-coastal-erosion',
  function (req, res) {
    const data = req.session.data
    res.render('proposal/create-proposal/properties-affected-coastal-erosion', {
      data: data
    })
  }
)

// POST properties affected by coastal erosion
router.post(
  '/proposal/create-proposal/properties-affected-coastal-erosion',
  function (req, res) {
    const data = req.session.data
    delete data['properties-affected-coastal-error']

    // Helper to check if a checkbox is checked
    function isChecked(val) {
      if (!val) return false
      if (Array.isArray(val)) {
        return val.includes('true')
      }
      return val === 'true'
    }

    const noProperties = isChecked(req.body['no-properties-affected-coastal'])

    if (noProperties) {
      data['no-properties-affected-coastal'] = 'true'
      delete data['properties-maintaining-coastal-protection']
      delete data['properties-reducing-coastal-risk']
    } else {
      delete data['no-properties-affected-coastal']

      const p1 = req.body['properties-maintaining-coastal-protection']
      const p2 = req.body['properties-reducing-coastal-risk']

      if (!p1 && !p2) {
        data['properties-affected-coastal-error'] =
          'Enter the number of properties affected by coastal erosion'
        return res.redirect(
          '/proposal/create-proposal/properties-affected-coastal-erosion'
        )
      }

      data['properties-maintaining-coastal-protection'] = p1
      data['properties-reducing-coastal-risk'] = p2
    }

    res.redirect('/proposal/create-proposal/current-flood-risk')
  }
)

// GET current flood risk
router.get('/proposal/create-proposal/current-flood-risk', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/current-flood-risk', { data: data })
})

// POST current flood risk
router.post(
  '/proposal/create-proposal/current-flood-risk',
  function (req, res) {
    const data = req.session.data
    delete data['current-flood-risk-error']

    const risk = req.body['current-flood-risk']

    if (!risk) {
      data['current-flood-risk-error'] = 'Select the current flood risk'
      return res.redirect('/proposal/create-proposal/current-flood-risk')
    }

    data['current-flood-risk'] = risk

    if (data['coastal-erosion']) {
      res.redirect('/proposal/create-proposal/current-coastal-erosion-risk')
    } else {
      res.redirect('/proposal/create-proposal/check-answers')
    }
  }
)

// GET current coastal erosion risk
router.get(
  '/proposal/create-proposal/current-coastal-erosion-risk',
  function (req, res) {
    const data = req.session.data
    res.render('proposal/create-proposal/current-coastal-erosion-risk', {
      data: data
    })
  }
)

// POST current coastal erosion risk
router.post(
  '/proposal/create-proposal/current-coastal-erosion-risk',
  function (req, res) {
    const data = req.session.data
    delete data['current-coastal-risk-error']

    const risk = req.body['current-coastal-risk']

    if (!risk) {
      data['current-coastal-risk-error'] =
        'Select the current coastal erosion risk'
      return res.redirect(
        '/proposal/create-proposal/current-coastal-erosion-risk'
      )
    }

    data['current-coastal-risk'] = risk

    res.redirect('/proposal/create-proposal/check-answers')
  }
)

// GET flood protection outcomes page
router.get(
  '/proposal/create-proposal/flood-protection-outcomes',
  function (req, res) {
    const data = req.session.data
    const fundingYears = getFundingYears(data)

    res.render('proposal/create-proposal/flood-protection-outcomes', {
      data: data,
      fundingYears: fundingYears
    })
  }
)

// POST flood protection outcomes page
router.post(
  '/proposal/create-proposal/flood-protection-outcomes',
  function (req, res) {
    const data = req.session.data
    const fundingYears = getFundingYears(data)

    // Clear any previous error
    delete data['flood-protection-outcomes-error']

    // Save the checkbox
    data['reduced-risk-of-households-for-floods'] =
      req.body['reduced-risk-of-households-for-floods']

    // Save the flood outcomes data
    if (!data['flood-outcomes']) {
      data['flood-outcomes'] = {}
    }

    fundingYears.forEach((year) => {
      if (!data['flood-outcomes'][year]) {
        data['flood-outcomes'][year] = {}
      }
      data['flood-outcomes'][year]['a'] =
        req.body[`flood-outcome-a-${year}`] || ''
      data['flood-outcomes'][year]['b'] =
        req.body[`flood-outcome-b-${year}`] || ''
      data['flood-outcomes'][year]['c'] =
        req.body[`flood-outcome-c-${year}`] || ''
      data['flood-outcomes'][year]['d'] =
        req.body[`flood-outcome-d-${year}`] || ''
      data['flood-outcomes'][year]['e'] =
        req.body[`flood-outcome-e-${year}`] || ''
    })

    // Check if coastal erosion is selected, navigate accordingly
    if (data['coastal-erosion']) {
      // Navigate to coastal erosion outcomes page (to be created)
      res.redirect('/proposal/create-proposal/check-answers')
    } else {
      // Navigate back to overview
      res.redirect('/proposal/create-proposal/check-answers')
    }
  }
)

// Add your routes here

// Environmental Benefits Data
const environmentalBenefits = [
  {
    id: 'intertidal-habitat',
    heading:
      'Will the project create or enhance an intertidal wetland habitat?',
    lede: 'Intertidal wetland habitats are found between the high and low tide marks. The habitats most associated with FCERM works are salt marshes and mud flats.',
    unit: 'hectares'
  },
  {
    id: 'woodland-habitat',
    heading: 'Will the project create or enhance a woodland habitat?',
    lede: 'Woodlands are areas of vegetation dominated by trees that are more than 5m high when mature, which forms a canopy (areas of trees with a canopy greater than 20%). This includes felled, young or newly planted woodland.',
    unit: 'hectares'
  },
  {
    id: 'wet-woodland-habitat',
    heading: 'Will the project create or enhance a wet woodlands habitat?',
    lede: 'Wet woodland habitats have trees associated with wet soils such as alder, birch and willow.',
    unit: 'hectares'
  },
  {
    id: 'wetland-or-wet-grassland-habitat',
    heading:
      'Will the project create or enhance a wetland or wet grassland habitat?',
    lede: 'Wetlands and wet grassland habitats include flood plains, wetlands mosaics, reed beds and bogs.',
    unit: 'hectares'
  },
  {
    id: 'grassland-habitat',
    heading: 'Will the project create or enhance a grassland habitat?',
    lede: 'This is land under permanent-natural or semi-natural grassland, dominated by grassland species with very little or no dwarf shrub, wetland or wooded species within the sward.',
    unit: 'hectares'
  },
  {
    id: 'heathland-habitat',
    heading: 'Will the project create or enhance a heathland habitat?',
    lede: 'This is habitat that covers the full altitudinal range of heathlands and has at least 25% cover of the heathers and other dwarf shrubs, or previously heathland in a degraded state below this.',
    unit: 'hectares'
  },
  {
    id: 'ponds-lakes-habitat',
    heading: 'Will the project create or enhance a pond and/or lake habitat?',
    lede: 'Lakes are generally all bodies of water over 2 hectares in area. Ponds are all bodies of water up to 1 hectare.',
    unit: 'hectares'
  },
  {
    id: 'arable-land-habitat',
    heading: 'Will the project create or enhance an arable land habitat?',
    lede: 'This is land under cultivation, it includes temporary grass leys.',
    unit: 'hectares'
  },
  {
    id: 'comprehensive-restoration',
    heading:
      'Will the project include comprehensive restoration or creation of natural processes, habitats and/or removal of physical modifications?',
    lede: 'This includes creating new channels with minor physical modifications that do not inhibit natural river processes.',
    unit: 'kilometres'
  },
  {
    id: 'partial-restoration',
    heading:
      'Will the project include partial restoration of natural processes, habitats and/or partial removal of physical modifications?',
    lede: 'This includes creating new channels with some physical modifications and partial functioning of natural processes.',
    unit: 'kilometres'
  },
  {
    id: 'create-habitat-watercourse',
    heading:
      'Will the project enhance or create a single major physical or habitat of watercourse?',
    lede: '',
    unit: 'kilometres'
  }
]

// Make environmentalBenefits available to views
router.use((req, res, next) => {
  res.locals.environmentalBenefits = environmentalBenefits
  next()
})

// GET approach
router.get('/proposal/create-proposal/approach', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/approach', { data: data })
})

// POST approach
router.post('/proposal/create-proposal/approach', function (req, res) {
  const data = req.session.data
  delete data['approach-error']

  if (!req.body['approach']) {
    data['approach-error'] =
      'Explain how your project will achieve the outcomes'
    return res.redirect('/proposal/create-proposal/approach')
  }

  res.redirect('/proposal/create-proposal/check-answers')
})

// GET any environmental benefits
router.get(
  '/proposal/create-proposal/any-environmental-benefits',
  function (req, res) {
    const data = req.session.data
    res.render('proposal/create-proposal/any-environmental-benefits', {
      data: data
    })
  }
)

// POST any environmental benefits
router.post(
  '/proposal/create-proposal/any-environmental-benefits',
  function (req, res) {
    const data = req.session.data
    delete data['any-environmental-benefits-error']

    if (!req.body['any-environmental-benefits']) {
      data['any-environmental-benefits-error'] =
        'Select yes if the project includes any environmental benefits'
      return res.redirect(
        '/proposal/create-proposal/any-environmental-benefits'
      )
    }

    if (data['any-environmental-benefits'] === 'yes') {
      res.redirect(
        '/proposal/create-proposal/environmental-benefit/' +
        environmentalBenefits[0].id
      )
    } else {
      res.redirect('/proposal/create-proposal/check-answers')
    }
  }
)

// GET environmental benefit question
router.get(
  '/proposal/create-proposal/environmental-benefit/:benefitId',
  function (req, res) {
    const benefitId = req.params.benefitId
    const benefit = environmentalBenefits.find((b) => b.id === benefitId)
    const index = environmentalBenefits.findIndex((b) => b.id === benefitId)

    let backLink = ''
    if (index === 0) {
      backLink = '/proposal/create-proposal/any-environmental-benefits'
    } else {
      const prevBenefit = environmentalBenefits[index - 1]
      // Check if previous benefit was 'yes', if so back link is amount page
      if (req.session.data[prevBenefit.id] === 'yes') {
        backLink =
          '/proposal/create-proposal/environmental-benefit-amount/' +
          prevBenefit.id
      } else {
        backLink =
          '/proposal/create-proposal/environmental-benefit/' + prevBenefit.id
      }
    }

    res.render('proposal/create-proposal/environmental-benefit-question', {
      pageHeading: benefit.heading,
      lede: benefit.lede,
      benefitId: benefitId,
      backLink: backLink,
      nextLink: '/proposal/create-proposal/environmental-benefit/' + benefitId
    })
  }
)

// POST environmental benefit question
router.post(
  '/proposal/create-proposal/environmental-benefit/:benefitId',
  function (req, res) {
    const benefitId = req.params.benefitId
    const data = req.session.data
    const index = environmentalBenefits.findIndex((b) => b.id === benefitId)

    delete data[benefitId + '-error']

    if (!req.body[benefitId]) {
      data[benefitId + '-error'] =
        'Select yes if the project will create or enhance this habitat'
      return res.redirect(
        '/proposal/create-proposal/environmental-benefit/' + benefitId
      )
    }

    if (data[benefitId] === 'yes') {
      res.redirect(
        '/proposal/create-proposal/environmental-benefit-amount/' + benefitId
      )
    } else {
      if (index < environmentalBenefits.length - 1) {
        res.redirect(
          '/proposal/create-proposal/environmental-benefit/' +
          environmentalBenefits[index + 1].id
        )
      } else {
        res.redirect('/proposal/create-proposal/check-answers')
      }
    }
  }
)

// GET environmental benefit amount
router.get(
  '/proposal/create-proposal/environmental-benefit-amount/:benefitId',
  function (req, res) {
    const benefitId = req.params.benefitId
    const benefit = environmentalBenefits.find((b) => b.id === benefitId)

    // Heading for amount page is slightly different, usually "How many hectares..."
    // But for simplicity and "exactly same" requirement, I'll construct it based on unit.
    let pageHeading = ''
    if (benefit.unit === 'hectares') {
      pageHeading =
        'How many hectares of ' +
        benefit.id.replace(/-/g, ' ').replace('habitat', '').trim() +
        ' habitat will the project create or enhance?'
      // Fix specific wordings if needed to match exactly
      if (benefit.id === 'intertidal-habitat')
        pageHeading =
          'How many hectares of intertidal wetland habitat will the project create or enhance?'
      if (benefit.id === 'woodland-habitat')
        pageHeading =
          'How many hectares of woodland habitat will the project create or enhance?'
      if (benefit.id === 'wet-woodland-habitat')
        pageHeading =
          'How many hectares of wet woodlands habitat will the project create or enhance?'
      if (benefit.id === 'wetland-or-wet-grassland-habitat')
        pageHeading =
          'How many hectares of wetland or wet grassland habitat will the project create or enhance?'
      if (benefit.id === 'grassland-habitat')
        pageHeading =
          'How many hectares of grassland habitat will the project create or enhance?'
      if (benefit.id === 'heathland-habitat')
        pageHeading =
          'How many hectares of heathland habitat will the project create or enhance?'
      if (benefit.id === 'ponds-lakes-habitat')
        pageHeading =
          'How many hectares of pond and/or lake habitat will the project create or enhance?'
      if (benefit.id === 'arable-land-habitat')
        pageHeading =
          'How many hectares of arable land habitat will the project create or enhance?'
    } else {
      if (benefit.id === 'comprehensive-restoration')
        pageHeading =
          'How many kilometres of comprehensive river restoration will be enhanced or created?'
      if (benefit.id === 'partial-restoration')
        pageHeading =
          'How many kilometres of partial restoration will be enhanced or created?'
      if (benefit.id === 'create-habitat-watercourse')
        pageHeading =
          'How many kilometres of single major physical improvement the project will be enhanced or created?'
    }

    res.render('proposal/create-proposal/environmental-benefit-amount', {
      pageHeading: pageHeading,
      benefitId: benefitId,
      unit: benefit.unit,
      backLink: '/proposal/create-proposal/environmental-benefit/' + benefitId,
      nextLink:
        '/proposal/create-proposal/environmental-benefit-amount/' + benefitId
    })
  }
)

// POST environmental benefit amount
router.post(
  '/proposal/create-proposal/environmental-benefit-amount/:benefitId',
  function (req, res) {
    const benefitId = req.params.benefitId
    const index = environmentalBenefits.findIndex((b) => b.id === benefitId)
    const data = req.session.data

    delete data[benefitId + '-amount-error']

    if (!req.body[benefitId + '-amount']) {
      data[benefitId + '-amount-error'] = 'Enter the amount'
      return res.redirect(
        '/proposal/create-proposal/environmental-benefit-amount/' + benefitId
      )
    }

    if (index < environmentalBenefits.length - 1) {
      res.redirect(
        '/proposal/create-proposal/environmental-benefit/' +
        environmentalBenefits[index + 1].id
      )
    } else {
      res.redirect('/proposal/create-proposal/check-answers')
    }
  }
)

// GET property confidence
router.get('/proposal/create-proposal/property-confidence', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/property-confidence', { data: data })
})

// POST property confidence
router.post('/proposal/create-proposal/property-confidence', function (req, res) {
  const data = req.session.data
  delete data['property-confidence-error']

  if (!req.body['property-confidence']) {
    data['property-confidence-error'] = 'Select the confidence level'
    return res.redirect('/proposal/create-proposal/property-confidence')
  }

  res.redirect('/proposal/create-proposal/gateway4-confidence')
})

// GET gateway4 confidence
router.get('/proposal/create-proposal/gateway4-confidence', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/gateway4-confidence', { data: data })
})

// POST gateway4 confidence
router.post('/proposal/create-proposal/gateway4-confidence', function (req, res) {
  const data = req.session.data
  delete data['gateway4-confidence-error']

  if (!req.body['gateway4-confidence']) {
    data['gateway4-confidence-error'] = 'Select the confidence level'
    return res.redirect('/proposal/create-proposal/gateway4-confidence')
  }

  res.redirect('/proposal/create-proposal/funding-confidence')
})

// GET funding confidence
router.get('/proposal/create-proposal/funding-confidence', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/funding-confidence', { data: data })
})

// POST funding confidence
router.post('/proposal/create-proposal/funding-confidence', function (req, res) {
  const data = req.session.data
  delete data['funding-confidence-error']

  if (!req.body['funding-confidence']) {
    data['funding-confidence-error'] = 'Select the confidence level'
    return res.redirect('/proposal/create-proposal/funding-confidence')
  }

  res.redirect('/proposal/create-proposal/check-answers')
})

// GET urgency
router.get('/proposal/create-proposal/urgency', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/urgency', { data: data })
})

// POST urgency
router.post('/proposal/create-proposal/urgency', function (req, res) {
  const data = req.session.data
  delete data['urgency-error']

  if (!req.body['urgency']) {
    data['urgency-error'] = 'Select the reason why your project is urgent'
    return res.redirect('/proposal/create-proposal/urgency')
  }

  if (data['urgency'] === 'not_urgent') {
    res.redirect('/proposal/create-proposal/check-answers')
  } else {
    res.redirect('/proposal/create-proposal/urgency-details')
  }
})

// GET urgency details
router.get('/proposal/create-proposal/urgency-details', function (req, res) {
  const data = req.session.data
  res.render('proposal/create-proposal/urgency-details', { data: data })
})

// POST urgency details
router.post('/proposal/create-proposal/urgency-details', function (req, res) {
  const data = req.session.data
  delete data['urgency-details-error']

  if (!req.body['urgency-details']) {
    // Error message depends on reason
    const reason = data['urgency']
    let error = 'Enter details'
    if (reason === 'statutory_need')
      error =
        'You told us the project is urgent due to a business critical statutory need. Tell us more information about this.'
    if (reason === 'legal_need')
      error =
        'You told us the project is urgent due to a business critical legal need. Tell us more information about this.'
    if (reason === 'health_and_safety')
      error =
        'You told us the project is urgent due to a health and safety issue. Tell us more information about this.'
    if (reason === 'emergency_works')
      error =
        'You told us the project is urgent due to an emergency. Tell us more information about this.'
    if (reason === 'time_limited')
      error =
        'You told us the project is urgent due to a specific aspect of the project that has a time limit. Tell us more information about this.'

    data['urgency-details-error'] = error
    return res.redirect('/proposal/create-proposal/urgency-details')
  }

  res.redirect('/proposal/create-proposal/check-answers')
})

module.exports = router

