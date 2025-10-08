'use client';

import { useChat } from '@/app/chat/ChatProvider';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatWindow() {
    const { isOpen, close, clear } = useChat();

    if (!isOpen) return null;

    return (
        <div
            className="fixed right-4 bottom-20 md:bottom-4 z-40 w-[92vw] max-w-[380px] h-[60vh] md:h-[70vh] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-label="인망모 채팅"
        >
            <header className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
                <div className="font-semibold">인망모 채팅</div>
                <div className="flex gap-2">
                    <button
                        onClick={clear}
                        className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200"
                        title="대화 지우기"
                    >
                        Clear
                    </button>
                    <button
                        onClick={close}
                        className="text-xs px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200"
                        title="닫기"
                    >
                        ✕
                    </button>
                </div>
            </header>

            <MessageList />
            <MessageInput />
        </div>
    );
}
