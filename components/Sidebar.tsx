
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Task } from '../types';

interface SidebarProps {
  tasks: Task[];
  onNewTask?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ tasks, onNewTask }) => {
  const logoUrl = "https://5338832.fs1.hubspotusercontent-na1.net/hubfs/5338832/LOGO%20AS%20COLORIDO.png";

  return (
    <aside className="w-64 bg-primary dark:bg-[#090d14] text-white flex flex-col h-full shrink-0 z-50 shadow-2xl transition-colors duration-300 border-r border-transparent dark:border-white/5">
      <div className="p-6 flex flex-col h-full">
        <div className="mb-10 p-4 bg-white/95 dark:bg-white rounded-2xl shadow-xl flex justify-center backdrop-blur-sm">
          <img 
            src={logoUrl} 
            alt="AmorSaúde" 
            className="h-10 w-auto object-contain"
          />
        </div>
        
        <nav className="flex flex-col gap-1 grow">
          <NavLink 
            to="/" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">home</span>
            <p className="text-sm font-bold">Início</p>
          </NavLink>

          <NavLink 
            to="/strategic" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">track_changes</span>
            <p className="text-sm font-bold">Planejamento Estratégico</p>
          </NavLink>

          <div className="h-px bg-white/10 my-2 mx-2"></div>

          <NavLink 
            to="/backlog" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">list_alt</span>
            <p className="text-sm font-bold">Backlog</p>
          </NavLink>
          <NavLink 
            to="/list" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">format_list_bulleted</span>
            <p className="text-sm font-bold">Lista de Tarefas</p>
          </NavLink>
          <NavLink 
            to="/board" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">view_kanban</span>
            <p className="text-sm font-bold">Quadro de Projetos</p>
          </NavLink>
          <NavLink 
            to="/team" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">group</span>
            <p className="text-sm font-bold">Equipe</p>
          </NavLink>
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/10 ${isActive ? 'bg-white/20 dark:bg-white/10 shadow-inner' : ''}`}
          >
            <span className="material-symbols-outlined text-white">settings</span>
            <p className="text-sm font-bold">Configurações</p>
          </NavLink>
        </nav>

        <button 
          onClick={onNewTask}
          className="flex items-center justify-center gap-2 mt-auto w-full h-12 rounded-xl bg-white dark:bg-primary text-primary dark:text-white font-black uppercase tracking-widest text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Nova Tarefa</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;