
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Task, TaskPriority, TaskType, TaskStatus, Sprint, SprintStatus, User } from '../types';

// Define the properties expected by the Backlog component.
interface BacklogProps {
  tasks: Task[];
  users: User[];
  sprints: Sprint[];
  onNewTask?: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onCreateSprint: (sprint: Partial<Sprint>) => Promise<void>;
  onUpdateSprint: (sprintId: string, updates: Partial<Sprint>) => Promise<void>;
  onStartSprint: (sprintId: string) => Promise<void>;
}

const Backlog: React.FC<BacklogProps> = ({ tasks, users, sprints, onNewTask, onUpdateTask, onCreateSprint, onUpdateSprint, onStartSprint }) => {
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [sprintName, setSprintName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goal, setGoal] = useState('');

  const getTasksBySprint = (sprintId?: string) => 
    tasks.filter(t => 
      t.sprintId === sprintId && 
      t.type !== TaskType.EPIC && 
      (!selectedUserId || t.responsible.id === selectedUserId)
    );
    
  const tasksNoSprint = tasks.filter(t => 
    !t.sprintId && 
    t.type !== TaskType.EPIC && 
    (!selectedUserId || t.responsible.id === selectedUserId)
  );

  const activeAndPlannedSprints = sprints.filter(s => s.status !== SprintStatus.COMPLETED);

  const sortedSprints = [...activeAndPlannedSprints].sort((a, b) => {
    const statusOrder = {
      [SprintStatus.ACTIVE]: 0,
      [SprintStatus.PLANNED]: 1
    };
    return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
  });

  const openModal = (sprint: Sprint | null = null) => {
    if (sprint) {
      setEditingSprint(sprint);
      setSprintName(sprint.name);
      setStartDate(sprint.startDate || '');
      setEndDate(sprint.endDate || '');
      setGoal(sprint.goal || '');
    } else {
      setEditingSprint(null);
      setSprintName('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 12096e5).toISOString().split('T')[0]);
      setGoal('');
    }
    setIsSprintModalOpen(true);
  };

  const closeModal = () => {
    setIsSprintModalOpen(false);
    setEditingSprint(null);
  };

  const handleSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim()) return;

    const sprintData = {
      name: sprintName,
      startDate,
      endDate,
      goal,
      status: editingSprint ? editingSprint.status : SprintStatus.PLANNED
    };

    if (editingSprint) {
      await onUpdateSprint(editingSprint.id, sprintData);
    } else {
      await onCreateSprint(sprintData);
    }
    closeModal();
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, sprintId: string | null) => {
    e.preventDefault();
    setActiveDropZone(sprintId || 'backlog');
  };

  const handleDrop = async (e: React.DragEvent, sprintId: string | null) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      await onUpdateTask(taskId, { sprintId: sprintId || '' } as any);
    }
    setDraggedTaskId(null);
    setActiveDropZone(null);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-8 font-display text-left">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
        <div>
          <p className="text-slate-900 dark:text-white text-3xl font-black leading-tight tracking-tight">Backlog de Produto</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organize sprints e priorize itens para o time CRM</p>
        </div>

        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time:</span>
             <div className="flex -space-x-2 overflow-x-auto custom-scrollbar max-w-[250px] pb-1">
                {users.map(user => (
                   <button 
                    key={user.id}
                    onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                    className={`size-9 rounded-full border-2 transition-all hover:scale-110 hover:z-10 shrink-0 ${
                      selectedUserId === user.id ? 'border-primary ring-2 ring-primary/20 scale-110 z-20' : 'border-white dark:border-slate-900'
                    } bg-cover bg-center`}
                    style={{ backgroundImage: `url(${user.avatar})` }}
                    title={user.name}
                   />
                ))}
             </div>
             {selectedUserId && (
               <button onClick={() => setSelectedUserId(null)} className="material-symbols-outlined text-slate-400 hover:text-rose-500 text-[20px]">filter_alt_off</button>
             )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => openModal()}
              className="flex h-10 items-center gap-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-sm font-bold shadow-sm hover:bg-slate-50 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add_box</span>
              Criar Sprint
            </button>
            <button onClick={onNewTask} className="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {sortedSprints.map(sprint => (
          <div 
            key={sprint.id}
            onDragOver={(e) => handleDragOver(e, sprint.id)}
            onDrop={(e) => handleDrop(e, sprint.id)}
            onDragLeave={() => setActiveDropZone(null)}
            className={`bg-white dark:bg-slate-900 rounded-xl border transition-all duration-300 ${
              activeDropZone === sprint.id 
                ? 'border-primary ring-4 ring-primary/10 bg-primary/5' 
                : sprint.status === SprintStatus.ACTIVE 
                  ? 'border-primary/40 shadow-xl shadow-primary/5 ring-4 ring-primary/5' 
                  : 'border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between flex-wrap gap-4 rounded-t-xl ${
              sprint.status === SprintStatus.ACTIVE 
                ? 'bg-blue-50/70 dark:bg-blue-900/20 border-primary/20' 
                : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center gap-4">
                <span className={`material-symbols-outlined ${sprint.status === SprintStatus.ACTIVE ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{sprint.name}</h3>
                    <span className="text-slate-400 text-xs font-medium">({getTasksBySprint(sprint.id).length} tickets)</span>
                    {sprint.status === SprintStatus.ACTIVE && (
                      <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ring-1 ring-primary/20">
                        Ativa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] text-slate-500 font-medium">
                      {sprint.startDate && sprint.endDate ? `${new Date(sprint.startDate).toLocaleDateString('pt-BR')} – ${new Date(sprint.endDate).toLocaleDateString('pt-BR')}` : 'Sem datas'}
                    </p>
                    {sprint.goal && (
                      <>
                        <span className="text-slate-300 text-[10px]">|</span>
                        <p className={`text-[11px] font-bold truncate max-w-md ${sprint.status === SprintStatus.ACTIVE ? 'text-primary' : 'text-slate-500'}`} title={sprint.goal}>
                          Objetivo: {sprint.goal}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openModal(sprint)} className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">Editar</button>
                {sprint.status === SprintStatus.PLANNED && (
                  <button onClick={() => onStartSprint(sprint.id)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 transition-all shadow-sm">Iniciar sprint</button>
                )}
                {sprint.status === SprintStatus.ACTIVE && (
                   <button onClick={() => onUpdateSprint(sprint.id, { status: SprintStatus.COMPLETED })} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-md hover:bg-emerald-700 transition-all shadow-sm">Concluir sprint</button>
                )}
              </div>
            </div>
            <TaskTable tasks={getTasksBySprint(sprint.id)} allTasks={tasks} onDragStart={handleDragStart} draggedTaskId={draggedTaskId} onUpdateTask={onUpdateTask} />
          </div>
        ))}

        <div 
          onDragOver={(e) => handleDragOver(e, null)}
          onDrop={(e) => handleDrop(e, null)}
          onDragLeave={() => setActiveDropZone(null)}
          className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 ${
            activeDropZone === 'backlog' ? 'border-primary ring-4 ring-primary/10 bg-primary/5' : ''
          }`}
        >
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-slate-400">expand_more</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Backlog Geral</h3>
              <span className="text-slate-400 text-xs font-medium">({tasksNoSprint.length} tickets)</span>
            </div>
          </div>
          <TaskTable tasks={tasksNoSprint} allTasks={tasks} onDragStart={handleDragStart} draggedTaskId={draggedTaskId} onUpdateTask={onUpdateTask} />
        </div>
      </div>

      {isSprintModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[550px] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-1.5 rounded-lg text-white"><span className="material-symbols-outlined text-xl">{editingSprint ? 'edit' : 'add_box'}</span></div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingSprint ? 'Editar Sprint' : 'Nova Sprint'}</h2>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSprintSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Nome da Sprint</label>
                <input autoFocus required type="text" placeholder="Ex: Sprint 23 - CRM" value={sprintName} onChange={e => setSprintName(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Término</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Objetivo da Sprint</label>
                <textarea placeholder="O que o time pretende entregar ao final destas duas semanas?" value={goal} onChange={e => setGoal(e.target.value)} className="w-full p-4 h-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
              </div>
              <div className="pt-4 flex justify-end items-center gap-6">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-slate-500 hover:text-slate-800">Cancelar</button>
                <button type="submit" className="px-10 h-11 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">{editingSprint ? 'Salvar Alterações' : 'Criar Sprint'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskTableProps {
  tasks: Task[];
  allTasks: Task[];
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  draggedTaskId: string | null;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const TaskTable: React.FC<TaskTableProps> = ({ tasks, allTasks, onDragStart, draggedTaskId, onUpdateTask }) => {
  const [statusMenuTaskId, setStatusMenuTaskId] = useState<string | null>(null);
  const [epicMenuTaskId, setEpicMenuTaskId] = useState<string | null>(null);
  const [priorityMenuTaskId, setPriorityMenuTaskId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStatusMenuTaskId(null);
        setEpicMenuTaskId(null);
        setPriorityMenuTaskId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    return allTasks.find(t => t.id === parentId);
  };

  const availableEpics = useMemo(() => allTasks.filter(t => t.type === TaskType.EPIC), [allTasks]);

  return (
    <div className="flex flex-col">
      {tasks.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-slate-400 italic">Nenhum ticket encontrado.</div>
      ) : (
        tasks.map((task, index) => {
          const { icon, color } = getTaskIcon(task.type);
          const parentEpic = findEpic(task.parentEpic);
          const isStatusOpen = statusMenuTaskId === task.id;
          const isEpicOpen = epicMenuTaskId === task.id;
          const isPriorityOpen = priorityMenuTaskId === task.id;
          const isLast = index === tasks.length - 1;
          const statusStyle = getStatusClasses(task.status);
          const pStyle = getPriorityStyle(task.priority);
          
          return (
            <div 
              key={task.id} 
              draggable="true"
              onDragStart={(e) => onDragStart(e, task.id)}
              className={`flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group cursor-grab active:cursor-grabbing transition-all relative ${isStatusOpen || isEpicOpen || isPriorityOpen ? 'z-50' : 'z-auto'} ${isLast ? 'rounded-b-xl' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors text-[20px] select-none shrink-0">drag_indicator</span>
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
                  onClick={(e) => { e.preventDefault(); setStatusMenuTaskId(isStatusOpen ? null : task.id); setEpicMenuTaskId(null); setPriorityMenuTaskId(null); }}
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
              <div className="w-20 px-2 shrink-0 flex justify-center relative">
                 <button 
                  onClick={() => { setPriorityMenuTaskId(isPriorityOpen ? null : task.id); setStatusMenuTaskId(null); setEpicMenuTaskId(null); }}
                  className={`p-1 rounded-lg transition-all hover:scale-110 active:scale-90 ${pStyle.bg}`}
                  title={`Prioridade: ${task.priority}`}
                >
                  <span className={`material-symbols-outlined text-xl ${pStyle.color}`}>{pStyle.icon}</span>
                </button>
                {isPriorityOpen && (
                  <div ref={dropdownRef} className="absolute top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in slide-in-from-top-2">
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

              <div className="w-12 shrink-0 flex justify-end">
                <div 
                  className="size-8 rounded-full bg-cover border-2 border-white dark:border-slate-700 shadow-sm" 
                  style={{ backgroundImage: `url(${task.responsible.avatar})` }} 
                  title={`Responsável: ${task.responsible.name}`}
                ></div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default Backlog;
