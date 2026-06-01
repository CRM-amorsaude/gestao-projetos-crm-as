
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TaskType, TaskStatus, TaskPriority, Sprint, User, Task, SprintStatus, OKR, KeyResult } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<any>, files: File[]) => void;
  sprints: Sprint[];
  epics: Task[];
  users: User[];
  currentUser: any;
  okrs?: OKR[];
  keyResults?: KeyResult[];
}

const ToolbarBtn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} title={title} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors flex items-center justify-center min-w-[28px] h-7">
    {children}
  </button>
);
const TbDivider = () => <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5 self-center shrink-0" />;

const RichTextEditor = ({ label, value, onChange, placeholder, minHeight = '200px', required = false }: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; minHeight?: string; required?: boolean;
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const wrapSel = (pre: string, suf: string) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.substring(s, e) || 'texto';
    onChange(value.substring(0, s) + pre + sel + suf + value.substring(e));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + pre.length, s + pre.length + sel.length); }, 0);
  };

  const linePrefix = (pre: string) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart;
    const ls = value.lastIndexOf('\n', s - 1) + 1;
    onChange(value.substring(0, ls) + pre + value.substring(ls));
    setTimeout(() => { ta.focus(); const np = s + pre.length; ta.setSelectionRange(np, np); }, 0);
  };

  const insertAt = (text: string, cursorOff: number) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart;
    onChange(value.substring(0, s) + text + value.substring(s));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + cursorOff, s + cursorOff); }, 0);
  };

  const codeBlock = () => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.substring(s, e) || 'código aqui';
    const pre = s > 0 && value[s - 1] !== '\n' ? '\n' : '';
    const block = `${pre}\`\`\`\n${sel}\n\`\`\`\n`;
    onChange(value.substring(0, s) + block + value.substring(e));
    setTimeout(() => { ta.focus(); const cs = s + pre.length + 4; ta.setSelectionRange(cs, cs + sel.length); }, 0);
  };

  return (
    <div className="space-y-2 text-left">
      {label && (
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className={`size-1.5 rounded-full ${required ? 'bg-rose-500' : 'bg-primary/40'}`} />
          {label}{required && <span className="text-rose-500 text-[10px] lowercase font-bold ml-1">(obrigatório)</span>}
        </label>
      )}
      <div className="border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-0.5 p-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 flex-wrap">
          <ToolbarBtn onClick={() => wrapSel('**', '**')} title="Negrito"><span className="material-symbols-outlined text-[18px]">format_bold</span></ToolbarBtn>
          <ToolbarBtn onClick={() => wrapSel('*', '*')} title="Itálico"><span className="material-symbols-outlined text-[18px]">format_italic</span></ToolbarBtn>
          <TbDivider />
          <ToolbarBtn onClick={() => linePrefix('# ')} title="Título H1"><span className="text-[11px] font-black leading-none">H1</span></ToolbarBtn>
          <ToolbarBtn onClick={() => linePrefix('## ')} title="Título H2"><span className="text-[11px] font-black leading-none">H2</span></ToolbarBtn>
          <TbDivider />
          <ToolbarBtn onClick={() => insertAt('\n- ', 3)} title="Lista com marcadores"><span className="material-symbols-outlined text-[18px]">format_list_bulleted</span></ToolbarBtn>
          <ToolbarBtn onClick={() => insertAt('\n1. ', 4)} title="Lista numerada"><span className="material-symbols-outlined text-[18px]">format_list_numbered</span></ToolbarBtn>
          <ToolbarBtn onClick={() => insertAt('\n- [ ] ', 7)} title="Lista de tarefas"><span className="material-symbols-outlined text-[18px]">checklist</span></ToolbarBtn>
          <TbDivider />
          <ToolbarBtn onClick={() => insertAt('\n> ', 3)} title="Citação"><span className="material-symbols-outlined text-[18px]">format_quote</span></ToolbarBtn>
          <ToolbarBtn onClick={() => wrapSel('`', '`')} title="Código inline"><span className="material-symbols-outlined text-[18px]">code</span></ToolbarBtn>
          <ToolbarBtn onClick={codeBlock} title="Bloco de código"><span className="material-symbols-outlined text-[18px]">terminal</span></ToolbarBtn>
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full p-4 bg-transparent border-none focus:ring-0 text-sm leading-relaxed resize-y placeholder:text-slate-300 dark:placeholder:text-slate-600 custom-scrollbar dark:text-white"
        />
      </div>
    </div>
  );
};

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSubmit, sprints, epics, users, currentUser, okrs = [], keyResults = [] }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [searchEpicQuery, setSearchEpicQuery] = useState('');
  const [searchOkrQuery, setSearchOkrQuery] = useState('');
  const [searchKrQuery, setSearchKrQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormData = {
    title: '',
    type: TaskType.TASK,
    status: TaskStatus.BACKLOG,
    priority: TaskPriority.MEDIUM,
    responsibleId: currentUser?.id || '',
    reporterId: currentUser?.id || '',
    sprintId: '',
    parentEpic: '',
    okrId: '',
    krId: '',
    description: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const availableSprintsOrdered = useMemo(() => {
    const nonCompleted = sprints.filter(s => s.status !== SprintStatus.COMPLETED);
    return [...nonCompleted].sort((a, b) => {
      if (a.status === SprintStatus.ACTIVE && b.status !== SprintStatus.ACTIVE) return -1;
      if (a.status !== SprintStatus.ACTIVE && b.status === SprintStatus.ACTIVE) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [sprints]);

  const filteredEpics = useMemo(() => {
    if (!searchEpicQuery.trim()) return epics;
    const q = searchEpicQuery.toLowerCase();
    return epics.filter(e => e.title.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
  }, [epics, searchEpicQuery]);

  const filteredOkrs = useMemo(() => {
    if (!searchOkrQuery.trim()) return okrs;
    const q = searchOkrQuery.toLowerCase();
    return okrs.filter(o => o.title.toLowerCase().includes(q));
  }, [okrs, searchOkrQuery]);

  const filteredKrs = useMemo(() => {
    const rel = keyResults.filter(kr => kr.okrId === formData.okrId);
    if (!searchKrQuery.trim()) return rel;
    const q = searchKrQuery.toLowerCase();
    return rel.filter(kr => kr.title.toLowerCase().includes(q));
  }, [keyResults, formData.okrId, searchKrQuery]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData(prev => ({ ...prev, responsibleId: currentUser.id, reporterId: currentUser.id }));
    }
  }, [isOpen, currentUser]);

  const typeRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const respRef = useRef<HTMLDivElement>(null);
  const repRef = useRef<HTMLDivElement>(null);
  const sprintRef = useRef<HTMLDivElement>(null);
  const epicRef = useRef<HTMLDivElement>(null);
  const okrRef = useRef<HTMLDivElement>(null);
  const krRef = useRef<HTMLDivElement>(null);

  const resetFields = () => {
    setFormData(initialFormData);
    setSelectedFiles([]);
    setActiveDropdown(null);
    setSearchEpicQuery('');
    setSearchOkrQuery('');
    setSearchKrQuery('');
  };

  const handleClose = () => { resetFields(); onClose(); };

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const refs = [typeRef, statusRef, respRef, repRef, sprintRef, epicRef, okrRef, krRef];
      if (!refs.some(r => r.current?.contains(e.target as Node))) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (!isOpen) return null;

  const isEpic = formData.type === TaskType.EPIC;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { alert('O título da tarefa é obrigatório.'); return; }
    onSubmit({ ...formData, dueDate: new Date().toISOString().split('T')[0] }, selectedFiles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (i: number) => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));

  const getTaskTypeIcon = (type: TaskType) => {
    switch (type) {
      case TaskType.TASK: return { icon: 'check_circle', color: 'text-primary' };
      case TaskType.STORY: return { icon: 'bookmark', color: 'text-emerald-500' };
      case TaskType.BUG: return { icon: 'bug_report', color: 'text-rose-500' };
      case TaskType.EPIC: return { icon: 'bolt', color: 'text-purple-500' };
      case TaskType.ANALYSIS: return { icon: 'analytics', color: 'text-amber-500' };
      default: return { icon: 'label', color: 'text-slate-400' };
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.BACKLOG: return { icon: 'inventory_2', color: 'text-slate-400' };
      case TaskStatus.DEVELOPMENT: return { icon: 'engineering', color: 'text-amber-500' };
      case TaskStatus.IMPEDIMENT: return { icon: 'block', color: 'text-rose-500' };
      case TaskStatus.REVIEW: return { icon: 'visibility', color: 'text-indigo-500' };
      case TaskStatus.PUBLICATION: return { icon: 'upload_file', color: 'text-purple-500' };
      case TaskStatus.DONE: return { icon: 'check_circle', color: 'text-emerald-500' };
      default: return { icon: 'radio_button_checked', color: 'text-slate-400' };
    }
  };

  const selectedResp = users.find(u => u.id === formData.responsibleId);
  const selectedRep = users.find(u => u.id === formData.reporterId);
  const selectedSprint = sprints.find(s => s.id === formData.sprintId);
  const selectedEpicTask = epics.find(e => e.id === formData.parentEpic);
  const selectedOkr = okrs.find(o => o.id === formData.okrId);
  const selectedKr = keyResults.find(kr => kr.id === formData.krId);

  const dropdownClass = "absolute top-full left-0 w-full mt-1 bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[160] py-1 animate-in fade-in slide-in-from-top-2";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[950px] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg text-white"><span className="material-symbols-outlined text-xl filled">add_task</span></div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Criar Nova Tarefa</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><span className="material-symbols-outlined">close</span></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">

          {/* Tipo + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-2" ref={typeRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tipo de card</label>
              <div className="relative">
                <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${getTaskTypeIcon(formData.type).color} text-[20px]`}>{getTaskTypeIcon(formData.type).icon}</span>
                    <span className="text-slate-900 dark:text-slate-200 font-medium">{formData.type}</span>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'type' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {activeDropdown === 'type' && (
                  <div className={dropdownClass}>
                    {Object.values(TaskType).map(type => (
                      <button key={type} type="button" onClick={() => { setFormData({ ...formData, type }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.type === type ? 'bg-primary/5' : ''}`}>
                        <span className={`material-symbols-outlined ${getTaskTypeIcon(type).color} text-[20px]`}>{getTaskTypeIcon(type).icon}</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2" ref={statusRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Status</label>
              <div className="relative">
                <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${getStatusIcon(formData.status).color} text-[20px]`}>{getStatusIcon(formData.status).icon}</span>
                    <span className="text-slate-900 dark:text-slate-200 font-medium">{formData.status}</span>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {activeDropdown === 'status' && (
                  <div className={dropdownClass}>
                    {Object.values(TaskStatus).map(status => (
                      <button key={status} type="button" onClick={() => { setFormData({ ...formData, status }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.status === status ? 'bg-primary/5' : ''}`}>
                        <span className={`material-symbols-outlined ${getStatusIcon(status).color} text-[20px]`}>{getStatusIcon(status).icon}</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Título <span className="text-red-500">*</span></label>
            <input required type="text" placeholder="Descreva brevemente o objetivo" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary/20 outline-none text-sm shadow-inner dark:text-white" />
          </div>

          {/* Responsável + Relator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-2" ref={respRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Responsável</label>
              <div className="relative">
                <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'resp' ? null : 'resp')} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    {selectedResp ? (<><div className="size-6 rounded-full bg-cover bg-center border border-primary/20" style={{ backgroundImage: `url(${selectedResp.avatar})` }} /><span className="text-slate-900 dark:text-white font-semibold">{selectedResp.name}</span></>) : <span className="text-slate-400">Selecionar...</span>}
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'resp' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {activeDropdown === 'resp' && (
                  <div className={`${dropdownClass} max-h-48 overflow-y-auto custom-scrollbar`}>
                    {users.map(user => (
                      <button key={user.id} type="button" onClick={() => { setFormData({ ...formData, responsibleId: user.id }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.responsibleId === user.id ? 'bg-primary/5' : ''}`}>
                        <div className="size-8 rounded-full bg-cover bg-center border border-slate-100 dark:border-slate-800 shadow-sm" style={{ backgroundImage: `url(${user.avatar})` }} />
                        <div className="flex flex-col"><span className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</span><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{user.role}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2" ref={repRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Relator</label>
              <div className="relative">
                <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'rep' ? null : 'rep')} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    {selectedRep ? (<><div className="size-6 rounded-full bg-cover bg-center border border-primary/20" style={{ backgroundImage: `url(${selectedRep.avatar})` }} /><span className="text-slate-900 dark:text-white font-semibold">{selectedRep.name}</span></>) : <span className="text-slate-400">Selecionar...</span>}
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'rep' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {activeDropdown === 'rep' && (
                  <div className={`${dropdownClass} max-h-48 overflow-y-auto custom-scrollbar`}>
                    {users.map(user => (
                      <button key={user.id} type="button" onClick={() => { setFormData({ ...formData, reporterId: user.id }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.reporterId === user.id ? 'bg-primary/5' : ''}`}>
                        <div className="size-8 rounded-full bg-cover bg-center border border-slate-100 dark:border-slate-800 shadow-sm" style={{ backgroundImage: `url(${user.avatar})` }} />
                        <div className="flex flex-col"><span className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</span><span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{user.role}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Épico + Sprint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-2" ref={epicRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pai (Épico)</label>
              <div className="relative">
                <button type="button" disabled={isEpic} onClick={() => { setActiveDropdown(activeDropdown === 'epic' ? null : 'epic'); setSearchEpicQuery(''); }} className={`w-full h-11 px-4 flex items-center justify-between rounded-lg border text-sm shadow-sm transition-all ${isEpic ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 cursor-not-allowed' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${selectedEpicTask ? 'text-purple-500' : 'text-slate-400'}`}>bolt</span>
                    <span className={selectedEpicTask ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400'}>{isEpic ? 'Hierarquia Máxima' : (selectedEpicTask ? selectedEpicTask.title : 'Nenhum')}</span>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'epic' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {activeDropdown === 'epic' && !isEpic && (
                  <div className={`${dropdownClass} max-h-64 overflow-hidden flex flex-col`}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative"><span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span><input type="text" placeholder="Pesquisar épico..." value={searchEpicQuery} onChange={e => setSearchEpicQuery(e.target.value)} className="w-full h-9 pl-8 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs focus:ring-1 focus:ring-primary outline-none" /></div>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                      <button type="button" onClick={() => { setFormData({ ...formData, parentEpic: '' }); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-rose-500">Nenhum</button>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                      {filteredEpics.length > 0 ? filteredEpics.map(e => (
                        <button key={e.id} type="button" onClick={() => { setFormData({ ...formData, parentEpic: e.id }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.parentEpic === e.id ? 'bg-primary/5' : ''}`}>
                          <span className="material-symbols-outlined text-purple-500 text-lg">bolt</span>
                          <div className="flex flex-col min-w-0"><span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">{e.id}</span><span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{e.title}</span></div>
                        </button>
                      )) : <div className="px-4 py-6 text-center text-xs text-slate-400 italic">Nenhum épico encontrado.</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isEpic && (
              <div className="space-y-2" ref={sprintRef}>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Sprint</label>
                <div className="relative">
                  <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'sprint' ? null : 'sprint')} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-[20px] ${selectedSprint ? 'text-primary' : 'text-slate-400'}`}>calendar_month</span>
                      <span className={selectedSprint ? 'text-slate-900 dark:text-slate-200 font-semibold' : 'text-slate-400'}>{selectedSprint ? selectedSprint.name : 'Backlog'}</span>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'sprint' ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {activeDropdown === 'sprint' && (
                    <div className={`${dropdownClass} max-h-64 overflow-y-auto custom-scrollbar`}>
                      <button type="button" onClick={() => { setFormData({ ...formData, sprintId: '' }); setActiveDropdown(null); }} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors font-bold text-xs text-slate-500 uppercase tracking-widest">
                        <span className="material-symbols-outlined text-slate-400 text-lg">inventory_2</span>Backlog
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                      {availableSprintsOrdered.map(s => (
                        <button key={s.id} type="button" onClick={() => { setFormData({ ...formData, sprintId: s.id }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.sprintId === s.id ? 'bg-primary/5' : ''}`}>
                          <span className={`material-symbols-outlined text-lg ${s.status === SprintStatus.ACTIVE ? 'text-primary' : 'text-slate-400'}`}>calendar_today</span>
                          <div className="flex flex-col"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.name}</span>{s.status === SprintStatus.ACTIVE && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Sprint Ativa</span>}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* OKR + KR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2" ref={okrRef}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Objetivo Estratégico (OKR)
                <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest bg-primary/5 px-2 rounded-full">Opcional</span>
              </label>
              <div className="relative">
                <button type="button" onClick={() => { setActiveDropdown(activeDropdown === 'okr' ? null : 'okr'); setSearchOkrQuery(''); }} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${selectedOkr ? 'text-primary' : 'text-slate-400'}`}>track_changes</span>
                    <span className={`${selectedOkr ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400'} truncate`}>{selectedOkr ? selectedOkr.title : 'Vincular a um OKR...'}</span>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'okr' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {activeDropdown === 'okr' && (
                  <div className={`${dropdownClass} max-h-64 overflow-hidden flex flex-col`}>
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative"><span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span><input type="text" placeholder="Pesquisar objetivo..." value={searchOkrQuery} onChange={e => setSearchOkrQuery(e.target.value)} className="w-full h-9 pl-8 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs focus:ring-1 focus:ring-primary outline-none" /></div>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1">
                      <button type="button" onClick={() => { setFormData({ ...formData, okrId: '', krId: '' }); setActiveDropdown(null); }} className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-rose-500">Sem Vínculo</button>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                      {filteredOkrs.length > 0 ? filteredOkrs.map(o => (
                        <button key={o.id} type="button" onClick={() => { setFormData({ ...formData, okrId: o.id, krId: '' }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.okrId === o.id ? 'bg-primary/5' : ''}`}>
                          <span className="material-symbols-outlined text-primary text-lg">track_changes</span>
                          <div className="flex flex-col min-w-0"><span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">{o.year}</span><span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{o.title}</span></div>
                        </button>
                      )) : <div className="px-4 py-6 text-center text-xs text-slate-400 italic">Nenhum OKR encontrado.</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formData.okrId && (
              <div className="space-y-2 animate-in slide-in-from-right-2 fade-in" ref={krRef}>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Resultado-Chave (KR)</label>
                <div className="relative">
                  <button type="button" onClick={() => { setActiveDropdown(activeDropdown === 'kr' ? null : 'kr'); setSearchKrQuery(''); }} className="w-full h-11 px-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm transition-all hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-[20px] ${selectedKr ? 'text-amber-500' : 'text-slate-400'}`}>military_tech</span>
                      <span className={`${selectedKr ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400'} truncate`}>{selectedKr ? selectedKr.title : 'Selecionar KR...'}</span>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'kr' ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  {activeDropdown === 'kr' && (
                    <div className={`${dropdownClass} max-h-64 overflow-hidden flex flex-col`}>
                      <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative"><span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span><input type="text" placeholder="Pesquisar KR..." value={searchKrQuery} onChange={e => setSearchKrQuery(e.target.value)} className="w-full h-9 pl-8 pr-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs focus:ring-1 focus:ring-primary outline-none" /></div>
                      </div>
                      <div className="overflow-y-auto custom-scrollbar flex-1">
                        {filteredKrs.length > 0 ? filteredKrs.map(kr => (
                          <button key={kr.id} type="button" onClick={() => { setFormData({ ...formData, krId: kr.id }); setActiveDropdown(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${formData.krId === kr.id ? 'bg-primary/5' : ''}`}>
                            <span className="material-symbols-outlined text-amber-500 text-lg">military_tech</span>
                            <div className="flex flex-col min-w-0"><span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">{kr.priority}</span><span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{kr.title}</span></div>
                          </button>
                        )) : <div className="px-4 py-6 text-center text-xs text-slate-400 italic">Nenhum resultado-chave vinculado.</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Prioridade</label>
            <div className="flex gap-2">
              {[TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT].map(p => (
                <button key={p} type="button" onClick={() => setFormData({ ...formData, priority: p })} className={`flex-1 h-10 rounded-lg border text-[10px] font-bold transition-all ${formData.priority === p ? 'bg-primary/5 border-primary text-primary shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>{p}</button>
              ))}
            </div>
          </div>

          {/* Descrição — campo único */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <RichTextEditor
              label="Descrição"
              value={formData.description}
              onChange={v => setFormData({ ...formData, description: v })}
              placeholder={isEpic
                ? 'Descreva a visão estratégica deste épico, objetivos e escopo...'
                : 'Descreva o contexto, o que deve ser feito, critérios de aceite...\n\nUse a toolbar para adicionar formatação: **negrito**, *itálico*, listas, checklists e blocos de código.'}
              minHeight="280px"
            />
          </div>

          {/* Anexos */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 text-left">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary/40" />Anexos
            </label>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-slate-400 hover:text-primary">
              <span className="material-symbols-outlined text-3xl">upload_file</span>
              <span className="text-xs font-bold uppercase tracking-widest">Clique para anexar documentos</span>
            </button>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 group">
                    <div className="flex items-center gap-3 truncate">
                      <span className="material-symbols-outlined text-primary">insert_drive_file</span>
                      <div className="flex flex-col truncate"><span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</span><span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span></div>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><span className="material-symbols-outlined text-lg">delete</span></button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </form>

        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end items-center gap-6 shrink-0">
          <button type="button" onClick={handleClose} className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} className="h-11 px-12 bg-primary text-white text-sm font-bold rounded-lg shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">Criar Tarefa</button>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;
