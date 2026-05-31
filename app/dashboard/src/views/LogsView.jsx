import React, { useRef, useEffect } from 'react';
import { TerminalSquare } from 'lucide-react';
import { AnsiLine } from '../components/SharedUI.jsx';

export default function LogsView({ currentTheme, appTheme, systemLogs }) {
  const logEndRef = useRef(null);
  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  const lines = systemLogs ? systemLogs.split('\n') : [];

  return (
    <div className="h-full flex flex-col p-8 md:p-12 animate-in fadeIn">
       <div className="flex items-center justify-between border-b pb-8 border-white/5 mb-8">
          <div>
             <h2 className="text-3xl font-bold tracking-widest uppercase">Sistem Konsolu</h2>
             <p className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest font-bold mt-2 opacity-60`}>AgentsHUB Node.js Runtime / Canlı Log Akışı</p>
          </div>
          <div className="flex items-center gap-3">
             <span className={`text-[9px] font-bold ${currentTheme.textMuted} font-mono`}>{lines.length} satır</span>
             <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold tracking-widest border border-emerald-500/20 rounded-full animate-pulse">CANLI BAĞLANTI</div>
          </div>
       </div>

       <div className={`flex-1 bg-[#0a0a0f] text-slate-300 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl`}>
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/2">
            <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
            <span className="ml-3 text-[9px] text-slate-600 font-mono">node — AgentsHUB Runtime — Port 3004</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 font-mono text-[11px] leading-relaxed">
             {lines.length > 0 ? (
               lines.map((line, i) => (
                 <div key={i} className="hover:bg-white/3 px-1 rounded min-h-[1.5em]">
                   <AnsiLine text={line} />
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center h-full opacity-20 gap-4">
                  <TerminalSquare size={48} />
                  <p className="font-bold uppercase tracking-widest">Sistem logları bekleniyor...</p>
               </div>
             )}
             <div ref={logEndRef} />
          </div>
          <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-600 font-mono">
             <span>● LISTENING</span>
             <span>localhost:3004</span>
          </div>
       </div>
    </div>
  );
}
