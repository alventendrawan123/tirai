import type { ClaimPreview, ClaimSuccess } from "../types";

export const MOCK_PREVIEW: ClaimPreview = {
  amountRaw: 500_000_000n,
  decimals: 9,
  symbol: "SOL",
  source: "Cloak Shield Pool",
  expiry: null,
};

export const MOCK_SUCCESS_FRESH: ClaimSuccess = {
  destination: "FreshGN3pAxZk7yT1bV2cQ4rHk6mLf8sUp9eJxKwC2nDh",
  txSignature:
    "3KqB2hM1nL4yX7bP2sUe5gKwHzQfA9LpV0EsXrYjN7iHc4MdQ8oG3vKt2HqAVfYQpW8",
  amountRaw: 500_000_000n,
  decimals: 9,
  symbol: "SOL",
  mode: "fresh",
  generatedSecret:
    "ed25519_secret_placeholder_8jPq2vXzR4tL6yM1bN3kHc5dGsW7uF9oA0eUiBaTrYpQwK4XnZmVcS3hG",
};
