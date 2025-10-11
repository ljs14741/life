export function getLikedSet(): Set<number> {
    try {
        const raw = localStorage.getItem('liked_posts');
        const arr = raw ? (JSON.parse(raw) as number[]) : [];
        return new Set(arr);
    } catch {
        return new Set<number>();
    }
}

export function saveLikedSet(set: Set<number>) {
    localStorage.setItem('liked_posts', JSON.stringify(Array.from(set)));
}