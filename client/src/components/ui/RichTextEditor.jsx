import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import createMentionSuggestion from './mentionSuggestion';
import SlashCommandExtension from './SlashCommandExtension';
import createSlashCommandSuggestion from './slashCommandSuggestion';
import 'tippy.js/dist/tippy.css';
import { 
    Bold, Italic, Strikethrough, Code, 
    List, ListOrdered, Quote, Heading2, 
    Undo, Redo, CheckSquare, Link as LinkIcon
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const TopToolbar = ({ editor }) => {
    if (!editor) return null;

    const navBtnClass = (isActive) => cn(
        "p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 transition-colors",
        isActive && "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
    );

    return (
        <div className="flex flex-wrap items-center gap-1 px-4 pt-3 pb-2 border-b border-transparent group-focus-within/editor:border-slate-100 dark:group-focus-within/editor:border-slate-700/50 opacity-0 group-focus-within/editor:opacity-100 transition-all duration-300">
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={navBtnClass(editor.isActive('bold'))}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={navBtnClass(editor.isActive('italic'))}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={navBtnClass(editor.isActive('strike'))}
                title="Strikethrough"
            >
                <Strikethrough className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={navBtnClass(editor.isActive('code'))}
                title="Code"
            >
                <Code className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
            
            <button
                type="button"
                onClick={() => {
                    const previousUrl = editor.getAttributes('link').href;
                    if (editor.isActive('link')) {
                        editor.chain().focus().unsetLink().run();
                        return;
                    }
                    const url = window.prompt('URL', previousUrl);
                    if (url) {
                        editor.chain().focus().setLink({ href: url }).run();
                    }
                }}
                className={navBtnClass(editor.isActive('link'))}
                title="Link"
            >
                <LinkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

const RichTextEditor = ({ value, onChange, placeholder = 'Write something...', mentions = [] }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            TaskList.configure({
                HTMLAttributes: {
                    class: 'not-prose pl-2',
                },
            }),
            TaskItem.configure({
                nested: true,
                HTMLAttributes: {
                    class: 'flex items-start gap-2 my-1',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 cursor-pointer',
                },
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-1 py-0.5 rounded cursor-pointer font-medium',
                },
                suggestion: createMentionSuggestion(mentions),
            }),
            SlashCommandExtension.configure({
                suggestion: createSlashCommandSuggestion(),
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none w-full min-h-[300px] px-5 py-4 text-[15px] leading-relaxed focus:outline-none focus:ring-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_.is-editor-empty:first-child::before]:text-slate-400/80 [&_.is-editor-empty:first-child::before]:text-[15px] [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:p-0 [&_li[data-type="taskItem"]]:flex [&_li[data-type="taskItem"]>label]:mr-3 [&_li[data-type="taskItem"]>label]:select-none [&_li[data-type="taskItem"]>label>input]:mt-[5px] [&_li[data-type="taskItem"]>label>input]:w-4 [&_li[data-type="taskItem"]>label>input]:h-4 [&_li[data-type="taskItem"]>label>input]:cursor-pointer [&_li[data-type="taskItem"]>label>input]:accent-indigo-600 [&_li[data-type="taskItem"]>div]:flex-1 [&_li[data-type="taskItem"]>div>p]:m-0',
            },
        },
    });

    return (
        <div className="group/editor relative flex flex-col rounded-xl transition-colors bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20 focus-within:!bg-white dark:focus-within:!bg-slate-900 focus-within:ring-1 focus-within:ring-slate-200 dark:focus-within:ring-slate-700">
            <TopToolbar editor={editor} />
            <div className="flex-1 cursor-text" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default RichTextEditor;
