import React, { useState } from 'react';
import { Bot, Cpu, Globe, Key, MessageCircle, Activity, Sparkles } from 'lucide-react';
import { SettingsInput, SkillToggle } from '../components/SharedUI.jsx';

export default function AgentForgeView({ onCreate, currentTheme, appTheme, setActiveView, setSkillMarketOpen }) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [vertexProject, setVertexProject] = useState('');
  const [vertexLocation, setVertexLocation] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-preview');
  const models = [
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
    { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
    { id: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro Image' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
  ];
  return (
    <div className="max-w-5xl mx-auto p-8 py-12 animate-in slide-in-from-bottom-4 duration-300">
      <div className={`mb-8 border-b ${currentTheme.border} pb-6`}>
        <h1 className="text-2xl font-bold tracking-widest uppercase text-center">Yeni Ajan Oluştur (Forge)</h1>
        <p className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest font-semibold mt-1 text-center`}>Bağımsız Ajan Yapılandırması</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className={`p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.card}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Cpu size={14}/> Temel Kimlik ve Model</h3>
            <div className="space-y-4">
              <SettingsInput label="Ajan Adı (ID)" type="text" placeholder="Örn: Satis_Temsilcisi" currentTheme={currentTheme} value={name} onChange={e=>setName(e.target.value)} icon={<Bot size={14}/>} />
              <div className="space-y-2">
                <label className={`text-[10px] font-bold ${currentTheme.textMuted} uppercase tracking-widest`}>Kullanılan Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {models.map(m => (
                    <div key={m.id} onClick={()=>setSelectedModel(m.id)} className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest text-center cursor-pointer transition-all ${selectedModel===m.id ? 'bg-indigo-600 border-indigo-600 text-white' : currentTheme.card + ' ' + currentTheme.border + ' ' + currentTheme.cardHover + ' text-slate-500'}`}>{m.label}</div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className={`text-[10px] font-bold ${currentTheme.textMuted} uppercase tracking-widest`}>KULLANICI_TALİMATLARI.md</label>
                <textarea rows={6} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Bu ajanın operasyonel hedefleri nelerdir?" className={`w-full ${currentTheme.card} border ${currentTheme.border} rounded-2xl px-4 py-3 text-xs focus:outline-none resize-none font-mono placeholder:opacity-30`} />
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.card}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 text-indigo-400"><Globe size={14}/> Bağımsız API ve Entegrasyon</h3>
            <p className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest mb-4 leading-relaxed`}>Sistemin geri kalanından izole, sadece bu hücreye ait bağlantı anahtarları.</p>
            <div className="space-y-4">
              <SettingsInput label="Ajan Özel Model API Key" type="password" placeholder="Sk-..." currentTheme={currentTheme} value={apiKey} onChange={e=>setApiKey(e.target.value)} icon={<Key size={14}/>} />
              
              {(apiKey.startsWith('AQ') || apiKey.startsWith('ya29')) && (
                 <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 mb-2">
                       <Sparkles size={14} className="text-indigo-400" />
                       <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Vertex AI Otonom Tespit</span>
                    </div>
                    <SettingsInput label="GCP Project ID" type="text" placeholder="my-gcp-project-123" currentTheme={currentTheme} value={vertexProject} onChange={e => setVertexProject(e.target.value)} />
                    <SettingsInput label="Vertex Region" type="text" placeholder="us-central1" currentTheme={currentTheme} value={vertexLocation} onChange={e => setVertexLocation(e.target.value)} />
                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 block">L2 Hafızası (Embedding) ve L3 Caching (Önbellekleme) için Proje ID ve Konum girmek zorunludur.</span>
                 </div>
              )}

              <SettingsInput label="Telegram Bot Token" type="password" placeholder="BotFather'dan aldığınız token..." currentTheme={currentTheme} value={telegramToken} onChange={e=>setTelegramToken(e.target.value)} icon={<MessageCircle size={14}/>} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.card}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14}/> Başlangıç Yetenekleri</h3>
            <p className={`text-[10px] ${currentTheme.textMuted} mb-4 leading-relaxed`}>Hücre uyandığında hangi yeteneklere (Skills) sahip olacak?</p>
            
            <div className="space-y-3 pointer-events-none opacity-80">
              <SkillToggle name="google_search.js" active={true} currentTheme={currentTheme} />
            </div>

            <div className={`mt-5 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5`}>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  <span className="text-indigo-400">NOT:</span> Eksik yetenekleri, yaratılış (Genesis) sürecini tamamladıktan sonra <span className="text-indigo-400">Ajan Ayarları</span> menüsündeki <span className="text-indigo-400">Skill Market</span> üzerinden hücresel düzeyde entegre edebilirsiniz.
               </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => setActiveView('agentHub')} className={`w-full py-4 border ${currentTheme.border} text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all text-slate-500`}>Vazgeç</button>
            <button onClick={() => onCreate(name, { model: selectedModel, system_prompt: instructions, api_key: apiKey, telegram_bot_token: telegramToken, vertex_project: vertexProject, vertex_location: vertexLocation })} className={`w-full py-5 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95`}>Genesis Başlat</button>
          </div>
        </div>
      </div>
    </div>
  );
}
