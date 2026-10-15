// app/components/shared/NotesRichEditor.tsx

"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";
import { Icon } from "@iconify/react";

type Props = {
  value: string;
  onChange: (html: string, text: string) => void;
  disabled?: boolean;
  maxLength?: number;
};

export default function NotesRichEditor({
  value,
  onChange,
  disabled = false,
  maxLength = 500,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] px-3 py-3 text-sm outline-none " +
          "prose prose-sm max-w-none dark:prose-invert " +
          "prose-p:my-1 prose-ul:my-1 prose-ol:my-1",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;

    const current = editor.getHTML();

    if (value !== current) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="min-h-[180px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    );
  }

  const toolbar = [
    {
      label: "Bold",
      icon: "lucide:bold",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Italic",
      icon: "lucide:italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      label: "Bullet list",
      icon: "lucide:list",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Numbered list",
      icon: "lucide:list-ordered",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      label: "Undo",
      icon: "lucide:undo-2",
      action: () => editor.chain().focus().undo().run(),
      active: false,
    },
    {
      label: "Redo",
      icon: "lucide:redo-2",
      action: () => editor.chain().focus().redo().run(),
      active: false,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#d5e2d2] bg-white focus-within:ring-2 focus-within:ring-[#d5e2d2] dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#d5e2d2] bg-[#eef3ec] p-2 dark:border-slate-700 dark:bg-slate-800">
        {toolbar.map((item) => (
          <button
            key={item.label}
            type="button"
            title={item.label}
            aria-label={item.label}
            disabled={
              disabled ||
              (item.label === "Undo" && !editor.can().undo()) ||
              (item.label === "Redo" && !editor.can().redo())
            }
            onClick={item.action}
            className={`rounded-md p-2 transition-colors disabled:opacity-40 ${
              item.active
                ? "bg-[#d5e2d2] text-[#36543b]"
                : "text-slate-600 hover:bg-[#dfe9dc] dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <Icon icon={item.icon} className="h-4 w-4" />
          </button>
        ))}
      </div>

      <EditorContent editor={editor} />

      <div className="flex justify-end border-t border-slate-100 px-3 py-2 dark:border-slate-800">
        <span
          className={`text-xs ${
            editor.storage.characterCount.characters() >= maxLength
              ? "text-red-500"
              : "text-slate-400"
          }`}
        >
          {editor.storage.characterCount.characters()}/{maxLength} characters
        </span>
      </div>
    </div>
  );
}