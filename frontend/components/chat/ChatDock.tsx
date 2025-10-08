'use client';

import { useChat } from '@/app/chat/ChatProvider';
import ChatWindow from './ChatWindow';

export default function ChatDock() {
    const { isOpen, toggle } = useChat();

    return (
        <>
            {/* 도킹 버튼 */}
            <button
                onClick={toggle}
                aria-expanded={isOpen}
                className="fixed right-4 bottom-4 z-40 rounded-full shadow-xl px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 transition"
            >
                {isOpen ? '닫기' : '채팅'}
            </button>

            {/* 확장 창 */}
            <ChatWindow />
        </>
    );
}
