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
  const validation = req.query.validation

  let errorMessage = undefined
  if (validation === 'required') {
    errorMessage = 'Enter a project Name'
  } else if (validation === 'alpha-numeric') {
    errorMessage =
      'The project name must only contain letters, underscores, hyphens and numbers'
  }

  res.render('general/create-proposal/title', {
    journeyData: req.journeyData,
    formData,
    errorMessage
  })
})

router.get('/general/create-proposal/title-unique', function (req, res) {
  const formData = getCreateProposalData(req)
  res.render('general/create-proposal/title-unique', {
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
      errorMessage: 'Enter a project Name'
    })
  }

  // Validate that project title contains only alphanumeric characters and spaces
  // This regex allows letters (a-z, A-Z), numbers (0-9), and spaces
  const alphanumericRegex = /^[a-zA-Z0-9\s]+$/
  if (!alphanumericRegex.test(formData.projectTitle)) {
    return res.render('general/create-proposal/title', {
      journeyData: req.journeyData,
      formData,
      errorMessage:
        'The project name must only contain letters, underscores, hyphens and numbers'
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
  const showError = req.query.required === 'true'

  res.render('general/create-proposal/rma-selection', {
    journeyData: req.journeyData,
    formData,
    rmaOptions,
    errorMessage: showError ? 'Select the lead RMA area' : undefined
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
  const validation = req.query.validation

  let errors = undefined
  if (validation === 'required') {
    errors = { projectType: 'Select the type of project you are proposing' }
  }

  res.render('general/create-proposal/project-type', {
    journeyData: req.journeyData,
    formData,
    projectTypeOptions,
    assetTypeOptions,
    errors
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

  const validation = req.query.validation
  let errorMessage = undefined
  if (validation === 'required') {
    errorMessage = 'Select the asset types your project will create'
  }

  res.render('general/create-proposal/project-type-assets', {
    journeyData: req.journeyData,
    formData,
    assetTypeOptions,
    errorMessage
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
    // Filter out '_unchecked' values
    formData.assetTypes = formData.assetTypes.filter(
      (asset) => asset && asset !== '_unchecked'
    )

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
    const validation = req.query.validation

    // Use filtered assets if available, otherwise use all assets for error template
    let filteredAssets = []
    if (formData.assetTypes && formData.assetTypes.length > 0) {
      filteredAssets = assetTypeOptions.filter((option) =>
        formData.assetTypes.includes(option.value)
      )
    } else {
      // For error template, show all assets
      filteredAssets = assetTypeOptions
    }

    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage =
        'Select the asset type that will deliver the most flood risk benefit'
    }

    res.render('general/create-proposal/project-type-primary-asset', {
      journeyData: req.journeyData,
      formData,
      filteredAssets,
      errorMessage
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
  const validation = req.query.validation

  let errorMessage = undefined
  if (validation === 'required') {
    errorMessage = 'Select the last financial year the project will spend funds'
  }

  res.render('general/create-proposal/financial-year', {
    journeyData: req.journeyData,
    formData,
    financialYearOptions,
    errorMessage
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
    const validation = req.query.validation

    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage =
        'Enter the financial year the project will stop spending funds'
    }

    res.render('general/create-proposal/financial-year-after', {
      journeyData: req.journeyData,
      formData,
      errorMessage
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

// Location page
router.get('/general/create-proposal/location', function (req, res) {
  // Clear any previous errors when accessing via GET
  delete req.session.data['grid-reference-error']

  const validation = req.query.validation
  let errorMessage = undefined
  if (validation === 'required') {
    errorMessage = "Tell us the project's National Grid Reference"
  }

  res.render('general/create-proposal/location', {
    journeyData: req.journeyData,
    data: req.session.data || {},
    errorMessage
  })
})

router.post('/general/create-proposal/location', function (req, res) {
  const gridReference = (req.body['grid-reference'] || '').trim()

  // Validate grid reference
  if (!gridReference) {
    req.session.data['grid-reference-error'] =
      "Tell us the project's National Grid Reference"
    req.session.data['grid-reference'] = gridReference
    return res.render('general/create-proposal/location', {
      journeyData: req.journeyData,
      data: req.session.data
    })
  }

  // Clear any previous errors
  delete req.session.data['grid-reference-error']

  // Save the grid reference to session
  req.session.data['grid-reference'] = gridReference

  // Redirect to benefit area file upload page
  res.redirect('/general/create-proposal/benefit-area-file')
})

// Benefit area file upload page
router.get('/general/create-proposal/benefit-area-file', function (req, res) {
  res.render('general/create-proposal/benefit-area-file', {
    journeyData: req.journeyData
  })
})

router.post('/general/create-proposal/benefit-area-file', function (req, res) {
  // In a real application, you would handle file upload here
  // For prototype, we'll just store a filename
  if (req.body['benefit-area-file'] || req.files) {
    req.session.data['benefit-area-file'] = 'uploaded-shapefile.zip'
    req.session.data['benefit-area-file-uploaded'] = true
  }

  // Redirect back to proposal overview
  res.redirect('/general/create-proposal/check-answers')
})

// Important dates - OBC start date
router.get(
  '/general/create-proposal/important-dates/obc-start',
  function (req, res) {
    delete req.session.data['obc-start-error']

    const validation = req.query.validation
    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage =
        "Enter the date you expect to start the project's outline business case"
    }

    res.render('general/create-proposal/obc-start-date', {
      journeyData: req.journeyData,
      data: req.session.data || {},
      errorMessage
    })
  }
)

router.post(
  '/general/create-proposal/important-dates/obc-start',
  function (req, res) {
    const monthNames = [
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
    const month = (req.body['obc-start-month'] || '').trim()
    const year = (req.body['obc-start-year'] || '').trim()

    // Validate that both month and year are provided
    if (!month || !year) {
      req.session.data['obc-start-error'] =
        "Enter the date you expect to start the project's outline business case"
      req.session.data['obc-start-month'] = month
      req.session.data['obc-start-year'] = year
      return res.render('general/create-proposal/obc-start-date', {
        journeyData: req.journeyData,
        data: req.session.data
      })
    }

    // Clear any previous errors
    delete req.session.data['obc-start-error']

    const monthInt = parseInt(month)
    const monthName = monthNames[monthInt - 1] || month
    req.session.data['obc-start-month'] = month
    req.session.data['obc-start-year'] = year
    req.session.data['obc-start-date'] = monthName + ' ' + year

    res.redirect('/general/create-proposal/important-dates/obc-completion')
  }
)

// Important dates - OBC completion date
router.get(
  '/general/create-proposal/important-dates/obc-completion',
  function (req, res) {
    delete req.session.data['obc-completion-error']

    const validation = req.query.validation
    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage =
        "Enter the date you expect to complete the project's outline business case"
    }

    res.render('general/create-proposal/obc-completion-date', {
      journeyData: req.journeyData,
      data: req.session.data || {},
      errorMessage
    })
  }
)

router.post(
  '/general/create-proposal/important-dates/obc-completion',
  function (req, res) {
    const monthNames = [
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
    const month = (req.body['obc-completion-month'] || '').trim()
    const year = (req.body['obc-completion-year'] || '').trim()

    // Validate that both month and year are provided
    if (!month || !year) {
      req.session.data['obc-completion-error'] =
        "Enter the date you expect to complete the project's outline business case"
      req.session.data['obc-completion-month'] = month
      req.session.data['obc-completion-year'] = year
      return res.render('general/create-proposal/obc-completion-date', {
        journeyData: req.journeyData,
        data: req.session.data
      })
    }

    // Clear any previous errors
    delete req.session.data['obc-completion-error']

    const monthInt = parseInt(month)
    const monthName = monthNames[monthInt - 1] || month
    req.session.data['obc-completion-month'] = month
    req.session.data['obc-completion-year'] = year
    req.session.data['obc-completion-date'] = monthName + ' ' + year

    res.redirect('/general/create-proposal/important-dates/contract-awarded')
  }
)

// Important dates - Contract awarded date
router.get(
  '/general/create-proposal/important-dates/contract-awarded',
  function (req, res) {
    delete req.session.data['contract-awarded-error']

    const validation = req.query.validation
    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage =
        "Enter the date you expect to award the project's main contract"
    }

    res.render('general/create-proposal/contract-awarded-date', {
      journeyData: req.journeyData,
      data: req.session.data || {},
      errorMessage
    })
  }
)

router.post(
  '/general/create-proposal/important-dates/contract-awarded',
  function (req, res) {
    const monthNames = [
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
    const month = (req.body['contract-awarded-month'] || '').trim()
    const year = (req.body['contract-awarded-year'] || '').trim()

    // Validate that both month and year are provided
    if (!month || !year) {
      req.session.data['contract-awarded-error'] =
        "Enter the date you expect to award the project's main contract"
      req.session.data['contract-awarded-month'] = month
      req.session.data['contract-awarded-year'] = year
      return res.render('general/create-proposal/contract-awarded-date', {
        journeyData: req.journeyData,
        data: req.session.data
      })
    }

    // Clear any previous errors
    delete req.session.data['contract-awarded-error']

    const monthInt = parseInt(month)
    const monthName = monthNames[monthInt - 1] || month
    req.session.data['contract-awarded-month'] = month
    req.session.data['contract-awarded-year'] = year
    req.session.data['contract-awarded-date'] = monthName + ' ' + year

    res.redirect('/general/create-proposal/important-dates/start-construction')
  }
)

// Important dates - Start construction date
router.get(
  '/general/create-proposal/important-dates/start-construction',
  function (req, res) {
    delete req.session.data['start-construction-error']

    const validation = req.query.validation
    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage = 'Enter the date you expect to start the work'
    }

    res.render('general/create-proposal/start-construction-date', {
      journeyData: req.journeyData,
      data: req.session.data || {},
      errorMessage
    })
  }
)

router.post(
  '/general/create-proposal/important-dates/start-construction',
  function (req, res) {
    const monthNames = [
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
    const month = (req.body['start-construction-month'] || '').trim()
    const year = (req.body['start-construction-year'] || '').trim()

    // Validate that both month and year are provided
    if (!month || !year) {
      req.session.data['start-construction-error'] =
        'Enter the date you expect to start the work'
      req.session.data['start-construction-month'] = month
      req.session.data['start-construction-year'] = year
      return res.render('general/create-proposal/start-construction-date', {
        journeyData: req.journeyData,
        data: req.session.data
      })
    }

    // Clear any previous errors
    delete req.session.data['start-construction-error']

    const monthInt = parseInt(month)
    const monthName = monthNames[monthInt - 1] || month
    req.session.data['start-construction-month'] = month
    req.session.data['start-construction-year'] = year
    req.session.data['start-construction-date'] = monthName + ' ' + year

    res.redirect('/general/create-proposal/important-dates/ready-for-service')
  }
)

// Important dates - Ready for service date
router.get(
  '/general/create-proposal/important-dates/ready-for-service',
  function (req, res) {
    delete req.session.data['ready-for-service-error']

    const validation = req.query.validation
    let errorMessage = undefined
    if (validation === 'required') {
      errorMessage =
        'Enter the date you expect the project to start achieving its benefits'
    }

    res.render('general/create-proposal/ready-for-service-date', {
      journeyData: req.journeyData,
      data: req.session.data || {},
      errorMessage
    })
  }
)

router.post(
  '/general/create-proposal/important-dates/ready-for-service',
  function (req, res) {
    const monthNames = [
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
    const month = (req.body['ready-for-service-month'] || '').trim()
    const year = (req.body['ready-for-service-year'] || '').trim()

    // Validate that both month and year are provided
    if (!month || !year) {
      req.session.data['ready-for-service-error'] =
        'Enter the date you expect the project to start achieving its benefits'
      req.session.data['ready-for-service-month'] = month
      req.session.data['ready-for-service-year'] = year
      return res.render('general/create-proposal/ready-for-service-date', {
        journeyData: req.journeyData,
        data: req.session.data
      })
    }

    // Clear any previous errors
    delete req.session.data['ready-for-service-error']

    const monthInt = parseInt(month)
    const monthName = monthNames[monthInt - 1] || month
    req.session.data['ready-for-service-month'] = month
    req.session.data['ready-for-service-year'] = year
    req.session.data['ready-for-service-date'] = monthName + ' ' + year

    // Mark that all important dates have been added
    req.session.data['important-dates-added'] = true

    // Redirect back to proposal overview
    res.redirect('/general/create-proposal/check-answers')
  }
)

// Funding sources page
router.get('/general/create-proposal/funding-sources', function (req, res) {
  // Clear error when accessing via GET (fresh page load)
  if (req.session.data) {
    delete req.session.data['funding-sources-error']
  }
  res.render('general/create-proposal/funding-sources', {
    journeyData: req.journeyData,
    data: req.session.data || {}
  })
})

router.post('/general/create-proposal/funding-sources', function (req, res) {
  // Ensure session data object exists
  if (!req.session.data) {
    req.session.data = {}
  }

  const fundingSources = req.body['funding-sources']

  // Validate that at least one funding source is selected
  // When no checkboxes are selected, the field may be undefined, empty string, empty array, or '_unchecked'
  let hasSelection = false

  if (fundingSources) {
    if (Array.isArray(fundingSources)) {
      // Filter out '_unchecked' values and check if any valid selections remain
      const validSelections = fundingSources.filter(
        (source) => source && source !== '_unchecked'
      )
      hasSelection = validSelections.length > 0
    } else if (typeof fundingSources === 'string') {
      // Check if it's not empty and not '_unchecked'
      const trimmed = fundingSources.trim()
      hasSelection = trimmed.length > 0 && trimmed !== '_unchecked'
    }
  }
  if (!hasSelection) {
    req.session.data['funding-sources-error'] =
      'The project must have at least one funding source.'
    // Don't save empty funding sources
    if (req.session.data['funding-sources']) {
      delete req.session.data['funding-sources']
    }
    return res.render('general/create-proposal/funding-sources', {
      journeyData: req.journeyData,
      data: req.session.data
    })
  }

  // Clear any previous errors
  delete req.session.data['funding-sources-error']

  // Save the funding sources to session
  // Filter out '_unchecked' values and ensure it's always an array
  if (Array.isArray(fundingSources)) {
    // Filter out '_unchecked' values
    req.session.data['funding-sources'] = fundingSources.filter(
      (source) => source && source !== '_unchecked'
    )
  } else {
    // If it's a string and not '_unchecked', save it as an array
    const trimmed = fundingSources.trim()
    if (trimmed && trimmed !== '_unchecked') {
      req.session.data['funding-sources'] = [trimmed]
    } else {
      req.session.data['funding-sources'] = []
    }
  }

  // Mark that funding sources have been added
  req.session.data['funding-sources-added'] = true

  // Redirect back to proposal overview
  res.redirect('/general/create-proposal/check-answers')
})

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
    journeyData: req.journeyData,
    query: req.query // Include query parameters for success notification
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

router.get('/admin/organisations/add', function (req, res) {
  const error = req.query.error
  res.render('admin/add-organisation', {
    error: error
  })
})

router.post('/admin/organisations/add', function (req, res) {
  const organisationType = req.body['organisation-type']

  if (!organisationType) {
    res.redirect('/admin/organisations/add?error=organisation-type')
  } else {
    // Redirect to the appropriate form based on organisation type
    if (organisationType === 'Authority') {
      res.redirect('/admin/organisations/add-authority')
    } else if (organisationType === 'PSO') {
      res.redirect('/admin/organisations/add-pso')
    } else if (organisationType === 'RMA') {
      res.redirect('/admin/organisations/add-rma')
    }
  }
})

router.get('/admin/organisations/add-authority', function (req, res) {
  const error = req.query.error
  res.render('admin/add-authority', {
    error: error
  })
})

router.get('/admin/organisations/add-pso', function (req, res) {
  const error = req.query.error
  res.render('admin/add-pso', {
    error: error
  })
})

router.get('/admin/organisations/add-rma', function (req, res) {
  const error = req.query.error
  res.render('admin/add-rma', {
    error: error
  })
})

router.post('/admin/organisations/add-authority', function (req, res) {
  const authorityCode = req.body['authority-code']
  const authorityType = req.body['authority-type']

  if (!authorityCode) {
    res.redirect(
      '/admin/organisations/add-authority?error=authority-code-empty'
    )
  } else if (!authorityType) {
    res.redirect(
      '/admin/organisations/add-authority?error=authority-type-empty'
    )
  } else {
    req.session.data = req.session.data || {}
    req.session.data['organisationType'] = 'Authority'
    req.session.data['authorityCode'] = authorityCode
    req.session.data['authorityType'] = authorityType
    res.redirect('/admin/organisations/check-your-answers')
  }
})

router.post('/admin/organisations/add-pso', function (req, res) {
  const psoName = req.body['pso-name']
  const eaArea = req.body['ea-area']
  const rfccCode = req.body['rfcc-code']

  if (!psoName) {
    res.redirect('/admin/organisations/add-pso?error=pso-name-empty')
  } else if (!eaArea) {
    res.redirect('/admin/organisations/add-pso?error=ea-area-empty')
  } else if (!rfccCode) {
    res.redirect('/admin/organisations/add-pso?error=rfcc-code-empty')
  } else {
    req.session.data = req.session.data || {}
    req.session.data['organisationType'] = 'PSO'
    req.session.data['psoName'] = psoName
    req.session.data['eaArea'] = eaArea
    req.session.data['rfccCode'] = rfccCode
    res.redirect('/admin/organisations/check-your-answers')
  }
})

router.post('/admin/organisations/add-rma', function (req, res) {
  const organisationName = req.body['organisation-name']
  const identifierCode = req.body['identifier-code']
  const authorityCode = req.body['authority-code']
  const associatedPso = req.body['associated-pso']

  if (!organisationName) {
    res.redirect('/admin/organisations/add-rma?error=organisation-name-empty')
  } else if (!identifierCode) {
    res.redirect('/admin/organisations/add-rma?error=identifier-code-empty')
  } else if (!authorityCode) {
    res.redirect('/admin/organisations/add-rma?error=authority-code-empty')
  } else if (!associatedPso) {
    res.redirect('/admin/organisations/add-rma?error=associated-pso-empty')
  } else {
    req.session.data = req.session.data || {}
    req.session.data['organisationType'] = 'RMA'
    req.session.data['organisationName'] = organisationName
    req.session.data['identifierCode'] = identifierCode
    req.session.data['authorityCode'] = authorityCode
    req.session.data['associatedPso'] = associatedPso
    res.redirect('/admin/organisations/check-your-answers')
  }
})

router.get('/admin/organisations/check-your-answers', function (req, res) {
  res.render('admin/check-your-answers', {
    data: req.session.data
  })
})

router.post('/admin/organisations/submit', function (req, res) {
  // Handle submission logic here
  res.redirect('/admin/organisations?success=true')
})

// Add your routes here
