import React from 'react';
import { MessageSquare, Bot, Activity, Settings } from 'lucide-react';

function HomeCard({ icon, title, desc, onClick, currentTheme, primary }) {
  return (
    <div onClick={onClick} className={`p-6 rounded-xl border ${primary ? 'border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/10 scale-[1.02]' : currentTheme.border + ' ' + currentTheme.card} ${currentTheme.cardHover} transition-all group cursor-pointer hover:border-indigo-500/30 ring-1 ring-transparent hover:ring-indigo-500/10`}>
      <div className={`${primary ? 'text-indigo-400' : 'text-slate-500'} mb-4 group-hover:scale-110 transition-transform`}>{icon}</div>
      <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${primary ? 'text-white' : ''}`}>{title}</h3>
      <p className={`text-[11px] ${currentTheme.textMuted} leading-relaxed font-medium`}>{desc}</p>
    </div>
  );
}

export default function HomeView({ setActiveView, currentTheme, appTheme, agents, handleAgentSwitch, activeAgent }) {

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 animate-in max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div onClick={() => window.open("https://AgentsHUB.com.tr", "_blank")} className="w-56 h-56 mx-auto flex items-center justify-center hover:scale-105 transition-transform duration-300 cursor-pointer">
          <img src="/Logo.png" alt="AgentsHUB" className="w-56 h-56 object-contain" style={{filter:'drop-shadow(0 0 24px rgba(99,102,241,0.6))'}} onError={e => { e.target.style.display='none'; }} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Hoş geldin! 👋</h1>
        <p className={`text-sm ${currentTheme.textMuted} max-w-md mx-auto leading-relaxed uppercase tracking-wider font-semibold opacity-70`}>
          Başlayalım mı? Ajanların hazır ve seni bekliyor.
        </p>
      </div>

      {/* M-14: Onboarding — ajan yoksa adım adım yönlendirme */}
      {agents.length === 0 && (
        <div className={`w-full p-6 rounded-2xl border ${currentTheme.border} bg-indigo-500/5 space-y-4`}>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Başlangıç Rehberi — 3 Adım</p>
          <div className="flex flex-col gap-3">
            {[
              { step: '1', label: 'API Anahtarı', desc: 'Ayarlar → Google AI Studio (aistudio.google.com/apikey) den ücretsiz anahtar alıp yapıştırın.', view: 'settings' },
              { step: '2', label: 'Ajan Oluştur', desc: 'Forge → İhtiyacınıza göre yeni bir AI ajanı oluşturun ve yeteneklerini seçin.', view: 'forge' },
              { step: '3', label: 'Konuşmaya Başla', desc: 'Arena → Ajanınızla sohbet edin. O araçları kullanarak internet arar, dosya okur/yazar, hesap yapar!', view: 'arena' },
            ].map(({ step, label, desc, view }) => (
              <button key={step} onClick={() => setActiveView(view)}
                className={`flex items-center gap-4 p-3 rounded-xl border ${currentTheme.border} hover:bg-white/5 text-left transition-all`}>
                <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                <div>
                  <div className={`text-xs font-bold ${currentTheme.textMain}`}>{label}</div>
                  <div className={`text-[10px] ${currentTheme.textMuted}`}>{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <HomeCard
          icon={<MessageSquare size={24}/>}
          title="Operasyona Başla"
          desc={activeAgent ? `${(activeAgent.name || activeAgent.id).toUpperCase()} Hücresi Aktif. Operasyona Hazır.` : "Bir hücre seçin ve operasyonu başlatın."}
          primary={!!activeAgent}
          onClick={() => {
            if (activeAgent) {
              setActiveView('arena');
            } else if (agents.length > 0) {
              handleAgentSwitch(agents[0]);
            } else {
              setActiveView('agentHub');
            }
          }}
          currentTheme={currentTheme}
        />
        <HomeCard icon={<Bot size={20}/>} title="Ajan Merkezi" desc="Tüm ajanları yönet, yapılandır ve yeni ajan oluştur." onClick={() => setActiveView('agentHub')} currentTheme={currentTheme} />
        <HomeCard icon={<Activity size={20}/>} title="Sistem İzleme" desc="Canlı telemetri, token harcaması ve log akışı." onClick={() => setActiveView('telemetry')} currentTheme={currentTheme} />
        <HomeCard icon={<Settings size={20}/>} title="Ayarlar" desc="API anahtarları ve sistem protokolleri." onClick={() => setActiveView('settings')} currentTheme={currentTheme} />
      </div>
    </div>
  );
}
