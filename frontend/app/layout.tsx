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
    title: "인생망한모임",
    description: "익명으로 실수담/조언을 나누는 커뮤니티",
    openGraph: {
        title: "인생망한모임",
        description: "익명으로 실수담/조언을 나누는 커뮤니티",
        url: "https://life.binaryworld.kr",
        siteName: "인생망한모임",
        locale: "ko_KR",
        type: "website",
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
