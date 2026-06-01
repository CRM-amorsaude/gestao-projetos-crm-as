
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../types';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onMarkAsRead, onClose }) => {
  const navigate = useNavigate();

  const groupedNotifications = useMemo(() => {
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    notifications.forEach(n => {
      const nDate = new Date(n.created_at);
      if (nDate >= todayStart) today.push(n);
      else if (nDate >= yesterdayStart) yesterday.push(n);
      else older.push(n);
    });

    return { today, yesterday, older };
  }, [notifications]);

  const handleNotificationClick = (n: Notification) => {
    onMarkAsRead(n.id);
    if (n.task_code) {
      navigate(`/task/${n.task_code}`);
    }
    onClose();
  };

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <h3 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 sticky top-0 z-10">
          {title}
        </h3>
        {items.map(n => (
          <div 
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            className={`px-4 py-4 flex gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors relative border-b border-slate-100 dark:border-white/5 group ${!n.is_read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
          >
            {!n.is_read && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 size-2 bg-primary rounded-full ring-2 ring-white dark:ring-slate-900"></div>
            )}
            
            <div 
              className="size-10 rounded-full bg-cover bg-center shrink-0 border border-slate-200 dark:border-white/10"
              style={{ backgroundImage: `url(${n.actor_avatar})` }}
            ></div>
            
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug">
                <span className="font-bold">{n.actor_name}</span> {n.type === 'mention' ? 'mencionou você' : 'atribuiu você'}
              </p>
              
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-[10px] font-mono font-black text-primary uppercase shrink-0">{n.task_code}</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">{n.task_title}</span>
              </div>

              {n.comment_snippet && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-100 dark:bg-white/5 p-2 rounded-lg mt-1 line-clamp-2">
                  "{n.comment_snippet}"
                </p>
              )}

              <div className="flex items-center gap-3 mt-1.5">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                  className="text-[10px] font-black uppercase tracking-tighter text-primary hover:underline"
                >
                  Exibir Task
                </button>
                <button 
                  className="text-[10px] font-black uppercase tracking-tighter text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Marcar lida
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="absolute right-0 mt-2 w-[380px] bg-white dark:bg-[#1a2330] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-slate-200 dark:border-white/10 overflow-hidden z-[300] flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-4">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#1a2330] shrink-0">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Notificações</h2>
        <div className="flex items-center gap-2">
           <button className="text-[10px] font-black uppercase tracking-tighter text-primary hover:underline">Limpar tudo</button>
           <button onClick={onClose} className="material-symbols-outlined text-slate-400 text-lg hover:text-slate-600">close</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a2330]">
        {notifications.length === 0 ? (
          <div className="px-10 py-16 text-center flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-5xl">notifications_off</span>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Você está em dia!<br/>Nenhuma notificação nova.</p>
          </div>
        ) : (
          <>
            {renderSection('Hoje', groupedNotifications.today)}
            {renderSection('Ontem', groupedNotifications.yesterday)}
            {renderSection('Mais Antigas', groupedNotifications.older)}
          </>
        )}
      </div>

      <div className="px-4 py-3 bg-slate-50 dark:bg-white/2 border-t border-slate-100 dark:border-white/5 text-center shrink-0">
        <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
          Ver todas no histórico
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
