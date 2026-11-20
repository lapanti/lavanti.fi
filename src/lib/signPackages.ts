/**
 * Sign packages: the only sign counts a donation can buy, and their prices. One sign stays at
 * 30 €; bigger packages cost less per sign. Five signs for 100 € is the package the page points
 * to: three signs cost nearly as much, and ten signs set the top. Spec:
 * .agents/specs/sign-adoption/spec.md.
 *
 * No imports, so the Node CLI under scripts/ can load it directly.
 */

export interface SignPackage {
    euros: number
    /** The package the form highlights ("Suosituin"). */
    featured?: true
    signs: number
}

export const SIGN_PACKAGES: readonly SignPackage[] = [
    { euros: 30, signs: 1 },
    { euros: 55, signs: 2 },
    { euros: 80, signs: 3 },
    { euros: 100, featured: true, signs: 5 },
    { euros: 190, signs: 10 },
]

/** The sign counts on offer, ascending: 1, 2, 3, 5, 10. */
export const PACKAGE_SIGNS: readonly number[] = SIGN_PACKAGES.map((p) => p.signs)

export const MAX_SIGNS = Math.max(...PACKAGE_SIGNS)

export const isPackage = (signs: number): boolean => PACKAGE_SIGNS.includes(signs)

/** The donation for `signs` signs; throws for a count no package offers. */
export const packageEuros = (signs: number): number => {
    const found = SIGN_PACKAGES.find((p) => p.signs === signs)
    if (!found) throw new RangeError(`No sign package for ${signs} signs`)

    return found.euros
}

/** Per-sign price, rounded to cents only when it isn't whole (55 € / 2 = 27,50 €). */
export const perSignEuros = (pkg: SignPackage): number => Math.round((pkg.euros / pkg.signs) * 100) / 100

/**
 * One value per package, keyed by sign count, so page scripts can look copy up by the chosen
 * count without assembling it in the browser.
 */
export const byPackage = <T>(fn: (pkg: SignPackage) => T): Record<number, T> =>
    Object.fromEntries(SIGN_PACKAGES.map((p) => [p.signs, fn(p)]))
