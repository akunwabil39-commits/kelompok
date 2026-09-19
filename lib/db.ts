import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

// Global database instance caching for Next.js Turbopack / hot-reload
const globalForDb = globalThis as unknown as {
  dbInstance: DatabaseSync | undefined;
};

// Password hashing helper using crypto.scrypt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, storedHash] = combined.split(':');
    if (!salt || !storedHash) return false;
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(computed, 'hex'));
  } catch {
    return false;
  }
}

// Database initialization
export function initDatabase(): DatabaseSync {
  const db = new DatabaseSync('data/database.sqlite');
  db.exec(`PRAGMA foreign_keys = ON;`);

  // Ensure users table exists with golongan, status, and is_leader
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nim TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT NOT NULL,
      nama TEXT NOT NULL,
      golongan TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('L', 'P')),
      role TEXT NOT NULL DEFAULT 'PARTICIPANT' CHECK(role IN ('ADMIN', 'PARTICIPANT')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED')),
      group_number INTEGER,
      is_leader INTEGER NOT NULL DEFAULT 0 CHECK(is_leader IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Auto-migration for existing database: add golongan, status, and is_leader columns if missing
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
    const colNames = tableInfo.map((c) => c.name);

    if (!colNames.includes('golongan')) {
      db.exec(`ALTER TABLE users ADD COLUMN golongan TEXT;`);
    }
    if (colNames.includes('kelas')) {
      db.exec(`UPDATE users SET golongan = kelas WHERE (golongan IS NULL OR golongan = '') AND kelas IS NOT NULL;`);
      try {
        db.exec(`ALTER TABLE users DROP COLUMN kelas;`);
      } catch { }
    }
    if (!colNames.includes('status')) {
      db.exec(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'APPROVED';`);
    }
    if (!colNames.includes('is_leader')) {
      db.exec(`ALTER TABLE users ADD COLUMN is_leader INTEGER NOT NULL DEFAULT 0;`);
    }
  } catch { }

  // Create settings table with total_groups, max_per_group, and is_published
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_groups INTEGER NOT NULL DEFAULT 4,
      max_per_group INTEGER NOT NULL DEFAULT 10,
      is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0, 1))
    );
  `);

  // Auto-migration for settings table: add is_published column if missing
  try {
    const settingsTableInfo = db.prepare(`PRAGMA table_info(settings)`).all() as { name: string }[];
    const sColNames = settingsTableInfo.map((c) => c.name);
    if (!sColNames.includes('is_published')) {
      db.exec(`ALTER TABLE settings ADD COLUMN is_published INTEGER NOT NULL DEFAULT 0;`);
    }
  } catch { }

  // Initialize default settings (id = 1) if not exists
  const settingsRow = db.prepare(`SELECT id FROM settings WHERE id = 1`).get();
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO settings (id, total_groups, max_per_group, is_published)
      VALUES (1, 4, 10, 0)
    `).run();
  }

  // Ensure admin user exists
  const adminRow = db.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).get();
  if (!adminRow) {
    try {
      const adminPass = hashPassword('admin');
      db.prepare(`
        INSERT INTO users (nim, password, nama, golongan, gender, role, status, group_number)
        VALUES ('admin', ?, 'Administrator', 'ADMIN', 'L', 'ADMIN', 'APPROVED', NULL)
      `).run(adminPass);
    } catch { }
  }

  // Pre-seed sample participants if database is empty
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'`).get() as { count: number } | undefined;
  if (!countRow || countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO users (nim, password, nama, golongan, gender, role, status, group_number)
      VALUES (?, ?, ?, ?, ?, 'PARTICIPANT', 'APPROVED', ?)
    `);

    const defaultPass = hashPassword('password123');

    const initial = [
      { nim: '230101', nama: 'Alice Johnson', golongan: 'A', gender: 'P' as const, group: null },
      { nim: '230102', nama: 'Bob Pratama', golongan: 'A', gender: 'L' as const, group: null },
      { nim: '230103', nama: 'Charlie Wijaya', golongan: 'B', gender: 'L' as const, group: null },
      { nim: '230104', nama: 'Diana Putri', golongan: 'B', gender: 'P' as const, group: null },
      { nim: '230105', nama: 'Evan Santoso', golongan: 'C', gender: 'L' as const, group: null },
      { nim: '230106', nama: 'Fiona Lestari', golongan: 'D', gender: 'P' as const, group: null },
    ];

    for (const p of initial) {
      try {
        insertStmt.run(p.nim, defaultPass, p.nama, p.golongan, p.gender, p.group);
      } catch { }
    }
  }

  return db;
}

export const db: DatabaseSync = globalForDb.dbInstance ?? initDatabase();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbInstance = db;
}

export interface UserRecord {
  id: number;
  nim: string;
  password?: string;
  nama: string;
  golongan: string;
  gender: 'L' | 'P';
  role: 'ADMIN' | 'PARTICIPANT';
  status: 'PENDING' | 'APPROVED';
  group_number: number | null;
  is_leader: boolean;
  created_at: string;
}

export interface ParticipantRecord {
  id: number;
  nim: string;
  nama: string;
  golongan: string;
  gender: 'L' | 'P';
  role: 'PARTICIPANT';
  status: 'PENDING' | 'APPROVED';
  group_number: number | null;
  is_leader: boolean;
  created_at: string;
}

export interface SettingsRecord {
  id: number;
  totalGroups: number;
  maxPerGroup: number;
  isPublished: boolean;
}

export interface GroupStats {
  group_number: number;
  total: number;
  males: number;
  females: number;
  maxCapacity: number;
  isFull: boolean;
  percentageFilled: number;
}

// Settings management
export function getSettings(): SettingsRecord {
  try {
    const row = db.prepare(`SELECT total_groups, max_per_group, is_published FROM settings WHERE id = 1`).get() as {
      total_groups: number;
      max_per_group: number;
      is_published?: number;
    } | undefined;

    if (row) {
      return {
        id: 1,
        totalGroups: row.total_groups || 4,
        maxPerGroup: row.max_per_group || 10,
        isPublished: Number(row.is_published) === 1,
      };
    }
    return { id: 1, totalGroups: 4, maxPerGroup: 10, isPublished: false };
  } catch {
    return { id: 1, totalGroups: 4, maxPerGroup: 10, isPublished: false };
  }
}

export function updateSettings(totalGroups: number, maxPerGroup: number): { success: boolean; error?: string } {
  try {
    const validTotal = Math.max(2, Math.min(30, Math.floor(totalGroups)));
    const validMax = Math.max(1, Math.min(200, Math.floor(maxPerGroup)));

    db.prepare(`
      INSERT INTO settings (id, total_groups, max_per_group, is_published)
      VALUES (1, ?, ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        total_groups = excluded.total_groups,
        max_per_group = excluded.max_per_group
    `).run(validTotal, validMax);

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui pengaturan';
    return { success: false, error: errorMsg };
  }
}

// Publish or Hide Group Results from Participants
export function setPublishStatus(isPublished: boolean): { success: boolean; isPublished: boolean; error?: string } {
  try {
    const val = isPublished ? 1 : 0;
    db.prepare(`
      INSERT INTO settings (id, total_groups, max_per_group, is_published)
      VALUES (1, 4, 10, ?)
      ON CONFLICT(id) DO UPDATE SET is_published = excluded.is_published
    `).run(val);

    return { success: true, isPublished };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui status publikasi kelompok';
    return { success: false, isPublished: false, error: errorMsg };
  }
}

// Get Group Members (teammates within the same group)
export function getGroupMembers(groupNumber: number): Array<{
  id: number;
  nim: string;
  nama: string;
  golongan: string;
  gender: 'L' | 'P';
  is_leader: boolean;
}> {
  try {
    const stmt = db.prepare(`
      SELECT id, nim, nama, golongan, gender, is_leader
      FROM users
      WHERE role = 'PARTICIPANT' AND status = 'APPROVED' AND group_number = ?
      ORDER BY is_leader DESC, nama ASC
    `);
    const rows = stmt.all(groupNumber) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      nim: String(r.nim),
      nama: String(r.nama),
      golongan: String(r.golongan || ''),
      gender: r.gender as 'L' | 'P',
      is_leader: Number(r.is_leader) === 1,
    }));
  } catch {
    return [];
  }
}

// Helper: Normalize strings
export function normalizeString(input: unknown): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/\s+/g, ' ');
}

// User Lookups
export function findUserByNim(nim: string): UserRecord | null {
  const cleanNim = normalizeString(nim);
  if (!cleanNim) return null;

  const stmt = db.prepare(`
    SELECT id, nim, password, nama, golongan, gender, role, status, group_number, is_leader, created_at
    FROM users
    WHERE LOWER(nim) = LOWER(?)
    LIMIT 1
  `);
  const row = stmt.get(cleanNim) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: Number(row.id),
    nim: String(row.nim),
    password: row.password ? String(row.password) : undefined,
    nama: String(row.nama),
    golongan: String(row.golongan || ''),
    gender: row.gender as 'L' | 'P',
    role: row.role as 'ADMIN' | 'PARTICIPANT',
    status: (row.status as 'PENDING' | 'APPROVED') || 'APPROVED',
    group_number: row.group_number !== null ? Number(row.group_number) : null,
    is_leader: Number(row.is_leader) === 1,
    created_at: String(row.created_at),
  };
}

export function getUserById(id: number): UserRecord | null {
  const stmt = db.prepare(`
    SELECT id, nim, nama, golongan, gender, role, status, group_number, is_leader, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `);
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: Number(row.id),
    nim: String(row.nim),
    nama: String(row.nama),
    golongan: String(row.golongan || ''),
    gender: row.gender as 'L' | 'P',
    role: row.role as 'ADMIN' | 'PARTICIPANT',
    status: (row.status as 'PENDING' | 'APPROVED') || 'APPROVED',
    group_number: row.group_number !== null ? Number(row.group_number) : null,
    is_leader: Number(row.is_leader) === 1,
    created_at: String(row.created_at),
  };
}

// Register Participant (Default status: PENDING)
export function registerParticipant(data: {
  nim: string;
  password: string;
  nama: string;
  golongan: string;
  gender: 'L' | 'P';
}): { success: boolean; user?: UserRecord; error?: string } {
  try {
    const cleanNim = normalizeString(data.nim);
    const cleanNama = normalizeString(data.nama);
    const cleanGolongan = normalizeString(data.golongan).toUpperCase();
    const cleanGender = data.gender === 'P' ? 'P' : data.gender === 'L' ? 'L' : null;

    if (!cleanNama || cleanNama.length < 2) {
      return { success: false, error: 'Nama lengkap wajib diisi (minimal 2 karakter).' };
    }
    if (!cleanNim || cleanNim.length < 3) {
      return { success: false, error: 'NIM wajib diisi (minimal 3 karakter).' };
    }
    if (!data.password || data.password.length < 5) {
      return { success: false, error: 'Password minimal terdiri dari 5 karakter.' };
    }
    if (!cleanGolongan) {
      return { success: false, error: 'Golongan wajib diisi.' };
    }
    if (!cleanGender) {
      return { success: false, error: 'Jenis kelamin wajib dipilih (L atau P).' };
    }

    // Check duplicate NIM
    const existing = findUserByNim(cleanNim);
    if (existing) {
      return { success: false, error: `NIM ${cleanNim} sudah terdaftar. Silakan gunakan NIM lain atau login.` };
    }

    const hashedPassword = hashPassword(data.password);

    const insertStmt = db.prepare(`
      INSERT INTO users (nim, password, nama, golongan, gender, role, status, group_number)
      VALUES (?, ?, ?, ?, ?, 'PARTICIPANT', 'PENDING', NULL)
    `);

    const info = insertStmt.run(cleanNim, hashedPassword, cleanNama, cleanGolongan, cleanGender);

    const newUser: UserRecord = {
      id: Number(info.lastInsertRowid),
      nim: cleanNim,
      nama: cleanNama,
      golongan: cleanGolongan,
      gender: cleanGender,
      role: 'PARTICIPANT',
      status: 'PENDING',
      group_number: null,
      is_leader: false,
      created_at: new Date().toISOString(),
    };

    return { success: true, user: newUser };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan pengguna';
    return { success: false, error: msg };
  }
}

// Authenticate Participant
export function authenticateParticipant(
  nim: string,
  password: string
): { success: boolean; user?: UserRecord; error?: string } {
  const cleanNim = normalizeString(nim);
  if (!cleanNim || !password) {
    return { success: false, error: 'NIM dan Password wajib diisi.' };
  }

  const userWithPass = findUserByNim(cleanNim);
  if (!userWithPass || !userWithPass.password) {
    return { success: false, error: 'NIM atau Password salah.' };
  }

  const isValid = verifyPassword(password, userWithPass.password);
  if (!isValid) {
    return { success: false, error: 'NIM atau Password salah.' };
  }

  // Remove password from returned record
  const { password: _, ...userSafe } = userWithPass;
  return { success: true, user: userSafe as UserRecord };
}

// Get All Participants
export function getAllParticipants(): ParticipantRecord[] {
  const stmt = db.prepare(`
    SELECT id, nim, nama, golongan, gender, role, status, group_number, is_leader, created_at
    FROM users
    WHERE role = 'PARTICIPANT'
    ORDER BY 
      CASE WHEN status = 'PENDING' THEN 0 ELSE 1 END,
      CASE WHEN group_number IS NULL THEN 1 ELSE 0 END,
      group_number ASC,
      is_leader DESC,
      nama ASC
  `);
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    nim: String(r.nim),
    nama: String(r.nama),
    golongan: String(r.golongan || ''),
    gender: r.gender as 'L' | 'P',
    role: 'PARTICIPANT' as const,
    status: (r.status as 'PENDING' | 'APPROVED') || 'APPROVED',
    group_number: r.group_number !== null ? Number(r.group_number) : null,
    is_leader: Number(r.is_leader) === 1,
    created_at: String(r.created_at),
  }));
}

// Approve Single Participant
export function approveParticipant(id: number): { success: boolean; error?: string } {
  try {
    const stmt = db.prepare(`UPDATE users SET status = 'APPROVED' WHERE id = ? AND role = 'PARTICIPANT'`);
    const info = stmt.run(id);
    if (info.changes === 0) {
      return { success: false, error: 'Peserta tidak ditemukan.' };
    }
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menyetujui peserta';
    return { success: false, error: errorMsg };
  }
}

// Approve All Pending Participants
export function approveAllParticipants(): { success: boolean; count?: number; error?: string } {
  try {
    const stmt = db.prepare(`UPDATE users SET status = 'APPROVED' WHERE role = 'PARTICIPANT' AND status = 'PENDING'`);
    const info = stmt.run();
    return { success: true, count: Number(info.changes) };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menyetujui semua peserta';
    return { success: false, error: errorMsg };
  }
}

// Delete Participant
export function deleteParticipant(id: number): { success: boolean; error?: string } {
  try {
    const stmt = db.prepare(`DELETE FROM users WHERE id = ? AND role = 'PARTICIPANT'`);
    const info = stmt.run(id);
    if (info.changes === 0) {
      return { success: false, error: 'Peserta tidak ditemukan.' };
    }
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal menghapus peserta';
    return { success: false, error: errorMsg };
  }
}

// Reassign Participant
export function reassignParticipant(id: number, newGroup: number | null): { success: boolean; error?: string } {
  try {
    const stmt = db.prepare(`UPDATE users SET group_number = ? WHERE id = ? AND role = 'PARTICIPANT'`);
    const info = stmt.run(newGroup, id);
    if (info.changes === 0) {
      return { success: false, error: 'Peserta tidak ditemukan.' };
    }
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memindahkan kelompok peserta';
    return { success: false, error: errorMsg };
  }
}

// Clear All Participants
export function clearAllParticipants(): { success: boolean } {
  try {
    db.prepare(`DELETE FROM users WHERE role = 'PARTICIPANT'`).run();
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * AUTO-SHUFFLE WITH MULTI-CONSTRAINT OPTIMIZATION:
 * 1. Aturan Golongan Berbeda (Cross-Golongan): Dalam 1 kelompok tidak boleh ada anggota dari golongan yang sama (memaksimalkan variasi A, B, C, D).
 * 2. Aturan Gender Seimbang: Pertahankan rasio gender L (Laki-laki) dan P (Perempuan) di setiap kelompok seimbang.
 * 3. Penanganan Sisa / Imbalance: Distribusi adil dengan multi-trial simulated greedy penalty optimization.
 * 4. Database Transaction: Eksekusi batch atomic dengan SQLite BEGIN TRANSACTION / COMMIT.
 */
export function shuffleAllParticipants(): {
  success: boolean;
  count?: number;
  stats?: ReturnType<typeof getStats>;
  error?: string;
} {
  try {
    const settings = getSettings();
    const { totalGroups } = settings;

    if (totalGroups < 2) {
      return { success: false, error: 'Jumlah kelompok minimal adalah 2.' };
    }

    const stmt = db.prepare(`
      SELECT id, nim, nama, golongan, gender, role, status, group_number, created_at
      FROM users
      WHERE role = 'PARTICIPANT'
    `);
    const all = stmt.all() as unknown as ParticipantRecord[];

    if (all.length === 0) {
      return { success: true, count: 0, stats: getStats() };
    }

    // Helper: Normalize golongan string (e.g. "Golongan A" -> "A", "A" -> "A")
    const normalizeGolongan = (g: string | null | undefined): string => {
      if (!g) return 'UNKNOWN';
      const clean = g.trim().toUpperCase();
      const match = clean.match(/^GOL(?:ONGAN)?\s*([A-D])$/);
      if (match) return match[1];
      if (['A', 'B', 'C', 'D'].includes(clean)) return clean;
      return clean;
    };

    // Fisher-Yates array shuffle helper
    const shuffleArray = <T>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    };

    // Multi-trial optimization to find the best configuration that minimizes:
    // - Same-golongan collisions (penalty: 1,000,000)
    // - Gender imbalance across groups (penalty: 5,000)
    // - Group size variance (penalty: 500)
    const NUM_TRIALS = 50;
    let bestAssignments: { id: number; groupNumber: number; isLeader: boolean }[] = [];
    let bestScore = Infinity;

    for (let trial = 0; trial < NUM_TRIALS; trial++) {
      // Group state tracker for 1..totalGroups
      const groups: {
        number: number;
        members: { id: number; gender: 'L' | 'P'; golongan: string }[];
        golonganCounts: Record<string, number>;
        males: number;
        females: number;
      }[] = Array.from({ length: totalGroups }, (_, i) => ({
        number: i + 1,
        members: [],
        golonganCounts: {},
        males: 0,
        females: 0,
      }));

      // Bucket participants by gender first ('L' and 'P')
      // Then bucket within gender by normalized golongan
      // This ensures gender balance is maintained while spreading golongans across groups
      const genderPools: ('L' | 'P')[] = Math.random() > 0.5 ? ['L', 'P'] : ['P', 'L'];

      for (const currentGender of genderPools) {
        const participantsOfGender = all.filter((p) => p.gender === currentGender);

        // Group by normalized golongan
        const golonganMap: Record<string, ParticipantRecord[]> = {};
        for (const p of participantsOfGender) {
          const normGol = normalizeGolongan(p.golongan);
          if (!golonganMap[normGol]) golonganMap[normGol] = [];
          golonganMap[normGol].push(p);
        }

        // Shuffle within each golongan bucket
        for (const key of Object.keys(golonganMap)) {
          golonganMap[key] = shuffleArray(golonganMap[key]);
        }

        // Sort golongan buckets by size descending (largest/most constrained first)
        const sortedGolonganKeys = Object.keys(golonganMap).sort(
          (a, b) => golonganMap[b].length - golonganMap[a].length
        );

        // Place participants into groups using greedy penalty minimization
        for (const golKey of sortedGolonganKeys) {
          const bucket = golonganMap[golKey];
          for (const participant of bucket) {
            // Find the group with lowest penalty for this participant
            let minCost = Infinity;
            let chosenGroupIndex = 0;

            for (let gIdx = 0; gIdx < totalGroups; gIdx++) {
              const grp = groups[gIdx];
              const sameGolCount = grp.golonganCounts[golKey] || 0;

              // 1. Same-Golongan Penalty: extreme penalty for putting same golongan in the same group
              const sameGolPenalty = sameGolCount * 100000;

              // 2. Gender Balance Penalty: prefer groups with fewer people of this gender
              const myGenderCount = currentGender === 'L' ? grp.males : grp.females;
              const otherGenderCount = currentGender === 'L' ? grp.females : grp.males;
              const genderDiff = myGenderCount - otherGenderCount;
              const genderPenalty = Math.max(0, genderDiff) * 3000 + myGenderCount * 1000;

              // 3. Overall Group Size Penalty: keep total group sizes even
              const sizePenalty = grp.members.length * 100;

              // 4. Random tie-breaker
              const tieBreaker = Math.random();

              const cost = sameGolPenalty + genderPenalty + sizePenalty + tieBreaker;
              if (cost < minCost) {
                minCost = cost;
                chosenGroupIndex = gIdx;
              }
            }

            // Assign participant to chosen group
            const targetGroup = groups[chosenGroupIndex];
            targetGroup.members.push({
              id: participant.id,
              gender: participant.gender,
              golongan: golKey,
            });
            targetGroup.golonganCounts[golKey] = (targetGroup.golonganCounts[golKey] || 0) + 1;
            if (currentGender === 'L') {
              targetGroup.males++;
            } else {
              targetGroup.females++;
            }
          }
        }
      }

      // Compute trial evaluation score
      let totalGolonganCollisions = 0;
      let totalGenderImbalance = 0;
      let minGroupSize = Infinity;
      let maxGroupSize = 0;

      for (const grp of groups) {
        // Count duplicate golongans in this group
        for (const cnt of Object.values(grp.golonganCounts)) {
          if (cnt > 1) {
            totalGolonganCollisions += (cnt - 1);
          }
        }
        // Gender difference in this group
        totalGenderImbalance += Math.abs(grp.males - grp.females);

        if (grp.members.length < minGroupSize) minGroupSize = grp.members.length;
        if (grp.members.length > maxGroupSize) maxGroupSize = grp.members.length;
      }

      const sizeVariance = maxGroupSize - minGroupSize;
      const trialScore = (totalGolonganCollisions * 1000000) + (totalGenderImbalance * 5000) + (sizeVariance * 500);

      if (trialScore < bestScore) {
        bestScore = trialScore;
        bestAssignments = [];
        for (const grp of groups) {
          if (grp.members.length > 0) {
            // Automatically elect 1 group leader fairly per formed group
            const leaderIndex = Math.floor(Math.random() * grp.members.length);
            grp.members.forEach((m, idx) => {
              bestAssignments.push({
                id: m.id,
                groupNumber: grp.number,
                isLeader: idx === leaderIndex,
              });
            });
          }
        }
        // Perfect score (0 collisions and minimal possible variance) -> stop early
        if (bestScore === 0) break;
      }
    }

    // Mass update into database in a transaction
    db.exec('BEGIN TRANSACTION;');
    // Reset all participants' is_leader to 0 first
    db.prepare(`UPDATE users SET is_leader = 0 WHERE role = 'PARTICIPANT'`).run();
    const updateStmt = db.prepare(`UPDATE users SET group_number = ?, is_leader = ? WHERE id = ?`);
    try {
      for (const u of bestAssignments) {
        updateStmt.run(u.groupNumber, u.isLeader ? 1 : 0, u.id);
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    return {
      success: true,
      count: bestAssignments.length,
      stats: getStats(),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal mengacak kelompok secara otomatis';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// Set or Toggle Leader for a participant
export function setParticipantLeader(id: number, isLeader: boolean): { success: boolean; error?: string } {
  try {
    const user = getUserById(id);
    if (!user || user.role !== 'PARTICIPANT') {
      return { success: false, error: 'Peserta tidak ditemukan.' };
    }
    if (isLeader && user.group_number !== null) {
      // Each group has at most 1 leader: unset any previous leader in that group
      db.prepare(`UPDATE users SET is_leader = 0 WHERE group_number = ? AND role = 'PARTICIPANT'`).run(user.group_number);
    }
    const stmt = db.prepare(`UPDATE users SET is_leader = ? WHERE id = ? AND role = 'PARTICIPANT'`);
    stmt.run(isLeader ? 1 : 0, id);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memperbarui status ketua kelompok';
    return { success: false, error: errorMsg };
  }
}

// Get Statistics
export function getStats() {
  const settings = getSettings();
  const { totalGroups, maxPerGroup } = settings;

  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'`);
  const total = (totalStmt.get() as { count: number }).count;

  const maleStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND gender = 'L'`);
  const totalMales = (maleStmt.get() as { count: number }).count;

  const femaleStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND gender = 'P'`);
  const totalFemales = (femaleStmt.get() as { count: number }).count;

  const unassignedStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND group_number IS NULL`);
  const totalUnassigned = (unassignedStmt.get() as { count: number }).count;

  const pendingStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND status = 'PENDING'`);
  const totalPending = (pendingStmt.get() as { count: number }).count;

  const approvedStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND status = 'APPROVED'`);
  const totalApproved = (approvedStmt.get() as { count: number }).count;

  const groupStatsStmt = db.prepare(`
    SELECT 
      group_number,
      COUNT(*) as total,
      SUM(CASE WHEN gender = 'L' THEN 1 ELSE 0 END) as males,
      SUM(CASE WHEN gender = 'P' THEN 1 ELSE 0 END) as females
    FROM users
    WHERE role = 'PARTICIPANT' AND group_number IS NOT NULL
    GROUP BY group_number
    ORDER BY group_number ASC
  `);
  const rawStats = groupStatsStmt.all() as {
    group_number: number;
    total: number;
    males: number;
    females: number;
  }[];

  const groupBreakdowns: GroupStats[] = [];
  for (let i = 1; i <= totalGroups; i++) {
    const existing = rawStats.find((r) => r.group_number === i);
    const grpTotal = existing ? existing.total : 0;
    const grpMales = existing ? existing.males : 0;
    const grpFemales = existing ? existing.females : 0;

    groupBreakdowns.push({
      group_number: i,
      total: grpTotal,
      males: grpMales,
      females: grpFemales,
      maxCapacity: maxPerGroup,
      isFull: grpTotal >= maxPerGroup,
      percentageFilled: maxPerGroup > 0 ? Math.min(100, Math.round((grpTotal / maxPerGroup) * 100)) : 0,
    });
  }

  return {
    totalParticipants: total,
    totalMales,
    totalFemales,
    totalUnassigned,
    totalPending,
    totalApproved,
    isPublished: settings.isPublished,
    settings,
    totalCapacity: totalGroups * maxPerGroup,
    groupBreakdowns,
  };
}
