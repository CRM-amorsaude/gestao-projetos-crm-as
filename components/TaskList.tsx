
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, Sprint, TaskType, User } from '../types';

interface TaskListProps {
  tasks: Task[];
  users: User[];
  sprints: Sprint[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, users, sprints, onUpdateTask }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusMenuTaskId, setStatusMenuTaskId] = useState<string | null>(null);
  const [epicMenuTaskId, setEpicMenuTaskId] = useState<string | null>(null);
  const [priorityMenuTaskId, setPriorityMenuTaskId] = useState<string | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const typeFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStatusMenuTaskId(null);
        setEpicMenuTaskId(null);
        setPriorityMenuTaskId(null);
      }
      if (typeFilterRef.current && !typeFilterRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (selectedUserId && t.responsible.id !== selectedUserId) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tasks, searchQuery, typeFilter, selectedUserId]);

  const availableEpics = useMemo(() => tasks.filter(t => t.type === TaskType.EPIC), [tasks]);

  const getTaskIcon = (type: TaskType | 'all') => {
    switch (type) {
      case TaskType.EPIC: return { icon: 'bolt', color: 'text-purple-500' };
      case TaskType.STORY: return { icon: 'bookmark', color: 'text-emerald-500' };
      case TaskType.BUG: return { icon: 'bug_report', color: 'text-rose-500' };
      case TaskType.ANALYSIS: return { icon: 'analytics', color: 'text-amber-500' };
      case 'all': return { icon: 'filter_alt', color: 'text-slate-400' };
      default: return { icon: 'check_circle', color: 'text-primary' };
    }
  };

  const getStatusClasses = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DEVELOPMENT: return { bg: 'bg-amber-100 text-amber-700 border-amber-200/50', dot: 'bg-amber-500' };
      case TaskStatus.DONE: return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200/50', dot: 'bg-emerald-500' };
      case TaskStatus.IMPEDIMENT: return { bg: 'bg-rose-100 text-rose-700 border-rose-200/50', dot: 'bg-rose-500' };
      case TaskStatus.REVIEW: return { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200/50', dot: 'bg-indigo-500' };
      case TaskStatus.PUBLICATION: return { bg: 'bg-blue-100 text-blue-700 border-blue-200/50', dot: 'bg-blue-500' };
      default: return { bg: 'bg-slate-100 text-slate-600 border-slate-200/50', dot: 'bg-slate-400' };
    }
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT: return { icon: 'priority_high', color: 'text-rose-600', bg: 'hover:bg-rose-50' };
      case TaskPriority.CRITICAL: return { icon: 'warning', color: 'text-rose-500', bg: 'hover:bg-rose-50' };
      case TaskPriority.HIGH: return { icon: 'arrow_upward', color: 'text-orange-500', bg: 'hover:bg-orange-50' };
      case TaskPriority.LOW: return { icon: 'arrow_downward', color: 'text-blue-500', bg: 'hover:bg-blue-50' };
      default: return { icon: 'equalizer', color: 'text-slate-400', bg: 'hover:bg-slate-50' };
    }
  };

  const findEpic = (parentId?: string) => {
    if (!parentId) return null;
    return tasks.find(t => t.id === parentId);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-8 font-display text-left">
      <header className="flex flex-wrap justify-between items-center gap-6 mb-8">
        <div>
          <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight leading-tight">Lista de Tarefas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Histórico completo de demandas do time CRM AmorSaúde</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filtrar por:</span>
            <div className="flex -space-x-3 overflow-x-auto custom-scrollbar max-w-[200px] pb-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                  title={user.name}
                  className={`relative size-10 rounded-full border-2 bg-cover bg-center transition-all shrink-0 hover:z-10 hover:scale-110 ${
                    selectedUserId === user.id ? 'border-primary ring-4 ring-primary/20 scale-110 z-20' : 'border-white dark:border-slate-900'
                  }`}
                  style={{ backgroundImage: `url(${user.avatar})` }}
                />
              ))}
            </div>
            {selectedUserId && (
              <button 
                onClick={() => setSelectedUserId(null)}
                className="ml-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                title="Limpar filtro"
              >
                <span className="material-symbols-outlined text-lg">filter_alt_off</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={typeFilterRef}>
              <button 
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="h-11 min-w-[200px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[20px] ${getTaskIcon(typeFilter as any).color}`}>
                    {getTaskIcon(typeFilter as any).icon}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    {typeFilter === 'all' ? 'Todos os Tipos' : typeFilter}
                  </span>
                </div>
                <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[150] py-1 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => { setTypeFilter('all'); setIsTypeDropdownOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${typeFilter === 'all' ? 'bg-primary/5' : ''}`}
                  >
                    <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_alt</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Todos os Tipos</span>
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                  {Object.values(TaskType).map((type) => (
                    <button 
                      key={type} 
                      onClick={() => { setTypeFilter(type); setIsTypeDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${typeFilter === type ? 'bg-primary/5' : ''}`}
                    >
                      <span className={`material-symbols-outlined ${getTaskIcon(type).color} text-[20px]`}>
                        {getTaskIcon(type).icon}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                        {type}s
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
              <input 
                type="text" 
                placeholder="Buscar por ID ou Título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-11 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        {/* Header da Grade */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-t-xl">
          <div className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-10 text-left">Tarefa</div>
          <div className="w-48 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-left">Épico (Pai)</div>
          <div className="w-44 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Etapa / Status</div>
          <div className="w-24 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Prioridade</div>
          <div className="w-20 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-4">Membro</div>
        </div>

        <div className="flex flex-col">
          {filteredTasks.length === 0 ? (
            <div className="px-6 py-24 text-center text-slate-400 italic font-medium">Nenhum resultado encontrado.</div>
          ) : (
            filteredTasks.map((task, index) => {
              const { icon, color } = getTaskIcon(task.type);
              const parentEpic = findEpic(task.parentEpic);
              const isStatusOpen = statusMenuTaskId === task.id;
              const isEpicOpen = epicMenuTaskId === task.id;
              const isPriorityOpen = priorityMenuTaskId === task.id;
              const isLast = index === filteredTasks.length - 1;
              const statusStyle = getStatusClasses(task.status);
              const pStyle = getPriorityStyle(task.priority);
              
              return (
                <div 
                  key={task.id} 
                  className={`flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group transition-all relative ${isStatusOpen || isEpicOpen || isPriorityOpen ? 'z-50' : 'z-auto'} ${isLast ? 'rounded-b-xl' : ''}`}
                >
                  {/* Título */}
                  <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <span className={`material-symbols-outlined text-[18px] shrink-0 ${color}`}>{icon}</span>
                    <span className="text-slate-400 text-[11px] font-mono shrink-0 font-bold">{task.id}</span>
                    <Link to={`/task/${task.id}`} className="text-slate-800 dark:text-slate-200 text-sm font-semibold hover:text-primary transition-colors truncate">
                      {task.title}
                    </Link>
                  </div>

                  {/* Épico Editável */}
                  <div className="w-48 px-4 shrink-0 relative">
                    <button 
                      onClick={() => { setEpicMenuTaskId(isEpicOpen ? null : task.id); setStatusMenuTaskId(null); setPriorityMenuTaskId(null); }}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 w-full text-left truncate ${
                        parentEpic 
                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm shrink-0">bolt</span>
                      <span className="truncate">{parentEpic?.title || 'Sem épico'}</span>
                    </button>
                    {isEpicOpen && (
                      <div ref={dropdownRef} className="absolute top-full left-4 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                         <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">Recente</p>
                         <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {availableEpics.map(e => (
                               <button 
                                key={e.id} 
                                onClick={() => { onUpdateTask(task.id, { parentEpic: e.id }); setEpicMenuTaskId(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group ${task.parentEpic === e.id ? 'bg-primary/5' : ''}`}
                               >
                                 <span className="material-symbols-outlined text-purple-500 text-lg">bolt</span>
                                 <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] font-bold text-slate-400 tracking-wider">{e.id}</span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{e.title}</span>
                                 </div>
                               </button>
                            ))}
                         </div>
                         <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                         <button 
                            onClick={() => { onUpdateTask(task.id, { parentEpic: '' }); setEpicMenuTaskId(null); }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            Remover pai
                          </button>
                      </div>
                    )}
                  </div>

                  {/* Status Editável */}
                  <div className="w-44 px-2 shrink-0 flex justify-center relative">
                    <button 
                      onClick={() => { setStatusMenuTaskId(isStatusOpen ? null : task.id); setEpicMenuTaskId(null); setPriorityMenuTaskId(null); }}
                      className={`flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-semibold text-center w-full truncate border transition-all hover:scale-105 active:scale-95 ${statusStyle.bg}`}
                    >
                      <span className={`size-1.5 rounded-full shrink-0 ${statusStyle.dot}`}></span>
                      <span className="truncate">{task.status}</span>
                    </button>
                    {isStatusOpen && (
                      <div ref={dropdownRef} className="absolute top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in slide-in-from-top-2">
                        {Object.values(TaskStatus).map((s) => {
                          const itemStyle = getStatusClasses(s);
                          return (
                            <button 
                              key={s} 
                              onClick={() => { onUpdateTask(task.id, { status: s }); setStatusMenuTaskId(null); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold rounded-lg transition-colors ${task.status === s ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                              <span className={`size-1.5 rounded-full ${task.status === s ? 'bg-white' : itemStyle.dot}`}></span>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Prioridade Editável */}
                  <div className="w-24 px-2 shrink-0 flex justify-center relative">
                     <button 
                      onClick={() => { setPriorityMenuTaskId(isPriorityOpen ? null : task.id); setStatusMenuTaskId(null); setEpicMenuTaskId(null); }}
                      className={`p-1 rounded-lg transition-all hover:scale-110 active:scale-90 ${pStyle.bg}`}
                      title={`Prioridade: ${task.priority}`}
                    >
                      <span className={`material-symbols-outlined text-xl ${pStyle.color}`}>{pStyle.icon}</span>
                    </button>
                    {isPriorityOpen && (
                      <div ref={dropdownRef} className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in slide-in-from-top-2">
                        {Object.values(TaskPriority).map(p => {
                          const itemStyle = getPriorityStyle(p);
                          return (
                            <button 
                              key={p} 
                              onClick={() => { onUpdateTask(task.id, { priority: p }); setPriorityMenuTaskId(null); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold rounded-lg transition-colors ${task.priority === p ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                            >
                              <span className={`material-symbols-outlined text-sm ${task.priority === p ? 'text-white' : itemStyle.color}`}>{itemStyle.icon}</span>
                              <span className="flex-1 text-left">{p}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Responsável (Membro) */}
                  <div className="w-20 px-2 shrink-0 flex justify-end pr-4">
                    <div 
                      className="size-8 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-800 shadow-sm"
                      style={{ backgroundImage: `url(${task.responsible.avatar})` }}
                      title={`Membro: ${task.responsible.name}`}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      <div className="mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        <p>AmorSaúde CRM Core System</p>
        <p>Exibindo {filteredTasks.length} registros</p>
      </div>
    </div>
  );
};

export default TaskList;
