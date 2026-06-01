
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../supabase';

interface ProfileProps {
  currentUser?: User;
  onUpdate: () => Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, onUpdate }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSquadDropdownOpen, setIsSquadDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    squad: '',
    avatar_url: ''
  });
  const [successMessage, setSuccessMessage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const squadDropdownRef = useRef<HTMLDivElement>(null);

  const squads = ['Medicina', 'Odontologia', 'cVortex', 'Geral'];

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        role: currentUser.role || '',
        squad: currentUser.squad || '',
        avatar_url: currentUser.avatar || ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (squadDropdownRef.current && !squadDropdownRef.current.contains(event.target as Node)) {
        setIsSquadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          role: formData.role,
          squad: formData.squad,
          avatar_url: formData.avatar_url
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      
      await onUpdate();
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (err: any) {
      alert(`Erro ao salvar perfil: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Arquivos sistema')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Arquivos sistema')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);
        
      await onUpdate();
    } catch (err: any) {
      alert(`Erro no upload: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!currentUser) return <div className="p-8 text-center">Carregando perfil...</div>;

  return (
    <div className="max-w-[800px] mx-auto p-8 font-display animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Meu Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400">Gerencie suas informações e aparência no sistema CRM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Coluna da Esquerda: Avatar */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div 
              className="size-48 rounded-3xl bg-cover bg-center border-4 border-white dark:border-slate-800 shadow-2xl transition-transform group-hover:scale-[1.02]"
              style={{ backgroundImage: `url(${formData.avatar_url})` }}
            >
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
              </div>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 rounded-3xl flex items-center justify-center">
                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser.name}</h2>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">{currentUser.role}</p>
          </div>
          <div className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
             <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Squad</span>
                <span className="text-primary font-black uppercase">{currentUser.squad}</span>
             </div>
          </div>
        </div>

        {/* Coluna da Direita: Formulário */}
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {successMessage && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl animate-in fade-in slide-in-from-top-2">
                Perfil atualizado com sucesso!
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail Corporativo</label>
              <input 
                disabled 
                type="email" 
                value={currentUser.email}
                className="w-full h-11 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-sm cursor-not-allowed"
              />
              <p className="text-[9px] text-slate-400 mt-1">O e-mail não pode ser alterado por motivos de segurança.</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nome Completo</label>
              <input 
                required
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cargo / Função</label>
                <input 
                  required
                  type="text" 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1" ref={squadDropdownRef}>
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Squad Principal</label>
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsSquadDropdownOpen(!isSquadDropdownOpen)}
                    className="w-full h-11 px-4 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:border-primary/50 transition-all"
                  >
                    <span className="text-slate-700 dark:text-slate-200">{formData.squad || 'Selecionar'}</span>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${isSquadDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  
                  {isSquadDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[50] py-1 animate-in fade-in slide-in-from-top-2">
                      {squads.map((s) => (
                        <button 
                          key={s}
                          type="button"
                          onClick={() => { setFormData({...formData, squad: s}); setIsSquadDropdownOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors ${formData.squad === s ? 'text-primary bg-primary/5' : 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit" 
                disabled={isSaving}
                className="h-12 px-12 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
