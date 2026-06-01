
import React, { useState } from 'react';
import { User } from '../types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (user: Partial<User>) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onAddUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    squad: 'Estratégia CRM',
    email: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddUser({
      name: formData.name,
      role: formData.role,
      squad: formData.squad,
      email: formData.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'Ativo'
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[500px] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Novo Membro</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
           <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Carlos Oliveira"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Cargo / Função</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Analista de CRM Senior"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">E-mail Corporativo</label>
            <input 
              required
              type="email" 
              placeholder="nome@amorsaude.com.br"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Squad</label>
            <select 
              value={formData.squad}
              onChange={e => setFormData({...formData, squad: e.target.value})}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            >
              <option>Estratégia CRM</option>
              <option>Crescimento</option>
              <option>App Mobile</option>
              <option>Núcleo de Banco de Dados</option>
              <option>Suporte e Manutenção</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button 
               type="button" 
               onClick={onClose}
               className="h-11 px-6 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
             >
               Cancelar
             </button>
             <button 
               type="submit"
               className="h-11 px-8 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
             >
               Confirmar Registro
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
