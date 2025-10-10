'use client';

import { useChat } from '@/app/chat/ChatProvider';
import ChatWindow from './ChatWindow';

export default function ChatDock() {

    const { isOpen, toggle, connected } = useChat();

    const statusText = connected ? '연결됨' : '오프라인';
    const statusDotClass = connected ? 'bg-emerald-500' : 'bg-rose-500';
    const statusPillClass = connected
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-rose-100 text-rose-700';

    return (
        <>
            {/* 우하단 도킹 영역 */}
            <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
                {/* 연결 상태 배지 (메시지 목록에는 넣지 않음) */}
                <div
                    className={`pointer-events-none select-none rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ${statusPillClass}`}
                    aria-live="polite"
                >
                    <span className={`mr-1 inline-block h-2 w-2 rounded-full ${statusDotClass}`} />
                    {statusText}
                </div>

                {/* 도킹 버튼 */}
                <button
                    onClick={toggle}
                    aria-expanded={isOpen}
                    className="rounded-full shadow-xl px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 active:translate-y-[1px] transition"
                >
                    {isOpen ? '닫기' : '채팅'}
                </button>
            </div>

            {/* 플로팅 채팅 창 */}
            <ChatWindow />
        </>
    );
}