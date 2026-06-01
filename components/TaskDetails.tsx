
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Task, TaskPriority, TaskStatus, TaskType, User, Sprint, SprintStatus, TaskLink } from '../types';
import { supabase } from '../supabase';

interface TaskDetailsProps {
  tasks: Task[];
  users: User[];
  sprints: Sprint[];
  onUpdateTask?: (taskId: string, updates: Partial<any>) => void;
  onAddComment?: (taskId: string, content: string) => Promise<void>;
}

interface CloudFile {
  name: string;
  size?: number;
  url?: string;
}

// ─── Inline Markdown Renderer ─────────────────────────────────────────────────

const renderInline = (text: string): React.ReactNode => {
  if (!text) return null;
  const codeParts = text.split(/(`[^`]+`)/g);
  return codeParts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} className="bg-slate-100 dark:bg-slate-800 text-rose-500 dark:text-rose-400 px-1.5 py-0.5 rounded text-[0.85em] font-mono">{part.slice(1, -1)}</code>;
    }
    const segs = part.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*[^*]+?\*|_[^_]+?_)/g);
    return segs.map((seg, j) => {
      if (seg.startsWith('***') && seg.endsWith('***')) return <strong key={`${i}-${j}`} className="font-black italic text-slate-900 dark:text-white">{seg.slice(3, -3)}</strong>;
      if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={`${i}-${j}`} className="font-black text-slate-900 dark:text-white">{seg.slice(2, -2)}</strong>;
      if ((seg.startsWith('*') && seg.endsWith('*')) || (seg.startsWith('_') && seg.endsWith('_'))) return <em key={`${i}-${j}`} className="italic">{seg.slice(1, -1)}</em>;
      return seg;
    });
  });
};

const renderMarkdown = (text: string): React.ReactNode => {
  if (!text || text.trim() === '') return null;
  const segments = text.split(/(```[\s\S]*?```)/g);
  return segments.map((segment, si) => {
    if (segment.startsWith('```')) {
      const inner = segment.replace(/^```[^\n]*\n?/, '').replace(/```$/, '');
      return (
        <pre key={si} className="bg-slate-900 dark:bg-black text-emerald-400 text-xs p-4 rounded-xl my-3 overflow-x-auto custom-scrollbar font-mono leading-relaxed">
          <code>{inner}</code>
        </pre>
      );
    }
    const lines = segment.split('\n');
    return (
      <React.Fragment key={si}>
        {lines.map((line, i) => {
          const t = line.trim();
          if (t.startsWith('# ') && !t.startsWith('## ')) return <h1 key={i} className="text-2xl font-black text-slate-900 dark:text-white mt-5 mb-2 leading-tight">{renderInline(t.slice(2))}</h1>;
          if (t.startsWith('## ') && !t.startsWith('### ')) return <h2 key={i} className="text-lg font-black text-slate-900 dark:text-white mt-4 mb-1.5 leading-tight">{renderInline(t.slice(3))}</h2>;
          if (t.startsWith('### ')) return <h3 key={i} className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mt-4 mb-1.5">{renderInline(t.slice(4))}</h3>;
          if (t.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-primary pl-4 my-2 italic text-slate-500 dark:text-slate-400 text-sm">{renderInline(t.slice(2))}</blockquote>;
          if (t === '- [ ]' || t.startsWith('- [ ] ')) return <div key={i} className="flex items-start gap-3 my-1"><span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px] mt-0.5">check_box_outline_blank</span><span className="text-slate-700 dark:text-slate-300 text-sm">{renderInline(t.slice(6))}</span></div>;
          if (t === '- [x]' || t.startsWith('- [x] ')) return <div key={i} className="flex items-start gap-3 my-1"><span className="material-symbols-outlined text-primary filled text-[20px] mt-0.5">check_box</span><span className="text-slate-400 dark:text-slate-500 line-through text-sm">{renderInline(t.slice(6))}</span></div>;
          if (t.startsWith('- ')) return <div key={i} className="flex items-start gap-3 my-1"><span className="size-1.5 rounded-full bg-primary mt-2 shrink-0"></span><span className="text-slate-700 dark:text-slate-300 text-sm">{renderInline(t.slice(2))}</span></div>;
          const numMatch = t.match(/^(\d+)\.\s(.*)/);
          if (numMatch) return <div key={i} className="flex items-start gap-3 my-1"><span className="text-xs font-black text-primary shrink-0 mt-0.5 w-5 text-right">{numMatch[1]}.</span><span className="text-slate-700 dark:text-slate-300 text-sm">{renderInline(numMatch[2])}</span></div>;
          if (t === '') return <div key={i} className="h-2"></div>;
          return <p key={i} className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-0.5">{renderInline(t)}</p>;
        })}
      </React.Fragment>
    );
  });
};

// ─── Description Editor (inline) ──────────────────────────────────────────────

interface DescriptionEditorProps {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const DescriptionEditor: React.FC<DescriptionEditorProps> = ({ value, onChange, onSave, onCancel }) => {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const wrapSel = (pre: string, suf: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const next = ta.value.substring(0, start) + pre + sel + suf + ta.value.substring(end);
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + pre.length, end + pre.length); });
  };

  const linePrefix = (pre: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const next = ta.value.substring(0, lineStart) + pre + ta.value.substring(lineStart);
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + pre.length, start + pre.length); });
  };

  const insertAt = (text: string, cursorOff: number) => {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const next = ta.value.substring(0, pos) + text + ta.value.substring(pos);
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos + cursorOff, pos + cursorOff); });
  };

  const codeBlock = () => {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const sel = ta.value.substring(pos, ta.selectionEnd);
    const block = '```\n' + (sel || 'código') + '\n```';
    const next = ta.value.substring(0, pos) + block + ta.value.substring(ta.selectionEnd);
    onChange(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos + 4, pos + 4 + (sel || 'código').length); });
  };

  const ToolBtn = ({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="size-7 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-[13px] font-bold"
    >
      {icon.length <= 3 ? <span className="text-xs font-black">{icon}</span> : <span className="material-symbols-outlined text-[16px]">{icon}</span>}
    </button>
  );

  return (
    <div className="space-y-2 animate-in fade-in duration-200">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl border border-slate-200 dark:border-slate-700 flex-wrap">
        <ToolBtn icon="B" title="Negrito (Ctrl+B)" onClick={() => wrapSel('**', '**')} />
        <ToolBtn icon="I" title="Itálico (Ctrl+I)" onClick={() => wrapSel('*', '*')} />
        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
        <ToolBtn icon="H1" title="Título 1" onClick={() => linePrefix('# ')} />
        <ToolBtn icon="H2" title="Título 2" onClick={() => linePrefix('## ')} />
        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
        <ToolBtn icon="format_list_bulleted" title="Lista com marcadores" onClick={() => linePrefix('- ')} />
        <ToolBtn icon="format_list_numbered" title="Lista numerada" onClick={() => linePrefix('1. ')} />
        <ToolBtn icon="checklist" title="Lista de tarefas" onClick={() => linePrefix('- [ ] ')} />
        <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></span>
        <ToolBtn icon="format_quote" title="Citação" onClick={() => linePrefix('> ')} />
        <ToolBtn icon="code" title="Código inline" onClick={() => wrapSel('`', '`')} />
        <ToolBtn icon="data_object" title="Bloco de código" onClick={codeBlock} />
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full min-h-[280px] p-4 bg-white dark:bg-[#1a2430] border border-slate-200 dark:border-slate-700 rounded-b-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white dark:placeholder-slate-600 resize-y"
        placeholder="Descreva o contexto, o que deve ser feito, critérios de aceite..."
      />
      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Cancelar</button>
        <button type="button" onClick={onSave} className="px-6 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg shadow-md hover:bg-primary/90 transition-colors">Salvar Alterações</button>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const TaskDetails: React.FC<TaskDetailsProps> = ({ tasks, users, sprints, onUpdateTask, onAddComment }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const task = tasks.find(t => t.id === id);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'activities'>('comments');
  const [newComment, setNewComment] = useState('');
  const [cloudFiles, setCloudFiles] = useState<CloudFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [taskLinks, setTaskLinks] = useState<TaskLink[]>([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');

  const [editingDescription, setEditingDescription] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(task?.title || '');

  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const sidebarRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task) setTempTitle(task.title);
  }, [task?.title]);

  const fetchAttachments = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.storage
        .from('Arquivos sistema')
        .list(`tasks/${id}/`);
      if (error) return;
      if (data) {
        const filesWithUrls = await Promise.all(data.map(async (file: any) => {
          const { data: urlData } = supabase.storage
            .from('Arquivos sistema')
            .getPublicUrl(`tasks/${id}/${file.name}`);
          return { name: file.name, size: file.metadata?.size, url: urlData.publicUrl };
        }));
        setCloudFiles(filesWithUrls);
      }
    } catch (err) {}
  }, [id]);

  const fetchTaskLinks = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('task_links')
        .select('*')
        .eq('from_task_id', id);
      if (error) {
        console.warn('Tabela task_links não encontrada ou erro de rede:', error.message);
        return;
      }
      if (data) setTaskLinks(data);
    } catch (err) {
      console.error('Erro ao buscar vínculos:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchAttachments();
    fetchTaskLinks();
  }, [id, fetchAttachments, fetchTaskLinks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let isInside = false;
      (Object.values(sidebarRefs.current) as (HTMLDivElement | null)[]).forEach(ref => {
        if (ref && ref.contains(event.target as Node)) isInside = true;
      });
      if (!isInside) {
        setActiveDropdown(null);
        setLinkSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderCommentContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@[\wÀ-ú]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const userName = part.substring(1);
        const userExists = users.some(u => u.name.replace(/\s/g, '').toLowerCase() === userName.toLowerCase());
        if (userExists) return <span key={i} className="text-primary font-black">@{userName}</span>;
      }
      return part;
    });
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionFilter(lastWord.substring(1).toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
    setNewComment(value);
  };

  const insertMention = (userName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const textAfterCursor = newComment.substring(cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const cleanName = userName.replace(/\s/g, '');
    words[words.length - 1] = `@${cleanName} `;
    const newValue = words.join(' ') + textAfterCursor;
    setNewComment(newValue);
    setShowMentions(false);
    textarea.focus();
  };

  const filteredMentionUsers = useMemo(() => {
    return users.filter(u => u.name.toLowerCase().includes(mentionFilter)).slice(0, 5);
  }, [users, mentionFilter]);

  const linkedTasksData = useMemo(() => {
    return taskLinks.map(link => {
      const targetTask = tasks.find(t => t.id === link.to_task_id);
      return { ...link, targetTask };
    }).sort((a, b) => {
      const statusOrder: Record<string, number> = {
        [TaskStatus.DEVELOPMENT]: 1, [TaskStatus.REVIEW]: 2, [TaskStatus.IMPEDIMENT]: 3,
        [TaskStatus.BACKLOG]: 4, [TaskStatus.PUBLICATION]: 5, [TaskStatus.DONE]: 6,
      };
      return (statusOrder[a.targetTask?.status || ''] || 99) - (statusOrder[b.targetTask?.status || ''] || 99);
    });
  }, [taskLinks, tasks]);

  const filteredSearchTasks = useMemo(() => {
    if (!linkSearchQuery.trim()) return [];
    const query = linkSearchQuery.toLowerCase();
    return tasks.filter(t =>
      t.id !== id &&
      !taskLinks.some(l => l.to_task_id === t.id) &&
      (t.title.toLowerCase().includes(query) || t.id.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [tasks, linkSearchQuery, id, taskLinks]);

  const handleAddLink = async (targetId: string) => {
    if (!id || !targetId) return;
    try {
      const { error } = await supabase
        .from('task_links')
        .upsert([
          { from_task_id: id, to_task_id: targetId, relation_type: 'relates_to' },
          { from_task_id: targetId, to_task_id: id, relation_type: 'relates_to' }
        ], { onConflict: 'from_task_id,to_task_id,relation_type' });
      if (error) throw error;
      await fetchTaskLinks();
      setActiveDropdown(null);
      setLinkSearchQuery('');
    } catch (err: any) {
      alert(`Erro ao vincular: ${err.message}`);
    }
  };

  const handleRemoveLink = async (targetTaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id || !targetTaskId) return;
    try {
      const { error } = await supabase
        .from('task_links')
        .delete()
        .match({ relation_type: 'relates_to' })
        .in('from_task_id', [id, targetTaskId])
        .in('to_task_id', [id, targetTaskId]);
      if (error) throw error;
      await fetchTaskLinks();
    } catch (err) {
      console.error('Erro ao remover vínculo:', err);
    }
  };

  if (!task) return <div className="p-8 text-center text-slate-500">Tarefa não encontrada ou carregando...</div>;

  const isEpic = task.type === TaskType.EPIC;
  const parentEpicTask = tasks.find(t => t.id === task.parentEpic);
  const availableEpics = tasks.filter(t => t.type === TaskType.EPIC && t.id !== task.id);
  const availableSprints = sprints.filter(s => s.status !== SprintStatus.COMPLETED);

  const handleUpdate = (updates: Partial<any>) => {
    if (onUpdateTask) onUpdateTask(task.id, updates);
    setActiveDropdown(null);
  };

  const handleTitleSave = () => {
    if (tempTitle.trim() && tempTitle !== task.title) {
      handleUpdate({ title: tempTitle.trim() });
    } else {
      setTempTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !onAddComment) return;
    await onAddComment(task.id, newComment);
    setNewComment('');
    setShowMentions(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id) return;
    setIsUploading(true);
    const files = Array.from(e.target.files) as File[];
    try {
      for (const file of files) {
        const filePath = `tasks/${id}/${file.name}`;
        await supabase.storage.from('Arquivos sistema').upload(filePath, file);
      }
      await fetchAttachments();
    } catch (err: any) {
      alert(`Erro ao subir arquivos: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('pt-BR', options).replace(',', ' às');
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT: return { icon: 'priority_high', color: 'text-red-500' };
      case TaskPriority.CRITICAL: return { icon: 'warning', color: 'text-rose-500' };
      case TaskPriority.HIGH: return { icon: 'arrow_upward', color: 'text-orange-500' };
      case TaskPriority.LOW: return { icon: 'arrow_downward', color: 'text-blue-500' };
      default: return { icon: 'equalizer', color: 'text-slate-400' };
    }
  };

  const getStatusClasses = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DEVELOPMENT: return { bg: 'bg-amber-100 text-amber-700 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50', dot: 'bg-amber-500' };
      case TaskStatus.DONE: return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50', dot: 'bg-emerald-500' };
      case TaskStatus.IMPEDIMENT: return { bg: 'bg-rose-100 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50', dot: 'bg-rose-500' };
      case TaskStatus.REVIEW: return { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200/50 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50', dot: 'bg-indigo-500' };
      case TaskStatus.PUBLICATION: return { bg: 'bg-blue-100 text-blue-700 border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50', dot: 'bg-blue-500' };
      default: return { bg: 'bg-slate-100 text-slate-600 border-slate-200/50 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50', dot: 'bg-slate-400' };
    }
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 lg:px-10 py-6 font-display">
      <div className="flex items-center flex-wrap gap-2 mb-4">
        <Link to="/backlog" className="flex items-center gap-1 text-slate-500 hover:text-primary text-sm font-medium transition-colors mr-2">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span>Voltar ao Backlog</span>
        </Link>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{task.project}</span>
        <span className="text-slate-400 dark:text-slate-600 text-sm">/</span>
        <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${isEpic ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{isEpic ? 'Épico' : (parentEpicTask?.title || 'Sem épico')}</span>
        <span className="text-slate-400 dark:text-slate-600 text-sm">/</span>
        <span className="text-slate-900 dark:text-white text-sm font-bold">{task.id}</span>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8 text-left">
        <div className="flex flex-col gap-2 flex-1 w-full group/title">
          {isEditingTitle ? (
            <div className="relative w-full">
              <input autoFocus type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTempTitle(task.title); setIsEditingTitle(false); } }} className="text-slate-900 dark:text-white text-3xl font-black tracking-tight leading-tight w-full bg-slate-100 dark:bg-slate-800 border-none px-4 py-2 -ml-4 rounded-xl ring-2 ring-primary shadow-inner focus:ring-primary outline-none" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2"><span className="text-[10px] font-black uppercase text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded shadow-sm">Enter para salvar</span></div>
            </div>
          ) : (
            <div onDoubleClick={() => setIsEditingTitle(true)} className="relative flex items-center gap-3 cursor-text hover:bg-slate-100/50 dark:hover:bg-slate-800/30 px-4 py-2 -ml-4 rounded-xl transition-all group" title="Clique duplo para editar">
              <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight leading-tight flex-1">{task.title}</h1>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity text-xl">edit</span>
            </div>
          )}
          <div className="flex gap-3 flex-wrap mt-2">
            <div className={`flex h-8 items-center gap-x-2 rounded-lg px-3 border text-xs font-bold uppercase ${isEpic ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800/50 dark:text-purple-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-400'}`}>
              <span className="material-symbols-outlined text-sm">{isEpic ? 'bolt' : 'label'}</span>
              <span>{task.type}</span>
            </div>
            <div className={`flex h-8 items-center gap-x-2 rounded-lg px-3 border text-[11px] font-bold uppercase ${getStatusClasses(task.status).bg}`}>
              <span className={`size-1.5 rounded-full ${getStatusClasses(task.status).dot}`}></span>
              <span>{task.status}</span>
            </div>
          </div>
        </div>
        <div className="relative" ref={el => { sidebarRefs.current['status'] = el; }}>
          <button onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')} className="h-11 bg-primary text-white font-black uppercase tracking-widest px-8 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2">
            <span>Alterar Status</span>
            <span className={`material-symbols-outlined transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          {activeDropdown === 'status' && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1c2632] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 p-1 text-left">
              {Object.values(TaskStatus).map((status) => {
                const sStyle = getStatusClasses(status);
                return (
                  <button key={status} onClick={() => handleUpdate({ status })} className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest rounded-lg transition-colors ${task.status === status ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    <span className={`size-1.5 rounded-full ${task.status === status ? 'bg-white' : sStyle.dot}`}></span>
                    <span className="flex-1 text-left">{status}</span>
                    {task.status === status && <span className="material-symbols-outlined text-sm">check</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">

          {/* ── Description Section ── */}
          <section className="bg-white dark:bg-[#161f2a] rounded-2xl border border-slate-200 dark:border-slate-800 pt-2 px-8 pb-8 shadow-sm space-y-6 relative overflow-hidden text-left min-h-[400px]">
            {editingDescription === null ? (
              <button
                onClick={() => setEditingDescription(task.description || '')}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <span className="text-[10px] font-black uppercase">Editar Descrição</span>
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            ) : null}

            <div className="space-y-4 pt-4">
              {editingDescription !== null ? (
                <DescriptionEditor
                  value={editingDescription}
                  onChange={setEditingDescription}
                  onSave={() => {
                    handleUpdate({ description: editingDescription });
                    setEditingDescription(null);
                  }}
                  onCancel={() => setEditingDescription(null)}
                />
              ) : (
                <div className="min-h-[200px]">
                  {!task.description || task.description.trim() === '' ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-700">
                      <span className="material-symbols-outlined text-6xl mb-2">description</span>
                      <p className="text-sm font-medium italic">Nenhuma descrição preenchida.</p>
                    </div>
                  ) : (
                    <div className="leading-relaxed">{renderMarkdown(task.description)}</div>
                  )}
                </div>
              )}
            </div>

            {/* ── Attachments ── */}
            <div className="pt-10 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="size-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[18px]">attach_file</span></div><h3 className="text-slate-900 dark:text-white text-sm font-black uppercase tracking-wider">Anexos ({cloudFiles.length})</h3></div>
                <button onClick={() => document.getElementById('file-upload')?.click()} disabled={isUploading} className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{isUploading ? 'Subindo...' : <><span className="material-symbols-outlined text-sm">add</span> Adicionar Anexos</>}</button>
                <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-11">
                {cloudFiles.map((file, i) => (
                  <div key={i} onClick={() => window.open(file.url, '_blank')} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1a2330] hover:border-primary transition-all cursor-pointer group"><span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">insert_drive_file</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</span></div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 text-left">
          <section className="bg-white dark:bg-[#161f2a] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="space-y-2 relative" ref={el => { sidebarRefs.current['sprint'] = el; }}>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sprint</span>
              <button onClick={() => setActiveDropdown(activeDropdown === 'sprint' ? null : 'sprint')} className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                <span>{sprints.find(s => s.id === task.sprintId)?.name || 'Backlog Operacional'}</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>
              {activeDropdown === 'sprint' && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1c2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[120] p-1 max-h-48 overflow-y-auto custom-scrollbar">
                  <button onClick={() => handleUpdate({ sprintId: '' })} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg dark:text-slate-300">Backlog Operacional</button>
                  {availableSprints.map(s => (
                    <button key={s.id} onClick={() => handleUpdate({ sprintId: s.id })} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg dark:text-slate-300">{s.name}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Envolvidos</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 relative" ref={el => { sidebarRefs.current['responsible'] = el; }}>
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Responsável</span>
                  <button onClick={() => setActiveDropdown(activeDropdown === 'resp' ? null : 'resp')} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group text-left w-full">
                    <div className="size-8 rounded-full bg-cover ring-2 ring-transparent group-hover:ring-primary/20 border dark:border-slate-800" style={{ backgroundImage: `url(${task.responsible.avatar})` }}></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-900 dark:text-white">{task.responsible.name}</span><span className="text-[10px] text-slate-500 dark:text-slate-400">{task.responsible.role}</span></div>
                    <span className="material-symbols-outlined text-sm ml-auto text-slate-300 dark:text-slate-700">expand_more</span>
                  </button>
                  {activeDropdown === 'resp' && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1c2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[120] p-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {users.map(u => (
                        <button key={u.id} onClick={() => handleUpdate({ responsibleId: u.id })} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"><div className="size-6 rounded-full bg-cover" style={{ backgroundImage: `url(${u.avatar})` }}></div><span className="text-xs dark:text-slate-300">{u.name}</span></button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 relative" ref={el => { sidebarRefs.current['reporter'] = el; }}>
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Relator</span>
                  <button onClick={() => setActiveDropdown(activeDropdown === 'rep' ? null : 'rep')} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group text-left w-full">
                    <div className="size-8 rounded-full bg-cover ring-2 ring-transparent group-hover:ring-primary/20 border dark:border-slate-800" style={{ backgroundImage: `url(${task.reporter.avatar})` }}></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-900 dark:text-white">{task.reporter.name}</span><span className="text-[10px] text-slate-500 dark:text-slate-400">{task.reporter.role}</span></div>
                    <span className="material-symbols-outlined text-sm ml-auto text-slate-300 dark:text-slate-700">expand_more</span>
                  </button>
                  {activeDropdown === 'rep' && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1c2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[120] p-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {users.map(u => (
                        <button key={u.id} onClick={() => handleUpdate({ reporterId: u.id })} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"><div className="size-6 rounded-full bg-cover" style={{ backgroundImage: `url(${u.avatar})` }}></div><span className="text-xs dark:text-slate-300">{u.name}</span></button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 relative" ref={el => { sidebarRefs.current['priority'] = el; }}>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Prioridade</span>
              <button onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                <span className={`material-symbols-outlined text-sm ${getPriorityIcon(task.priority).color}`}>{getPriorityIcon(task.priority).icon}</span>
                <span>{task.priority}</span>
                <span className="material-symbols-outlined text-sm ml-auto">expand_more</span>
              </button>
              {activeDropdown === 'priority' && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1c2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[120] p-1 text-left">
                  {Object.values(TaskPriority).map(p => (
                    <button key={p} onClick={() => handleUpdate({ priority: p })} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-bold dark:text-slate-300"><span className={`material-symbols-outlined text-sm ${getPriorityIcon(p).color}`}>{getPriorityIcon(p).icon}</span><span>{p}</span></button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 relative" ref={el => { sidebarRefs.current['epic'] = el; }}>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pai (Épico)</span>
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'epic' ? null : 'epic')}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  parentEpicTask
                  ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'
                  : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm shrink-0">bolt</span>
                <span className="truncate flex-1 text-left">{parentEpicTask?.title || 'Sem épico'}</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>

              {activeDropdown === 'epic' && (
                <div className="absolute top-full left-0 w-72 mt-1 bg-white dark:bg-[#1c2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 text-left">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Recente</p>
                    <div className="space-y-1 mt-1 max-h-48 overflow-y-auto custom-scrollbar">
                      {availableEpics.length > 0 ? (
                        availableEpics.map(e => (
                          <button
                            key={e.id}
                            onClick={() => handleUpdate({ parentEpic: e.id })}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group ${task.parentEpic === e.id ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                          >
                            <span className="material-symbols-outlined text-purple-500 text-lg">bolt</span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-primary tracking-wider">{e.id}</span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{e.title}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-4 text-xs text-slate-400 dark:text-slate-600 italic text-center">Nenhum épico disponível</p>
                      )}
                    </div>
                  </div>
                  <div className="p-1">
                    {parentEpicTask && (
                      <button
                        onClick={() => navigate(`/task/${parentEpicTask.id}`)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <span>Visualizar item pai</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                    )}
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                    <button
                      onClick={() => handleUpdate({ parentEpic: '' })}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                    >
                      <span>Remover pai</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO DE TICKETS VINCULADOS */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 relative" ref={el => { sidebarRefs.current['links'] = el; }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tickets vinculados</span>
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'links' ? null : 'links')}
                  className="size-6 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-primary transition-all flex items-center justify-center"
                  title="Vincular ticket"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>

              {activeDropdown === 'links' && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-[#1c2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[130] overflow-hidden animate-in fade-in slide-in-from-bottom-2 flex flex-col">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Buscar ID ou título..."
                        value={linkSearchQuery}
                        onChange={e => setLinkSearchQuery(e.target.value)}
                        className="w-full h-9 pl-8 pr-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                    {linkSearchQuery.trim() === '' ? (
                      <p className="px-4 py-4 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">Digite para buscar</p>
                    ) : filteredSearchTasks.length > 0 ? (
                      filteredSearchTasks.map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleAddLink(t.id)}
                          className="w-full flex flex-col gap-0.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors border-b border-slate-50 dark:border-white/5 last:border-0"
                        >
                          <span className="text-[10px] font-black text-primary uppercase font-mono tracking-tighter">{t.id}</span>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{t.title}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase ${getStatusClasses(t.status).bg}`}>{t.status}</div>
                            <span className="text-[8px] font-bold text-slate-400">{t.responsible.name.split(' ')[0]}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-4 text-[10px] text-slate-400 text-center italic">Nenhuma tarefa encontrada.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {linkedTasksData.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic py-1">Nenhum ticket vinculado.</p>
                ) : (
                  linkedTasksData.map(link => {
                    const statusStyle = getStatusClasses(link.targetTask?.status || TaskStatus.BACKLOG);
                    return (
                      <div
                        key={link.id}
                        className="group relative flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all cursor-pointer bg-slate-50/50 dark:bg-white/[0.02]"
                        onClick={() => navigate(`/task/${link.to_task_id}`)}
                      >
                        <button
                          onClick={(e) => handleRemoveLink(link.to_task_id, e)}
                          className="absolute top-2 right-2 size-5 rounded-full bg-white dark:bg-slate-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          title="Remover vínculo"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-primary uppercase font-mono tracking-tighter shrink-0">{link.to_task_id}</span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate pr-4">{link.targetTask?.title}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border flex items-center gap-1 ${statusStyle.bg}`}>
                            <span className={`size-1 rounded-full ${statusStyle.dot}`}></span>
                            {link.targetTask?.status}
                          </div>
                          {link.targetTask?.responsible && (
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[60px]">{link.targetTask.responsible.name.split(' ')[0]}</span>
                              <div className="size-5 rounded-full bg-cover bg-center border border-white dark:border-slate-800 shadow-sm" style={{ backgroundImage: `url(${link.targetTask.responsible.avatar})` }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#161f2a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-left p-6">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              </div>
              <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Prazos e Datas</h3>
            </div>
            <div className="space-y-4 pl-11">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Entrega</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Não definida'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Criado em</span>
                <span className="text-xs font-bold text-slate-500">14 de Março, 2024</span>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-[#161f2a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden min-h-[400px] relative">
            {showMentions && filteredMentionUsers.length > 0 && (
              <div className="absolute bottom-[130px] left-4 w-64 bg-white dark:bg-[#1a2330] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 z-[150] overflow-hidden animate-in slide-in-from-bottom-2 p-1">
                <p className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-white/5 mb-1">Mencionar Pessoa</p>
                {filteredMentionUsers.map((u, i) => (
                  <button
                    key={u.id}
                    onClick={() => insertMention(u.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${mentionIndex === i ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                  >
                    <div className="size-7 rounded-full bg-cover bg-center border border-white/20" style={{ backgroundImage: `url(${u.avatar})` }}></div>
                    <div className="flex flex-col overflow-hidden">
                      <span className={`text-xs font-bold truncate ${mentionIndex === i ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{u.name}</span>
                      <span className={`text-[9px] uppercase font-black tracking-tighter ${mentionIndex === i ? 'text-white/70' : 'text-slate-400'}`}>{u.role}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
              <button onClick={() => setActiveTab('comments')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'comments' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>Comentários ({task.comments?.length || 0})</button>
              <button onClick={() => setActiveTab('activities')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activities' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>Atividades</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-left">
              {activeTab === 'comments' ? (
                <div className="space-y-6">
                  {task.comments?.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="size-8 rounded-full bg-cover shrink-0 border dark:border-slate-800" style={{ backgroundImage: `url(${comment.user?.avatar})` }}></div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex justify-between items-baseline"><span className="text-xs font-bold text-slate-900 dark:text-white">{comment.user?.name}</span><span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase">{formatDate(comment.created_at)}</span></div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 border dark:border-slate-800 leading-relaxed">
                          {renderCommentContent(comment.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
                  {task.activities?.map(activity => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="size-8 rounded-full bg-cover shrink-0 border dark:border-slate-800" style={{ backgroundImage: `url(${activity.user?.avatar})` }}></div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-bold text-slate-900 dark:text-white">{activity.user?.name}</span> {activity.action_type} <span className="font-bold">{activity.field_name}</span></p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">{formatDate(activity.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {activeTab === 'comments' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                <textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={handleCommentChange}
                  onKeyDown={(e) => {
                    if (showMentions) {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(prev => (prev + 1) % filteredMentionUsers.length); }
                      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(prev => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length); }
                      if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredMentionUsers[mentionIndex].name); }
                      if (e.key === 'Escape') { setShowMentions(false); }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-[#1a2430] text-sm h-20 p-3 resize-none focus:ring-primary/20 outline-none dark:text-white dark:placeholder-slate-600"
                  placeholder="Escreva um comentário (use @ para mencionar)..."
                />
                <div className="flex justify-end mt-2"><button onClick={handleCommentSubmit} disabled={!newComment.trim()} className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-8 py-2.5 rounded-lg shadow-md hover:bg-primary/90 transition-all">Enviar</button></div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
