import crypto from "crypto";

/**
 * generateHash — SHA-256 hash of any JSON-serializable data.
 * Used to fingerprint incident records, DMCA notices, and contract receipts.
 *
 * @param {object|string} data
 * @returns {string} hex hash
 */
export const generateHash = (data) => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
};

/**
 * generateTxHash — Simulates a Polygon transaction hash.
 * Format matches real Ethereum tx hashes: 0x + 64 hex chars.
 *
 * @returns {string} e.g. "0x3f2a1b..."
 */
export const generateTxHash = () => {
  return "0x" + crypto.randomBytes(32).toString("hex");
};

/**
 * verifyHash — Checks if a record's hash still matches its data.
 * Useful for audit trail integrity checks.
 *
 * @param {object|string} data
 * @param {string} expectedHash
 * @returns {boolean}
 */
export const verifyHash = (data, expectedHash) => {
  return generateHash(data) === expectedHash;
};
