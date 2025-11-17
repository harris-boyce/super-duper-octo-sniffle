/**
 * Name Generator
 * 
 * Deterministic name generation system using seeded random selection.
 * Generates consistent vendor names from predefined pools of first and last names.
 * 
 * Features:
 * - Deterministic selection from seed
 * - 8 first names (diverse, retro-themed)
 * - 6 last names (memorable, varied)
 * - Consistent output for same seed
 * - Performance target: < 1ms per generation
 */

/**
 * Vendor name components
 */
interface VendorName {
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Full name (firstName + lastName) */
  fullName: string;
}

/**
 * Name Generator
 * 
 * Generates deterministic vendor names using seeded random selection
 * from predefined name pools.
 */
export class NameGenerator {
  /**
   * Pool of first names (8 diverse options)
   * 
   * Names are selected to be:
   * - Memorable and distinctive
   * - Appropriate for a retro 8-bit game aesthetic
   * - Gender-neutral or varied
   * - Easy to read and pronounce
   */
  private static readonly FIRST_NAMES = [
    'Max',
    'Ruby',
    'Ace',
    'Luna',
    'Chip',
    'Nova',
    'Rex',
    'Zara',
  ] as const;

  /**
   * Pool of last names (6 memorable options)
   * 
   * Names are selected to be:
   * - Quirky and fun
   * - Thematically appropriate for stadium vendors
   * - Distinct from each other
   * - Easy to remember
   */
  private static readonly LAST_NAMES = [
    'Pepper',
    'Swift',
    'Blaze',
    'Stone',
    'Rivers',
    'Cruz',
  ] as const;

  /**
   * Generate a deterministic vendor name from a seed
   * 
   * Uses the seed to deterministically select first and last names from
   * predefined pools. The same seed will always produce the same name.
   * 
   * @param seed - Seed string for deterministic selection
   * @returns Vendor name object
   * 
   * @example
   * ```typescript
   * const name1 = NameGenerator.generateVendorName('abc123');
   * const name2 = NameGenerator.generateVendorName('abc123');
   * console.assert(name1.fullName === name2.fullName, 'Names must be deterministic');
   * 
   * const name3 = NameGenerator.generateVendorName('xyz789');
   * console.assert(name1.fullName !== name3.fullName, 'Different seeds produce different names');
   * ```
   */
  public static generateVendorName(seed: string): VendorName {
    // Generate numeric seed from string
    const numericSeed = this.seedToNumber(seed);

    // Select first name
    const firstNameIndex = this.seededRandom(numericSeed, 0) % this.FIRST_NAMES.length;
    const firstName = this.FIRST_NAMES[firstNameIndex];

    // Select last name (use different offset to ensure different selection)
    const lastNameIndex = this.seededRandom(numericSeed, 1) % this.LAST_NAMES.length;
    const lastName = this.LAST_NAMES[lastNameIndex];

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
    };
  }

  /**
   * Convert seed string to numeric value
   * 
   * Uses a simple hash function (djb2 algorithm) to convert string seeds
   * into numeric values suitable for random number generation.
   * 
   * @param seed - Seed string
   * @returns Numeric seed value
   */
  private static seedToNumber(seed: string): number {
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) + hash) + seed.charCodeAt(i);
      hash = hash | 0; // Convert to 32-bit signed integer
    }
    
    // Additional mixing to improve distribution
    hash = hash ^ (hash >>> 16);
    hash = Math.imul(hash, 0x85ebca6b);
    hash = hash ^ (hash >>> 13);
    hash = Math.imul(hash, 0xc2b2ae35);
    hash = hash ^ (hash >>> 16);
    
    return Math.abs(hash);
  }

  /**
   * Generate seeded random number
   * 
   * Uses Linear Congruential Generator (LCG) algorithm for deterministic
   * random number generation.
   * 
   * @param seed - Numeric seed
   * @param offset - Offset for generating different sequences from same seed
   * @returns Random number (non-negative integer)
   */
  private static seededRandom(seed: number, offset: number): number {
    // LCG parameters (same as used in glibc)
    const a = 1103515245;
    const c = 12345;
    const m = 0x7fffffff; // 2^31 - 1

    // Efficiently advance LCG state by offset+1 steps using exponentiation by squaring
    // X_k = a^k * X_0 + c * (a^{k-1} + ... + a^0) mod m
    function modPow(base: number, exp: number, mod: number): number {
      let result = 1;
      base = base % mod;
      while (exp > 0) {
        if (exp % 2 === 1) result = (result * base) % mod;
        base = (base * base) % mod;
        exp = Math.floor(exp / 2);
      }
      return result;
    }

    // Geometric series sum: S = (a^k - 1) / (a - 1)
    function geometricSum(a: number, k: number, mod: number): number {
      if (a === 1) return k % mod;
      // Use modular inverse for division
      const numerator = (modPow(a, k, mod) - 1 + mod) % mod;
      const denominator = (a - 1 + mod) % mod;
      // Compute modular inverse of denominator
      function modInv(x: number, mod: number): number {
        // Extended Euclidean Algorithm
        let [a, b, u] = [mod, x, 0], v = 1;
        while (b !== 0) {
          const q = Math.floor(a / b);
          [a, b] = [b, a - q * b];
          [u, v] = [v, u - q * v];
        }
        return (u + mod) % mod;
      }
      return (numerator * modInv(denominator, mod)) % mod;
    }

    const k = offset + 1;
    const a_k = modPow(a, k, m);
    const sum = geometricSum(a, k, m);
    let mixed = (a_k * seed + c * sum) % m;
    mixed = mixed >>> 0;
    return mixed;
  }

  /**
   * Get all possible first names
   * 
   * @returns Array of all first names in the pool
   */
  public static getFirstNamePool(): readonly string[] {
    return this.FIRST_NAMES;
  }

  /**
   * Get all possible last names
   * 
   * @returns Array of all last names in the pool
   */
  public static getLastNamePool(): readonly string[] {
    return this.LAST_NAMES;
  }

  /**
   * Get total number of possible name combinations
   * 
   * @returns Total unique names possible
   */
  public static getTotalCombinations(): number {
    return this.FIRST_NAMES.length * this.LAST_NAMES.length;
  }

  /**
   * Generate multiple unique vendor names from sequential seeds
   * 
   * Generates multiple vendor names by appending sequence numbers to the base seed.
   * Useful for creating a roster of vendors with related but distinct names.
   * 
   * @param baseSeed - Base seed string
   * @param count - Number of names to generate
   * @returns Array of vendor names
   * 
   * @example
   * ```typescript
   * const names = NameGenerator.generateMultipleVendorNames('epoch-5', 3);
   * // Returns 3 different vendor names based on 'epoch-5-0', 'epoch-5-1', 'epoch-5-2'
   * ```
   */
  public static generateMultipleVendorNames(baseSeed: string, count: number): VendorName[] {
    const names: VendorName[] = [];
    
    for (let i = 0; i < count; i++) {
      const seed = `${baseSeed}-${i}`;
      names.push(this.generateVendorName(seed));
    }

    return names;
  }

  /**
   * Check if a name combination exists in the pools
   * 
   * @param firstName - First name to check
   * @param lastName - Last name to check
   * @returns True if both names exist in their respective pools
   */
  public static isValidNameCombination(firstName: string, lastName: string): boolean {
    return (
      this.FIRST_NAMES.includes(firstName as any) &&
      this.LAST_NAMES.includes(lastName as any)
    );
  }
}

export default NameGenerator;
