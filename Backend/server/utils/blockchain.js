import crypto from "crypto";

export const generateHash = (data) =>
  crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

// Mirrors the mock tx_hash format from the Python Broker agent
export const generateTxHash = () => "0x" + crypto.randomBytes(32).toString("hex");

export const verifyHash = (data, expectedHash) => generateHash(data) === expectedHash;
