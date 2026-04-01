//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Format a number with commas (e.g. 50000 → "50,000")
addFilter('numFormat', function (value) {
  const num = parseInt(value, 10)
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-GB')
})
