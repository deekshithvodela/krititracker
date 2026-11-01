import routerHandler from '../server/index';
import { execSync } from 'child_process';

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
  console.log('🧪 Starting Phase 18 Vercel Serverless Function Optimization Tests...\n');

  // Test 1: Function count assertion (Must be <= 12 for Hobby plan; target is exactly 1)
  const stdout = execSync('find api -maxdepth 1 -type f ! -name ".*"', { encoding: 'utf-8' }).trim();
  const functionFiles = stdout.split('\n').filter(Boolean);
  if (functionFiles.length === 1 && functionFiles[0] === 'api/index.js') {
    console.log('✅ Test 1 Passed: Exactly 1 Serverless Function detected (api/index.js). 100% Hobby quota compliant (1/12 used).');
  } else {
    throw new Error(`Test 1 Failed: Expected 1 function (api/index.js), found ${functionFiles.length}: ${JSON.stringify(functionFiles)}`);
  }

  // Test 2: Router health / root endpoint
  const healthReq: any = {
    url: '/api/health',
    query: { path: 'health' },
    method: 'GET',
    headers: {},
  };
  const healthRes = createMockRes();
  await routerHandler(healthReq, healthRes as any);

  if (healthRes.statusCode === 200 && healthRes.body?.status === 'healthy' && healthRes.body?.plan?.includes('Hobby')) {
    console.log('✅ Test 2 Passed: Router health endpoint responded 200 OK with healthy status.');
  } else {
    throw new Error(`Test 2 Failed: Unexpected health response: ${JSON.stringify(healthRes.body)}`);
  }

  // Test 3: Dev-login dispatch through unified router
  process.env.ENABLE_DEV_LOGIN = 'true';
  process.env.NODE_ENV = 'development';
  process.env.JWT_SECRET = 'test-secret-phase18-key-12345678901234567890';

  const loginReq: any = {
    url: '/api?path=auth/dev-login',
    query: { path: 'auth/dev-login' },
    method: 'POST',
    headers: {},
    body: { persona: 'admin' },
  };
  const loginRes = createMockRes();
  await routerHandler(loginReq, loginRes as any);

  if (loginRes.statusCode === 200 && loginRes.body?.success === true && loginRes.body?.data?.user?.email === 'admin.qa@company.com') {
    console.log('✅ Test 3 Passed: Auth handler dispatched through unified router successfully.');
  } else {
    throw new Error(`Test 3 Failed: Dev-login dispatch returned: ${JSON.stringify(loginRes.body)}`);
  }

  // Test 4: Dynamic parameter extraction for team routes
  let extractedTeamId: string | null = null;
  const teamTasksReq: any = {
    url: '/api?path=teams/team-scientific/tasks',
    query: { path: 'teams/team-scientific/tasks' },
    method: 'GET',
    headers: {},
  };
  const teamTasksRes = createMockRes();
  // Handler will try to authenticate session; even if it rejects with 401, req.query.teamId was set!
  await routerHandler(teamTasksReq, teamTasksRes as any);
  extractedTeamId = teamTasksReq.query.teamId;

  if (extractedTeamId === 'team-scientific') {
    console.log('✅ Test 4 Passed: Team route dynamic parameter extraction verified (teamId: team-scientific).');
  } else {
    throw new Error(`Test 4 Failed: Expected teamId 'team-scientific', got '${extractedTeamId}'`);
  }

  // Test 5: Dynamic parameter extraction for task routes
  let extractedTaskId: string | null = null;
  const taskStatusReq: any = {
    url: '/api?path=tasks/TASK-SCI-004/status',
    query: { path: 'tasks/TASK-SCI-004/status' },
    method: 'PATCH',
    headers: {},
  };
  const taskStatusRes = createMockRes();
  await routerHandler(taskStatusReq, taskStatusRes as any);
  extractedTaskId = taskStatusReq.query.taskId;

  if (extractedTaskId === 'TASK-SCI-004') {
    console.log('✅ Test 5 Passed: Task route dynamic parameter extraction verified (taskId: TASK-SCI-004).');
  } else {
    throw new Error(`Test 5 Failed: Expected taskId 'TASK-SCI-004', got '${extractedTaskId}'`);
  }

  // Test 6: 404 fallback for unknown paths
  const notFoundReq: any = {
    url: '/api?path=unknown/random/endpoint',
    query: { path: 'unknown/random/endpoint' },
    method: 'GET',
    headers: {},
  };
  const notFoundRes = createMockRes();
  await routerHandler(notFoundReq, notFoundRes as any);

  if (notFoundRes.statusCode === 404 && notFoundRes.body?.success === false) {
    console.log('✅ Test 6 Passed: Unknown route correctly returned 404 error.');
  } else {
    throw new Error(`Test 6 Failed: Expected 404, got ${notFoundRes.statusCode}`);
  }

  console.log('\n🎉 All 6 Phase 18 Vercel Serverless Function Optimization Tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('❌ Phase 18 Test Runner Error:', err);
  process.exit(1);
});
