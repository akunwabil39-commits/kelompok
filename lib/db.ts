import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');

const globalForDb = global as unknown as { dbInstance?: DatabaseSync };

function initDatabase(): DatabaseSync {
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode & foreign keys
  db.exec(`PRAGMA journal_mode = WAL;`);
  db.exec(`PRAGMA foreign_keys = ON;`);

  // Create users table with gender
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      gender TEXT NOT NULL CHECK(gender IN ('MALE', 'FEMALE')),
      role TEXT NOT NULL DEFAULT 'PARTICIPANT' CHECK(role IN ('ADMIN', 'PARTICIPANT')),
      group_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create settings table with total_groups and max_per_group
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_groups INTEGER NOT NULL DEFAULT 4,
      max_per_group INTEGER NOT NULL DEFAULT 10
    );
  `);

  // Initialize default settings (id = 1) if not exists
  const settingsRow = db.prepare(`SELECT id FROM settings WHERE id = 1`).get();
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO settings (id, total_groups, max_per_group)
      VALUES (1, 4, 10)
    `).run();
  }

  // Pre-seed sample participants if empty
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'`).get() as { count: number } | undefined;
  if (!countRow || countRow.count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO users (name, gender, role, group_number)
      VALUES (?, ?, 'PARTICIPANT', ?)
    `);

    const initial = [
      { name: 'Alice', gender: 'FEMALE', group: 1 },
      { name: 'Bob', gender: 'MALE', group: 1 },
      { name: 'Charlie', gender: 'MALE', group: 2 },
      { name: 'Diana', gender: 'FEMALE', group: 2 },
      { name: 'Evan', gender: 'MALE', group: 3 },
      { name: 'Fiona', gender: 'FEMALE', group: 3 },
    ];

    for (const p of initial) {
      try {
        insertStmt.run(p.name, p.gender, p.group);
      } catch {}
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
  name: string;
  gender: 'MALE' | 'FEMALE';
  role: 'ADMIN' | 'PARTICIPANT';
  group_number: number | null;
  created_at: string;
}

export interface ParticipantRecord {
  id: number;
  name: string;
  gender: 'MALE' | 'FEMALE';
  role: 'PARTICIPANT';
  group_number: number;
  created_at: string;
}

export interface SettingsRecord {
  id: number;
  totalGroups: number;
  maxPerGroup: number;
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
    const row = db.prepare(`SELECT total_groups, max_per_group FROM settings WHERE id = 1`).get() as {
      total_groups: number;
      max_per_group: number;
    } | undefined;

    if (row) {
      return {
        id: 1,
        totalGroups: row.total_groups || 4,
        maxPerGroup: row.max_per_group || 10,
      };
    }
    return { id: 1, totalGroups: 4, maxPerGroup: 10 };
  } catch {
    return { id: 1, totalGroups: 4, maxPerGroup: 10 };
  }
}

export function updateSettings(totalGroups: number, maxPerGroup: number): { success: boolean; error?: string } {
  try {
    const validTotal = Math.max(2, Math.min(30, Math.floor(totalGroups)));
    const validMax = Math.max(1, Math.min(200, Math.floor(maxPerGroup)));

    db.prepare(`
      INSERT INTO settings (id, total_groups, max_per_group)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        total_groups = excluded.total_groups,
        max_per_group = excluded.max_per_group
    `).run(validTotal, validMax);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update settings' };
  }
}

// User lookups
export function findUserByName(name: string): UserRecord | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const stmt = db.prepare(`
    SELECT id, name, gender, role, group_number, created_at
    FROM users
    WHERE LOWER(name) = LOWER(?)
    LIMIT 1
  `);
  const row = stmt.get(trimmed) as UserRecord | undefined;
  return row ?? null;
}

export function getUserById(id: number): UserRecord | null {
  const stmt = db.prepare(`
    SELECT id, name, gender, role, group_number, created_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `);
  const row = stmt.get(id) as UserRecord | undefined;
  return row ?? null;
}

/**
 * Advanced Gender-Balanced Random Auto-Assignment Algorithm:
 * 1. Fetch totalGroups and maxPerGroup from Settings.
 * 2. For each group 1..totalGroups, compute total members and count of incoming gender.
 * 3. Filter out full groups (total >= maxPerGroup).
 * 4. If all groups are full, return Registration Full error.
 * 5. From remaining available groups, find the group(s) with the LOWEST count of the incoming user's gender.
 * 6. If multiple groups are tied for the lowest count, pick one STRICTLY AT RANDOM.
 * 7. Assign user and commit to database.
 */
export function autoAssignGroup(
  name: string,
  gender: 'MALE' | 'FEMALE'
): { success: boolean; user?: UserRecord; isNew?: boolean; error?: string } {
  try {
    const trimmed = name.trim();
    const settings = getSettings();
    const { totalGroups, maxPerGroup } = settings;

    // Query current counts per group
    const statsStmt = db.prepare(`
      SELECT 
        group_number,
        COUNT(*) as total,
        SUM(CASE WHEN gender = 'MALE' THEN 1 ELSE 0 END) as males,
        SUM(CASE WHEN gender = 'FEMALE' THEN 1 ELSE 0 END) as females
      FROM users
      WHERE role = 'PARTICIPANT' AND group_number IS NOT NULL
      GROUP BY group_number
    `);
    const rawRows = statsStmt.all() as { group_number: number; total: number; males: number; females: number }[];

    // Build map for groups 1..totalGroups
    interface GroupState {
      groupNumber: number;
      total: number;
      males: number;
      females: number;
      genderCount: number;
    }

    const groupMap: Record<number, GroupState> = {};
    for (let i = 1; i <= totalGroups; i++) {
      groupMap[i] = {
        groupNumber: i,
        total: 0,
        males: 0,
        females: 0,
        genderCount: 0,
      };
    }

    for (const r of rawRows) {
      if (r.group_number >= 1 && r.group_number <= totalGroups) {
        groupMap[r.group_number] = {
          groupNumber: r.group_number,
          total: r.total,
          males: r.males,
          females: r.females,
          genderCount: gender === 'MALE' ? r.males : r.females,
        };
      }
    }

    // Step C: Filter out full groups (total >= maxPerGroup)
    const availableGroups = Object.values(groupMap).filter((g) => g.total < maxPerGroup);

    if (availableGroups.length === 0) {
      return {
        success: false,
        error: `Registration Full. All ${totalGroups} groups have reached their maximum capacity of ${maxPerGroup} participants.`,
      };
    }

    // Step D: Find the group(s) with the LOWEST count of the incoming user's gender
    let minGenderCount = Infinity;
    for (const g of availableGroups) {
      if (g.genderCount < minGenderCount) {
        minGenderCount = g.genderCount;
      }
    }

    const tiedGroups = availableGroups.filter((g) => g.genderCount === minGenderCount);

    // Step E: If multiple groups are tied, pick one STRICTLY AT RANDOM
    const randomIndex = Math.floor(Math.random() * tiedGroups.length);
    const chosenGroup = tiedGroups[randomIndex].groupNumber;

    // Step F: Insert into database
    const insertStmt = db.prepare(`
      INSERT INTO users (name, gender, role, group_number)
      VALUES (?, ?, 'PARTICIPANT', ?)
    `);
    const info = insertStmt.run(trimmed, gender, chosenGroup);

    const newUser: UserRecord = {
      id: Number(info.lastInsertRowid),
      name: trimmed,
      gender,
      role: 'PARTICIPANT',
      group_number: chosenGroup,
      created_at: new Date().toISOString(),
    };

    return { success: true, user: newUser, isNew: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Auto-assignment failed' };
  }
}

export function getOrJoinParticipant(
  name: string,
  gender: 'MALE' | 'FEMALE'
): { success: boolean; user?: UserRecord; isNew?: boolean; error?: string } {
  const existing = findUserByName(name);
  if (existing) {
    return { success: true, user: existing, isNew: false };
  }
  return autoAssignGroup(name, gender);
}

export function getAllParticipants(): ParticipantRecord[] {
  const stmt = db.prepare(`
    SELECT id, name, gender, role, group_number, created_at
    FROM users
    WHERE role = 'PARTICIPANT'
    ORDER BY group_number ASC, created_at DESC
  `);
  return stmt.all() as unknown as ParticipantRecord[];
}

export function deleteParticipant(id: number): { success: boolean; error?: string } {
  try {
    const stmt = db.prepare(`DELETE FROM users WHERE id = ? AND role = 'PARTICIPANT'`);
    const info = stmt.run(id);
    if (info.changes === 0) {
      return { success: false, error: 'Participant not found' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function reassignParticipant(id: number, newGroup: number): { success: boolean; error?: string } {
  try {
    if (newGroup < 1) {
      return { success: false, error: 'Invalid group number' };
    }
    const stmt = db.prepare(`UPDATE users SET group_number = ? WHERE id = ? AND role = 'PARTICIPANT'`);
    const info = stmt.run(Math.floor(newGroup), id);
    if (info.changes === 0) {
      return { success: false, error: 'Participant not found' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function clearAllParticipants(): { success: boolean } {
  try {
    db.prepare(`DELETE FROM users WHERE role = 'PARTICIPANT'`).run();
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function getStats() {
  const settings = getSettings();
  const { totalGroups, maxPerGroup } = settings;

  const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT'`);
  const total = (totalStmt.get() as { count: number }).count;

  const maleStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND gender = 'MALE'`);
  const totalMales = (maleStmt.get() as { count: number }).count;

  const femaleStmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'PARTICIPANT' AND gender = 'FEMALE'`);
  const totalFemales = (femaleStmt.get() as { count: number }).count;

  const groupStatsStmt = db.prepare(`
    SELECT 
      group_number,
      COUNT(*) as total,
      SUM(CASE WHEN gender = 'MALE' THEN 1 ELSE 0 END) as males,
      SUM(CASE WHEN gender = 'FEMALE' THEN 1 ELSE 0 END) as females
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
    settings,
    totalCapacity: totalGroups * maxPerGroup,
    groupBreakdowns,
  };
}
