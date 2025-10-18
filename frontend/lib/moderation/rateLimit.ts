// lib/moderation/rateLimit.ts
// 간단 토큰버킷 (로컬 스토리지) : 10초에 5메시지
const KEY = 'imangmo_rl';
const WINDOW_MS = 10_000;
const LIMIT = 5;

/** 현재 시점에 전송 가능하면 true, 불가면 false (내부적으로 카운트 1 증가) */
export function canSendNow(): boolean {
    if (typeof window === 'undefined') return true; // SSR 안전
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const kept = arr.filter((t) => now - t < WINDOW_MS);

    if (kept.length >= LIMIT) return false;

    kept.push(now);
    localStorage.setItem(KEY, JSON.stringify(kept));
    return true;
}

/** 남은 전송 가능 횟수(윈도우 내) */
export function remaining(): number {
    if (typeof window === 'undefined') return LIMIT;
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const kept = arr.filter((t) => now - t < WINDOW_MS);
    return Math.max(0, LIMIT - kept.length);
}

/** 다음 전송 가능까지 대기해야 하는 ms (즉시 가능하면 0) */
export function retryAfterMs(): number {
    if (typeof window === 'undefined') return 0;
    const now = Date.now();
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    const kept = arr.filter((t) => now - t < WINDOW_MS);
    if (kept.length < LIMIT) return 0;
    const oldest = Math.min(...kept);
    return Math.max(0, oldest + WINDOW_MS - now);
}
