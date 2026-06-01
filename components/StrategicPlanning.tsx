
// @google/genai guidelines followed. No API key exposure, correct model selection.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { OKR, KeyResult, OKRStatus, KRPriority, User, Task, TaskStatus } from '../types';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

interface StrategicPlanningProps {
  users: User[];
  tasks: Task[];
  okrs: OKR[];
  keyResults: KeyResult[];
  onRefresh?: () => Promise<void>;
}

const StrategicPlanning: React.FC<StrategicPlanningProps> = ({ users, tasks, okrs, keyResults, onRefresh }) => {
  // Modos de Visualização: 'list' ou 'reports'
  const [viewMode, setViewMode] = useState<'list' | 'reports'>('list');
  
  // Filtros
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('crm_okr_selected_year');
    return saved ? parseInt(saved) : new Date().getFullYear();
  });
  const [selectedSquadReport, setSelectedSquadReport] = useState<string>('Todos');

  // Estados de expansão
  const [expandedOkr, setExpandedOkr] = useState<string | null>(null);
  const [expandedKr, setExpandedKr] = useState<string | null>(null);

  // Estados de Drag and Drop
  const [draggedKrId, setDraggedKrId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Estados de UI Dropdowns
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isSquadReportDropdownOpen, setIsSquadReportDropdownOpen] = useState(false);

  // Estados de Modal e Edição
  const [isOkrModalOpen, setIsOkrModalOpen] = useState(() => localStorage.getItem('crm_okr_modal_open') === 'true');
  const [editingOkr, setEditingOkr] = useState<OKR | null>(() => {
    const saved = localStorage.getItem('crm_okr_editing_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [okrForm, setOkrForm] = useState(() => {
    const saved = localStorage.getItem('crm_okr_form_draft');
    return saved ? JSON.parse(saved) : { title: '', objective: '', year: selectedYear, justification: '', status: OKRStatus.NOT_STARTED };
  });

  const [isKrModalOpen, setIsKrModalOpen] = useState(() => localStorage.getItem('crm_kr_modal_open') === 'true');
  const [editingKr, setEditingKr] = useState<KeyResult | null>(() => {
    const saved = localStorage.getItem('crm_kr_editing_data');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeOkrId, setActiveOkrId] = useState<string | null>(() => localStorage.getItem('crm_kr_active_okr_id'));
  const [krForm, setKrForm] = useState(() => {
    const saved = localStorage.getItem('crm_kr_form_draft');
    return saved ? JSON.parse(saved) : { 
      title: '', responsibleId: '', priority: KRPriority.P2, squads: [] as string[], goalDescription: '', 
      startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 7776000000).toISOString().split('T')[0],
      status: OKRStatus.NOT_STARTED, associatedTaskIds: [] as string[]
    };
  });

  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Refs para fechamento automático
  const respDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const squadReportDropdownRef = useRef<HTMLDivElement>(null);
  
  const availableSquads = ['Medicina', 'Odontologia', 'cVortex', 'Geral'];

  // Função para navegar do relatório para a gestão
  const handleNavigateToKr = (krId: string, okrId: string) => {
    setViewMode('list');
    setExpandedOkr(okrId);
    setExpandedKr(krId);
    // Timeout para dar tempo de renderizar e rolar até o elemento
    setTimeout(() => {
      const element = document.getElementById(`kr-card-${krId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Calcular anos disponíveis dinamicamente
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(okrs.map(o => o.year))).sort((a, b) => b - a);
    // Se não houver anos cadastrados, garantir que o ano atual apareça
    if (years.length === 0) return [new Date().getFullYear()];
    return years;
  }, [okrs]);

  // Efeito para persistir estados
  useEffect(() => {
    localStorage.setItem('crm_okr_modal_open', String(isOkrModalOpen));
    localStorage.setItem('crm_okr_form_draft', JSON.stringify(okrForm));
    localStorage.setItem('crm_okr_editing_data', JSON.stringify(editingOkr));
    localStorage.setItem('crm_okr_selected_year', String(selectedYear));
  }, [isOkrModalOpen, okrForm, editingOkr, selectedYear]);

  useEffect(() => {
    localStorage.setItem('crm_kr_modal_open', String(isKrModalOpen));
    localStorage.setItem('crm_kr_form_draft', JSON.stringify(krForm));
    localStorage.setItem('crm_kr_editing_data', JSON.stringify(editingKr));
    localStorage.setItem('crm_kr_active_okr_id', activeOkrId || '');
  }, [isKrModalOpen, krForm, editingKr, activeOkrId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (respDropdownRef.current && !respDropdownRef.current.contains(target) && 
          priorityDropdownRef.current && !priorityDropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(target)) {
        setIsYearDropdownOpen(false);
      }
      if (squadReportDropdownRef.current && !squadReportDropdownRef.current.contains(target)) {
        setIsSquadReportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // HANDLERS DRAG AND DROP - KRs
  const handleKrDragStart = (e: React.DragEvent, krId: string) => {
    setDraggedKrId(krId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleKrDrop = async (e: React.DragEvent, targetKrId: string, okrId: string) => {
    e.preventDefault();
    if (!draggedKrId || draggedKrId === targetKrId) return;
    setDraggedKrId(null);
    setDropTargetId(null);
    if (onRefresh) await onRefresh();
  };

  // HANDLERS DRAG AND DROP - TAREFAS
  // Fix: Added handleTaskDragStart to resolve "Cannot find name 'handleTaskDragStart'" error.
  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDrop = async (e: React.DragEvent, targetTaskId: string, krId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const kr = keyResults.find(k => k.id === krId);
    if (!kr) return;

    // Fix: Explicitly cast kr.taskIds to string[] to resolve type unknown errors during operations
    const newTasksOrder = [...((kr.taskIds as string[]) || [])];
    const draggedIndex = newTasksOrder.indexOf(draggedTaskId as string);
    const targetIndex = newTasksOrder.indexOf(targetTaskId);

    // Fix: Explicitly cast to number to avoid 'left-hand side of an arithmetic operation' error in some TS versions
    if ((draggedIndex as number) >= 0 && (targetIndex as number) >= 0) {
      newTasksOrder.splice(draggedIndex, 1);
      newTasksOrder.splice(targetIndex, 0, draggedTaskId as string);

      try {
        await supabase.from('key_result_tasks').delete().eq('kr_id', krId);
        await supabase.from('key_result_tasks').insert(
          newTasksOrder.map(tid => ({ kr_id: krId, task_id: tid }))
        );
        if (onRefresh) await onRefresh();
      } catch (err) {
        console.error("Erro ao reordenar tarefas:", err);
      }
    }

    setDraggedTaskId(null);
    setDropTargetId(null);
  };

  const getCalculatedKrProgress = (kr: KeyResult) => {
    const krTasks = tasks.filter(t => kr.taskIds?.includes(t.id));
    if (krTasks.length === 0) return 0;
    
    // Fix arithmetic type errors by explicitly typing the reduce accumulator.
    const score = krTasks.reduce((acc: number, t) => {
      if (t.status === TaskStatus.DONE) return acc + 1;
      if (t.status === TaskStatus.REVIEW) return acc + 0.8;
      if (t.status === TaskStatus.DEVELOPMENT) return acc + 0.3;
      return acc;
    }, 0);
    return Math.round((score / krTasks.length) * 100);
  };

  const getCalculatedOkrProgress = (okrId: string) => {
    const associatedKrs = keyResults.filter(kr => kr.okrId === okrId);
    if (associatedKrs.length === 0) return 0;
    // Fix arithmetic type errors by explicitly typing the reduce accumulator.
    const totalProgress = associatedKrs.reduce((acc: number, kr) => acc + getCalculatedKrProgress(kr), 0);
    return Math.round(totalProgress / associatedKrs.length);
  };

  const filteredOkrs = useMemo(() => {
    return okrs.filter(o => o.year === selectedYear);
  }, [okrs, selectedYear]);

  const reportData = useMemo(() => {
    const filteredKrs = keyResults.filter(kr => {
      const okr = okrs.find(o => o.id === kr.okrId);
      if (!okr || okr.year !== selectedYear) return false;
      if (selectedSquadReport !== 'Todos' && !kr.squads.includes(selectedSquadReport)) return false;
      return true;
    });

    return filteredKrs.map(kr => {
      const krTasks = tasks.filter(t => kr.taskIds?.includes(t.id));
      return {
        ...kr,
        progress: getCalculatedKrProgress(kr),
        statusCounts: {
          done: krTasks.filter(t => t.status === TaskStatus.DONE).length,
          inProgress: krTasks.filter(t => t.status === TaskStatus.DEVELOPMENT || t.status === TaskStatus.REVIEW).length,
          impediment: krTasks.filter(t => t.status === TaskStatus.IMPEDIMENT).length,
          backlog: krTasks.filter(t => t.status === TaskStatus.BACKLOG).length,
          total: krTasks.length
        }
      };
    });
  }, [keyResults, okrs, selectedYear, selectedSquadReport, tasks]);

  const globalReportMetrics = useMemo(() => {
    if (reportData.length === 0) return { avgProgress: 0, totalTasks: 0, totalImpediments: 0 };
    // Fix arithmetic type errors by explicitly typing the reduce accumulators.
    const totalProgress = reportData.reduce((acc: number, kr) => acc + kr.progress, 0);
    const totalTasks = reportData.reduce((acc: number, kr) => acc + kr.statusCounts.total, 0);
    const totalImpediments = reportData.reduce((acc: number, kr) => acc + kr.statusCounts.impediment, 0);

    return {
      avgProgress: Math.round(totalProgress / reportData.length),
      totalTasks,
      totalImpediments
    };
  }, [reportData]);

  const handleExportCSV = () => {
    const headers = ['OKR', 'Resultado-Chave', 'Responsável', 'Squads', 'Progresso (%)', 'Tarefas Totais', 'Concluídas', 'Impedimentos'];
    const rows = reportData.map(kr => {
      const okr = okrs.find(o => o.id === kr.okrId);
      const resp = users.find(u => u.id === kr.responsibleId)?.name || 'N/A';
      return [
        okr?.title || 'N/A',
        kr.title,
        resp,
        kr.squads.join(', '),
        kr.progress,
        kr.statusCounts.total,
        kr.statusCounts.done,
        kr.statusCounts.impediment
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_estrategico_crm_${selectedYear}.csv`);
    link.click();
  };

  const getStatusStyle = (status: OKRStatus) => {
    switch (status) {
      case OKRStatus.COMPLETED: return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case OKRStatus.IN_PROGRESS: return 'bg-primary/10 text-primary border-primary/20';
      case OKRStatus.AT_RISK: return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const clearOkrModalState = () => {
    setIsOkrModalOpen(false);
    setEditingOkr(null);
    setOkrForm({ title: '', objective: '', year: selectedYear, justification: '', status: OKRStatus.NOT_STARTED });
    localStorage.removeItem('crm_okr_modal_open');
    localStorage.removeItem('crm_okr_form_draft');
    localStorage.removeItem('crm_okr_editing_data');
  };

  const clearKrModalState = () => {
    setIsKrModalOpen(false);
    setEditingKr(null);
    setActiveOkrId(null);
    setKrForm({ 
      title: '', responsibleId: '', priority: KRPriority.P2, squads: [], goalDescription: '', 
      startDate: new Date().toISOString().split('T')[0], endDate: new Date(Date.now() + 7776000000).toISOString().split('T')[0],
      status: OKRStatus.NOT_STARTED, associatedTaskIds: [] 
    });
    localStorage.removeItem('crm_kr_modal_open');
    localStorage.removeItem('crm_kr_form_draft');
    localStorage.removeItem('crm_kr_editing_data');
    localStorage.removeItem('crm_kr_active_okr_id');
  };

  const handleSaveOkr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOkr) {
        await supabase.from('okrs').update(okrForm).eq('id', editingOkr.id);
      } else {
        await supabase.from('okrs').insert([{ ...okrForm, quarter: 'T1', progress: 0 }]);
      }
      clearOkrModalState();
      if (onRefresh) await onRefresh();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveKr = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOkrId = activeOkrId || editingKr?.okrId;
    if (!finalOkrId) return;
    try {
      let krId = editingKr?.id;
      const krPayload = {
        okr_id: finalOkrId,
        title: krForm.title,
        responsible_id: krForm.responsibleId,
        priority: krForm.priority,
        squads: krForm.squads,
        goal_description: krForm.goal_description,
        start_date: krForm.start_date,
        end_date: krForm.end_date,
        status: krForm.status
      };
      if (editingKr) {
        await supabase.from('key_results').update(krPayload).eq('id', krId);
      } else {
        const { data } = await supabase.from('key_results').insert([krPayload]).select();
        krId = data?.[0]?.id;
      }
      if (krId) {
        await supabase.from('key_result_tasks').delete().eq('kr_id', krId);
        if (krForm.associatedTaskIds.length > 0) {
          await supabase.from('key_result_tasks').insert(krForm.associatedTaskIds.map(t => ({ kr_id: krId, task_id: t })));
        }
      }
      clearKrModalState();
      if (onRefresh) await onRefresh();
    } catch (err: any) { alert(err.message); }
  };

  const getKrPriorityStyle = (priority: KRPriority) => {
    switch (priority) {
      case KRPriority.P0: return { icon: 'warning', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' };
      case KRPriority.P1: return { icon: 'arrow_upward', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' };
      case KRPriority.P2: return { icon: 'equalizer', color: 'text-primary', bg: 'bg-primary/5' };
      case KRPriority.P3: return { icon: 'arrow_downward', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' };
      default: return { icon: 'equalizer', color: 'text-slate-400', bg: 'bg-slate-50' };
    }
  };

  const selectedKrResp = users.find(u => u.id === krForm.responsibleId);
  const selectedPriorityStyle = getKrPriorityStyle(krForm.priority);

  return (
    <div className="max-w-[1400px] w-full mx-auto p-8 font-display text-left">
      <header className="flex flex-wrap justify-between items-end gap-6 mb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tight leading-tight">Planejamento Estratégico</h1>
            {(isOkrModalOpen || isKrModalOpen) && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase rounded-full animate-pulse border border-amber-200 dark:border-amber-800 shadow-sm">
                <span className="material-symbols-outlined text-xs">edit_note</span>
                Edição em Andamento
              </div>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Gerenciamento Anual de Metas e OKRs</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
             <button 
              onClick={() => setViewMode('list')}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-slate-500'}`}
             >
               Gestão
             </button>
             <button 
              onClick={() => setViewMode('reports')}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'reports' ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' : 'text-slate-500'}`}
             >
               Relatórios
             </button>
          </div>
          
          <div className="flex flex-col gap-1.5" ref={yearDropdownRef}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ciclo Anual</span>
            <div className="relative">
              <button 
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="h-11 min-w-[120px] px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161f2a] text-slate-900 dark:text-white text-xs font-black flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all"
              >
                <span>{selectedYear}</span>
                <span className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              
              {isYearDropdownOpen && (
                <div className="absolute top-full mt-1 left-0 w-full bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[150] py-1 animate-in fade-in slide-in-from-top-2">
                  {availableYears.map(y => (
                    <button 
                      key={y} 
                      onClick={() => { setSelectedYear(y); setIsYearDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-black transition-colors ${selectedYear === y ? 'text-primary bg-primary/5' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="min-w-[160px] flex justify-end">
            {viewMode === 'list' ? (
              <button onClick={() => { clearOkrModalState(); setIsOkrModalOpen(true); }} className="h-11 px-6 bg-primary text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Novo OKR
              </button>
            ) : (
              <button onClick={handleExportCSV} className="h-11 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">download</span>
                Exportar CSV
              </button>
            )}
          </div>
        </div>
      </header>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500">
          {filteredOkrs.length === 0 ? (
            <div className="bg-white dark:bg-[#161f2a] rounded-[40px] border border-slate-100 dark:border-white/5 p-20 text-center flex flex-col items-center gap-4">
               <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-6xl">track_changes</span>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum objetivo registrado para {selectedYear}</p>
            </div>
          ) : (
            filteredOkrs.map(okr => {
              const okrProgress = getCalculatedOkrProgress(okr.id);
              const circumference = 2 * Math.PI * 16;
              const offset = circumference - (okrProgress / 100) * circumference;

              return (
                <div key={okr.id} className="bg-white dark:bg-[#161f2a] rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-all hover:shadow-xl">
                  <div className="p-10 flex flex-wrap gap-10 items-start justify-between relative text-left">
                    <div className="flex-1 min-w-[300px]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusStyle(okr.status)}`}>{okr.status}</span>
                        <span className="text-primary text-[11px] font-black uppercase tracking-widest">{okr.year}</span>
                        <button onClick={() => { setEditingOkr(okr); setOkrForm({ ...okr, status: okr.status }); setIsOkrModalOpen(true); }} className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors text-xl">edit</button>
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 leading-tight tracking-tight">{okr.title}</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-3xl leading-relaxed">{okr.objective}</p>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3 px-10 border-l border-slate-100 dark:border-white/5">
                      <div className="relative size-28">
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-50 dark:stroke-white/5" strokeWidth="3.5"></circle>
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-primary transition-all duration-1000 ease-out" strokeWidth="3.5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"></circle>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{okrProgress}%</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Progresso Médio</span>
                    </div>

                    <button onClick={() => setExpandedOkr(expandedOkr === okr.id ? null : okr.id)} className="flex items-center gap-3 h-12 px-8 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm">
                      <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: expandedOkr === okr.id ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                      {expandedOkr === okr.id ? 'Ocultar KRs' : 'Ver Resultados-Chave'}
                    </button>
                  </div>

                  {expandedOkr === okr.id && (
                    <div className="p-10 border-t border-slate-50 dark:border-white/5 animate-in slide-in-from-top-4 duration-500 bg-slate-50/30 dark:bg-white/2 text-left">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-slate-900 dark:text-white text-xl font-black uppercase tracking-tighter">Resultados-Chave (KRs)</h3>
                        <button onClick={() => { clearKrModalState(); setActiveOkrId(okr.id); setIsKrModalOpen(true); }} className="text-primary text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">Novo KR +</button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {keyResults.filter(kr => kr.okrId === okr.id).length === 0 ? (
                          <p className="text-center py-10 text-slate-400 text-xs italic">Nenhum KR vinculado a este objetivo.</p>
                        ) : (
                          keyResults.filter(kr => kr.okrId === okr.id).map(kr => {
                            const krProgress = getCalculatedKrProgress(kr);
                            const isKrExpanded = expandedKr === kr.id;
                            const krTasks = tasks.filter(t => kr.taskIds?.includes(t.id));
                            const responsible = users.find(u => u.id === kr.responsibleId);

                            return (
                              <div 
                                id={`kr-card-${kr.id}`}
                                key={kr.id} 
                                draggable="true"
                                onDragStart={(e) => handleKrDragStart(e, kr.id)}
                                onDragOver={(e) => { e.preventDefault(); setDropTargetId(kr.id); }}
                                onDragLeave={() => setDropTargetId(null)}
                                onDrop={(e) => handleKrDrop(e, kr.id, okr.id)}
                                className={`rounded-3xl border transition-all shadow-sm overflow-hidden ${
                                  dropTargetId === kr.id 
                                    ? 'border-primary border-dashed bg-primary/5 scale-[0.99]' 
                                    : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#121a22]'
                                } ${draggedKrId === kr.id ? 'opacity-40' : 'opacity-100'}`}
                              >
                                <div className="p-6 flex flex-wrap gap-8 items-center cursor-pointer group" onClick={() => setExpandedKr(isKrExpanded ? null : kr.id)}>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary cursor-grab active:cursor-grabbing">drag_indicator</span>
                                  </div>
                                  <div className="flex-1 text-left min-w-[300px]">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${kr.priority === KRPriority.P0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10'}`}>{kr.priority}</span>
                                      {kr.squads.map(s => <span key={s} className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">{s}</span>)}
                                      <button onClick={(e) => { e.stopPropagation(); setEditingKr(kr); setKrForm({ ...kr, associatedTaskIds: kr.taskIds || [] }); setActiveOkrId(kr.okrId); setIsKrModalOpen(true); }} className="material-symbols-outlined text-slate-300 hover:text-primary text-base transition-colors">edit</button>
                                    </div>
                                    <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-tight">{kr.title}</h4>
                                  </div>
                                  
                                  <div className="w-48 border-l border-slate-100 dark:border-white/5 pl-6 text-left shrink-0">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Responsável</span>
                                    <div className="flex items-center gap-3">
                                      <div className="size-8 rounded-full bg-cover bg-center border-2 border-slate-50 dark:border-white/10" style={{ backgroundImage: `url(${responsible?.avatar})` }}></div>
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{responsible?.name}</span>
                                    </div>
                                  </div>

                                  <div className="w-48 border-l border-slate-100 dark:border-white/5 pl-6 text-left shrink-0">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Progresso (Por Tarefas)</span>
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${krProgress}%` }}></div></div>
                                      <span className="text-xs font-black text-primary">{krProgress}%</span>
                                    </div>
                                  </div>
                                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-transform" style={{ transform: isKrExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                </div>
                                {isKrExpanded && (
                                  <div className="p-8 border-t border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Tarefas Relacionadas ({krTasks.length}) • Arraste para Reordenar</p>
                                    <div className="space-y-2">
                                      {krTasks.length > 0 ? krTasks.map(task => (
                                        <div
                                          key={task.id}
                                          draggable="true"
                                          onDragStart={(e) => handleTaskDragStart(e, task.id)}
                                          onDragOver={(e) => { e.preventDefault(); setDropTargetId(task.id); }}
                                          onDragLeave={() => setDropTargetId(null)}
                                          onDrop={(e) => handleTaskDrop(e, task.id, kr.id)}
                                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm group/task ${
                                            dropTargetId === task.id 
                                              ? 'border-primary border-dashed bg-primary/10' 
                                              : 'bg-white dark:bg-[#161f2a] border-slate-100 dark:border-white/5 hover:border-primary/50'
                                          } ${draggedTaskId === task.id ? 'opacity-30' : 'opacity-100'}`}
                                        >
                                          <div className="flex items-center gap-4">
                                            <span className="material-symbols-outlined text-slate-300 group-hover/task:text-primary cursor-grab active:cursor-grabbing text-lg">drag_indicator</span>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 font-mono tracking-widest">{task.id}</span>
                                            <Link to={`/task/${task.id}`} className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover/task:text-primary transition-colors">{task.title}</Link>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                              task.status === TaskStatus.DONE ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                                              task.status === TaskStatus.IMPEDIMENT ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                              'text-slate-400 border-slate-100 dark:border-white/5'
                                            }`}>{task.status}</span>
                                            <div className="size-8 rounded-full bg-cover bg-center border-2 border-white dark:border-slate-800 shadow-sm" style={{ backgroundImage: `url(${task.responsible.avatar})` }} title={`Responsável: ${task.responsible.name}`}></div>
                                          </div>
                                        </div>
                                      )) : <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma tarefa vinculada.</p>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in duration-500">
          {/* Métricas Globais de Relatório */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#161f2a] p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Progresso Médio Global</span>
               <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-primary leading-none">{globalReportMetrics.avgProgress}%</span>
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-primary" style={{ width: `${globalReportMetrics.avgProgress}%` }}></div>
                  </div>
               </div>
            </div>
            <div className="bg-white dark:bg-[#161f2a] p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total de Resultados (KRs)</span>
               <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{reportData.length}</span>
                  <span className="material-symbols-outlined text-primary text-3xl">target</span>
               </div>
            </div>
            <div className="bg-white dark:bg-[#161f2a] p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tarefas Vinculadas</span>
               <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">{globalReportMetrics.totalTasks}</span>
                  <span className="material-symbols-outlined text-indigo-500 text-3xl">assignment_turned_in</span>
               </div>
            </div>
            <div className="bg-white dark:bg-[#161f2a] p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Impedimentos Críticos</span>
               <div className="flex items-center gap-4">
                  <span className="text-4xl font-black text-rose-500 leading-none">{globalReportMetrics.totalImpediments}</span>
                  <span className="material-symbols-outlined text-rose-500 text-3xl">warning</span>
               </div>
            </div>
          </div>

          {/* Filtros de Relatório e Exportação */}
          <div className="flex flex-wrap items-center justify-between gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-6">
               <div className="flex flex-col gap-1.5" ref={squadReportDropdownRef}>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Squad</span>
                  <div className="relative">
                    <button 
                      onClick={() => setIsSquadReportDropdownOpen(!isSquadReportDropdownOpen)}
                      className="h-11 min-w-[220px] px-4 rounded-xl bg-white dark:bg-[#090d14] border border-slate-200 dark:border-white/10 text-xs font-black text-slate-700 dark:text-white outline-none flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all"
                    >
                      <span>{selectedSquadReport === 'Todos' ? 'Todos os Squads' : selectedSquadReport}</span>
                      <span className={`material-symbols-outlined text-slate-400 text-lg transition-transform ${isSquadReportDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    
                    {isSquadReportDropdownOpen && (
                      <div className="absolute top-full mt-1 left-0 w-full bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[150] py-1 animate-in fade-in slide-in-from-top-2">
                        <button 
                          onClick={() => { setSelectedSquadReport('Todos'); setIsSquadReportDropdownOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase transition-colors ${selectedSquadReport === 'Todos' ? 'text-primary bg-primary/5' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                        >
                          Todos os Squads
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                        {availableSquads.map(s => (
                          <button 
                            key={s} 
                            onClick={() => { setSelectedSquadReport(s); setIsSquadReportDropdownOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase transition-colors ${selectedSquadReport === s ? 'text-primary bg-primary/5' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
            </div>
            
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">
              Use os controles superiores para exportar o relatório consolidado.
            </div>
          </div>

          {/* Detalhamento por KR */}
          <div className="bg-white dark:bg-[#161f2a] rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden">
             <div className="px-10 py-8 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Detalhamento Analítico dos KRs</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exibindo {reportData.length} resultados encontrados</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/30 dark:bg-white/2">
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado-Chave / Squad</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição de Status</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Alertas</th>
                      <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-10 py-20 text-center text-slate-400 italic text-sm">Sem dados para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      reportData.map(kr => (
                        <tr key={kr.id} onClick={() => handleNavigateToKr(kr.id, kr.okrId)} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors group cursor-pointer">
                          <td className="px-10 py-6">
                            <div className="flex flex-col gap-1 max-w-[300px]">
                              <span className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">{kr.title}</span>
                              <div className="flex gap-2">
                                {kr.squads.map(s => <span key={s} className="text-[9px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">{s}</span>)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex flex-col gap-1 w-32">
                                <span className="text-xs font-black text-primary">{kr.progress}%</span>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${kr.progress}%` }}></div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex items-center h-4 w-40 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 border dark:border-white/5">
                                <div className="h-full bg-emerald-500" style={{ width: `${(kr.statusCounts.done / kr.statusCounts.total) * 100 || 0}%` }} title="Concluído"></div>
                                <div className="h-full bg-primary" style={{ width: `${(kr.statusCounts.inProgress / kr.statusCounts.total) * 100 || 0}%` }} title="Em andamento"></div>
                                <div className="h-full bg-rose-500" style={{ width: `${(kr.statusCounts.impediment / kr.statusCounts.total) * 100 || 0}%` }} title="Impedimento"></div>
                                <div className="h-full bg-slate-300 dark:bg-slate-700" style={{ width: `${(kr.statusCounts.backlog / kr.statusCounts.total) * 100 || 0}%` }} title="Backlog"></div>
                             </div>
                             <div className="flex gap-3 mt-2">
                                <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1"><span className="size-1.5 rounded-full bg-emerald-500"></span> {kr.statusCounts.done}</span>
                                <span className="text-[9px] font-bold text-primary flex items-center gap-1"><span className="size-1.5 rounded-full bg-primary"></span> {kr.statusCounts.inProgress}</span>
                                <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1"><span className="size-1.5 rounded-full bg-rose-500"></span> {kr.statusCounts.impediment}</span>
                             </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                             {kr.statusCounts.impediment > 0 ? (
                               <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase animate-pulse">
                                  <span className="material-symbols-outlined text-sm">report_problem</span>
                                  {kr.statusCounts.impediment} Imped.
                               </span>
                             ) : (
                               <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                             )}
                          </td>
                          <td className="px-10 py-6 text-right">
                             <div className="flex items-center justify-end gap-3">
                                <div className="flex flex-col items-end">
                                   <span className="text-xs font-bold text-slate-800 dark:text-white">{users.find(u => u.id === kr.responsibleId)?.name}</span>
                                   <span className="text-[9px] text-slate-400 uppercase font-black">{users.find(u => u.id === kr.responsibleId)?.role}</span>
                                </div>
                                <div className="size-10 rounded-2xl bg-cover bg-center border-2 border-slate-50 dark:border-white/10" style={{ backgroundImage: `url(${users.find(u => u.id === kr.responsibleId)?.avatar})` }}></div>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="bg-white dark:bg-[#161f2a] rounded-[40px] border border-slate-100 dark:border-white/5 p-10 shadow-sm text-left">
                <div className="flex items-center gap-4 mb-8">
                   <div className="size-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <span className="material-symbols-outlined text-2xl">block</span>
                   </div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">KRs em Risco</h3>
                </div>
                <div className="space-y-4">
                   {reportData.filter(kr => kr.statusCounts.impediment > 0).length === 0 ? (
                     <p className="text-xs text-slate-400 italic">Nenhum risco detectado com os filtros atuais.</p>
                   ) : (
                     reportData.filter(kr => kr.statusCounts.impediment > 0).sort((a,b) => b.statusCounts.impediment - a.statusCounts.impediment).slice(0, 5).map(kr => (
                       <div key={kr.id} onClick={() => handleNavigateToKr(kr.id, kr.okrId)} className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all">
                          <div className="flex flex-col gap-0.5 max-w-[70%]">
                             <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{kr.title}</span>
                             <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{kr.statusCounts.impediment} tarefas bloqueadas</span>
                          </div>
                          <Link to={`/backlog`} onClick={(e) => e.stopPropagation()} className="h-8 px-4 flex items-center justify-center rounded-lg bg-white dark:bg-[#1a2330] text-[10px] font-black uppercase tracking-widest text-rose-600 shadow-sm hover:scale-105 transition-all">Ver no Quadro</Link>
                       </div>
                     ))
                   )}
                </div>
             </div>

             <div className="bg-white dark:bg-[#161f2a] rounded-[40px] border border-slate-100 dark:border-white/5 p-10 shadow-sm text-left">
                <div className="flex items-center gap-4 mb-8">
                   <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <span className="material-symbols-outlined text-2xl">trending_up</span>
                   </div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Top Performance</h3>
                </div>
                <div className="space-y-4">
                   {reportData.filter(kr => kr.progress > 0).sort((a,b) => b.progress - a.progress).slice(0, 5).map(kr => (
                      <div key={kr.id} onClick={() => handleNavigateToKr(kr.id, kr.okrId)} className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all">
                         <div className="flex flex-col gap-0.5 max-w-[70%]">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{kr.title}</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{kr.progress}% Concluído</span>
                         </div>
                         <div className="size-8 rounded-full bg-cover" style={{ backgroundImage: `url(${users.find(u => u.id === kr.responsibleId)?.avatar})` }}></div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modais mantidos conforme original para brevidade */}
      {isOkrModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-[#161f2a] w-full max-w-[600px] rounded-[40px] p-10 border-2 shadow-2xl text-left transition-all border-primary">
             <h2 className="text-3xl font-black mb-8 text-slate-900 dark:text-white tracking-tight">{editingOkr ? 'Ajustar Objetivo' : 'Novo Objetivo Anual'}</h2>
             <form onSubmit={handleSaveOkr} className="space-y-6">
                <input required placeholder="Título do Objetivo..." value={okrForm.title} onChange={e => setOkrForm({...okrForm, title: e.target.value})} className="w-full h-14 px-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                <textarea required placeholder="Meta Detalhada..." value={okrForm.objective} onChange={e => setOkrForm({...okrForm, objective: e.target.value})} className="w-full p-6 h-32 rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm outline-none resize-none focus:ring-4 focus:ring-primary/10 transition-all" />
                <div className="grid grid-cols-2 gap-6">
                  <input type="number" required value={okrForm.year} onChange={e => setOkrForm({...okrForm, year: parseInt(e.target.value)})} className="w-full h-14 px-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                  <select value={okrForm.status} onChange={e => setOkrForm({...okrForm, status: e.target.value as any})} className="w-full h-14 px-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:ring-4 focus:ring-primary/10 outline-none">
                    {Object.values(OKRStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-6 pt-6">
                  <button type="button" onClick={clearOkrModalState} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">Descartar</button>
                  <button type="submit" className="h-14 px-12 bg-primary text-white text-sm font-black uppercase rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">Salvar Estratégia</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isKrModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-[#161f2a] w-full max-w-[750px] rounded-[40px] p-10 border-2 shadow-2xl flex flex-col max-h-[90vh] text-left transition-all border-primary">
             <h2 className="text-3xl font-black mb-8 text-slate-900 dark:text-white tracking-tight shrink-0">{editingKr ? 'Editar Resultado-Chave' : 'Novo Resultado-Chave'}</h2>
             <form onSubmit={handleSaveKr} className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
                <input required placeholder="Título do Resultado-Chave..." value={krForm.title} onChange={e => setKrForm({...krForm, title: e.target.value})} className="w-full h-14 px-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
                <div className="grid grid-cols-2 gap-6 items-start">
                  <div className="space-y-1 relative" ref={respDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
                    <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'resp' ? null : 'resp')} className="w-full h-14 px-6 flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        {selectedKrResp ? (
                          <>
                            <div className="size-6 rounded-full bg-cover bg-center border border-primary/20" style={{ backgroundImage: `url(${selectedKrResp.avatar})` }}></div>
                            <span className="text-slate-900 dark:text-white">{selectedKrResp.name}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">Selecionar...</span>
                        )}
                      </div>
                      <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'resp' ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {activeDropdown === 'resp' && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[210] overflow-hidden animate-in fade-in slide-in-from-top-2 p-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {users.map(u => (
                          <button key={u.id} type="button" onClick={() => { setKrForm({...krForm, responsibleId: u.id}); setActiveDropdown(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-white/5 text-left ${krForm.responsibleId === u.id ? 'bg-primary/5' : ''}`}>
                            <div className="size-8 rounded-full bg-cover bg-center border border-slate-100 dark:border-slate-800 shadow-sm" style={{ backgroundImage: `url(${u.avatar})` }}></div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{u.role}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 relative" ref={priorityDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Prioridade</label>
                    <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'priority' ? null : 'priority')} className="w-full h-14 px-6 flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[20px] ${selectedPriorityStyle.color}`}>{selectedPriorityStyle.icon}</span>
                        <span className="text-slate-900 dark:text-white">{krForm.priority}</span>
                      </div>
                      <span className={`material-symbols-outlined text-slate-400 transition-transform ${activeDropdown === 'priority' ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {activeDropdown === 'priority' && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#1a2330] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[210] overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                        {Object.values(KRPriority).map(p => {
                          const pStyle = getKrPriorityStyle(p);
                          return (
                            <button key={p} type="button" onClick={() => { setKrForm({...krForm, priority: p}); setActiveDropdown(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-white/5 text-left ${krForm.priority === p ? 'bg-primary/5' : ''}`}>
                              <span className={`material-symbols-outlined text-[20px] ${pStyle.color}`}>{pStyle.icon}</span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{p}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Squad Responsável</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {availableSquads.map(squad => {
                      const isSelected = krForm.squads.includes(squad);
                      return (
                        <button key={squad} type="button" onClick={() => { const newSquads = isSelected ? krForm.squads.filter(s => s !== squad) : [...krForm.squads, squad]; setKrForm({...krForm, squads: newSquads}); }} className={`flex items-center justify-center gap-2 p-3 h-12 rounded-xl border font-bold text-xs transition-all shadow-sm ${isSelected ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-white/2 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}>{isSelected && <span className="material-symbols-outlined text-[16px] font-black">check</span>}{squad}</button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Vincular Tarefas de Apoio (Múltipla Escolha)</p>
                  <div className="relative"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span><input type="text" placeholder="Buscar ticket..." value={taskSearchQuery} onChange={(e) => setTaskSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-white" /></div>
                  <div className="max-h-48 overflow-y-auto border border-slate-100 dark:border-white/5 rounded-[32px] p-6 space-y-2 bg-slate-50 dark:bg-white/2 custom-scrollbar shadow-inner">
                    {tasks.filter(t => t.type !== 'Épico' && (t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || t.id.toLowerCase().includes(taskSearchQuery.toLowerCase()))).map(task => (
                      <label key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${krForm.associatedTaskIds.includes(task.id) ? 'bg-primary/10 border-primary/30' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                        <input type="checkbox" className="hidden" checked={krForm.associatedTaskIds.includes(task.id)} onChange={(e) => { const ids = e.target.checked ? [...krForm.associatedTaskIds, task.id] : krForm.associatedTaskIds.filter(id => id !== task.id); setKrForm({...krForm, associatedTaskIds: ids}); }} />
                        <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all ${krForm.associatedTaskIds.includes(task.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/10'}`}>{krForm.associatedTaskIds.includes(task.id) && <span className="material-symbols-outlined text-white text-[14px] font-black">check</span>}</div>
                        <div className="flex flex-col min-w-0"><span className="text-[10px] font-black text-slate-400 dark:text-slate-600 font-mono tracking-widest">{task.id}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{task.title}</span></div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-6 pt-6">
                  <button type="button" onClick={clearKrModalState} className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">Descartar</button>
                  <button type="submit" className="h-14 px-12 bg-primary text-white text-sm font-black uppercase rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all">Sincronizar Resultado-Chave</button>
                </div>
             </form>
          </div>
        </div>
      )}

      <footer className="mt-16 py-10 border-t border-slate-100 dark:border-white/5 flex flex-wrap justify-between items-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
         <div className="flex items-center gap-4 text-left"><span className="size-2 rounded-full bg-primary animate-pulse"></span><p>Gestão de Performance Estratégica CRM AmorSaúde</p></div>
         <p>© {new Date().getFullYear()} • CRM AmorSaúde</p>
      </footer>
    </div>
  );
};

export default StrategicPlanning;
