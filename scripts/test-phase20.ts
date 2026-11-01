import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MockResponse {
  statusCode: number;
  headers: Record<string, any>;
  body: any;
  status(code: number): MockResponse;
  json(data: any): MockResponse;
  setHeader(name: string, value: any): MockResponse;
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    setHeader(name: string, value: any) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('🧪 Starting Phase 20 Vercel Serverless Function Production Bundle Tests...\n');

  // Test 1: Exactly 1 file in api/ (api/index.js)
  const apiDir = path.join(__dirname, '../api');
  const files = fs.readdirSync(apiDir);
  if (files.length === 1 && files[0] === 'index.js') {
    console.log('✅ Test 1 Passed: Exactly 1 Serverless Function file detected in api/ (api/index.js). 100% Hobby quota compliant (1/12 used).');
  } else {
    throw new Error(`Test 1 Failed: Expected only ['index.js'] in api/, found: ${JSON.stringify(files)}`);
  }

  // Test 2: Native Node ESM Module Import
  const bundlePath = path.join(__dirname, '../api/index.js');
  const serverModule = await import(bundlePath);
  if (typeof serverModule.default === 'function') {
    console.log('✅ Test 2 Passed: api/index.js loaded cleanly into Node.js ESM mode with zero ERR_MODULE_NOT_FOUND errors.');
  } else {
    throw new Error('Test 2 Failed: Default export of api/index.js is not a function.');
  }

  const handler = serverModule.default;

  // Test 3: Health check endpoint via query rewrite
  const healthReq: any = {
    method: 'GET',
    url: '/api/health',
    query: { path: 'health' },
    headers: {},
  };
  const healthRes = createMockRes();
  await handler(healthReq, healthRes as any);

  if (healthRes.statusCode === 200 && healthRes.body?.status === 'healthy' && healthRes.body?.plan?.includes('Hobby')) {
    console.log('✅ Test 3 Passed: Health endpoint returned 200 OK with healthy status.');
  } else {
    throw new Error(`Test 3 Failed: Unexpected health response: ${JSON.stringify(healthRes.body)}`);
  }

  // Test 4: Direct invocation with undefined query
  const directReq: any = {
    method: 'GET',
    url: '/api',
    query: undefined,
    headers: {},
  };
  const directRes = createMockRes();
  await handler(directReq, directRes as any);

  if (directRes.statusCode === 200 && directRes.body?.status === 'healthy') {
    console.log('✅ Test 4 Passed: Direct invocation with undefined query handled safely without TypeError.');
  } else {
    throw new Error(`Test 4 Failed: Direct invocation failed: ${JSON.stringify(directRes.body)}`);
  }

  // Test 5: Session endpoint returns structured 401 instead of crashing
  const sessionReq: any = {
    method: 'GET',
    url: '/api/auth/session',
    query: { path: 'auth/session' },
    headers: {},
  };
  const sessionRes = createMockRes();
  await handler(sessionReq, sessionRes as any);

  if (sessionRes.statusCode === 401 && sessionRes.body?.success === false) {
    console.log('✅ Test 5 Passed: Auth session endpoint returned structured 401 JSON for unauthenticated request.');
  } else {
    throw new Error(`Test 5 Failed: Unexpected session response: ${JSON.stringify(sessionRes.body)}`);
  }

  // Test 6: Dev Persona Login execution via bundled handler
  process.env.ENABLE_DEV_LOGIN = 'true';
  const devLoginReq: any = {
    method: 'POST',
    url: '/api/auth/dev-login',
    query: { path: 'auth/dev-login' },
    headers: {},
    body: { personaKey: 'admin' },
  };
  const devLoginRes = createMockRes();
  await handler(devLoginReq, devLoginRes as any);

  if (devLoginRes.statusCode === 200 && devLoginRes.body?.data?.user?.email === 'admin.qa@company.com') {
    console.log('✅ Test 6 Passed: Dev persona login dispatched cleanly through bundled handler.');
  } else {
    throw new Error(`Test 6 Failed: Unexpected dev login response: ${JSON.stringify(devLoginRes.body)}`);
  }

  // Test 7: 404 Route handling
  const notFoundReq: any = {
    method: 'GET',
    url: '/api/non-existent-route',
    query: { path: 'non-existent-route' },
    headers: {},
  };
  const notFoundRes = createMockRes();
  await handler(notFoundReq, notFoundRes as any);

  if (notFoundRes.statusCode === 404 && notFoundRes.body?.success === false) {
    console.log('✅ Test 7 Passed: 404 fallback caught undefined route cleanly.');
  } else {
    throw new Error(`Test 7 Failed: Expected 404 for nonexistent route.`);
  }

  console.log('\n🎉 ALL 7/7 Phase 20 Verification Tests Passed Successfully!');
}

runTests().catch(err => {
  console.error('\n❌ Phase 20 Verification Failed:', err);
  process.exit(1);
});
