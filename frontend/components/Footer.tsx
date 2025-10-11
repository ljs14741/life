import Link from 'next/link';

const year = new Date().getFullYear();

export default function Footer() {
    return (
        <footer className="mt-16 border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-black">
            <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-600 dark:text-neutral-400">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    {/* 소개 블럭 */}
                    <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">인생망한모임</div>
                        <p className="mt-2 max-w-md leading-6">
                            익명으로 실수담/조언을 나누는 커뮤니티. 서로의 망함을 공유하며 웃어넘겨요^^.
                        </p>
                    </div>

                    {/* 링크 블럭 */}
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                        <div>
                            <div className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">서비스</div>
                            <ul className="space-y-1">
                                <li><Link href="/" className="hover:underline">홈</Link></li>
                                <li><Link href="/write" className="hover:underline">글 쓰기</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">정책</div>
                            <ul className="space-y-1">
                                <li><Link href="/legal/privacy" className="hover:underline">개인정보처리방침</Link></li>
                                <li><Link href="/legal/terms" className="hover:underline">이용약관</Link></li>
                                <li><Link href="/legal/cookies" className="hover:underline">쿠키 안내</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">소개/문의</div>
                            <ul className="space-y-1">
                                <li><Link href="/legal/about" className="hover:underline">소개</Link></li>
                                <li><Link href="/legal/contact" className="hover:underline">문의</Link></li>
                            </ul>
                        </div>
                        <div>
                            <div className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">고지</div>
                            <ul className="space-y-1">
                                <li>© {year} 인생망한모임</li>
                                <li>일부 페이지에 광고가 게재될 수 있습니다.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
