// Cloak instruction binary format constants — replicated from
// @cloak.dev/sdk-devnet internal source. If SDK updates the format,
// these MUST be updated in lockstep.
// Reference: SDK index.js lines 6411-6428 (version 0.1.5-devnet.1)

export const TRANSACT_TAG = 0;
export const TRANSACT_SWAP_TAG = 1;

export const PROOF_LEN = 256;
export const PUBLIC_INPUTS_LEN = 264;
export const SWAP_PARAMS_LEN = 72;

export const PUBLIC_INPUTS_OFFSET = 1 + PROOF_LEN; // 257
export const CHAIN_NOTES_OFFSET_TRANSACT = 1 + PROOF_LEN + PUBLIC_INPUTS_LEN; // 521
export const CHAIN_NOTES_OFFSET_TRANSACT_SWAP =
  1 + PROOF_LEN + PUBLIC_INPUTS_LEN + SWAP_PARAMS_LEN; // 593

// Offsets within the public inputs slice:
export const PUBLIC_AMOUNT_OFFSET = 32;
export const EXT_DATA_HASH_OFFSET = 40;
export const OUTPUT_COMMITMENT_0_OFFSET = 168;
export const OUTPUT_COMMITMENT_1_OFFSET = 200;
export const CHAIN_NOTE_HASH_OFFSET = 232;

// Cloak fee: 5_000_000 lamports fixed + 0.3% variable
export const FIXED_FEE_LAMPORTS = 5_000_000n;
export const VARIABLE_FEE_NUMERATOR = 3n;
export const VARIABLE_FEE_DENOMINATOR = 1000n;
