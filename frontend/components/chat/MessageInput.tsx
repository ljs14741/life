'use client';

import { useState } from 'react';
import { useChat } from '@/app/chat/ChatProvider';

export default function MessageInput() {
    const { send } = useChat();
    const [value, setValue] = useState('');

    const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        const text = value.trim();
        if (!text) return;
        send(text);
        setValue('');
    };

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        setValue(e.target.value);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.nativeEvent?.isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = value.trim();
            if (!text) return;
            send(text);
            setValue('');
        }
    };

    return (
        <form onSubmit={onSubmit} className="border-t border-neutral-200 dark:border-neutral-700 p-2">
            <div className="flex gap-2">
                <input
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    placeholder="메시지를 입력하세요… (Shift+Enter 줄바꿈)"
                    className="flex-1 rounded-xl px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    className="rounded-xl px-3 py-2 bg-blue-600 text-white hover:bg-blue-700"
                    type="submit"
                >
                    보내기
                </button>
            </div>
        </form>
    );
}
