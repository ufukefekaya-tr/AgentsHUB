import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Download, Check, Shield, 
  Cpu, Terminal, Database, Globe, Zap, 
  ExternalLink, Info, Star
} from 'lucide-react';
import { UI_API } from '../api';

export default function SkillMarket({ onClose, agentId }) {
  const [skills, setSkills] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [installing, setInstalling] = useState(null);

  useEffect(() => {
    UI_API.fetchMarketSkills().then(setSkills);
  }, []);

  const filtered = skills.filter(s => 
    (filter === 'All' || s.type === filter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()))
  );

  const handleInstall = (id) => {
    setInstalling(id);
    setTimeout(() => {
        setInstalling(null);
        // Backend entegrasyonu (Genesis-Protocol) tetiklenecek
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="glass w-full max-w-5xl h-[80vh] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-elite"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                 <Cpu className="text-accent" size={24} />
              </div>
              <div>
                 <h2 className="font-display text-2xl font-bold tracking-tight">ClawHub: Sovereign Skill Market</h2>
                 <p className="text-xs text-meta opacity-60 uppercase tracking-widest">{agentId} için kapasite artırımı</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 interactive rounded-full border border-white/5">
              <X size={20} />
           </button>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 border-b border-white/5 flex items-center gap-6">
           <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={16} />
              <input 
                placeholder="Yetenek ara (ör: RAG, Terminal, SQL)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 p-2.5 pl-10 rounded-xl text-sm outline-none focus:border-accent/40"
              />
           </div>
           <div className="flex items-center gap-2">
              {['All', 'Core', 'OS', 'Data', 'Network'].map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${filter === f ? 'bg-accent text-bg shadow-lg' : 'hover:bg-white/5 text-dim'}`}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           <div className="grid grid-cols-3 gap-6">
              {filtered.map(skill => (
                <div key={skill.id} className="group relative glass border border-white/5 p-6 rounded-2xl hover:border-accent/30 transition-all flex flex-col h-full">
                   <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-accent/5 border border-accent/10 text-accent`}>
                         {getTypeIcon(skill.type)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-500/80">
                         <Star size={10} fill="currentColor" /> 4.9
                      </div>
                   </div>
                   
                   <h3 className="font-display font-bold text-lg mb-1">{skill.name}</h3>
                   <span className="text-[10px] text-meta opacity-50 uppercase tracking-widest mb-3">By {skill.author}</span>
                   
                   <p className="text-xs text-dim leading-relaxed mb-6 flex-1">
                      {skill.desc}
                   </p>

                   <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                      <button 
                        onClick={() => handleInstall(skill.id)}
                        disabled={installing === skill.id}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all ${installing === skill.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 hover:bg-accent hover:text-bg shadow-sm'}`}
                      >
                         {installing === skill.id ? <><Loader size={14} className="animate-spin"/> Kuruluyor...</> : <><Download size={14}/> Hemen Kur</>}
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getTypeIcon(type) {
  switch(type) {
    case 'OS': return <Terminal size={20} />;
    case 'Data': return <Database size={20} />;
    case 'Network': return <Globe size={20} />;
    default: return <Cpu size={20} />;
  }
}

function Loader({ size, className }) {
    return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className={className}><Zap size={size}/></motion.div>
}

// Named export used by App.jsx
export function SkillMarketModal({ skills, onClose, currentTheme, appTheme, activeAgent }) {
  const [installing, setInstalling] = React.useState(null);
  const [installResult, setInstallResult] = React.useState({});

  const handleInstall = async (skillName, skillFile) => {
    if (!activeAgent) { alert('Önce bir ajan seçin.'); return; }
    setInstalling(skillName);
    setInstallResult(r => ({ ...r, [skillName]: null }));
    try {
      const response = await UI_API.installSkill(activeAgent.id, skillFile || skillName);
      setInstallResult(r => ({ ...r, [skillName]: response.message || 'Kuruldu.' }));
    } catch(e) {
      setInstallResult(r => ({ ...r, [skillName]: `Hata: ${e.message}` }));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-10 ${currentTheme.modalOverlay}`}>
       <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className={`${currentTheme.bg} border ${currentTheme.border} rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]`}>
          <div className={`h-20 flex items-center justify-between px-8 border-b ${currentTheme.border} ${currentTheme.headerBg}`}>
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><Database size={24}/></div>
                <div>
                  <h2 className="text-xl font-bold tracking-tighter uppercase">Skill Market</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Otonom Yetenek Entegrasyon Merkezi {activeAgent ? `· ${activeAgent.id}` : '· Ajan Seçilmedi'}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all"><X size={24}/></button>
          </div>
          <div className="flex-1 p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {skills.map(skill => (
                <div key={skill.id} className={`${currentTheme.card} border ${currentTheme.border} rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-all group`}>
                   <div>
                      <div className="flex justify-between items-start mb-6">
                         <div className="p-3 bg-white/5 border border-white/5 rounded-xl group-hover:scale-110 transition-transform"><Globe size={20}/></div>
                         <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 rounded border border-white/5 text-slate-500">{skill.type || 'Core'}</span>
                      </div>
                      <h4 className="text-sm font-bold uppercase tracking-wider mb-2">{skill.name}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{skill.desc || skill.description}</p>
                      {installResult[skill.name] && (
                        <p className={`mt-3 text-[10px] ${installResult[skill.name].startsWith('Hata') ? 'text-red-400' : 'text-emerald-400'} font-medium leading-relaxed`}>{installResult[skill.name]}</p>
                      )}
                   </div>
                   <button
                      onClick={() => handleInstall(skill.name, skill.file)}
                      disabled={installing === skill.name}
                      className="mt-8 w-full py-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                      {installing === skill.name ? <><Zap size={14} className="animate-spin"/> Karantinaya Alınıyor...</> : <><Download size={14}/> Kurulumu Başlat</>}
                   </button>
                </div>
             ))}
          </div>
       </motion.div>
    </div>
  );
}
