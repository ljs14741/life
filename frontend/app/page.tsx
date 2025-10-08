// app/page.tsx
import { ChatProvider } from './chat/ChatProvider';
import ChatDock from '@/components/chat/ChatDock';

export default function Home() {
  return (
      <ChatProvider>
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-4">인망모 MVP</h1>
          <p className="text-neutral-600">채팅부터 시작해요. 우측 하단의 버튼을 눌러보세요.</p>
        </main>
        <ChatDock />
      </ChatProvider>
  );
}
