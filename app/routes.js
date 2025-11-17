//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const sessionManager = require('./middleware/session-manager')

const sampleProposals = [
  {
    referenceNumber: 'FCRM1-000123',
    name: 'River Foss flood storage improvements',
    areaName: 'Bristol City Council',
    lastUpdated: '2 October 2025',
    status: 'Draft',
    inProgramme: 'Y'
  },
  {
    referenceNumber: 'FCRM1-000456',
    name: 'Coastal erosion mitigation for Seaview',
    areaName: 'Environment Agency – North East',
    lastUpdated: '28 September 2025',
    status: 'Submitted',
    inProgramme: 'Y'
  },
  {
    referenceNumber: 'FCRM1-000789',
    name: 'Upper Thames natural flood management pilot',
    areaName: 'Lancashire County Council',
    lastUpdated: '15 September 2025',
    status: 'Returned with comments',
    inProgramme: 'N'
  }
]

const rmaOptions = [
  { value: 'bristol-city-council', label: 'Bristol City Council' },
  { value: 'dorset-council', label: 'Dorset Council' },
  {
    value: 'environment-agency-north-east',
    label: 'Environment Agency – North East'
  },
  { value: 'lancashire-county-council', label: 'Lancashire County Council' }
]

const projectTypeOptions = [
  {
    value: 'new_or_improve',
    label:
      'Create a new flood or coastal erosion risk management asset or improve the standard of service of an existing one'
  },
  {
    value: 'restore_standard',
    label:
      'Restore the standard of service of a flood or coastal erosion risk management asset by refurbishment or replacement'
  },
  {
    value: 'strategy_complex',
    label:
      'Produce a strategy for complex flood or coastal erosion risk situations across several interconnected areas'
  },
  {
    value: 'environmental_only',
    label:
      'Carry out an environmental project that does not benefit any properties'
  }
]

const assetTypeOptions = [
  { value: 'defences', label: 'Defences (hard engineering)' },
  { value: 'natural-flood-management', label: 'Natural flood management' },
  { value: 'suds', label: 'Sustainable drainage systems' },
  { value: 'property-resilience', label: 'Property flood resilience' }
]

const financialYearOptions = [
  { value: '2025-2026', label: 'April 2025 to March 2026' },
  { value: '2026-2027', label: 'April 2026 to March 2027' },
  { value: '2027-2028', label: 'April 2027 to March 2028' },
  { value: '2028-2029', label: 'April 2028 to March 2029' },
  { value: '2029-2030', label: 'April 2029 to March 2030' },
  { value: '2030-2031', label: 'April 2030 to March 2031' }
]

function getCreateProposalData(req) {
  req.session.data = req.session.data || {}
  if (!req.session.data.createProposal) {
    req.session.data.createProposal = {
      projectTitle: '',
      rmaName: '',
      projectType: '',
      assetTypes: [],
      primaryAsset: '',
      financialYear: ''
    }
  }
  return req.session.data.createProposal
}

function clearCreateProposalData(req) {
  if (req.session.data && req.session.data.createProposal) {
    delete req.session.data.createProposal
  }
}

function normaliseToArray(value) {
  if (!value) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

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
router.get(
  '/email-templates/account-approved-set-password',
  function (req, res) {
    res.render('email-templates/account-approved-set-password', {
      journeyData: req.journeyData
    })
  }
)

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

router.post(
  '/general/request-account/ea-additional-areas',
  function (req, res) {
    res.redirect('/general/request-account/check-answers')
  }
)

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

router.get(
  '/general/request-account/pso-additional-areas',
  function (req, res) {
    req.session.data = req.session.data || {}
    req.session.data.areasData = loadAreasData()
    res.render('general/request-account/pso-additional-areas', {
      journeyData: req.journeyData
    })
  }
)

router.post(
  '/general/request-account/pso-additional-areas',
  function (req, res) {
    res.redirect('/general/request-account/check-answers')
  }
)

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

router.get(
  '/general/request-account/rma-additional-areas',
  function (req, res) {
    req.session.data = req.session.data || {}
    req.session.data.areasData = loadAreasData()
    res.render('general/request-account/rma-additional-areas', {
      journeyData: req.journeyData
    })
  }
)

router.post(
  '/general/request-account/rma-additional-areas',
  function (req, res) {
    res.redirect('/general/request-account/check-answers')
  }
)

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
      journeyData: req.journeyData,
      proposals: sampleProposals,
      hasProjects: sampleProposals.length > 0
    })
  }
})

router.get('/general/proposals-empty', function (req, res) {
  res.render('general/proposals-empty')
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
  res.redirect('/general/create-proposal/start')
})

router.get('/general/create-proposal/start', function (req, res) {
  clearCreateProposalData(req)
  const journeyData = req.journeyData || {}
  res.render('general/create-proposal/start', {
    journeyData: journeyData
  })
})

router.get('/general/create-proposal/title', function (req, res) {
  const formData = getCreateProposalData(req)
  res.render('general/create-proposal/title', {
    journeyData: req.journeyData,
    formData
  })
})

router.post('/general/create-proposal/title', function (req, res) {
  const formData = getCreateProposalData(req)
  formData.projectTitle = (req.body.projectTitle || '').trim()

  if (!formData.projectTitle) {
    return res.render('general/create-proposal/title', {
      journeyData: req.journeyData,
      formData,
      errorMessage: 'Enter a project title'
    })
  }

  res.redirect(
    rmaOptions.length > 1
      ? '/general/create-proposal/rma-selection'
      : '/general/create-proposal/project-type'
  )
})

router.get('/general/create-proposal/rma-selection', function (req, res) {
  const formData = getCreateProposalData(req)
  res.render('general/create-proposal/rma-selection', {
    journeyData: req.journeyData,
    formData,
    rmaOptions
  })
})

router.post('/general/create-proposal/rma-selection', function (req, res) {
  const formData = getCreateProposalData(req)
  formData.rmaName = req.body.rmaName || ''

  if (!formData.rmaName) {
    return res.render('general/create-proposal/rma-selection', {
      journeyData: req.journeyData,
      formData,
      rmaOptions,
      errorMessage: 'Select the lead RMA area'
    })
  }

  res.redirect('/general/create-proposal/project-type')
})

router.get('/general/create-proposal/project-type', function (req, res) {
  const formData = getCreateProposalData(req)
  res.render('general/create-proposal/project-type', {
    journeyData: req.journeyData,
    formData,
    projectTypeOptions,
    assetTypeOptions
  })
})

router.post('/general/create-proposal/project-type', function (req, res) {
  const formData = getCreateProposalData(req)
  formData.projectType = req.body.projectType || ''

  if (!formData.projectType) {
    return res.render('general/create-proposal/project-type', {
      journeyData: req.journeyData,
      formData,
      projectTypeOptions,
      errors: { projectType: 'Select the type of project you are proposing' }
    })
  }

  if (formData.projectType !== 'new_or_improve') {
    formData.assetTypes = []
    formData.primaryAsset = ''
    return res.redirect('/general/create-proposal/financial-year')
  }

  res.redirect('/general/create-proposal/project-type/assets')
})

router.get('/general/create-proposal/project-type/assets', function (req, res) {
  const formData = getCreateProposalData(req)
  if (formData.projectType !== 'new_or_improve') {
    return res.redirect('/general/create-proposal/financial-year')
  }
  res.render('general/create-proposal/project-type-assets', {
    journeyData: req.journeyData,
    formData,
    assetTypeOptions
  })
})

router.post(
  '/general/create-proposal/project-type/assets',
  function (req, res) {
    const formData = getCreateProposalData(req)
    if (formData.projectType !== 'new_or_improve') {
      return res.redirect('/general/create-proposal/financial-year')
    }

    formData.assetTypes = normaliseToArray(req.body.assetTypes)

    if (formData.assetTypes.length === 0) {
      return res.render('general/create-proposal/project-type-assets', {
        journeyData: req.journeyData,
        formData,
        assetTypeOptions,
        errorMessage: 'Select the asset types your project will create'
      })
    }

    res.redirect('/general/create-proposal/project-type/primary-asset')
  }
)

router.get(
  '/general/create-proposal/project-type/primary-asset',
  function (req, res) {
    const formData = getCreateProposalData(req)
    if (
      formData.projectType !== 'new_or_improve' ||
      !formData.assetTypes.length
    ) {
      return res.redirect('/general/create-proposal/project-type')
    }

    const filteredAssets = assetTypeOptions.filter((option) =>
      formData.assetTypes.includes(option.value)
    )

    res.render('general/create-proposal/project-type-primary-asset', {
      journeyData: req.journeyData,
      formData,
      filteredAssets
    })
  }
)

router.post(
  '/general/create-proposal/project-type/primary-asset',
  function (req, res) {
    const formData = getCreateProposalData(req)
    if (
      formData.projectType !== 'new_or_improve' ||
      !formData.assetTypes.length
    ) {
      return res.redirect('/general/create-proposal/project-type')
    }

    formData.primaryAsset = req.body.primaryAsset || ''
    const filteredAssets = assetTypeOptions.filter((option) =>
      formData.assetTypes.includes(option.value)
    )
    const isValid = filteredAssets.some(
      (option) => option.value === formData.primaryAsset
    )

    if (!isValid) {
      return res.render('general/create-proposal/project-type-primary-asset', {
        journeyData: req.journeyData,
        formData,
        filteredAssets,
        errorMessage:
          'Select the asset type that will deliver the most flood risk benefit'
      })
    }

    res.redirect('/general/create-proposal/financial-year')
  }
)

router.get('/general/create-proposal/financial-year', function (req, res) {
  const formData = getCreateProposalData(req)
  res.render('general/create-proposal/financial-year', {
    journeyData: req.journeyData,
    formData,
    financialYearOptions
  })
})

router.post('/general/create-proposal/financial-year', function (req, res) {
  const formData = getCreateProposalData(req)
  formData.financialYear = req.body.financialYear || ''

  if (!formData.financialYear) {
    return res.render('general/create-proposal/financial-year', {
      journeyData: req.journeyData,
      formData,
      financialYearOptions,
      errorMessage:
        'Select the last financial year the project will spend funds'
    })
  }

  res.redirect('/general/create-proposal/check-answers')
})

router.get(
  '/general/create-proposal/financial-year/after',
  function (req, res) {
    const formData = getCreateProposalData(req)
    res.render('general/create-proposal/financial-year-after', {
      journeyData: req.journeyData,
      formData
    })
  }
)

router.post(
  '/general/create-proposal/financial-year/after',
  function (req, res) {
    const formData = getCreateProposalData(req)
    formData.financialYear = (req.body.financialYearAfter || '').trim()

    if (!formData.financialYear) {
      return res.render('general/create-proposal/financial-year-after', {
        journeyData: req.journeyData,
        formData,
        errorMessage:
          'Enter the financial year the project will stop spending funds'
      })
    }

    res.redirect('/general/create-proposal/check-answers')
  }
)

router.get('/general/create-proposal/check-answers', function (req, res) {
  const formData = getCreateProposalData(req)
  const variant = req.query.variant

  // Show legacy variant if requested
  if (variant === 'legacy') {
    return res.render('general/create-proposal/check-answers-legacy', {
      journeyData: req.journeyData,
      status: req.query.status || 'draft' // Can be 'submitted' or 'draft'
    })
  }

  res.render('general/create-proposal/check-answers', {
    journeyData: req.journeyData,
    formData,
    projectTypeOptions,
    assetTypeOptions,
    financialYearOptions,
    rmaOptions
  })
})

router.post('/general/create-proposal/check-answers', function (req, res) {
  clearCreateProposalData(req)
  res.redirect('/general/proposals?variant=1')
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
