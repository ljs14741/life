export default function PrivacyPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-10 leading-7">
            <h1 className="text-2xl font-bold">개인정보처리방침</h1>
            <p className="mt-4">
                인망모(이하 “서비스”)는 개인이 운영하는 취미/사이드 프로젝트입니다.
                서비스를 제공하는 과정에서 아래와 같은 최소한의 정보를 처리하며, 관련 법령을 준수합니다.
            </p>

            <h2 className="mt-8 text-xl font-semibold">1. 수집 항목과 목적</h2>
            <ul className="list-disc pl-6">
                <li>이용자 입력: 닉네임, 게시물/댓글 내용, 비밀번호(서버에는 해시 형태로만 저장) – 글/댓글 작성 및 수정·삭제 권한 확인</li>
                <li>자동 수집: 접속 기록(요청/응답 로그, IP, 시간), 쿠키/로컬스토리지 – 서비스 보안·통계, 편의 기능(닉네임 저장, 좋아요 중복 방지)</li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">2. 보관 기간</h2>
            <p>게시물/댓글은 사용자가 삭제할 때까지 보관되며, 관련 법령상 보관 의무가 있는 경우 해당 기간 동안 보관합니다. 서버 로그는 안전한 운영을 위해 (예: 3~6개월) 보관 후 파기합니다.</p>

            <h2 className="mt-8 text-xl font-semibold">3. 제3자 제공 및 처리 위탁</h2>
            <p>운영자는 이용자의 정보를 제3자에게 판매·임대·공유하지 않습니다. 다만 법령에 따른 요청이 있는 경우 제공할 수 있습니다. 현재 별도의 처리 위탁은 없습니다.</p>

            <h2 className="mt-8 text-xl font-semibold">4. 쿠키 및 로컬스토리지</h2>
            <p>닉네임 저장, 좋아요 중복 방지 등 편의 기능을 위해 브라우저 저장소를 사용할 수 있습니다. 브라우저 설정을 통해 삭제/차단할 수 있습니다.</p>

            <h2 className="mt-8 text-xl font-semibold">5. 광고 및 분석 도구 (선택)</h2>
            <p>본 서비스는 Google AdSense를 사용할 수 있습니다. Google 및 파트너는 쿠키를 사용하여 광고를 제공하거나 개인화할 수 있습니다. 자세한 내용과 개인화 설정은 아래에서 확인하실 수 있습니다.</p>
            <ul className="list-disc pl-6">
                <li>Google 광고 및 콘텐츠 네트워크 개인정보취급방침: <a className="underline" href="https://policies.google.com/technologies/ads?hl=ko" target="_blank">링크</a></li>
                <li>개인화 광고 설정/해제(Ad Settings): <a className="underline" href="https://adssettings.google.com" target="_blank">링크</a></li>
            </ul>

            <h2 className="mt-8 text-xl font-semibold">6. 이용자 권리</h2>
            <p>이용자는 자신이 작성한 게시물/댓글에 대해 비밀번호를 통한 수정·삭제를 할 수 있습니다. 기타 문의는 아래 연락처로 요청해주세요.</p>

            <h2 className="mt-8 text-xl font-semibold">7. 보안</h2>
            <p>비밀번호는 원문을 저장하지 않고 해시 형태로만 보관합니다. 합리적인 보안 조치를 위해 노력하나, 인터넷 특성상 완전한 안전을 보장할 수는 없습니다.</p>

            <h2 className="mt-8 text-xl font-semibold">8. 연락처</h2>
            <p>운영자: Binary / 이메일: (ljs14741@gmail.com)</p>

            <p className="mt-10 text-sm text-neutral-500">
                최종 업데이트: {new Date().toISOString().slice(0,10)}
            </p>
        </div>
    );
}
