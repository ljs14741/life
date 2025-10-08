const BAD_WORDS = ['fuck','shit','bitch','asshole','개새','병신','씨발']; // 샘플
const MASK_CHAR = '•';

export function maskProfanity(input: string) {
    let out = input;
    for (const w of BAD_WORDS) {
        const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        out = out.replace(re, (m) => MASK_CHAR.repeat(m.length));
    }
    return out;
}
