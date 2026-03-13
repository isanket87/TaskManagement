import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
    Bold, Italic, Strikethrough, Code, 
    List, ListOrdered, Quote, Heading2, 
    Undo, Redo 
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const MenuBar = ({ editor }) => {
    if (!editor) return null;

    const navBtnClass = (isActive) => cn(
        "p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors",
        isActive && "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
    );

    return (
        <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={navBtnClass(editor.isActive('bold'))}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={navBtnClass(editor.isActive('italic'))}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={navBtnClass(editor.isActive('strike'))}
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={!editor.can().chain().focus().toggleCode().run()}
                className={navBtnClass(editor.isActive('code'))}
                title="Code"
            >
                <Code className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
            
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={navBtnClass(editor.isActive('heading', { level: 2 }))}
                title="Heading 2"
            >
                <Heading2 className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={navBtnClass(editor.isActive('bulletList'))}
                title="Bullet List"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={navBtnClass(editor.isActive('orderedList'))}
                title="Numbered List"
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={navBtnClass(editor.isActive('blockquote'))}
                title="Quote"
            >
                <Quote className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

            <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
                className={navBtnClass()}
                title="Undo"
            >
                <Undo className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
                className={navBtnClass()}
                title="Redo"
            >
                <Redo className="w-4 h-4" />
            </button>
        </div>
    );
};

const RichTextEditor = ({ value, onChange, placeholder = 'Write something...' }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none w-full min-h-[140px] p-4 text-[15px] focus:outline-none focus:ring-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_.is-editor-empty:first-child::before]:text-slate-400/70 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
            },
        },
    });

    return (
        <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm transition-colors focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/50 flex flex-col">
            <MenuBar editor={editor} />
            <div className="flex-1 cursor-text overflow-y-auto" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default RichTextEditor;
