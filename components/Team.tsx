
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import CreateUserModal from './CreateUserModal';

interface TeamProps {
  users: User[];
  onAddUser: (user: Partial<User>) => void;
}

const Team: React.FC<TeamProps> = ({ users, onAddUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('Todos os Squads');
  const [isSquadDropdownOpen, setIsSquadDropdownOpen] = useState(false);
  
  const squadDropdownRef = useRef<HTMLDivElement>(null);
  const squads = ['Medicina', 'Odontologia', 'cVortex', 'Geral'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (squadDropdownRef.current && !squadDropdownRef.current.contains(event.target as Node)) {
        setIsSquadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSquad = selectedSquad === 'Todos os Squads' || u.squad === selectedSquad;
    return matchesSearch && matchesSquad;
  });

  return (
    <div className="max-w-[1200px] w-full mx-auto p-8 font-display text-left">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight leading-tight">Equipe CRM</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-normal">Gerencie os membros do time AmorSaúde, squads e permissões.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-3 h-12 px-8 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-[0.98] font-bold text-sm"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Adicionar Membro</span>
        </button>
      </header>

      <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nome, cargo ou squad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm shadow-sm"
          />
        </div>

        <div className="flex items-center gap-4">
           <span className="text-sm font-bold text-slate-500">Filtrar Squad:</span>
           <div className="relative" ref={squadDropdownRef}>
              <button 
                onClick={() => setIsSquadDropdownOpen(!isSquadDropdownOpen)}
                className="h-11 min-w-[200px] px-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:border-primary/50 transition-all"
              >
                <span>{selectedSquad}</span>
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isSquadDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              
              {isSquadDropdownOpen && (
                <div className="absolute top-full right-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[50] py-1 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => { setSelectedSquad('Todos os Squads'); setIsSquadDropdownOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors ${selectedSquad === 'Todos os Squads' ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Todos os Squads
                  </button>
                  {squads.map((s) => (
                    <button 
                      key={s}
                      onClick={() => { setSelectedSquad(s); setIsSquadDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors ${selectedSquad === s ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-6 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 h-1.5 w-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="size-16 rounded-2xl bg-cover bg-center border-4 border-slate-50 dark:border-slate-800 shadow-sm transition-transform group-hover:scale-[1.02]" style={{ backgroundImage: `url(${user.avatar})` }}></div>
                <div className="flex flex-col justify-center">
                   <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{user.name}</h3>
                   <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              <button className="material-symbols-outlined text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">more_vert</button>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-50 dark:border-slate-800">
               <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">Squad:</span>
                  <span className="text-primary font-black uppercase tracking-tighter bg-primary/10 px-3 py-1.5 rounded-lg">{user.squad}</span>
               </div>
               <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-widest">E-mail:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[180px]">{user.email}</span>
               </div>
            </div>

            <div className="flex items-center gap-3 mt-auto pt-2">
               <button className="flex-1 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">Ver Perfil</button>
               <button className="flex-1 h-10 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Mensagem</button>
            </div>
          </div>
        ))}
      </div>

      <CreateUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddUser={(data) => {
          onAddUser(data);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default Team;
