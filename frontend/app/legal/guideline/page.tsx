export default function GuidelinesPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-10 leading-7">
            <h1 className="text-2xl font-bold">커뮤니티 가이드라인</h1>
            <p className="mt-4">
                <strong>인생망한모임</strong>은 힘든 경험과 썰을 나누며 서로 공감하고 위로하는 공간입니다.
                모두가 안전하게 이야기를 나눌 수 있도록, 익명성에 기댄 책임감 있는 행동을 부탁드립니다.
                아래 가이드라인을 위반하는 게시물이나 댓글은 운영자의 판단에 따라 사전 통지 없이 삭제되거나 수정될 수 있습니다.
            </p>

            <h2 className="mt-8 text-xl font-semibold">1. 비난 및 욕설 자제</h2>
            <ul className="list-disc pl-6">
                <li>타인에 대한 욕설, 비방, 인신공격, 조롱을 자제합니다.</li>
                <li>다른 이용자의 닉네임을 언급하며 저격하거나 분란을 조장하는 행위를 자제합니다.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">2. 과도한 비관 및 유해 콘텐츠 자제 (중요)</h2>
            <p className="mt-2">
                본 커뮤니티는 건강한 소통을 지향하며, Google AdSense 정책을 준수합니다.
                다음과 같은 콘텐츠는 엄격히 자제합니다.
            </p>
            <ul className="list-disc pl-6">
                <li>자해, 자살 등 극단적 선택을 암시, 조장, 권유하는 내용</li>
                <li>타인에게 심각한 우울감이나 불안감을 유발할 수 있는 과도하게 비관적인 내용</li>
                <li>폭력적이거나 혐오스러운 콘텐츠 (이미지, 영상, 텍스트 포함)</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">3. 불법 및 스팸 콘텐츠 금지</h2>
            <ul className="list-disc pl-6">
                <li>불법 도박, 성인물, 마약 등 관련 법령에 위배되는 모든 콘텐츠를 금지합니다.</li>
                <li>홍보, 스팸, 도배성 게시물을 금지합니다.</li>
                <li>타인의 개인정보(실명, 연락처, 주소 등)를 유출하는 행위를 금지합니다.</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">4. 책임</h2>
            <p className="mt-2">
                게시물과 댓글의 1차적인 책임은 작성자 본인에게 있습니다.
                운영자는 익명 커뮤니티의 특성상 발생하는 모든 분쟁에 개입하거나 책임지지 않으나,
                건강한 환경 유지를 위해 가이드라인에 따른 조치를 취할 수 있습니다.
            </p>

            <p className="mt-10 text-sm text-neutral-500">
                최종 업데이트: 2025-11-01
            </p>
        </div>
    );
}