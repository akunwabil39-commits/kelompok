import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Testing Auto-Shuffle Leader Election & Cross-Golongan Distribution ---');

  // 1. Admin Login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { password: process.env.ADMIN_PASSWORD || 'kelompokwebsite!!!' },
  });

  const cookieHeader = loginRes.headers['set-cookie'];
  const adminCookie = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;

  // Clear roster first to start with a pristine roster
  await request('/api/admin/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: { action: 'clear_roster' },
  });

  // 2. Register 8 participants: 2 per Golongan (1 L, 1 P)
  const testParticipants = [
    { nim: '240101', nama: 'Alice A (P)', golongan: 'A', gender: 'P', password: 'password123' },
    { nim: '240102', nama: 'Alex A (L)', golongan: 'A', gender: 'L', password: 'password123' },
    { nim: '240201', nama: 'Bella B (P)', golongan: 'B', gender: 'P', password: 'password123' },
    { nim: '240202', nama: 'Bob B (L)', golongan: 'B', gender: 'L', password: 'password123' },
    { nim: '240301', nama: 'Chloe C (P)', golongan: 'C', gender: 'P', password: 'password123' },
    { nim: '240302', nama: 'Charlie C (L)', golongan: 'C', gender: 'L', password: 'password123' },
    { nim: '240401', nama: 'Diana D (P)', golongan: 'D', gender: 'P', password: 'password123' },
    { nim: '240402', nama: 'David D (L)', golongan: 'D', gender: 'L', password: 'password123' },
  ];

  for (const p of testParticipants) {
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: p,
    });
    if (!regRes.data.success) {
      console.error(`Failed to register ${p.nim}:`, regRes.data);
    }
  }
  console.log('✓ Successfully registered 8 participants across Golongan A, B, C, D');

  // 3. Approve all participants
  const approveRes = await request('/api/admin/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: { action: 'approve_all' },
  });
  console.log('✓ Approved all participants:', approveRes.data.message);

  // 4. Configure 2 groups
  await request('/api/admin/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: { action: 'update_settings', totalGroups: 2, maxPerGroup: 4 },
  });

  // 5. Execute Auto-Shuffle
  const shuffleRes = await request('/api/admin/shuffle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
  });

  if (!shuffleRes.data.success) {
    console.error('Shuffle failed:', shuffleRes.data);
    process.exit(1);
  }
  console.log('✓ Auto-Shuffle executed successfully');

  // 6. Fetch participants list and verify group composition & leaders
  const listRes = await request('/api/admin/participants', {
    method: 'GET',
    headers: { Cookie: adminCookie },
  });

  if (!listRes.data || !listRes.data.participants) {
    console.error('Failed to get participants:', listRes.status, listRes.data);
    process.exit(1);
  }

  const participants = listRes.data.participants;
  const group1 = participants.filter((p) => p.group_number === 1);
  const group2 = participants.filter((p) => p.group_number === 2);

  console.log(`\n--- Group 1 (${group1.length} members) ---`);
  group1.forEach((m) => {
    console.log(`  - ${m.nama} (NIM: ${m.nim}) | Golongan: ${m.golongan} | Gender: ${m.gender} ${m.is_leader ? '👑 [KETUA KELOMPOK]' : ''}`);
  });

  console.log(`\n--- Group 2 (${group2.length} members) ---`);
  group2.forEach((m) => {
    console.log(`  - ${m.nama} (NIM: ${m.nim}) | Golongan: ${m.golongan} | Gender: ${m.gender} ${m.is_leader ? '👑 [KETUA KELOMPOK]' : ''}`);
  });

  // Verification checks
  const g1Leaders = group1.filter((p) => p.is_leader);
  const g2Leaders = group2.filter((p) => p.is_leader);

  if (g1Leaders.length !== 1) {
    throw new Error(`Group 1 should have exactly 1 leader, got ${g1Leaders.length}`);
  }
  if (g2Leaders.length !== 1) {
    throw new Error(`Group 2 should have exactly 1 leader, got ${g2Leaders.length}`);
  }
  console.log('\n✓ Leader Election Check Passed: Exactly 1 leader elected per group!');

  // Check unique golongans in Group 1 & Group 2
  const g1Gols = new Set(group1.map((p) => p.golongan));
  const g2Gols = new Set(group2.map((p) => p.golongan));
  if (g1Gols.size !== 4 || g2Gols.size !== 4) {
    throw new Error(`Each group must contain all 4 distinct Golongans (A, B, C, D). G1: ${g1Gols.size}, G2: ${g2Gols.size}`);
  }
  console.log('✓ Cross-Golongan Check Passed: 0 duplicate Golongan in any group!');

  // 7. Check Participant Confidentiality (Results hidden until published)
  const userLoginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { nim: '240101', password: 'password123' },
  });
  const userCookie = Array.isArray(userLoginRes.headers['set-cookie'])
    ? userLoginRes.headers['set-cookie'].join('; ')
    : userLoginRes.headers['set-cookie'];

  const userGroupRes = await request('/api/participant/my-group', {
    method: 'GET',
    headers: { Cookie: userCookie },
  });

  if (userGroupRes.data.groupNumber !== null) {
    throw new Error(`Participant should NOT see groupNumber before publishing! Got: ${userGroupRes.data.groupNumber}`);
  }
  if (userGroupRes.data.groupMembers.length !== 0) {
    throw new Error('Participant should NOT see group members before publishing!');
  }
  console.log('✓ Confidentiality Check Passed: Group results and leader remain 100% hidden from participant!');

  // 8. Test manual leader assignment
  const nonLeader = group1.find((p) => !p.is_leader);
  console.log(`\nPromoting ${nonLeader.nama} (ID ${nonLeader.id}) to Ketua Kelompok 1...`);
  const setLeaderRes = await request('/api/admin/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: { action: 'set_leader', id: nonLeader.id, isLeader: true },
  });
  if (!setLeaderRes.data.success) {
    throw new Error(`set_leader failed: ${setLeaderRes.data.error}`);
  }

  const updatedListRes = await request('/api/admin/participants', {
    method: 'GET',
    headers: { Cookie: adminCookie },
  });
  const updatedG1 = updatedListRes.data.participants.filter((p) => p.group_number === 1);
  const updatedG1Leaders = updatedG1.filter((p) => p.is_leader);

  if (updatedG1Leaders.length !== 1 || updatedG1Leaders[0].id !== nonLeader.id) {
    throw new Error(`Expected new leader to be ID ${nonLeader.id}, got: ${JSON.stringify(updatedG1Leaders)}`);
  }
  console.log(`✓ Manual Leader Assignment Passed: ${nonLeader.nama} is now the sole leader of Kelompok 1!`);

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
