'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useChat } from '@/app/chat/ChatProvider';

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const { open: openChat } = useChat();

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const handleChatClick = () => {
        openChat();
        setIsOpen(false);
    };

    const links = [
        { href: '/write', label: '글쓰기', isLink: true },
        { label: '채팅', isLink: false, onClick: handleChatClick },
        { href: '/legal/guideline', label: '가이드라인', isLink: true },
    ];

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800/80 dark:bg-black/90">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

                    <Link href="/" className="text-lg font-bold" onClick={() => setIsOpen(false)}>
                        인망모
                    </Link>

                    <div className="hidden items-center gap-4 sm:flex">
                        <Link href="/write" className="text-sm font-medium text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white">
                            글쓰기
                        </Link>
                        <button
                            onClick={openChat}
                            className="text-sm font-medium text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                        >
                            채팅
                        </button>
                    </div>

                    <button
                        onClick={toggleMenu}
                        className="relative z-50 h-8 w-8 text-neutral-900 dark:text-white sm:hidden"
                        aria-label="메뉴 열기"
                    >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 space-y-1.5">
                            <motion.span
                                animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 6.5 : 0 }}
                                className="block h-0.5 w-6 bg-current"
                            />
                            <motion.span
                                animate={{ opacity: isOpen ? 0 : 1 }}
                                className="block h-0.5 w-6 bg-current"
                            />
                            <motion.span
                                animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -6.5 : 0 }}
                                className="block h-0.5 w-6 bg-current"
                            />
                        </div>
                    </button>
                </nav>
            </header>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-white/95 pt-20 dark:bg-black/95 sm:hidden"
                    >
                        <nav className="flex flex-col items-center gap-6 px-4">
                            {links.map((link) => (
                                link.isLink ? (
                                    <Link
                                        key={link.href}
                                        href={link.href!}
                                        onClick={() => setIsOpen(false)}
                                        className="block w-full rounded-lg bg-neutral-100 p-4 text-center text-lg font-semibold text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                                    >
                                        {link.label}
                                    </Link>
                                ) : (
                                    <button
                                        key={link.label}
                                        onClick={link.onClick}
                                        className="block w-full rounded-lg bg-neutral-100 p-4 text-center text-lg font-semibold text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                                    >
                                        {link.label}
                                    </button>
                                )
                            ))}
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}