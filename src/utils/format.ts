const currencyFormatter = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

