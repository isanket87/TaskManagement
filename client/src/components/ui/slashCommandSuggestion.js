import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import SlashCommandList from './SlashCommandList';
import { 
    Heading1, Heading2, Heading3, 
    List, ListOrdered, CheckSquare, 
    Quote, Code, Minus
} from 'lucide-react';

const getSuggestionItems = () => {
    return [
        {
            title: 'Heading 1',
            description: 'Big section heading.',
            icon: Heading1,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading.',
            icon: Heading2,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading.',
            icon: Heading3,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'To-do List',
            description: 'Track tasks with an interactive checklist.',
            icon: CheckSquare,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bulleted list.',
            icon: List,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a numbered list.',
            icon: ListOrdered,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Quote',
            description: 'Capture a quote.',
            icon: Quote,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
        {
            title: 'CodeSnippet',
            description: 'Capture a code snippet.',
            icon: Code,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
            },
        },
        {
            title: 'Divider',
            description: 'Visually divide blocks.',
            icon: Minus,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
    ];
};

const createSlashCommandSuggestion = () => {
    return {
        items: ({ query }) => {
            return getSuggestionItems()
                .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
                .slice(0, 10);
        },

        render: () => {
            let component;
            let popup;

            return {
                onStart: props => {
                    component = new ReactRenderer(SlashCommandList, {
                        props,
                        editor: props.editor,
                    });

                    if (!props.clientRect) {
                        return;
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                        theme: 'light',
                    });
                },

                onUpdate(props) {
                    component.updateProps(props);

                    if (!props.clientRect) {
                        return;
                    }

                    popup[0].setProps({
                        getReferenceClientRect: props.clientRect,
                    });
                },

                onKeyDown(props) {
                    if (props.event.key === 'Escape') {
                        popup[0].hide();
                        return true;
                    }

                    return component.ref?.onKeyDown(props);
                },

                onExit() {
                    popup[0].destroy();
                    component.destroy();
                },
            };
        },
    };
};

export default createSlashCommandSuggestion;
