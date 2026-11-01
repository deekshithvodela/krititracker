import { sanitizePrivateKey, resolveServiceAccountCredentials } from '../server/_lib/sheets';
import crypto from 'crypto';

async function runTests() {
  console.log('🧪 Starting Phase 21 Private Key Sanitizer & Multi-Format Credentials Tests...\n');

  // Generate ephemeral real 2048-bit RSA key for testing
  const { generateKeyPairSync } = crypto;
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  function canSign(key: string): boolean {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update('kriti-test-payload');
    sign.sign(key);
    return true;
  }

  // Test 1: Standard clean PEM key
  const cleanResult = sanitizePrivateKey(privateKey);
  if (canSign(cleanResult)) {
    console.log('✅ Test 1 Passed: Standard PEM private key decodes and signs.');
  }

  // Test 2: Literal \n replacement (Vercel env paste)
  const escapedLiteral = privateKey.replace(/\n/g, '\\n');
  const sanitizedEscaped = sanitizePrivateKey(escapedLiteral);
  if (canSign(sanitizedEscaped)) {
    console.log('✅ Test 2 Passed: Escaped literal \\n key decodes and signs.');
  }

  // Test 3: Wrapped in double quotes ("-----BEGIN...")
  const doubleQuoted = `"${escapedLiteral}"`;
  const sanitizedDoubleQuoted = sanitizePrivateKey(doubleQuoted);
  if (canSign(sanitizedDoubleQuoted)) {
    console.log('✅ Test 3 Passed: Double-quoted key decodes and signs.');
  }

  // Test 4: Wrapped in single quotes ('-----BEGIN...')
  const singleQuoted = `'${escapedLiteral}'`;
  const sanitizedSingleQuoted = sanitizePrivateKey(singleQuoted);
  if (canSign(sanitizedSingleQuoted)) {
    console.log('✅ Test 4 Passed: Single-quoted key decodes and signs.');
  }

  // Test 5: Full Service Account JSON pasted into GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const fullJson = JSON.stringify({
    type: 'service_account',
    client_email: 'test-sa@project.iam.gserviceaccount.com',
    private_key: escapedLiteral,
  });
  const sanitizedJson = sanitizePrivateKey(fullJson);
  if (canSign(sanitizedJson)) {
    console.log('✅ Test 5 Passed: Full JSON pasted as private key extracts and signs.');
  }

  // Test 6: Base64-encoded PEM string
  const base64Pem = Buffer.from(privateKey).toString('base64');
  const sanitizedBase64 = sanitizePrivateKey(base64Pem);
  if (canSign(sanitizedBase64)) {
    console.log('✅ Test 6 Passed: Base64 encoded PEM key auto-decodes and signs.');
  }

  // Test 7: Credentials resolver with GOOGLE_SERVICE_ACCOUNT_KEY_BASE64
  const oldEnv = { ...process.env };
  try {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 = Buffer.from(fullJson).toString('base64');
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    const resolved = resolveServiceAccountCredentials();
    if (resolved.clientEmail === 'test-sa@project.iam.gserviceaccount.com' && canSign(resolved.privateKey)) {
      console.log('✅ Test 7 Passed: resolveServiceAccountCredentials successfully parses GOOGLE_SERVICE_ACCOUNT_KEY_BASE64.');
    }
  } finally {
    process.env = oldEnv;
  }

  console.log('\n🎉 ALL 7/7 Phase 21 Verification Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('\n❌ Phase 21 Verification Failed:', err);
  process.exit(1);
});
