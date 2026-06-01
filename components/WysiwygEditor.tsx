import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

interface WysiwygEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  required?: boolean;
}

const Btn = ({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors flex items-center justify-center min-w-[28px] h-7 ${
      active
        ? 'bg-primary/15 text-primary'
        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'
    }`}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5 self-center shrink-0" />;

const EMPTY_HTML = '<p></p>';

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  label, value, onChange, placeholder, minHeight = '200px', required = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Placeholder.configure({ placeholder: placeholder || 'Escreva aqui...' }),
      TaskList,
      TaskItem.configure({ nested: false }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === EMPTY_HTML ? '' : html);
    },
  });

  // Limpa o editor quando o valor é resetado externamente (ex: fechar modal)
  useEffect(() => {
    if (!editor) return;
    if (!value && editor.getHTML() !== EMPTY_HTML) {
      editor.commands.setContent('');
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="space-y-2 text-left">
      {label && (
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${required ? 'bg-rose-500' : 'bg-primary/40'}`} />
          {label}
          {required && <span className="text-rose-500 text-[10px] lowercase font-bold ml-1">(obrigatório)</span>}
        </label>
      )}
      <div className="border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-0.5 p-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex-wrap">
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito (Ctrl+B)">
            <span className="material-symbols-outlined text-[18px]">format_bold</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico (Ctrl+I)">
            <span className="material-symbols-outlined text-[18px]">format_italic</span>
          </Btn>
          <Sep />
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título H1">
            <span className="text-[11px] font-black leading-none">H1</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título H2">
            <span className="text-[11px] font-black leading-none">H2</span>
          </Btn>
          <Sep />
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista com marcadores">
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
            <span className="material-symbols-outlined text-[18px]">format_list_numbered</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Lista de tarefas">
            <span className="material-symbols-outlined text-[18px]">checklist</span>
          </Btn>
          <Sep />
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
            <span className="material-symbols-outlined text-[18px]">format_quote</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
            <span className="material-symbols-outlined text-[18px]">code</span>
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloco de código">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
          </Btn>
        </div>
        <EditorContent editor={editor} style={{ minHeight }} />
      </div>
    </div>
  );
};

export default WysiwygEditor;
