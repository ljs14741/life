import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Script from "next/script";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    metadataBase: new URL("https://life.binaryworld.kr"),
    title: "인생 망한 사람들의 모임",
    description: '인생 망한 사람, 인생 개망해서 씁쓸한 사람들끼리 모이는 커뮤니티. 익명으로 글 쓰고 공감 받으세요.',
    keywords: ['인망모', '인생망한모임', '인생 망한 사람', '인생 망한 사람들', '인생 개망', '망한 인생 커뮤니티', '인생존망'],
    openGraph: {
        title: "인생망한모임",
        description: '인생 망한 사람, 인생 개망해서 씁쓸한 사람들끼리 모이는 커뮤니티. 익명으로 글 쓰고 공감 받으세요.',
        url: "https://life.binaryworld.kr",
        siteName: "인생망한모임",
        locale: "ko_KR",
        type: "website",
    },

    manifest: '/favicon/manifest.json',

    // 2. 아이콘 설정
    icons: {
        // 기본 파비콘
        icon: [
            { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
            { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
            { url: '/favicon/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
        ],
        // Apple '홈 화면에 추가' 아이콘
        apple: [
            { url: '/favicon/apple-icon-57x57.png', sizes: '57x57' },
            { url: '/favicon/apple-icon-60x60.png', sizes: '60x60' },
            { url: '/favicon/apple-icon-72x72.png', sizes: '72x72' },
            { url: '/favicon/apple-icon-76x76.png', sizes: '76x76' },
            { url: '/favicon/apple-icon-114x114.png', sizes: '114x114' },
            { url: '/favicon/apple-icon-120x120.png', sizes: '120x120' },
            { url: '/favicon/apple-icon-144x144.png', sizes: '144x144' },
            { url: '/favicon/apple-icon-152x152.png', sizes: '152x152' },
            { url: '/favicon/apple-icon-180x180.png', sizes: '180x180' },
        ],
        // .ico (오래된 브라우저용)
        shortcut: '/favicon/favicon.ico',
        // 구형 Apple 기기용
        other: [
            {
                rel: 'apple-touch-icon-precomposed',
                url: '/favicon/apple-icon-precomposed.png',
            },
        ],
    },

    // 3. Microsoft 타일 및 기타 메타 태그
    other: {
        'msapplication-TileColor': '#FFFFFF', // (이 색상은 나중에 사이트 테마에 맞게 바꾸세요)
        'msapplication-TileImage': '/favicon/ms-icon-144x144.png',
        'msapplication-config': '/favicon/browserconfig.xml',
    },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
        <head>
            <Script
                async
                strategy="afterInteractive"
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6890085609044109"
                crossOrigin="anonymous"
            />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-neutral-900 dark:bg-black dark:text-white`}>
        <Header />
        <main>{children}</main>
        <Footer />
        </body>
        </html>
    );
}
