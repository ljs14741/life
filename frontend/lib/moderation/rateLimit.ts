// 간단 토큰버킷 (로컬 스토리지) : 10초에 5메시지
const KEY = 'imangmo_rl';
const WINDOW_MS = 10_000;
const LIMIT = 5;

export function canSendNow(): boolean {
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const kept = arr.filter((t) => now - t < WINDOW_MS);
    if (kept.length >= LIMIT) return false;
    kept.push(now);
    localStorage.setItem(KEY, JSON.stringify(kept));
    return true;
}
