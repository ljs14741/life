export default function TermsPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="text-2xl font-bold">이용약관</h1>
            <p className="mt-4 leading-7">
                본 약관은 인생망한모임 서비스 이용과 관련하여 운영자와 이용자 간의 권리, 의무 및 책임 사항 등을 규정합니다.
            </p>
            <h2 className="mt-8 text-xl font-semibold">게시물 관리</h2>
            <ul className="mt-2 list-disc pl-6 leading-7">
                <li>법령 및 공서양속에 반하는 게시물은 사전 통지 없이 제한될 수 있습니다.</li>
                <li>저작권 등 타인의 권리를 침해하지 않아야 합니다.</li>
            </ul>
            <h2 className="mt-8 text-xl font-semibold">면책</h2>
            <p className="mt-2 leading-7">
                서비스는 “있는 그대로” 제공됩니다. 운영자는 데이터 손실, 시스템 장애 등 간접 손해에 대해 책임지지 않습니다.
            </p>
            <p className="mt-10 text-sm text-neutral-500">최종 업데이트: {new Date().toISOString().slice(0, 10)}</p>
        </div>
    );
}
