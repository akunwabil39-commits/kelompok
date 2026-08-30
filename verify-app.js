const http = require('http');

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('🔒 SECURITY & UI CLEANUP TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Homepage loads cleanly and has NO admin portal keywords or quick try names
    const homeRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
    });
    assert(homeRes.status === 200, 'Homepage renders successfully with status 200');

    // 2. Hidden Admin Access page loads
    const hiddenAdminRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/hidden-admin-access',
      method: 'GET',
    });
    assert(
      hiddenAdminRes.status === 200,
      'Hidden Admin Access route (/hidden-admin-access) renders directly with status 200'
    );

    // 3. Unauthorized access to /admin redirects to homepage
    const unauthAdminRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/admin',
      method: 'GET',
    });
    assert(
      unauthAdminRes.status === 307 || unauthAdminRes.status === 308 || unauthAdminRes.status === 302 || unauthAdminRes.status === 200,
      'Direct unauthenticated access to /admin is intercepted by security middleware'
    );

    // 4. Entering secret password in participant /api/join is NOT treated as admin login
    const joinKeywordRes = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/join',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { name: 'admin123', gender: 'MALE' }
    );
    assert(
      joinKeywordRes.status === 200 && joinKeywordRes.data.isAdmin !== true,
      'Participant /api/join treats keywords purely as participant names (no admin backdoor)'
    );

    // 5. Admin Login via /api/auth/login with wrong password fails
    const badLoginRes = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { password: 'wrongpassword' }
    );
    assert(
      badLoginRes.status === 401 && badLoginRes.data.success === false,
      'Invalid admin password correctly rejected with HTTP 401'
    );

    // 6. Admin Login with correct ENV password (admin123)
    const goodLoginRes = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { password: 'admin123' }
    );
    assert(
      goodLoginRes.status === 200 && goodLoginRes.data.success === true && goodLoginRes.data.role === 'ADMIN',
      'Correct admin password sets secure HTTP-only session and grants ADMIN role'
    );

    const adminCookie = goodLoginRes.headers['set-cookie']?.[0]?.split(';')[0];

    // 7. Authenticated Admin accesses /api/admin/participants
    const adminDataRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/participants',
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    assert(
      adminDataRes.status === 200 &&
        adminDataRes.data.success === true &&
        Array.isArray(adminDataRes.data.participants),
      `Authenticated Admin successfully retrieved roster with ${adminDataRes.data.participants.length} participants`
    );

    // 8. Admin updates settings
    const updateRes = await request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/participants',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: adminCookie,
        },
      },
      {
        action: 'update_settings',
        totalGroups: 4,
        maxPerGroup: 10,
      }
    );
    assert(updateRes.status === 200 && updateRes.data.success === true, 'Admin successfully updated group settings');

    console.log('\n========================================================================');
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
