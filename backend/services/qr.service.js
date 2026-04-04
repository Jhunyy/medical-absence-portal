const QRCode = require('qrcode');
const crypto = require('crypto');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL    = process.env.CLIENT_URL || 'http://localhost:3000';
const QR_SECRET   = process.env.QR_SECRET  || process.env.JWT_SECRET; // add QR_SECRET to .env

// ─── Generate a signed verification code ─────────────────────────────────────
// The code is an HMAC of the requestId — so it can be verified without a DB lookup,
// and it cannot be forged without the secret.
function generateCode(requestId) {
  return crypto
    .createHmac('sha256', QR_SECRET)
    .update(requestId)
    .digest('hex')
    .substring(0, 24) // 24-char hex code is short enough to be readable
    .toUpperCase();
}

// ─── generateQR(requestId) ────────────────────────────────────────────────────
// Returns { code, imageData } where:
//   code      — the short verification code stored in the DB
//   imageData — base64 PNG of the QR image (stored in DB, rendered in frontend)
exports.generateQR = async (requestId) => {
  const code = generateCode(requestId);

  // The QR encodes a URL that points to the public verify page
  // e.g. https://yourapp.com/verify/REQ-1718000000000-ABC123?code=A3F9C2B1D4E78F60
  const verifyUrl = `${BASE_URL}/verify/${encodeURIComponent(requestId)}?code=${code}`;

  const imageData = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',   // high — survives printing / slight damage
    type:   'image/png',
    margin: 2,
    width:  300,
    color: {
      dark:  '#1a5276', // clinic brand blue
      light: '#ffffff'
    }
  });

  return { code, imageData, verifyUrl };
};

// ─── verifyCode(requestId, submittedCode) ─────────────────────────────────────
// Re-derives the expected code and does a timing-safe comparison.
// Returns true if valid, false if tampered / invalid.
exports.verifyCode = (requestId, submittedCode) => {
  if (!requestId || !submittedCode) return false;

  const expected = generateCode(requestId);

  // Timing-safe comparison prevents timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected.toUpperCase()),
      Buffer.from(submittedCode.toUpperCase().trim())
    );
  } catch {
    // Buffers of different lengths throw — that means invalid input
    return false;
  }
};

// ─── generateQRBuffer(requestId) ─────────────────────────────────────────────
// Alternative: returns a raw PNG Buffer (for attaching to emails or saving to disk)
exports.generateQRBuffer = async (requestId) => {
  const code       = generateCode(requestId);
  const verifyUrl  = `${BASE_URL}/verify/${encodeURIComponent(requestId)}?code=${code}`;
  const buffer     = await QRCode.toBuffer(verifyUrl, {
    errorCorrectionLevel: 'H',
    width:  300,
    margin: 2
  });
  return { code, buffer, verifyUrl };
};