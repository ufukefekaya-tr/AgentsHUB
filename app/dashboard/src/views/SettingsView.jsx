import React, { useState, useEffect } from 'react';
import { Settings, Key, Sparkles, Zap, ShieldAlert, Power, Activity, Archive, FileCode2, FolderClosed, Database } from 'lucide-react';
import { UI_API } from '../api';
import { SettingsInput } from '../components/SharedUI.jsx';

export default function SettingsView({ currentTheme, appTheme, shieldActive, setShieldActive }) {
  const [activeTab, setActiveTab] = useState('models');
  const [geminiKey, setGeminiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');
  const [savedSettings, setSavedSettings] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({ byterover_tier: 'restricted', global_skills_enabled: true });

  useEffect(() => {
    UI_API.fetchGlobalSettings().then(d => setGlobalSettings(d || { byterover_tier: 'restricted', global_skills_enabled: true })).catch(() => {});
    UI_API.fetchSystemSecrets().then(d => {
        if (d) {
            setGeminiKey(d.global_gemini_key || '');
            setClaudeKey(d.global_claude_key || '');
        }
    }).catch(() => {});
  }, []);

  const handleSaveSettings = async () => {
    try { 
        await UI_API.updateGlobalSettings(globalSettings); 
        await UI_API.updateSystemSecrets({ global_gemini_key: geminiKey, global_claude_key: claudeKey });
    } catch(e) {}
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2000);
  };

  const ToggleItem = ({ label, desc, configKey, defaultValue }) => {
    const isActive = globalSettings[configKey] !== false;
    return (
      <div className="flex items-center justify-between p-4 bg-black/10 border border-white/5 rounded-xl hover:bg-white/5 transition-all">
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-slate-300">{label}</div>
          <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">{desc}</div>
        </div>
        <button onClick={() => setGlobalSettings(s => ({...s, [configKey]: !isActive}))} className={`w-12 h-6 ${isActive ? 'bg-emerald-500' : 'bg-slate-700'} rounded-full flex items-center transition-colors px-1`}>
          <div className={`w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'ml-auto' : 'ml-0'}`}></div>
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-10 animate-in fadeIn">
       <div className="flex items-center justify-between border-b pb-8 border-white/5 mb-8">
          <div>
             <h2 className="text-3xl font-bold tracking-widest uppercase">Global Ayarlar</h2>
             <p className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest font-bold mt-2 opacity-60`}>Sistem Geneli Konfigürasyon ve Güvenlik</p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={async () => {
                 if(window.confirm('Sistemi yeniden başlatmak istediğinize emin misiniz? Pano (Canvas) ve sohbet ekranınız yenilenecektir.')) { 
                     try {
                         await UI_API.restartSystem(); 
                         alert('Sistem yeniden başlatılıyor. Sayfa 3 saniye içinde otomatik yenilenecektir.'); 
                         setTimeout(() => window.location.reload(), 3000);
                     } catch(err) {
                         alert('Yeniden başlatma komutu iletilemedi: ' + err.message);
                     }
                 } 
             }} className="px-4 py-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/20 transition-all rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95">
               <Activity size={14}/> Yeniden Başlat
             </button>
             <button onClick={async () => { 
                 if(window.confirm('Sistemi kapatmak istediğinize emin misiniz? Arka plandaki tüm işlemler duracaktır.')) { 
                     try {
                         await UI_API.shutdownSystem(); 
                         alert('Sistem kapatıldı. Pencereyi güvenle kapatabilirsiniz.'); 
                         window.close(); 
                     } catch(err) {
                         alert('Kapatma komutu iletilemedi: ' + err.message);
                     }
                 } 
             }} className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 transition-all rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm active:scale-95">
               <Power size={14}/> Sistemi Kapat
             </button>
          </div>
       </div>

       <div className="flex gap-8">
          <div className="w-48 flex flex-col gap-1">
             <button onClick={()=>setActiveTab('models')} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-left transition-all ${activeTab==='models' ? (appTheme==='dark'?'bg-white/10 text-white':'bg-slate-800 text-white') : 'text-slate-500 hover:bg-white/5'}`}>Model API'leri</button>
             <button onClick={()=>setActiveTab('shield')} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-left transition-all ${activeTab==='shield' ? (appTheme==='dark'?'bg-emerald-500/20 text-emerald-400':'bg-emerald-600 text-white') : 'text-slate-500 hover:bg-white/5'}`}>Güvenlik Kalkanı</button>
             <button onClick={()=>setActiveTab('limits')} className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-left transition-all ${activeTab==='limits' ? (appTheme==='dark'?'bg-indigo-500/20 text-indigo-400':'bg-indigo-600 text-white') : 'text-slate-500 hover:bg-white/5'}`}>Sistem Limitleri</button>
          </div>

          <div className="flex-1 space-y-8">
             {activeTab === 'models' ? (
                <div className={`p-8 rounded-2xl border ${currentTheme.border} ${currentTheme.card} space-y-8 animate-in slide-in-from-right-4`}>
                   <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 text-indigo-400">
                     <Key size={18}/> Mevcut Modeller
                   </h3>
                   <div className="grid gap-6">
                      <SettingsInput label="Google Gemini Pro API Key" type="password" placeholder="AIzaSy..." currentTheme={currentTheme} icon={<Sparkles size={14}/>} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
                      <SettingsInput label="Anthropic Claude API Key" type="password" placeholder="sk-ant-..." currentTheme={currentTheme} icon={<Zap size={14}/>} value={claudeKey} onChange={e => setClaudeKey(e.target.value)} />
                   </div>
                </div>
             ) : activeTab === 'limits' ? (
                <div className={`p-8 rounded-2xl border ${currentTheme.border} ${currentTheme.card} space-y-8 animate-in slide-in-from-right-4`}>
                   <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 text-indigo-400">
                     <Settings size={18}/> Sistem Limitleri ve Otonomi
                   </h3>
                   <div className="grid grid-cols-2 gap-6">
                      <SettingsInput label="ReAct Macs Döngü" type="number" placeholder="200" currentTheme={currentTheme} icon={<Activity size={14}/>} value={globalSettings.react_max_loops || ''} onChange={e => setGlobalSettings(s => ({...s, react_max_loops: e.target.value}))} />
                      <SettingsInput label="Bağlam Budama Eşiği" type="number" placeholder="40000" currentTheme={currentTheme} icon={<Archive size={14}/>} value={globalSettings.context_prune_tokens || ''} onChange={e => setGlobalSettings(s => ({...s, context_prune_tokens: e.target.value}))} />
                      <SettingsInput label="Araç Kesinti Sınırı" type="number" placeholder="18000" currentTheme={currentTheme} icon={<FileCode2 size={14}/>} value={globalSettings.tool_output_max || ''} onChange={e => setGlobalSettings(s => ({...s, tool_output_max: e.target.value}))} />
                      <SettingsInput label="Skill Boyut Limiti (byte)" type="number" placeholder="256000" currentTheme={currentTheme} icon={<FolderClosed size={14}/>} value={globalSettings.skill_size_limit_bytes || ''} onChange={e => setGlobalSettings(s => ({...s, skill_size_limit_bytes: e.target.value}))} />
                      <SettingsInput label="ReAct Zaman Limiti (ms)" type="number" placeholder="600000" currentTheme={currentTheme} icon={<Zap size={14}/>} value={globalSettings.react_time_limit_ms || ''} onChange={e => setGlobalSettings(s => ({...s, react_time_limit_ms: e.target.value}))} />
                      <SettingsInput label="Cache Eşik (Token)" type="number" placeholder="100000" currentTheme={currentTheme} icon={<Database size={14}/>} value={globalSettings.cache_threshold_tokens || ''} onChange={e => setGlobalSettings(s => ({...s, cache_threshold_tokens: e.target.value}))} />
                      <SettingsInput label="Budama Koruma Limiti" type="number" placeholder="14" currentTheme={currentTheme} icon={<Archive size={14}/>} value={globalSettings.context_prune_keep_messages || ''} onChange={e => setGlobalSettings(s => ({...s, context_prune_keep_messages: e.target.value}))} />
                      <SettingsInput label="Kalkan Önbellek Eşiği" type="number" placeholder="1000" currentTheme={currentTheme} icon={<ShieldAlert size={14}/>} value={globalSettings.cache_threshold_shield || ''} onChange={e => setGlobalSettings(s => ({...s, cache_threshold_shield: e.target.value}))} />
                      <SettingsInput label="Max Model Çıktısı (Token)" type="number" placeholder="8000" currentTheme={currentTheme} icon={<Sparkles size={14}/>} value={globalSettings.max_output_tokens || ''} onChange={e => setGlobalSettings(s => ({...s, max_output_tokens: e.target.value}))} />
                   </div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase mt-4 opacity-70 border-t border-white/5 pt-4">Bu limitler tüm sistemi bağlar. Canlı (hot-reload) olarak yansır.</p>
                </div>
             ) : (
                <div className={`p-8 rounded-2xl border ${currentTheme.border} ${currentTheme.card} space-y-8 animate-in slide-in-from-right-4`}>
                   <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 text-emerald-400">
                     <ShieldAlert size={18}/> Güvenlik Kalkanı (CyberShield)
                   </h3>
                   
                   <div className="space-y-3">
                     <div className="text-[11px] font-bold uppercase text-emerald-400">Bağımsız Koruma Katmanları</div>
                     <ToggleItem label="Global Yetenek Aktivasyonu" desc="Tüm ajanların araç kullanabilme yetkisini (skills) aç/kapat." configKey="global_skills_enabled" />
                     <ToggleItem label="SSRF Koruması" desc="İç ağ adreslerine ve cloud metadatalarına erişimi engeller." configKey="ssrf_guard_enabled" />
                     <ToggleItem label="Path Guard" desc="Ajanların sadece tanımlı workspace (klasör) içine yazmasını zorunlu kılar." configKey="path_guard_enabled" />
                     <ToggleItem label="CyberShield Girdi Filtresi" desc="Prompt injection, jailbreak ve izinsiz kimlik saldırılarını engeller." configKey="shield_enabled" />
                     <ToggleItem label="API Key Maskeleme" desc="Terminal ve log çıktılarında API şifrelerini maskeler." configKey="api_key_masking_enabled" />
                     <ToggleItem label="Büyük Skill İndirme Engeli" desc="Tanımlı limiti (Örn: 256KB) aşan dev skill dosyalarının kurulmasını bloklar." configKey="skill_size_limit_enabled" />
                     <ToggleItem label="Tehlikeli Komut Onayı (Exec Approval)" desc="Terminal komutları için önceden manuel onay penceresi çıkartır." configKey="exec_approval_enabled" />
                   </div>
                   
                   <div className={`p-6 bg-black/20 border ${currentTheme.border} rounded-2xl space-y-4`}>
                      <div className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Byterover İzin Seviyesi (OS Erişim Katmanı)</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed font-bold">
                        Sınırsız: Her komutu ve silme işlemini yapabilir. Sınırlı: Yalnızca Workspace içinde dosya yazabilir, format vb zarar verici OS komutları bloklanır. Güvenli: Sadece dosya Oku ve Listele yapabilir, yazma ve komut işletme tamamen yasaktır.
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-4">
                        {[ 
                            { id: 'unlimited', label: 'Sınırsız (Unlimited)', desc: 'Tam izole, tehlikeli eylemlere açık.', class: 'text-rose-400 border-rose-500/30' }, 
                            { id: 'restricted', label: 'Sınırlı (Restricted)', desc: 'Zarar verici komutlar ('+'rm -rf, format'+') engellenir.', class: 'text-amber-400 border-amber-500/30' }, 
                            { id: 'safe', label: 'Güvenli (Safe)', desc: 'Yalnızca okuma ve listeleme izni verilir (Standart Kullanıcı).', class: 'text-emerald-400 border-emerald-500/30' } 
                        ].map(tier => (
                          <label key={tier.id} className={`flex items-center gap-3 p-3 rounded-xl border ${globalSettings.byterover_tier === tier.id ? 'bg-white/10 ' + tier.class : 'border-transparent bg-white/5 opacity-60'} cursor-pointer hover:opacity-100 transition-all`}>
                            <input type="radio" name="byterover_tier" value={tier.id} checked={globalSettings.byterover_tier === tier.id} onChange={() => setGlobalSettings(s => ({...s, byterover_tier: tier.id}))} className="sr-only" />
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${globalSettings.byterover_tier === tier.id ? 'border-indigo-400' : 'border-slate-500'}`}>
                               {globalSettings.byterover_tier === tier.id && <div className="w-2 h-2 bg-indigo-400 rounded-full" />}
                            </div>
                            <div>
                               <div className="text-[11px] font-bold uppercase tracking-widest">{tier.label}</div>
                               <div className="text-[9px] text-slate-500">{tier.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                   </div>
                </div>
             )}

             <div className="flex justify-end pt-4">
                <button onClick={handleSaveSettings} className={`px-12 py-4 ${savedSettings ? 'bg-emerald-500 text-white' : appTheme === 'dark' ? 'bg-white text-black hover:bg-slate-200' : 'bg-slate-800 text-white hover:bg-slate-700'} text-xs font-bold uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95`}>
                   {savedSettings ? '✓ Kaydedildi' : 'Protokolleri Kaydet'}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}
