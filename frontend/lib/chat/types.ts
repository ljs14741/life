export type ChatRole = 'user' | 'bot' | 'system';

export interface ChatMessage {
    id: string;
    role: ChatRole;
    text: string;
    createdAt: number; // Date.now()
}

export interface ChatState {
    isOpen: boolean;
    messages: ChatMessage[];
}

export interface ChatContextValue extends ChatState {
    open: () => void;
    close: () => void;
    toggle: () => void;
    send: (text: string) => void;
    clear: () => void;
}
