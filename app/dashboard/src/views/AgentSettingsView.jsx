import React, { useState, useEffect } from 'react';
import { Bot, Cpu, Globe, Key, MessageCircle, Activity, ShieldAlert, Sparkles } from 'lucide-react';
import { UI_API } from '../api';
import { SettingsInput, SkillToggle } from '../components/SharedUI.jsx';

export default function AgentSettingsView({ agent, currentTheme, appTheme, setSkillMarketOpen, handleAgentDelete }) {
  if (!agent) return null;
  const [config, setConfig] = useState(null);
  const [saved, setSaved] = useState(false);
  const [agentSkills, setAgentSkills] = useState([]);

  useEffect(() => {
    UI_API.fetchAgentConfig(agent.id).then(cfg => setConfig(cfg || {}));
    UI_API.fetchAgentSkills(agent.id)
      .then(skills => setAgentSkills(Array.isArray(skills) ? skills : []))
      .catch(err => console.error('Skills fetch error:', err));
  }, [agent.id]);

  const handleSave = async () => {
    if (!config) return;
    try {
      await UI_API.updateAgentConfig(agent.id, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Config kaydetme hatası:', err);
      alert('Ayarlar kaydedilemedi: ' + err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 py-12 animate-in fadeIn">
       <div className="flex items-center justify-between border-b pb-8 border-white/5 mb-8">
          <div className="flex items-center gap-6">
             <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/10">
               <Bot size={32} />
             </div>
             <div>
                <h2 className="text-2xl font-bold tracking-widest uppercase">{agent.name || agent.id} Ayarları</h2>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">Workspace/{agent.id}/ Config</p>
             </div>
          </div>
          <button onClick={handleSave} className={`px-10 py-3 ${saved ? 'bg-emerald-500 text-white' : appTheme === 'dark' ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-800 text-white hover:bg-slate-700'} text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-xl`}>{saved ? '✓ Kaydedildi' : 'Kaydet'}</button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
              <div className={`p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.card}`}>
                 <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-400"><Cpu size={14}/> Model ve DNA</h3>
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className={`text-[10px] font-bold ${currentTheme.textMuted} uppercase tracking-widest`}>Kullanılan Model</label>
                       <select value={config?.model || 'gemini-3.1-flash-preview'} onChange={e => setConfig(c => ({...c, model: e.target.value}))} className={`w-full ${currentTheme.card} border ${currentTheme.border} rounded-xl px-3 py-2 text-sm focus:outline-none appearance-none font-mono`}>
                          <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                          <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
                          <option value="gemini-3-flash-preview">Gemini 3.0 Flash</option>
                          <option value="gemini-3-pro-image-preview">Gemini 3.0 Pro Image</option>
                          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                          <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className={`text-[10px] font-bold ${currentTheme.textMuted} uppercase tracking-widest`}>KULLANICI_TALİMATLARI.md</label>
                       <textarea rows={10} value={config?.system_prompt || ''} onChange={e => setConfig(c => ({...c, system_prompt: e.target.value}))} placeholder="Bu ajanın sistem talimatları..." className={`w-full ${currentTheme.card} border ${currentTheme.border} rounded-2xl px-4 py-3 text-xs font-mono outline-none focus:border-indigo-500 transition-all resize-none`} />
                    </div>
                 </div>
              </div>

              <div className={`p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.card}`}>
                 <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-indigo-400"><Globe size={14}/> Bağımsız API</h3>
                 <div className="space-y-4">
                    <SettingsInput label="Ajan Özel API Key" type="password" placeholder="Değiştirmek için girin..." currentTheme={currentTheme} icon={<Key size={14}/>} value={config?.api_key || ''} onChange={e => setConfig(c => ({...c, api_key: e.target.value}))} />
                    
                    {(config?.api_key?.startsWith('AQ.') || config?.vertex_project) && (
                       <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-2 mb-2">
                             <Sparkles size={14} className="text-indigo-400" />
                             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Vertex AI Otonom Tespit</span>
                          </div>
                          <SettingsInput label="GCP Project ID" type="text" placeholder="my-gcp-project-123" currentTheme={currentTheme} value={config?.vertex_project || ''} onChange={e => setConfig(c => ({...c, vertex_project: e.target.value}))} />
                          <SettingsInput label="Vertex Region" type="text" placeholder="us-central1" currentTheme={currentTheme} value={config?.vertex_location || ''} onChange={e => setConfig(c => ({...c, vertex_location: e.target.value}))} />
                          <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 block">L2 Hafızası (Embedding) ve L3 Caching (Önbellekleme) için Proje ID ve Konum girmek zorunludur.</span>
                       </div>
                    )}

                    <SettingsInput label="Telegram Bot Token" type="password" placeholder="BotFather'dan aldığınız token..." currentTheme={currentTheme} icon={<MessageCircle size={14}/>} value={config?.telegram_bot_token || ''} onChange={e => setConfig(c => ({...c, telegram_bot_token: e.target.value}))} />
                 </div>
              </div>
          </div>

          <div className="space-y-6">
             <div className={`p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.card} flex flex-col max-h-[400px]`}>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> Yetenekler ({agentSkills.length})</h3>
                  <button onClick={() => setSkillMarketOpen(true)} className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest border border-indigo-500/20 rounded-md hover:bg-indigo-500/20 transition-all">+ Market</button>
                </div>
                
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                   {agentSkills.length === 0 ? (
                     <div className="text-center opacity-50 text-[10px] uppercase font-bold py-4">Henüz yetenek kurulu değil.</div>
                   ) : agentSkills.map(skill => (
                     <SkillToggle key={skill.file} name={skill.file} data={skill}
                       active={config?.skills ? config.skills.includes(skill.file) : skill.enabled}
                       onClick={() => {
                         const agentId = agent.id;
                         const currentSkills = config?.skills || [];
                         let newSkills = currentSkills.includes(skill.file) 
                             ? currentSkills.filter(s => s !== skill.file) 
                             : [...currentSkills, skill.file];
                         
                         // Hot Switch Logic: Mutually exclusive google_search.js
                         if (skill.file === 'google_search.js') {
                             if (!currentSkills.includes('google_search.js')) {
                                 // Tuning ON google_search: disable all others
                                 newSkills = ['google_search.js'];
                             }
                         } else {
                             if (!currentSkills.includes(skill.file)) {
                                 // Turning ON another skill: disable google_search
                                 newSkills = newSkills.filter(s => s !== 'google_search.js');
                             }
                         }

                         const newConfig = { ...config, skills: newSkills };
                         setConfig(newConfig);
                         UI_API.updateAgentConfig(agentId, newConfig).catch(err => console.error('Skill save failed:', err));
                       }}
                       currentTheme={currentTheme} />
                   ))}
                </div>
             </div>

             <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-2"><ShieldAlert size={14}/> Tehlikeli Alan</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-bold">Ajan silindiğinde geri dönüşü olmayan bir veri kaybı yaşanır.</p>
                <button onClick={() => handleAgentDelete(agent.id)} className="w-full py-3 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95">Ajanı Yok Et</button>
             </div>
          </div>
       </div>
    </div>
  );
}
