import crypto from 'crypto';

function timingSafeEqualString(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function base64UrlFromBuffer(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function collectSignatureCandidates(header) {
  const trimmed = String(header || '').trim();
  if (!trimmed) return [];

  const candidates = new Set([trimmed]);
  trimmed.split(',').forEach((part) => {
    const piece = part.trim();
    if (!piece) return;
    const eqIdx = piece.indexOf('=');
    if (eqIdx === -1) {
      candidates.add(piece);
    } else {
      const value = piece.slice(eqIdx + 1).trim();
      if (value) candidates.add(value);
    }
  });

  return Array.from(candidates);
}

export function verifyAdsgramSignature(signatureHeader, secret, rawBody) {
  if (!signatureHeader || !secret || !rawBody) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const expectedHex = hmac.digest('hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const variants = [
      expectedHex,
      expectedHex.toLowerCase(),
      expectedHex.toUpperCase(),
      expectedBuf.toString('base64'),
      base64UrlFromBuffer(expectedBuf),
    ].filter(Boolean);

    for (const candidate of collectSignatureCandidates(signatureHeader)) {
      for (const variant of variants) {
        if (timingSafeEqualString(candidate, variant)) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
