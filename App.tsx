
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Backlog from './components/Backlog';
import ProjectBoard from './components/ProjectBoard';
import TaskDetails from './components/TaskDetails';
import TaskList from './components/TaskList';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import CreateTaskModal from './components/CreateTaskModal';
import Profile from './components/Profile';
import Team from './components/Team';
import StrategicPlanning from './components/StrategicPlanning';
import NotificationPanel from './components/NotificationPanel';
import { Task, Sprint, User, TaskType, SprintStatus, TaskStatus, TaskPriority, Comment, ActivityLog, UserAccessLevel, OKR, KeyResult, Notification } from './types';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const logoUrl = "https://5338832.fs1.hubspotusercontent-na1.net/hubfs/5338832/LOGO%20AS%20COLORIDO.png";

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (data) setNotifications(data);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }
  }, [session?.user?.id]);

  // Enriquecimento de notificações (computado em render para garantir dados sempre frescos)
  const enrichedNotifications = useMemo(() => {
    return notifications.map(n => {
      let actor = users.find(u => u.id === n.actor_id);
      let taskInfo = null;
      
      if (n.entity_type === 'task') {
        taskInfo = tasks.find(t => t.id === n.entity_id);
      } else if (n.entity_type === 'comment') {
        const comment = tasks.flatMap(t => t.comments || []).find(c => c.id === n.entity_id);
        if (comment) {
          taskInfo = tasks.find(t => t.id === comment.task_id);
        }
      }

      return {
        ...n,
        task_code: taskInfo?.id,
        task_title: taskInfo?.title,
        actor_name: actor?.name || 'Alguém do CRM',
        actor_avatar: actor?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=crm`,
      };
    });
  }, [notifications, users, tasks]);

  // Inscrição Supabase Realtime para notificações
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`realtime_notifications_${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? (payload.new as Notification) : n));
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      // O estado será atualizado via Realtime (evento UPDATE)
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [profilesRes, sprintsRes, tasksRes, commentsRes, activityRes, okrsRes, krsRes, linksRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('sprints').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('comments').select('*').order('created_at', { ascending: false }),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }),
        supabase.from('okrs').select('*').order('year', { ascending: false }),
        supabase.from('key_results').select('*').order('created_at', { ascending: true }),
        supabase.from('key_result_tasks').select('kr_id, task_id')
      ]);

      const mappedUsers: User[] = (profilesRes.data || []).map(p => {
        let accessLevel = (p.access_level as UserAccessLevel) || UserAccessLevel.VIEWER;
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL as string;
        if (adminEmail && p.email === adminEmail) {
          accessLevel = UserAccessLevel.ADMIN;
        }

        return {
          id: p.id,
          name: p.name,
          role: p.role || 'Membro do Time',
          accessLevel: accessLevel,
          avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`,
          email: p.email,
          squad: p.squad || 'Geral',
          joinDate: p.join_date,
          status: p.status as 'Ativo' | 'Inativo'
        };
      });
      setUsers(mappedUsers);

      const mappedSprints: Sprint[] = (sprintsRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        startDate: s.start_date,
        endDate: s.end_date,
        goal: s.goal,
        status: s.status as SprintStatus
      }));
      setSprints(mappedSprints);

      if (okrsRes.data) setOkrs(okrsRes.data);
      if (krsRes.data) {
        setKeyResults(krsRes.data.map((kr: any) => ({
          ...kr,
          okrId: kr.okr_id,
          responsibleId: kr.responsible_id,
          goalDescription: kr.goal_description,
          startDate: kr.start_date,
          endDate: kr.end_date,
          taskIds: linksRes.data?.filter(l => l.kr_id === kr.id).map(l => l.task_id) || []
        })));
      }

      const mappedTasks: Task[] = (tasksRes.data || []).map(t => ({
        ...t,
        responsible: mappedUsers.find(u => u.id === t.responsible_id) || mappedUsers[0],
        reporter: mappedUsers.find(u => u.id === t.reporter_id) || mappedUsers[0],
        parentEpic: t.parent_epic_id,
        sprintId: t.sprint_id,
        dueDate: t.due_date,
        comments: (commentsRes.data || [])
          .filter((c: any) => c.task_id === t.id)
          .map((c: any) => ({ ...c, user: mappedUsers.find(u => u.id === c.user_id) })),
        activities: (activityRes.data || [])
          .filter((a: any) => a.task_id === t.id)
          .map((a: any) => ({ ...a, user: mappedUsers.find(u => u.id === a.user_id) }))
      }));
      setTasks(mappedTasks);
      
      fetchNotifications();

    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllData();
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllData();
      else {
        setTasks([]);
        setSprints([]);
        setUsers([]);
        setNotifications([]);
        setIsLoading(false);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fetchAllData]);

  const handleUpdateTask = async (taskId: string, updates: Partial<any>) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    try {
      const dbUpdates: any = {};
      const mapping: Record<string, string> = {
        status: 'status',
        priority: 'priority',
        title: 'title',
        description: 'description',
        responsibleId: 'responsible_id',
        reporterId: 'reporter_id',
        sprintId: 'sprint_id',
        parentEpic: 'parent_epic_id',
        dueDate: 'due_date'
      };

      const activityEntries: any[] = [];
      let newResponsibleId: string | null = null;

      Object.keys(updates).forEach(key => {
        if (mapping[key] !== undefined) {
          const newValue = updates[key] === '' ? null : updates[key];
          
          let oldValue: any;
          if (key === 'responsibleId') oldValue = originalTask.responsible.id;
          else if (key === 'reporterId') oldValue = originalTask.reporter.id;
          else if (key === 'sprintId') oldValue = originalTask.sprintId;
          else if (key === 'parentEpic') oldValue = originalTask.parentEpic;
          else oldValue = (originalTask as any)[key];

          if (String(newValue) !== String(oldValue)) {
            dbUpdates[mapping[key]] = newValue;
            
            if (key === 'responsibleId') {
              newResponsibleId = newValue as string;
            }

            let displayFieldName = key;
            let displayOld = String(oldValue || 'Nenhum');
            let displayNew = String(newValue || 'Nenhum');

            if (key === 'status') displayFieldName = 'Status';
            if (key === 'priority') displayFieldName = 'Prioridade';
            if (key === 'sprintId') {
              displayFieldName = 'Sprint';
              displayOld = sprints.find(s => s.id === oldValue)?.name || 'Backlog';
              displayNew = sprints.find(s => s.id === newValue)?.name || 'Backlog';
            }
            if (key === 'responsibleId') {
              displayFieldName = 'Responsável';
              displayOld = users.find(u => u.id === oldValue)?.name || 'Nenhum';
              displayNew = users.find(u => u.id === newValue)?.name || 'Nenhum';
            }
            if (key === 'description') {
              displayFieldName = 'Descrição';
              displayOld = 'Conteúdo anterior';
              displayNew = 'Novo conteúdo';
            }

            activityEntries.push({
              task_id: taskId,
              user_id: session.user.id,
              field_name: displayFieldName,
              old_value: displayOld,
              new_value: displayNew,
              action_type: key === 'description' ? 'atualizou a' : 'alterou o'
            });
          }
        }
      });

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', taskId);
        if (error) throw error;
        
        if (activityEntries.length > 0) {
          await supabase.from('activity_log').insert(activityEntries);
        }

        if (newResponsibleId && newResponsibleId !== session.user.id) {
          await supabase.from('notifications').insert([{
            user_id: newResponsibleId,
            actor_id: session.user.id,
            type: 'assignment',
            entity_type: 'task',
            entity_id: taskId,
            message: `Você foi atribuído como responsável pela tarefa ${taskId}: ${originalTask.title}`
          }]);
        }
        
        await fetchAllData(true);
      }
    } catch (err) {
      console.error('Erro ao atualizar tarefa:', err);
      fetchAllData(true);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const dbUpdates: any = {};
      if (updates.accessLevel) dbUpdates.access_level = updates.accessLevel;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.squad) dbUpdates.squad = updates.squad;
      if (updates.role) dbUpdates.role = updates.role;

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
      if (error) throw error;
      await fetchAllData(true);
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
    }
  };

  const handleAddComment = async (taskId: string, content: string) => {
    if (!content.trim()) return;
    try {
      const { data: commentData, error: commentError } = await supabase.from('comments').insert([{
        task_id: taskId,
        user_id: session.user.id,
        content: content.trim()
      }]).select();

      if (commentError) throw commentError;

      const mentions = content.match(/@([\wÀ-ú]+)/g) || [];
      if (mentions.length > 0) {
        const notificationEntries = mentions.map(m => {
          const cleanName = m.substring(1).toLowerCase();
          const mentionedUser = users.find(u => u.name.replace(/\s/g, '').toLowerCase() === cleanName);
          
          if (mentionedUser && mentionedUser.id !== session.user.id) {
            return {
              user_id: mentionedUser.id,
              actor_id: session.user.id,
              type: 'mention',
              entity_type: 'comment',
              entity_id: commentData[0].id,
              message: `${session.user.user_metadata?.full_name || 'Alguém'} mencionou você em um comentário na tarefa ${taskId}`
            };
          }
          return null;
        }).filter(n => n !== null);

        if (notificationEntries.length > 0) {
          await supabase.from('notifications').insert(notificationEntries);
        }

        const mentionedUserIds = notificationEntries.map(n => n?.user_id).filter(id => !!id);
        if (mentionedUserIds.length > 0) {
          const mentionPayloads = mentionedUserIds.map(uId => ({
            comment_id: commentData[0].id,
            mentioned_user_id: uId,
            task_id: taskId
          }));
          await supabase.from('comment_mentions').insert(mentionPayloads);
        }
      }
      
      await supabase.from('activity_log').insert([{
        task_id: taskId,
        user_id: session.user.id,
        field_name: 'Comentário',
        old_value: '-',
        new_value: 'Novo comentário',
        action_type: 'adicionou um'
      }]);

      await fetchAllData(true);
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    }
  };

  const handleCreateTask = async (newTaskData: Partial<any>, files: File[]) => {
    const taskId = `CRM-${Date.now().toString(36).toUpperCase()}`;
    const dbPayload = {
      id: taskId,
      title: newTaskData.title,
      type: newTaskData.type || TaskType.TASK,
      status: newTaskData.status || TaskStatus.BACKLOG,
      priority: newTaskData.priority || TaskPriority.MEDIUM,
      responsible_id: newTaskData.responsibleId,
      reporter_id: newTaskData.reporterId,
      parent_epic_id: newTaskData.parent_epic_id || null,
      squad: newTaskData.squad || 'Geral',
      due_date: newTaskData.dueDate,
      description: newTaskData.description,
      project: newTaskData.project || 'CRM AmorSaúde',
      sprint_id: newTaskData.sprint_id || null
    };

    try {
      const { error } = await supabase.from('tasks').insert([dbPayload]);
      if (error) throw error;
      
      if (newTaskData.responsibleId && newTaskData.responsibleId !== session.user.id) {
        await supabase.from('notifications').insert([{
          user_id: newTaskData.responsibleId,
          actor_id: session.user.id,
          type: 'assignment',
          entity_type: 'task',
          entity_id: taskId,
          message: `Nova tarefa atribuída a você: ${taskId} - ${newTaskData.title}`
        }]);
      }

      if (newTaskData.krId) {
        await supabase.from('key_result_tasks').insert([{
          kr_id: newTaskData.krId,
          task_id: taskId
        }]);
      }

      if (files && files.length > 0) {
        for (const file of files) {
          const filePath = `tasks/${taskId}/${file.name}`;
          await supabase.storage.from('Arquivos sistema').upload(filePath, file);
        }
      }

      await supabase.from('activity_log').insert([{
        task_id: taskId,
        user_id: session.user.id,
        field_name: 'Tarefa',
        old_value: '-',
        new_value: taskId,
        action_type: 'criou a tarefa'
      }]);

      await fetchAllData(true);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(`Erro ao salvar tarefa: ${err.message}`);
    }
  };

  const handleCreateSprint = async (sprintData: Partial<Sprint>) => {
    try {
      const { error } = await supabase.from('sprints').insert([{
        name: sprintData.name,
        start_date: sprintData.startDate,
        end_date: sprintData.endDate,
        goal: sprintData.goal,
        status: sprintData.status || SprintStatus.PLANNED
      }]);
      if (error) throw error;
      await fetchAllData(true);
    } catch (err: any) {
      alert(`Erro ao criar sprint: ${err.message}`);
    }
  };

  const handleUpdateSprint = async (sprintId: string, updates: Partial<Sprint>) => {
    try {
      const { error } = await supabase.from('sprints').update({
        name: updates.name,
        start_date: updates.startDate,
        end_date: updates.endDate,
        goal: updates.goal,
        status: updates.status
      }).eq('id', sprintId);
      if (error) throw error;
      await fetchAllData(true);
    } catch (err: any) {
      alert(`Erro ao atualizar sprint: ${err.message}`);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await supabase
        .from('sprints')
        .update({ status: SprintStatus.ACTIVE })
        .eq('id', sprintId);
      fetchAllData(true);
    } catch (err: any) {
      alert(`Erro ao iniciar sprint: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background-light dark:bg-background-dark text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold animate-pulse">Sincronizando CRM...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login onLogin={(user) => setSession({ user })} />;

  const currentUser = users.find(u => u.id === session.user.id);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <HashRouter>
      <div className={`flex h-screen overflow-hidden bg-background-light dark:bg-background-dark ${isDarkMode ? 'dark' : ''}`}>
        <Sidebar tasks={tasks} onNewTask={() => setIsCreateModalOpen(true)} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#090d14] shrink-0 transition-colors duration-300">
             <div className="flex items-center gap-4">
              <img src={logoUrl} alt="AmorSaúde" className="h-8 w-auto object-contain" />
              <div className="w-px h-6 bg-slate-200 dark:bg-white/10 hidden sm:block"></div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white hidden sm:block">Sistema de Gestão CRM</h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase rounded-full ml-2">
                <span className="material-symbols-outlined text-xs">cloud_done</span> Online
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
                  className={`p-2 rounded-lg transition-all ${isNotificationPanelOpen ? 'bg-slate-100 dark:bg-white/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 size-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-[#090d14]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationPanelOpen && (
                  <NotificationPanel 
                    notifications={enrichedNotifications} 
                    onMarkAsRead={markNotificationAsRead}
                    onClose={() => setIsNotificationPanelOpen(false)}
                  />
                )}
              </div>

              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-all">
                <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
              </button>
              
              <div className="relative" ref={profileDropdownRef}>
                <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <div className="size-10 rounded-full bg-cover border-2 border-primary/20 bg-center" style={{ backgroundImage: `url(${currentUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`})` }}></div>
                  <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1a2330] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.name || session.user.email}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{session.user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg">person</span> Meu Perfil
                      </Link>
                      <button onClick={() => { supabase.auth.signOut(); setIsProfileDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg">logout</span> Sair da Conta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Routes>
              <Route path="/" element={<Dashboard tasks={tasks} sprints={sprints} users={users} currentUser={currentUser} onNewTask={() => setIsCreateModalOpen(true)} onUpdateTask={handleUpdateTask} />} />
              <Route path="/strategic" element={<StrategicPlanning users={users} tasks={tasks} okrs={okrs} keyResults={keyResults} onRefresh={() => fetchAllData(true)} />} />
              <Route path="/backlog" element={<Backlog tasks={tasks} sprints={sprints} users={users} onUpdateTask={handleUpdateTask} onCreateSprint={handleCreateSprint} onUpdateSprint={handleUpdateSprint} onStartSprint={handleStartSprint} onNewTask={() => setIsCreateModalOpen(true)} />} />
              <Route path="/list" element={<TaskList tasks={tasks} sprints={sprints} users={users} onUpdateTask={handleUpdateTask} />} />
              <Route path="/board" element={<ProjectBoard tasks={tasks} sprints={sprints} users={users} onUpdateTask={handleUpdateTask} />} />
              <Route path="/task/:id" element={<TaskDetails tasks={tasks} sprints={sprints} users={users} onUpdateTask={handleUpdateTask} onAddComment={handleAddComment} />} />
              <Route path="/profile" element={<Profile currentUser={currentUser} onUpdate={() => fetchAllData(true)} />} />
              <Route path="/team" element={<Team users={users} onAddUser={() => {}} />} />
              <Route path="/settings" element={<Settings users={users} onUpdateUser={handleUpdateUser} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <CreateTaskModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateTask} sprints={sprints} epics={tasks.filter(t => t.type === TaskType.EPIC)} users={users} currentUser={session.user} okrs={okrs} keyResults={keyResults} />
    </HashRouter>
  );
};

export default App;
