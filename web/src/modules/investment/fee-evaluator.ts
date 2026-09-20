import { create, all } from 'mathjs/number'

export interface FeeScope {
  amount: number // total transaction value (qty × price)
  shares: number // quantity of shares
  price: number // price per share
}

// ponytail: block only functions that mutate the math environment or allow
// re-entrant evaluation — evaluate/parse are the JS API, not expression-callable
const math = create(all)
math.import(
  {
    import: () => {
      throw new Error('disabled')
    },
    createUnit: () => {
      throw new Error('disabled')
    },
  },
  { override: true },
)

const DRY_RUN_SCOPE: FeeScope = { amount: 1000, shares: 10, price: 100 }

/**
 * Evaluate a fee formula against a scope.
 * Returns the numeric result or throws on invalid formula / non-numeric result.
 */
export function evaluateFeeFormula(formula: string, scope: FeeScope): number {
  const result = math.evaluate(formula, { ...scope })
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Formula must evaluate to a finite number')
  }
  return result
}

/**
 * Validate a formula string without real transaction data.
 * Returns an error message, or null if valid.
 */
export function validateFormula(formula: string): string | null {
  if (!formula.trim()) return 'Formula is required'
  try {
    const result = math.evaluate(formula, { ...DRY_RUN_SCOPE })
    if (typeof result !== 'number' || !isFinite(result)) {
      return 'Formula must evaluate to a finite number'
    }
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid formula'
  }
}
