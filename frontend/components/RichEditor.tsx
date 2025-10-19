'use client';

import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import { Extension, Node, type CommandProps } from '@tiptap/core';

const API = process.env.NEXT_PUBLIC_API_BASE || '';
const toAbsolute = (u: string) => (u?.startsWith('http') ? u : `${API}${u}`);

/* ---------- 글자 크기 마크(텍스트 스타일) ---------- */
const FontSize = Extension.create({
    name: 'fontSize',
    addGlobalAttributes() {
        return [
            {
                types: ['textStyle'],
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: el => (el as HTMLElement).style.fontSize || null,
                        renderHTML: attrs =>
                            attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
                    },
                },
            },
        ];
    },
});

/* ---------- 이미지 확장: width 지원(스타일로 렌더) ---------- */
const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...(this.parent?.() as Record<string, unknown>),
            width: {
                default: null,
                parseHTML: el =>
                    el.getAttribute('width') || (el as HTMLElement).style.width || null,
                renderHTML: attrs => (attrs.width ? { style: `width:${attrs.width}` } : {}),
            },
        };
    },
});

/* ---------- 동영상 노드 ---------- */

/** boolean과 원시 속성만 허용하는 안전한 HTML 속성 타입 */
type SafeHTMLAttrs =
    { controls?: boolean } &
    Record<string, string | number | boolean | null | undefined>;

const VideoNode = Node.create({
    name: 'video',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
        return {
            src: { default: null },
            poster: { default: null },
            class: { default: 'max-w-full h-auto rounded' },
            controls: { default: true },
        };
    },

    parseHTML() {
        return [{ tag: 'video' }];
    },

    renderHTML({ HTMLAttributes }: { HTMLAttributes: SafeHTMLAttrs }) {
        const { controls, ...rest } = HTMLAttributes;

        // TipTap의 boolean 속성은 '존재'만으로 true 처리 → controls=""
        const maybeControls = controls ? { controls: '' as const } : {};

        // null/undefined 속성 제거 (DOM에 쓰레기 값 안 나가게)
        const cleanedRest = Object.fromEntries(
            Object.entries(rest).filter(([, v]) => v !== null && v !== undefined),
        ) as Record<string, string | number | boolean>;

        return ['video', { ...maybeControls, ...cleanedRest }];
    },

    addCommands() {
        return {
            setVideo:
                (attrs: { src: string; poster?: string }) =>
                    ({ commands }: CommandProps) =>
                        commands.insertContent({ type: this.name, attrs }),
        };
    },
});

/* ---- TipTap 커맨드 타입 보강 (setVideo 선언) ---- */
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        video: {
            setVideo: (attrs: { src: string; poster?: string }) => ReturnType;
        };
    }
}

/* ---------- 컴포넌트 ---------- */
type Props = {
    value: string;
    onChange: (html: string) => void;
};

export default function RichEditor({ value, onChange }: Props) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false }),
            Heading.configure({ levels: [2, 3, 4] }),
            TextStyle,
            Color,
            FontSize,
            Link.configure({
                autolink: true,
                openOnClick: true,
                HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
                protocols: ['http', 'https', 'mailto', 'tel'],
            }),
            ResizableImage.configure({ inline: false, allowBase64: false }),
            VideoNode,
        ],
        content: value || '<p></p>',
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class:
                    'tiptap prose prose-neutral max-w-none min-h-[280px] p-3 focus:outline-none',
            },
        },
        // React 19/Next 15 하이드레이션 경고 회피
        immediatelyRender: false,
    });

    if (!editor) return <div className="min-h-[280px] border rounded bg-white" />;

    /* ---------- 업로드 공통 ---------- */
    const upload = async (file: File): Promise<string> => {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch(`${API}/api/posts/uploads`, { method: 'POST', body: fd });
        if (!r.ok) throw new Error(await r.text());
        const { url } = (await r.json()) as { url: string };
        return toAbsolute(url);
    };

    /* ---------- 이미지 업로드 ---------- */
    const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const f = input.files?.[0];
        if (!f) return;
        try {
            const src = await upload(f);
            editor
                .chain()
                .focus()
                .setImage({ src, alt: f.name })
                .updateAttributes('image', { width: '100%' }) // 기본 100%
                .run();
        } catch (err) {
            alert('이미지 업로드 실패: ' + (err as Error).message);
        } finally {
            input.value = '';
        }
    };

    /* 이미지 크기 버튼(100/75/50/원본) */
    const setImgWidth = (w?: string) => {
        editor.chain().focus().updateAttributes('image', w ? { width: w } : { width: null }).run();
    };

    /* ---------- 동영상 업로드 ---------- */
    const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const f = input.files?.[0];
        if (!f) return;
        try {
            const src = await upload(f);
            // 비동기 뒤 프레임에서 적용 → mismatched transaction 경고 방지
            requestAnimationFrame(() => {
                editor?.commands.setVideo({ src });
            });
        } catch (err) {
            alert('동영상 업로드 실패: ' + (err as Error).message);
        } finally {
            input.value = '';
        }
    };

    /* ---------- 기타 유틸 ---------- */
    const normalizeUrl = (raw: string) => {
        const t = raw.trim();
        if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
        return `https://${t}`;
    };

    /* ---------- 상태/가능여부 ---------- */
    const btn = 'px-2 py-1 rounded border text-sm transition select-none';
    const btnOn = 'bg-blue-600 text-white border-blue-600 shadow-sm';
    const btnOff = 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-100';

    const setFontSize = (size: string) => {
        if (!size) editor.chain().focus().unsetMark('textStyle').run();
        else editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    };

    const activeBold = editor.isActive('bold');
    const activeItalic = editor.isActive('italic');
    const activeStrike = editor.isActive('strike');
    const activeUnderline = editor.isActive('underline');
    const activeBullet = editor.isActive('bulletList');
    const activeOrdered = editor.isActive('orderedList');
    const activeQuote = editor.isActive('blockquote');
    const activeH2 = editor.isActive('heading', { level: 2 });
    const activeH3 = editor.isActive('heading', { level: 3 });

    const canBold = editor.can().chain().focus().toggleBold().run();
    const canItalic = editor.can().chain().focus().toggleItalic().run();
    const canStrike = editor.can().chain().focus().toggleStrike().run();
    const canBullet = editor.can().chain().focus().toggleBulletList().run();
    const canOrdered = editor.can().chain().focus().toggleOrderedList().run();
    const canQuote = editor.can().chain().focus().toggleBlockquote().run();
    const canH2 = editor.can().chain().focus().toggleHeading({ level: 2 }).run();
    const canH3 = editor.can().chain().focus().toggleHeading({ level: 3 }).run();

    return (
        <div className="border rounded bg-white">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 px-2 py-2 border-b bg-neutral-50 text-sm">
                {/* 인라인 */}
                <button
                    type="button"
                    aria-pressed={activeBold}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`${btn} ${activeBold ? btnOn : btnOff}`}
                    disabled={!canBold}
                >
                    B
                </button>

                <button
                    type="button"
                    aria-pressed={activeItalic}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`${btn} italic ${activeItalic ? btnOn : btnOff}`}
                    disabled={!canItalic}
                >
                    /
                </button>

                <button
                    type="button"
                    aria-pressed={activeStrike}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`${btn} ${activeStrike ? btnOn : btnOff}`}
                    disabled={!canStrike}
                >
                    S
                </button>

                <button
                    type="button"
                    aria-pressed={activeUnderline}
                    onClick={() => editor.chain().focus().toggleUnderline?.().run()}
                    className={`${btn} ${activeUnderline ? btnOn : btnOff}`}
                >
                    U
                </button>

                {/* 목록 */}
                <button
                    type="button"
                    aria-pressed={activeBullet}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`${btn} ${activeBullet ? btnOn : btnOff}`}
                    disabled={!canBullet}
                >
                    • List
                </button>

                <button
                    type="button"
                    aria-pressed={activeOrdered}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`${btn} ${activeOrdered ? btnOn : btnOff}`}
                    disabled={!canOrdered}
                >
                    1. List
                </button>

                {/* 인용 */}
                <button
                    type="button"
                    aria-pressed={activeQuote}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`${btn} ${activeQuote ? btnOn : btnOff}`}
                    disabled={!canQuote}
                >
                    &quot;
                </button>

                {/* 제목 */}
                <button
                    type="button"
                    aria-pressed={activeH2}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`${btn} ${activeH2 ? btnOn : btnOff}`}
                    disabled={!canH2}
                >
                    H2
                </button>

                <button
                    type="button"
                    aria-pressed={activeH3}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`${btn} ${activeH3 ? btnOn : btnOff}`}
                    disabled={!canH3}
                >
                    H3
                </button>

                {/* 되돌리기/다시 */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    className={`${btn} ${btnOff}`}
                    disabled={!editor.can().undo()}
                >
                    ↶
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    className={`${btn} ${btnOff}`}
                    disabled={!editor.can().redo()}
                >
                    ↷
                </button>

                {/* Clear */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    className={`${btn} ${btnOff}`}
                >
                    Clear
                </button>

                {/* 색상/크기 */}
                <input
                    type="color"
                    onChange={e => editor.chain().focus().setColor(e.target.value).run()}
                    className="ml-2 h-8 w-12 border rounded"
                    title="글자 색상"
                />

                <select
                    className="ml-1 h-8 border rounded px-2"
                    defaultValue=""
                    onChange={e => setFontSize(e.target.value)}
                    title="글자 크기"
                >
                    <option value="">크기: 기본</option>
                    <option value="14px">작게 (14px)</option>
                    <option value="16px">보통 (16px)</option>
                    <option value="18px">조금 크게 (18px)</option>
                    <option value="20px">크게 (20px)</option>
                    <option value="24px">아주 크게 (24px)</option>
                </select>

                {/* 링크 */}
                <button
                    type="button"
                    className={`${btn} ${btnOff}`}
                    title="링크"
                    onClick={() => {
                        const raw = window.prompt('링크 URL');
                        if (!raw) return;
                        const url = normalizeUrl(raw);
                        if (editor.state.selection.empty) {
                            editor
                                .chain()
                                .focus()
                                .insertContent({
                                    type: 'text',
                                    text: url,
                                    marks: [
                                        {
                                            type: 'link',
                                            attrs: {
                                                href: url,
                                                target: '_blank',
                                                rel: 'noopener noreferrer',
                                            },
                                        },
                                    ],
                                })
                                .run();
                        } else {
                            editor
                                .chain()
                                .focus()
                                .extendMarkRange('link')
                                .setLink({
                                    href: url,
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                })
                                .run();
                        }
                    }}
                >
                    Link
                </button>

                {/* 업로드 */}
                <label className={`${btn} ${btnOff} cursor-pointer`} title="이미지 업로드">
                    이미지
                    <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
                </label>

                {/* 이미지 크기 퀵 버튼 */}
                <span className="ml-1 inline-flex items-center gap-1">
          <span className="text-xs text-neutral-500">이미지 크기:</span>
          <button type="button" className={`${btn} ${btnOff}`} onClick={() => setImgWidth('100%')}>
            100%
          </button>
          <button type="button" className={`${btn} ${btnOff}`} onClick={() => setImgWidth('75%')}>
            75%
          </button>
          <button type="button" className={`${btn} ${btnOff}`} onClick={() => setImgWidth('50%')}>
            50%
          </button>
          <button type="button" className={`${btn} ${btnOff}`} onClick={() => setImgWidth(undefined)}>
            원본
          </button>
        </span>

                <label className={`${btn} ${btnOff} cursor-pointer`} title="동영상 업로드">
                    동영상
                    <input type="file" accept="video/*" onChange={onPickVideo} className="hidden" />
                </label>
            </div>

            <EditorContent editor={editor} />
        </div>
    );
}
