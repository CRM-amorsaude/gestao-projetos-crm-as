
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Task, TaskPriority, TaskStatus, TaskType, Sprint, User, UserAccessLevel } from '../types';

interface DashboardProps {
  tasks: Task[];
  users: User[];
  currentUser?: User;
  sprints: Sprint[];
  onNewTask?: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, users, currentUser, sprints, onNewTask, onUpdateTask }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUser?.id || null);
  const [priorityMenuTaskId, setPriorityMenuTaskId] = useState<string | null>(null);
  const [statusMenuTaskId, setStatusMenuTaskId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.accessLevel === UserAccessLevel.ADMIN;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPriorityMenuTaskId(null);
        setStatusMenuTaskId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeUserId = isAdmin ? selectedUserId : currentUser?.id;

  const filteredTasksForStats = useMemo(() => {
    return activeUserId ? tasks.filter(t => t.responsible.id === activeUserId) : tasks;
  }, [tasks, activeUserId]);

  const dailyTasks = useMemo(() => {
    return filteredTasksForStats.filter(t => t.type !== TaskType.EPIC);
  }, [filteredTasksForStats]);

  const stats = useMemo(() => [
    { label: 'Tarefas Ativas', value: filteredTasksForStats.length, change: '', color: 'text-primary', icon: 'assignment' },
    { label: 'Em Desenvolv.', value: filteredTasksForStats.filter(t => t.status === TaskStatus.DEVELOPMENT).length, change: '', color: 'text-amber-500', icon: 'pending' },
    { label: 'Em Revisão', value: filteredTasksForStats.filter(t => t.status === TaskStatus.REVIEW).length, change: '', color: 'text-indigo-500', icon: 'rule' },
    { label: 'Impedimentos', value: filteredTasksForStats.filter(t => t.status === TaskStatus.IMPEDIMENT).length, change: '', color: 'text-rose-500', icon: 'block' },
  ], [filteredTasksForStats]);

  const getPriorityStyle = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT: return { icon: 'priority_high', color: 'text-rose-600', bg: 'hover:bg-rose-50 dark:hover:bg-rose-900/20' };
      case TaskPriority.CRITICAL: return { icon: 'warning', color: 'text-rose-500', bg: 'hover:bg-rose-50 dark:hover:bg-rose-900/20' };
      case TaskPriority.HIGH: return { icon: 'arrow_upward', color: 'text-orange-500', bg: 'hover:bg-orange-50 dark:hover:bg-orange-900/20' };
      case TaskPriority.LOW: return { icon: 'arrow_downward', color: 'text-blue-500', bg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20' };
      default: return { icon: 'equalizer', color: 'text-slate-400', bg: 'hover:bg-slate-50 dark:hover:bg-white/5' };
    }
  };

  const getStatusClasses = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DEVELOPMENT: return { bg: 'bg-amber-100 text-amber-700 border-amber-200/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50', dot: 'bg-amber-500' };
      case TaskStatus.DONE: return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50', dot: 'bg-emerald-500' };
      case TaskStatus.IMPEDIMENT: return { bg: 'bg-rose-100 text-rose-700 border-rose-200/50 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50', dot: 'bg-rose-500' };
      case TaskStatus.REVIEW: return { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200/50 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50', dot: 'bg-indigo-500' };
      case TaskStatus.PUBLICATION: return { bg: 'bg-blue-100 text-blue-700 border-blue-200/50 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50', dot: 'bg-blue-500' };
      default: return { bg: 'bg-slate-100 text-slate-600 border-slate-200/50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', dot: 'bg-slate-400' };
    }
  };

  const findEpicTitle = (parentId?: string) => {
    if (!parentId) return 'Sem épico';
    const epic = tasks.find(t => t.id === parentId);
    return epic ? epic.title : 'Sem épico';
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto p-8 font-display text-left">
      <header className="flex flex-wrap justify-between items-end gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-4xl font-black tracking-tight">Painel da Equipe</p>
          <div className="flex items-center gap-3">
             <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Gestão operacional de demandas CRM</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-4 bg-white dark:bg-[#161f2a] p-2 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Visualizar:</span>
             <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[300px] p-1">
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
             {selectedUserId && (
               <button onClick={() => setSelectedUserId(null)} className="p-2 ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400" title="Ver Global">
                 <span className="material-symbols-outlined text-lg">public</span>
               </button>
             )}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 text-left animate-in fade-in duration-500">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#0d121b] flex flex-col gap-2 rounded-xl p-6 border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:scale-[1.02] hover:border-primary/30">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="text-slate-900 dark:text-white text-3xl font-extrabold leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-slate-200/50 dark:bg-white/5 rounded-lg">
            <Link to="/board" className="flex items-center h-10 px-6 rounded-md bg-white dark:bg-[#1a2330] text-slate-900 dark:text-white text-sm font-bold shadow-sm transition-all">Quadro</Link>
            <Link to="/backlog" className="flex items-center h-10 px-6 rounded-md text-slate-500 dark:text-slate-400 text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all">Backlog</Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0d121b] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden text-left animate-in slide-in-from-bottom-2 duration-500">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
            <h3 className="text-slate-900 dark:text-white font-bold text-left">
              {activeUserId && activeUserId !== currentUser?.id ? `Prioridades de ${users.find(u => u.id === activeUserId)?.name}` : 'Minhas Prioridades'}
            </h3>
            <Link to="/list" className="text-primary text-xs font-bold hover:underline">Ver Todas as Tarefas</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-[#090d14]">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/10">Tarefa</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-b border-slate-100 dark:border-white/10">Prioridade</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-b border-slate-100 dark:border-white/10">Épico</th>
                  <th className="px-6 py-3 w-44 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center border-b border-slate-100 dark:border-white/10">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {dailyTasks.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma prioridade encontrada para este filtro.</td>
                    </tr>
                ) : (
                    dailyTasks.map(task => {
                      const pStyle = getPriorityStyle(task.priority);
                      const isPriorityOpen = priorityMenuTaskId === task.id;
                      const isStatusOpen = statusMenuTaskId === task.id;
                      const statusStyle = getStatusClasses(task.status);
                      const epicTitle = findEpicTitle(task.parentEpic);
                      
                      return (
                        <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <Link to={`/task/${task.id}`} className="flex items-center gap-3 text-left">
                              <div className={`h-2 w-2 rounded-full shrink-0 ${task.priority === TaskPriority.CRITICAL || task.priority === TaskPriority.URGENT ? 'bg-rose-500' : 'bg-primary'}`}></div>
                              <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate max-w-[300px]">{task.title}</span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 relative">
                            <div className="flex justify-center">
                               <button 
                                onClick={() => { setPriorityMenuTaskId(isPriorityOpen ? null : task.id); setStatusMenuTaskId(null); }}
                                className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-90 ${pStyle.bg} ${isPriorityOpen ? 'ring-2 ring-primary/20' : ''}`}
                                title={`Prioridade: ${task.priority}`}
                              >
                                <span className={`material-symbols-outlined text-xl ${pStyle.color}`}>{pStyle.icon}</span>
                              </button>
                            </div>
                            {isPriorityOpen && (
                              <div ref={dropdownRef} className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-40 bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in slide-in-from-top-2">
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
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-tighter border ${task.parentEpic ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' : 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-white/5 dark:text-slate-500 dark:border-white/10'}`}>
                              {epicTitle}
                            </span>
                          </td>
                          <td className="px-6 py-4 relative w-44">
                            <div className="flex justify-center">
                              <button 
                                onClick={() => { setStatusMenuTaskId(isStatusOpen ? null : task.id); setPriorityMenuTaskId(null); }}
                                className={`flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-semibold text-center w-full truncate border transition-all hover:scale-105 active:scale-95 shadow-sm ${statusStyle.bg}`}
                              >
                                <span className={`size-1.5 rounded-full shrink-0 ${statusStyle.dot}`}></span> 
                                <span className="truncate">{task.status}</span>
                              </button>
                            </div>
                            {isStatusOpen && (
                              <div ref={dropdownRef} className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in slide-in-from-top-2">
                                {Object.values(TaskStatus).map((s) => {
                                  const itemStyle = getStatusClasses(s);
                                  return (
                                    <button 
                                      key={s} 
                                      onClick={() => { onUpdateTask(task.id, { status: s }); setStatusMenuTaskId(null); }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold rounded-lg transition-colors ${task.status === s ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                                    >
                                      <span className={`size-1.5 rounded-full ${task.status === s ? 'bg-white' : itemStyle.dot}`}></span>
                                      <span className="flex-1 text-left">{s}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="fixed bottom-8 right-8">
        <button 
          onClick={onNewTask}
          className="flex items-center justify-center gap-3 h-14 pl-5 pr-6 rounded-full bg-primary text-white shadow-2xl hover:scale-105 transition-transform active:scale-95 ring-4 ring-primary/20"
        >
          <span className="material-symbols-outlined">add_task</span>
          <span className="text-base font-bold tracking-tight">Adicionar Tarefa</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
