
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Task, TaskStatus, TaskPriority, Sprint, SprintStatus, TaskType, User } from '../types';

interface ProjectBoardProps {
  tasks: Task[];
  users: User[];
  sprints: Sprint[];
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
}

type GroupByOption = 'Epic' | 'Status' | 'Priority';

const ProjectBoard: React.FC<ProjectBoardProps> = ({ tasks, users, sprints, onUpdateTask }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupByOption>(() => {
    return (localStorage.getItem('crm_project_board_group_by') as GroupByOption) || 'Epic';
  });
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    const savedMode = localStorage.getItem('crm_project_board_view_mode');
    return (savedMode === 'kanban' || savedMode === 'list') ? savedMode : 'kanban';
  });
  
  // Estados para Drag and Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropStatus, setActiveDropStatus] = useState<TaskStatus | null>(null);

  const [statusMenuTaskId, setStatusMenuTaskId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('crm_project_board_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('crm_project_board_group_by', groupBy);
  }, [groupBy]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStatusMenuTaskId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeSprint = sprints.find(s => s.status === SprintStatus.ACTIVE);
  
  const filteredTasks = useMemo(() => {
    if (!activeSprint) return [];
    return tasks.filter(t => 
      t.sprintId === activeSprint.id && 
      t.type !== TaskType.EPIC &&
      (!selectedUserId || t.responsible.id === selectedUserId)
    );
  }, [tasks, activeSprint, selectedUserId]);

  const groupedTasks = useMemo<Record<string, Task[]>>(() => {
    const groups: Record<string, Task[]> = {};
    
    filteredTasks.forEach(task => {
      let key = 'Sem Grupo';
      if (groupBy === 'Epic') {
        const epic = tasks.find(t => t.id === task.parentEpic);
        key = epic ? `${epic.id} | ${epic.title.toUpperCase()}` : 'SEM ÉPICO';
      } else if (groupBy === 'Status') {
        key = task.status.toUpperCase();
      } else if (groupBy === 'Priority') {
        key = task.priority.toUpperCase();
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [filteredTasks, groupBy, tasks]);

  // Handlers de Drag and Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Pequeno delay para a classe de opacidade ser aplicada após o clique
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.classList.add('opacity-40');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    setActiveDropStatus(null);
    const el = e.target as HTMLElement;
    el.classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (activeDropStatus !== status) {
      setActiveDropStatus(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onUpdateTask) {
      onUpdateTask(taskId, { status });
    }
    setDraggedTaskId(null);
    setActiveDropStatus(null);
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getTaskIcon = (type: TaskType) => {
    switch (type) {
      case TaskType.EPIC: return { icon: 'bolt', color: 'text-purple-500' };
      case TaskType.STORY: return { icon: 'bookmark', color: 'text-emerald-500' };
      case TaskType.BUG: return { icon: 'bug_report', color: 'text-rose-500' };
      case TaskType.ANALYSIS: return { icon: 'analytics', color: 'text-amber-500' };
      default: return { icon: 'check_circle', color: 'text-primary' };
    }
  };

  const getStatusClasses = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.BACKLOG: return { bg: 'bg-slate-100 text-slate-600 border-slate-200/60', dot: 'bg-slate-400' };
      case TaskStatus.DEVELOPMENT: return { bg: 'bg-amber-100/60 text-amber-700 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' };
      case TaskStatus.DONE: return { bg: 'bg-emerald-100/60 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' };
      case TaskStatus.IMPEDIMENT: return { bg: 'bg-rose-100/60 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400', dot: 'bg-rose-500' };
      case TaskStatus.REVIEW: return { bg: 'bg-indigo-100/60 text-indigo-700 border-indigo-200/50 dark:bg-indigo-900/30 dark:text-indigo-400', dot: 'bg-indigo-500' };
      case TaskStatus.PUBLICATION: return { bg: 'bg-blue-100/60 text-blue-700 border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-500' };
      default: return { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
    }
  };

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT: return { icon: 'report_problem', color: 'text-rose-600', bg: 'hover:bg-rose-50 dark:hover:bg-white/5' };
      case TaskPriority.CRITICAL: return { icon: 'report_problem', color: 'text-rose-500', bg: 'hover:bg-rose-50 dark:hover:bg-white/5' };
      case TaskPriority.HIGH: return { icon: 'arrow_upward', color: 'text-orange-500', bg: 'hover:bg-orange-50 dark:hover:bg-white/5' };
      case TaskPriority.MEDIUM: return { icon: 'bar_chart', color: 'text-slate-400', bg: 'hover:bg-slate-50 dark:hover:bg-white/5' };
      case TaskPriority.LOW: return { icon: 'arrow_downward', color: 'text-blue-500', bg: 'hover:bg-blue-50 dark:hover:bg-white/5' };
      default: return { icon: 'bar_chart', color: 'text-slate-400', bg: 'hover:bg-slate-50 dark:hover:bg-white/5' };
    }
  };

  const findEpicTitle = (parentId?: string) => {
    if (!parentId) return 'Sem épico';
    const epic = tasks.find(t => t.id === parentId);
    return epic ? epic.title : 'Sem épico';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden font-display text-left bg-slate-50 dark:bg-background-dark">
      <header className="h-20 flex flex-wrap items-center justify-between px-8 bg-white dark:bg-[#161f2a] border-b border-slate-200 dark:border-slate-800 shrink-0 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quadro de Projetos</h2>
            {activeSprint ? (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{activeSprint.name}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Nenhuma sprint ativa</span>
            )}
          </div>

          <div className="h-10 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center shadow-inner">
             <button 
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-4 h-full rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
             >
               <span className="material-symbols-outlined text-lg">view_kanban</span>
               Kanban
             </button>
             <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 h-full rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
             >
               <span className="material-symbols-outlined text-lg">list_alt</span>
               Lista
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {viewMode === 'list' && (
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agrupar por:</span>
               <select 
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer"
               >
                 <option value="Epic">Épico</option>
                 <option value="Status">Status</option>
                 <option value="Priority">Prioridade</option>
               </select>
             </div>
           )}

           <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[250px] p-1">
              {users.map(user => (
                 <button 
                  key={user.id}
                  onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                  className={`size-11 rounded-full transition-all shrink-0 flex items-center justify-center ${
                    selectedUserId === user.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-[#161f2a]' : 'hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title={user.name}
                 >
                   <div 
                    className="size-8 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-800 shadow-sm"
                    style={{ backgroundImage: `url(${user.avatar})` }}
                   />
                 </button>
              ))}
           </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8 custom-scrollbar">
        {!activeSprint ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
             <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700">view_kanban</span>
             <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400">Não há uma Sprint ativa</h3>
             <Link to="/backlog" className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm">Ir para Backlog</Link>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-6 h-full min-w-max">
            {(Object.values(TaskStatus) as TaskStatus[]).map(status => (
              <div 
                key={status} 
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                onDragLeave={() => setActiveDropStatus(null)}
                className={`w-80 flex flex-col h-full rounded-xl p-3 shrink-0 transition-all border-2 ${activeDropStatus === status ? 'border-primary border-dashed bg-primary/5' : 'bg-slate-200/40 dark:bg-[#161f2a]/60 border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-4 px-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{status}</h3>
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                      {filteredTasks.filter(t => t.status === status).length}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-[200px]">
                  {filteredTasks.filter(t => t.status === status).map(task => {
                    const { icon, color } = getTaskIcon(task.type);
                    return (
                      <div 
                        key={task.id} 
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className="group cursor-grab active:cursor-grabbing transition-opacity"
                      >
                        <Link 
                          to={`/task/${task.id}`}
                          className="block bg-white dark:bg-[#1c2632] p-4 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col gap-3 text-left">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-1.5">
                                <span className={`material-symbols-outlined text-[16px] ${color}`}>{icon}</span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-primary tracking-wider">{task.id}</span>
                              </div>
                              <div className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/30">
                                {findEpicTitle(task.parentEpic)}
                              </div>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{task.title}</h4>
                            <div className="flex items-center justify-between pt-2">
                              <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter border ${getPriorityStyle(task.priority).bg} ${getPriorityStyle(task.priority).color}`}>
                                {task.priority}
                              </span>
                              <div className="size-6 rounded-full bg-cover border border-white dark:border-slate-800 shadow-sm" style={{ backgroundImage: `url(${task.responsible.avatar})` }}></div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {(Object.entries(groupedTasks) as [string, Task[]][]).map(([groupKey, groupTasks]) => {
              const isCollapsed = collapsedGroups.includes(groupKey);
              return (
                <div key={groupKey} className="bg-white dark:bg-[#161f2a] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Cabeçalho do Grupo */}
                  <div 
                    className="px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none group/header"
                    onClick={() => toggleGroup(groupKey)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>expand_more</span>
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-xl ${groupBy === 'Epic' ? 'text-purple-600' : 'text-primary'}`}>
                          {groupBy === 'Epic' ? 'bolt' : groupBy === 'Status' ? 'rule' : 'signal_cellular_alt'}
                        </span>
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{groupKey}</h3>
                      </div>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                        {groupTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Tarefas */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {groupTasks.map(task => {
                        const { icon, color } = getTaskIcon(task.type);
                        const statusStyle = getStatusClasses(task.status);
                        const pStyle = getPriorityStyle(task.priority);
                        const isStatusOpen = statusMenuTaskId === task.id;
                        const epicTitle = findEpicTitle(task.parentEpic);

                        return (
                          <div 
                            key={task.id} 
                            className="flex items-center px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all group/row"
                          >
                            {/* Lado Esquerdo: Icon, ID e Título */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <span className={`material-symbols-outlined ${color} text-lg shrink-0`}>{icon}</span>
                              <div className="flex items-center gap-3 truncate">
                                <span className="text-[11px] font-mono font-black text-slate-400 dark:text-slate-500 tracking-tighter shrink-0">{task.id}</span>
                                <Link 
                                  to={`/task/${task.id}`} 
                                  className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover/row:text-primary transition-colors truncate"
                                >
                                  {task.title}
                                </Link>
                              </div>
                            </div>

                            {/* Centro/Direita: Status, Épico, Prioridade Cluster */}
                            <div className="flex items-center gap-10 shrink-0">
                              {/* Status Badge - Padronizado AmorSaúde (rounded-md) */}
                              <div className="w-44 relative">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setStatusMenuTaskId(isStatusOpen ? null : task.id); }}
                                  className={`flex items-center gap-2.5 px-4 py-1.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 border ${statusStyle.bg} w-full shadow-sm`}
                                >
                                  <span className={`size-1.5 rounded-full shrink-0 ${statusStyle.dot}`}></span>
                                  <span className="truncate">{task.status}</span>
                                </button>
                                
                                {isStatusOpen && (
                                  <div 
                                    ref={dropdownRef} 
                                    className="absolute left-0 top-full mt-2 w-52 bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[999] p-1 animate-in fade-in slide-in-from-top-2 text-left"
                                  >
                                    {(Object.values(TaskStatus) as TaskStatus[]).map((s) => {
                                      const itemStyle = getStatusClasses(s);
                                      const isSelected = task.status === s;
                                      return (
                                        <button 
                                          key={s} 
                                          onClick={() => { onUpdateTask?.(task.id, { status: s }); setStatusMenuTaskId(null); }}
                                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold rounded-lg transition-all ${isSelected ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                                        >
                                          <span className={`size-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : itemStyle.dot}`}></span>
                                          {s}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Épico - Badge Padronizado AmorSaúde (rounded-md + bolt) */}
                              <div className="w-48 px-2 shrink-0">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all w-full text-left truncate ${
                                  epicTitle !== 'Sem épico'
                                  ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' 
                                  : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-white/5 dark:text-slate-500'
                                }`}>
                                  <span className="material-symbols-outlined text-sm shrink-0">bolt</span>
                                  <span className="truncate">{epicTitle}</span>
                                </div>
                              </div>

                              {/* Prioridade e Avatar - Padronizado (sem fundo ou hover) */}
                              <div className="flex items-center gap-5">
                                <div 
                                  className={`size-8 rounded-lg flex items-center justify-center transition-all ${pStyle.bg}`}
                                  title={`Prioridade: ${task.priority}`}
                                >
                                  <span className={`material-symbols-outlined text-xl ${pStyle.color}`}>{pStyle.icon}</span>
                                </div>
                                
                                <div 
                                  className="size-9 rounded-full bg-cover border-2 border-white dark:border-slate-800 shadow-sm" 
                                  style={{ backgroundImage: `url(${task.responsible.avatar})` }} 
                                  title={task.responsible.name}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBoard;
