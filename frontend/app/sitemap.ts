import type { MetadataRoute } from 'next';

const BASE = 'https://life.binaryworld.kr';
const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

type Post = {
    id: number;
    updateDate?: string;
    createDate?: string;
    deleteYn?: 'Y' | 'N';
};

async function fetchPosts(): Promise<Post[]> {
    try {
        const r = await fetch(`${API}/api/posts?page=0&size=500`, { next: { revalidate: 3600 } });
        if (!r.ok) return [];
        const arr = (await r.json()) as Post[];
        return arr.filter((p) => p.deleteYn !== 'Y');
    } catch {
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await fetchPosts();

    const staticPages: MetadataRoute.Sitemap = [
        { url: `${BASE}/`, lastModified: new Date() },
        { url: `${BASE}/legal/privacy`, lastModified: new Date() },
        { url: `${BASE}/legal/terms`, lastModified: new Date() },
        { url: `${BASE}/legal/cookies`, lastModified: new Date() },
        { url: `${BASE}/legal/about`, lastModified: new Date() },
        { url: `${BASE}/legal/contact`, lastModified: new Date() },
    ];

    const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
        url: `${BASE}/posts/${p.id}`,
        lastModified: p.updateDate ? new Date(p.updateDate) : (p.createDate ? new Date(p.createDate) : new Date()),
    }));

    return [...staticPages, ...postPages];
}
