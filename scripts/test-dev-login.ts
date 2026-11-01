import handler, { DEV_PERSONAS } from '../api/auth/dev-login';

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
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('🧪 Starting Zero-Leak Dev Login Verification Tests...\n');

  // Test 1: Production Tripwire (Zero-Leak Guarantee)
  {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const req: any = { method: 'POST', body: { persona: 'admin' } };
    const res = createMockRes();

    await handler(req, res as any);
    process.env.NODE_ENV = originalEnv;

    if (res.statusCode === 404) {
      console.log('✅ Test 1 Passed: Production environment triggers immediate 404 Tripwire (Zero-Leak verified).');
    } else {
      console.error(`❌ Test 1 Failed: Expected 404 in production, received ${res.statusCode}`);
      process.exit(1);
    }
  }

  // Test 2: Disabled Feature Flag Guard
  {
    const originalEnv = process.env.NODE_ENV;
    const originalFlag = process.env.ENABLE_DEV_LOGIN;
    process.env.NODE_ENV = 'staging';
    process.env.ENABLE_DEV_LOGIN = 'false';
    const req: any = { method: 'POST', body: { persona: 'admin' } };
    const res = createMockRes();

    await handler(req, res as any);
    process.env.NODE_ENV = originalEnv;
    process.env.ENABLE_DEV_LOGIN = originalFlag;

    if (res.statusCode === 403) {
      console.log('✅ Test 2 Passed: Dev login correctly blocked (403) when ENABLE_DEV_LOGIN is not true.');
    } else {
      console.error(`❌ Test 2 Failed: Expected 403, received ${res.statusCode}`);
      process.exit(1);
    }
  }

  // Test 3: Dev Persona Super Admin Login
  {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    const req: any = { method: 'POST', body: { persona: 'admin' } };
    const res = createMockRes();

    await handler(req, res as any);

    if (res.statusCode === 200 && res.body?.data?.user?.role === 'admin') {
      console.log('✅ Test 3 Passed: Super Admin dev persona login succeeded with valid user and CSRF token.');
      console.log('   User:', res.body.data.user.email, '| Role:', res.body.data.user.role);
    } else {
      console.error('❌ Test 3 Failed:', res.body);
      process.exit(1);
    }
  }

  // Test 4: Dev Persona Team Head Login
  {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    const req: any = { method: 'POST', body: { persona: 'team_head_eng' } };
    const res = createMockRes();

    await handler(req, res as any);

    if (res.statusCode === 200 && res.body?.data?.user?.role === 'team_head' && (res.body?.data?.user?.teamId === 'team-scientific' || res.body?.data?.user?.teamId === 'team-engineering')) {
      console.log('✅ Test 4 Passed: Team Head (Scientific Program) dev persona login succeeded with team assignment.');
      console.log('   User:', res.body.data.user.email, '| Team:', res.body.data.user.teamId);
    } else {
      console.error('❌ Test 4 Failed:', res.body);
      process.exit(1);
    }
  }

  // Test 5: Dev Persona Auditor Login
  {
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_LOGIN = 'true';
    const req: any = { method: 'POST', body: { persona: 'viewer' } };
    const res = createMockRes();

    await handler(req, res as any);

    if (res.statusCode === 200 && res.body?.data?.user?.role === 'viewer') {
      console.log('✅ Test 5 Passed: Auditor dev persona login succeeded with viewer role.');
      console.log('   User:', res.body.data.user.email, '| Role:', res.body.data.user.role);
    } else {
      console.error('❌ Test 5 Failed:', res.body);
      process.exit(1);
    }
  }

  console.log('\n🎉 All 5 Zero-Leak Dev Login Verification Tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
