export const FLOW: [string, string, string][] = [
  ['Your voice', 'Recorded in memory, turned into text on this device, then thrown away', 'Stays on this device'],
  ['Your story text', 'Read by simple on-device rules to find candidate facts', 'Stays on this device'],
  ['Confirmed facts', 'Saved in this browser (IndexedDB) so you can come back', 'Stays on this device'],
  ['Speech model', 'Downloaded once the first time you use voice, then kept for offline use', 'Model files only: no story content'],
  ['The brief', 'Made on this device. Downloaded or printed only when you choose', 'Leaves only if you share it'],
];
