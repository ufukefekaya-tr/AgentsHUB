import React, { useState, useEffect } from 'react';
import { Archive, MessageSquare } from 'lucide-react';
import { UI_API } from '../api';

export default function ArchiveView({ currentTheme, activeAgent, onRestore, activeView }) {
  const [archivedThreads, setArchivedThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (activeAgent) {
      UI_API.fetchThreads(activeAgent.id, true).then(data => {
        setArchivedThreads((data || []).filter(t => t.is_archived));
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [activeAgent, activeView]);

  const handleRestore = async (action, threadId) => {
    await onRestore(action, threadId);
    setArchivedThreads(prev => prev.filter(t => t.id !== threadId));
  };

  return (
    <div className="p-12 max-w-5xl mx-auto space-y-12 animate-in fadeIn">
       <div className="border-b pb-8 border-white/5">
          <h2 className="text-3xl font-bold tracking-widest uppercase">Sohbet Arşivi</h2>
          <p className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest font-bold mt-2`}>
             {activeAgent ? `${activeAgent.id.toUpperCase()} Hücresine Ait Arşivlenenler` : 'Önce Bir Hücre Seçmelisiniz'}
          </p>
       </div>

       {!activeAgent ? (
         <div className="h-64 flex flex-col items-center justify-center opacity-20 gap-4 text-center">
            <Archive size={64} />
            <p className="font-bold uppercase tracking-widest text-sm">Arşivi görmek için bir ajan seçin.</p>
         </div>
       ) : loading ? (
         <div className="p-20 text-center animate-pulse font-bold uppercase tracking-widest opacity-40">Arşiv yükleniyor...</div>
       ) : archivedThreads.length === 0 ? (
         <div className="p-20 text-center opacity-40">
            <Archive size={40} className="mx-auto mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">Arşivlenmiş sohbet bulunamadı.</p>
         </div>
       ) : (
         <div className="grid gap-4">
           {archivedThreads.map(t => (
             <div key={t.id} className={`${currentTheme.card} border ${currentTheme.border} rounded-2xl p-6 flex items-center justify-between hover:border-indigo-500/30 transition-all group`}>
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white/5 rounded-xl text-slate-500"><MessageSquare size={18}/></div>
                   <div>
                      <h4 className="text-sm font-bold uppercase tracking-wide">{t.title || 'İsimsiz Sohbet'}</h4>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">{t.id}</p>
                   </div>
                </div>
                <button onClick={() => handleRestore('unarchive', t.id)} className="px-6 py-2.5 bg-indigo-600/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all">Geri Yükle</button>
             </div>
           ))}
         </div>
       )}
    </div>
  );
}
