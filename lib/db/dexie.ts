import Dexie, { type Table } from 'dexie';
import type { BriefRecord, InterruptionLog, Story } from './models';

class NaviraDB extends Dexie {
  stories!: Table<Story, string>;
  briefs!: Table<BriefRecord, string>;
  interruptions!: Table<InterruptionLog, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor() {
    super('navira');
    this.version(1).stores({ stories: 'id, createdAt', briefs: 'id, generatedAt', interruptions: 'id, at', meta: 'key' });
  }
}

let _db: NaviraDB | null = null;
export function db(): NaviraDB {
  if (!_db) _db = new NaviraDB();
  return _db;
}
export function resetDbHandle() { _db = null; }
