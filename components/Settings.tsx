
import React, { useState, useMemo } from 'react';
import { TaskType, User, UserAccessLevel } from '../types';

type SettingsTab = 'workflow' | 'users' | 'taskTypes';

interface SettingsProps {
  users: User[];
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ users, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const workflows = [
    { name: 'Novo Lead', badge: 'NOVO', category: 'Gestão de Leads', color: 'bg-blue-100 text-blue-800' },
    { name: 'Exame Agendado', badge: 'AGENDADO', category: 'Execução', color: 'bg-purple-100 text-purple-800' },
    { name: 'Revisão Pendente', badge: 'REVISÃO', category: 'Auditoria Clínica', color: 'bg-yellow-100 text-yellow-800' },
    { name: 'Concluído', badge: 'SUCESSO', category: 'Arquivamento', color: 'bg-green-100 text-green-800' },
  ];

  const automations = [
    { id: 1, name: 'Formulário de Demanda Externa', target: 'Backlog Geral', type: 'Formulário Público', active: true },
    { id: 2, name: 'Integração de Leads Landing Page', target: 'Gestão de Leads', type: 'Webhook', active: true },
  ];

  const taskTypesList = [
    { type: TaskType.TASK, icon: 'check_circle', color: 'text-primary' },
    { type: TaskType.EPIC, icon: 'auto_awesome_motion', color: 'text-purple-600' },
    { type: TaskType.STORY, icon: 'bookmark', color: 'text-emerald-600' },
    { type: TaskType.BUG, icon: 'bug_report', color: 'text-rose-600' },
    { type: TaskType.ANALYSIS, icon: 'analytics', color: 'text-amber-600' },
  ];

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  return (
    <div className="max-w-[1200px] mx-auto pt-8 px-8 font-display text-left">
      <div className="flex flex-wrap justify-between items-end gap-4 pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-tight">Configurações do Sistema</h1>
          <p className="text-slate-500 dark:text-slate-400 text-base font-normal">Configure status de fluxo, permissões de usuários e tipos de demanda CRM.</p>
        </div>
        <button className="flex items-center justify-center rounded-xl h-12 px-8 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all active:scale-[0.98]">
          <span>Salvar Alterações</span>
        </button>
      </div>

      <div className="mb-8">
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-8">
          <button 
            onClick={() => setActiveTab('workflow')}
            className={`border-b-[3px] pb-3 text-sm font-bold transition-all ${activeTab === 'workflow' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            Fluxo de Trabalho
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`border-b-[3px] pb-3 text-sm font-bold transition-all ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            Usuários
          </button>
          <button 
            onClick={() => setActiveTab('taskTypes')}
            className={`border-b-[3px] pb-3 text-sm font-bold transition-all ${activeTab === 'taskTypes' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
          >
            Tipos de Tarefa
          </button>
        </div>
      </div>

      {activeTab === 'workflow' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold">Status do Fluxo</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-lg hover:bg-slate-200 transition-all">
                <span className="material-symbols-outlined text-sm">add</span>
                Adicionar Status
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Selo Visual</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {workflows.map((wf, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-200 text-sm font-bold">{wf.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter uppercase ${wf.color}`}>{wf.badge}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">{wf.category}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold">
                        <div className="flex justify-end items-center gap-3">
                          <button className="text-primary hover:underline">Editar</button>
                          <span className="text-slate-200">|</span>
                          <button className="text-rose-500 hover:underline">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold">Automações de Entrada</h2>
              <button className="flex items-center gap-2 px-5 h-10 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-sm">robot_2</span>
                Criar Automação / Formulário
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {automations.map((auto) => (
                <div key={auto.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">{auto.type === 'Webhook' ? 'api' : 'assignment'}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{auto.name}</h3>
                        <p className="text-xs text-slate-500">{auto.type}</p>
                      </div>
                    </div>
                    <div className="flex h-6 w-11 bg-emerald-500 rounded-full p-1 cursor-pointer">
                      <div className="size-4 bg-white rounded-full ml-auto shadow-sm"></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Destino</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{auto.target}</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-primary text-xs font-bold hover:underline">
                      <span className="material-symbols-outlined text-sm">link</span>
                      Copiar Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold">Gestão de Acessos</h2>
              <div className="flex items-center gap-3">
                 <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input 
                      type="text" 
                      placeholder="Buscar usuário..." 
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="h-9 pl-9 pr-4 rounded-lg bg-slate-50 dark:bg-slate-800 border-none text-xs focus:ring-primary w-64" 
                    />
                 </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membro</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permissão</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">Nenhum membro encontrado.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-sm" style={{ backgroundImage: `url(${user.avatar})` }}></div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</span>
                              <span className="text-[10px] text-slate-400">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={user.accessLevel}
                            onChange={(e) => onUpdateUser(user.id, { accessLevel: e.target.value as UserAccessLevel })}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md py-1 px-2"
                          >
                            {Object.values(UserAccessLevel).map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${user.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              <span className={`size-1.5 rounded-full ${user.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              {user.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button title="Recuperar Senha" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <span className="material-symbols-outlined text-lg">lock_reset</span>
                            </button>
                            <button 
                              onClick={() => onUpdateUser(user.id, { status: user.status === 'Ativo' ? 'Inativo' : 'Ativo' })}
                              title={user.status === 'Ativo' ? 'Desativar' : 'Ativar'} 
                              className={`p-2 rounded-lg transition-colors ${user.status === 'Ativo' ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                            >
                              <span className="material-symbols-outlined text-lg">{user.status === 'Ativo' ? 'person_off' : 'person_check'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'taskTypes' && (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taskTypesList.map((item, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:-translate-y-1 transition-all group">
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">{item.type}</h3>
                    </div>
                    <button className="material-symbols-outlined text-slate-300 hover:text-slate-600 transition-colors">settings</button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">Define as regras de negócio, campos obrigatórios e fluxo padrão para demandas do tipo {item.type}.</p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">Modelo Padrão Ativo</span>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">3 Automações</span>
                  </div>
                </div>
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuração Avançada</span>
                  <button className="text-primary text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                    Acessar Editor <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
            
            <button className="h-[200px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all text-slate-400 hover:text-primary">
               <span className="material-symbols-outlined text-4xl">add_box</span>
               <span className="text-sm font-bold uppercase tracking-widest">Novo Tipo de Tarefa</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
