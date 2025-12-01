import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";

import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";

export default function RichTextEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Link
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg p-2">
      {/* Toolbar */}
      <div className="mb-2 flex flex-wrap gap-2">
        <button onClick={() => editor.chain().focus().toggleBold().run()} className="px-2 py-1 border rounded">B</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()} className="px-2 py-1 border rounded">I</button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className="px-2 py-1 border rounded">U</button>
        <button onClick={() => editor.chain().focus().toggleStrike().run()} className="px-2 py-1 border rounded">S</button>

        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-10 h-8 p-0 border-none"
        />

        {/* FONT SIZE FIXED — NO FONT-SIZE EXTENSION NEEDED */}
        <input
          type="number"
          placeholder="px"
          onChange={(e) =>
            editor.chain()
              .focus()
              .setMark("textStyle", { fontSize: `${e.target.value}px` })
              .run()
          }
          className="w-16 border px-1 rounded"
        />

        <button onClick={() => editor.chain().focus().unsetAllMarks().run()} className="px-2 py-1 border rounded">
          Clear
        </button>

        <button
          onClick={() => {
            const url = prompt("Enter URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className="px-2 py-1 border rounded"
        >
          Link
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[200px] p-2 focus:outline-none" />
    </div>
  );
}
