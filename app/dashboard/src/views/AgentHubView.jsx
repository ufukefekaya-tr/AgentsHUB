import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Plus, Settings, Edit2, Trash2, FolderInput, Archive, ChevronRight, MoreVertical } from 'lucide-react';

export function FolderActionMenu({ folder, onAction, currentTheme, position }) {
  if (!position) return null;
  return createPortal(
    <div className={`folder-portal-menu fixed w-40 ${currentTheme.card} border ${currentTheme.border} rounded-xl shadow-2xl py-2 z-[300] animate-in fade-in zoom-in-95`} style={{ top: position.top, right: position.right }}>
      <div className="px-3 py-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/5 mb-1">Klasör Eylemleri</div>
      <button onClick={() => { const val = prompt('Yeni isim:', folder.name); if(val) onAction('rename', folder.id, val); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-white/5 flex items-center gap-2"><Edit2 size={12}/> İsim Değiştir</button>
      <button onClick={() => onAction('delete', folder.id)} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-red-500/10 text-red-500 flex items-center gap-2 mt-1 border-t border-white/5 pt-2"><Trash2 size={12}/> Sil</button>
    </div>,
    document.body
  );
}

export function ChatActionMenu({ thread, onAction, currentTheme, folders, position }) {
  const [isMoving, setIsMoving] = useState(false);
  if (!position) return null;
  return createPortal(
    <div className={`chat-portal-menu fixed w-48 ${currentTheme.card} border ${currentTheme.border} rounded-xl shadow-2xl py-2 z-[300] animate-in fade-in zoom-in-95`} style={{ top: position.top, right: position.right }}>
      <div className="px-3 py-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/5 mb-1">Sohbet Eylemleri</div>
      {!isMoving ? (
        <>
          <button onClick={() => { const val = prompt('Yeni isim:', thread.title); if(val) onAction('rename', thread.id, val); }} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-white/5 flex items-center gap-2"><Edit2 size={12}/> İsim Değiştir</button>
          <button onClick={() => setIsMoving(true)} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-white/5 flex items-center gap-2"><FolderInput size={12}/> Klasöre Taşı</button>
          <button onClick={() => onAction(thread.is_archived ? 'unarchive' : 'archive', thread.id)} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-white/5 flex items-center gap-2"><Archive size={12}/> {thread.is_archived ? 'Arşivden Çıkar' : 'Arşivle'}</button>
          <button onClick={() => onAction('delete', thread.id)} className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-red-500/10 text-red-500 flex items-center gap-2 mt-1 border-t border-white/5 pt-2"><Trash2 size={12}/> Sil</button>
        </>
      ) : (
        <div className="space-y-1">
          <button onClick={() => setIsMoving(false)} className="w-full text-left px-3 py-1 text-[8px] font-bold uppercase text-indigo-400 hover:underline mb-1 flex items-center gap-1"><ChevronRight size={10} className="rotate-180"/> Geri</button>
          <div className="max-h-32 overflow-y-auto px-1">
            <button onClick={() => onAction('move', thread.id, null)} className={`w-full text-left px-2 py-1.5 text-[9px] font-bold uppercase rounded hover:bg-white/5 ${!thread.folder_id ? 'text-indigo-400' : ''}`}>- Klasör Yok -</button>
            {folders.map(f => (
              <button key={f.id} onClick={() => onAction('move', thread.id, f.id)} className={`w-full text-left px-2 py-1.5 text-[9px] font-bold uppercase rounded hover:bg-white/5 ${thread.folder_id === f.id ? 'text-indigo-400' : ''}`}>{f.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export default function AgentHubView({ setActiveView, agents, currentTheme, appTheme, handleAgentSwitch, navigateToAgentConfig, setSkillMarketOpen }) {
  return (
    <div className="p-10 max-w-6xl mx-auto space-y-12 animate-in text-slate-300">
       <div className="flex items-center justify-between border-b pb-8 border-white/5">
         <div>
            <h2 className="text-3xl font-bold tracking-widest uppercase">Ajan Merkezi</h2>
            <p className={`text-xs ${currentTheme.textMuted} uppercase tracking-widest font-bold mt-2 opacity-60`}>AgentsHUB — Tüm Otonom Ajanların Yönetim Merkezi</p>
         </div>
         <div className="flex items-center gap-4">
           <button onClick={() => setSkillMarketOpen(true)} className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${appTheme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
              <Bot size={18} /> Yetenek Marketi
           </button>
           <button onClick={() => setActiveView("forge")} className="px-6 py-3 bg-indigo-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3">
              <Plus size={18} /> Yeni Ajan Oluştur
           </button>
         </div>
       </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
           {agents.length === 0 ? (
             <div className="col-span-full py-20 text-center opacity-20">
                <Bot size={60} className="mx-auto mb-4" />
                <p className="uppercase font-bold tracking-widest">Hiçbir hücre bulunamadı.</p>
             </div>
           ) : agents.map(agent => (
             <div key={agent.id} className="flex flex-col items-center group relative cursor-pointer">
                <div className={`w-32 h-32 rounded-2xl mb-4 flex items-center justify-center border ${currentTheme.border} ${currentTheme.card} ${currentTheme.cardHover} transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-500/50 relative overflow-hidden shadow-lg`}>
                   <Bot size={48} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                   <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-black shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                   
                   {/* Actions Overlay */}
                   <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex items-center justify-center gap-4 backdrop-blur-[2px]">
                      <button onClick={(e) => { e.stopPropagation(); handleAgentSwitch(agent); }} className="px-5 py-2 bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-xl hover:scale-110 active:scale-95 transition-all shadow-xl">Seç</button>
                      <button onClick={(e) => { e.stopPropagation(); navigateToAgentConfig(agent); }} className="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all shadow-lg"><Settings size={18}/></button>
                   </div>
                </div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-center mb-0.5">{agent.name || agent.id}</h3>
                <p className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest text-center opacity-60 font-bold`}>Otonom Ajan</p>
             </div>
           ))}
           <div className="flex flex-col items-center group cursor-pointer" onClick={() => setActiveView("forge")}>
              <div className={`w-32 h-32 rounded-2xl mb-4 flex items-center justify-center border-2 border-dashed ${currentTheme.border} ${currentTheme.cardHover} transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-500/50`}>
                 <Plus size={48} className={currentTheme.textMuted} />
              </div>
              <h3 className={`text-sm font-bold tracking-wider uppercase text-center ${currentTheme.textMuted} group-hover:${currentTheme.textMain}`}>+ Yeni Ajan</h3>
           </div>
        </div>
    </div>
  );
}
