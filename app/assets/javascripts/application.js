//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  // Format number with commas
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Parse number from input (remove commas)
  function parseNumber(str) {
    if (!str || str.trim() === '') return 0
    return parseFloat(str.replace(/,/g, '')) || 0
  }

  // Funding values table - calculate totals dynamically
  const fundingTable = document.querySelector('.funding-table')

  if (fundingTable) {
    const inputs = fundingTable.querySelectorAll('.funding-value')

    // Calculate all totals
    function calculateTotals() {
      // Calculate row totals
      const rowTotals = document.querySelectorAll('.row-total')
      rowTotals.forEach((totalCell) => {
        const year = totalCell.dataset.year
        const rowInputs = fundingTable.querySelectorAll(
          `input[data-year="${year}"]`
        )
        let sum = 0
        rowInputs.forEach((input) => {
          sum += parseNumber(input.value)
        })
        totalCell.textContent = formatNumber(sum.toFixed(2))
      })

      // Calculate column totals
      const columnTotals = document.querySelectorAll('.column-total')
      columnTotals.forEach((totalCell) => {
        const source = totalCell.dataset.source
        const columnInputs = fundingTable.querySelectorAll(
          `input[data-source="${source}"]`
        )
        let sum = 0
        columnInputs.forEach((input) => {
          sum += parseNumber(input.value)
        })
        totalCell.textContent = formatNumber(sum.toFixed(2))
      })

      // Calculate grand total (sum of all inputs)
      const grandTotalCell = document.querySelector('.grand-total')
      if (grandTotalCell) {
        let grandSum = 0
        inputs.forEach((input) => {
          grandSum += parseNumber(input.value)
        })
        grandTotalCell.textContent = formatNumber(grandSum.toFixed(2))
      }
    }

    // Add event listeners to all inputs
    inputs.forEach((input) => {
      input.addEventListener('input', calculateTotals)
      input.addEventListener('change', calculateTotals)
    })

    // Calculate totals on page load
    calculateTotals()
  }

  // Contributor values tables - calculate totals for each contributor
  const contributorTables = document.querySelectorAll(
    '.contributor-values-table'
  )

  if (contributorTables.length > 0) {
    contributorTables.forEach((table) => {
      const contributorName = table.dataset.contributor
      const inputs = table.querySelectorAll('.contributor-amount-value')
      const totalCell = table.querySelector('.contributor-grand-total')

      function calculateContributorTotal() {
        let sum = 0
        inputs.forEach((input) => {
          sum += parseNumber(input.value)
        })
        if (totalCell) {
          totalCell.textContent = formatNumber(sum.toFixed(2))
        }
      }

      // Add event listeners to all inputs
      inputs.forEach((input) => {
        input.addEventListener('input', calculateContributorTotal)
        input.addEventListener('change', calculateContributorTotal)
      })

      // Calculate total on page load
      calculateContributorTotal()
    })
  }
})
