import React, { useState, useEffect } from 'react';
import { 
  Terminal, ShieldCheck, Database, Cpu, TrendingUp, RefreshCcw,
  Clock, Activity, DollarSign, BarChart2
} from 'lucide-react';
import { UI_API } from '../api';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export default function TelemetryView({ activeAgent, currentTheme, appTheme }) {
  const [summary, setSummary] = useState(null);
  const [stats, setStats] = useState(null);
  const [evaluation, setEvaluation] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [activeAgent]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
        const [tel, stat] = await Promise.all([
             UI_API.fetchTelemetry().catch(() => null),
             UI_API.fetchTelemetryStats().catch(() => null)
        ]);
        
        if (tel && typeof tel === 'object') setSummary(tel);
        if (stat) setStats(stat);

        if (activeAgent) {
            const evalData = await UI_API.fetchEvaluation(activeAgent.id).catch(() => null);
            if (evalData?.content) setEvaluation(evalData.content);
        }
    } catch (e) {
        console.error("Telemetry Error:", e);
    } finally {
        setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const formatTokens = (n) => n > 9999 ? `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n / 1000)}k` : new Intl.NumberFormat('tr-TR').format(n || 0);
  const formatYAxis = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return n;
  };
  const formatLatency = (ms) => ms > 999 ? `${(ms/1000).toFixed(1)}s` : `${ms || 0}ms`;
  
  const successRate = summary
    ? `${summary.total_requests > 0 ? (((summary.total_requests - summary.error_count) / summary.total_requests) * 100).toFixed(1) : '100'}%`
    : '—';

  const statCards = [
    { label: 'Bugünün Hacmi', val: formatTokens(stats?.today?.tokens || 0), sub: `$${stats?.today?.cost || '0.00'} • ${new Intl.NumberFormat('tr-TR').format(stats?.today?.requests || 0)} İstek`, icon: <Database size={16} /> },
    { label: 'Ort. Yanıt Hızı', val: formatLatency(summary?.avg_latency_ms), sub: summary ? 'Canlı ölçüm' : 'Veri yok', icon: <Clock size={16} /> },
    { label: 'Ortalama Maliyet (İstek)', val: `$${summary?.avg_usd || '0.00'}`, sub: `Ort. ${formatTokens(summary?.avg_tokens)} token`, icon: <DollarSign size={16} /> },
    { label: 'Başarı Oranı', val: successRate, sub: `${summary?.error_count || 0} hata`, icon: <ShieldCheck size={16} /> },
  ];

  // Grafik verilerini hazırla (stats nesnesinden)
  const hourlyData = stats?.hourly 
      ? Object.keys(stats.hourly).map(h => {
          const t = stats.hourly[h].tokens;
          return { name: `${h}:00`, token: t, cost: `$${((t/1000000)*0.50).toFixed(4)}`, reqs: stats.hourly[h].requests };
        })
      : [];
      
  const dailyData = stats?.daily 
      ? [...stats.daily].reverse().map(d => {
          return { name: d.date.slice(-5), token: d.tokens, cost: `$${((d.tokens/1000000)*0.50).toFixed(4)}`, reqs: d.requests };
        })
      : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-lg border ${currentTheme.border} ${appTheme === 'dark' ? 'bg-[#111]' : 'bg-white'} shadow-xl`}>
          <p className="font-bold text-xs mb-1 opacity-80">{label}</p>
          <div className="flex flex-col gap-1 mt-2">
             <p className="text-indigo-400 font-mono text-xs flex justify-between gap-4"><span>Token:</span> <span className="font-bold">{new Intl.NumberFormat('tr-TR').format(data.token)}</span></p>
             <p className="text-emerald-500 font-mono text-xs flex justify-between gap-4"><span>Maliyet:</span> <span className="font-bold">{data.cost}</span></p>
             <p className="text-slate-400 font-mono text-[9px] flex justify-between gap-4"><span>İstek Sy:</span> <span>{data.reqs}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartColor = appTheme === 'dark' ? '#6366f1' : '#f59e0b'; // Indigo / Amber (Sepia)

  return (
    <div className="tele-noble flex flex-col gap-6 p-4">
       <div className="flex justify-between items-end mb-2">
          <div className="flex flex-col gap-1">
             <span className={`text-[10px] uppercase font-bold tracking-widest ${currentTheme.textMuted}`}>Sovereign Oversight</span>
             <h2 className="text-2xl font-bold tracking-tight">Hücre Telemetrisi & Maliyet</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                CANLI BAĞLANTI
             </div>
             <button onClick={fetchData} className={`p-2 rounded-full border ${currentTheme.border} ${currentTheme.cardHover} ${isRefreshing ? 'animate-spin' : ''}`}>
                <RefreshCcw size={14} className={currentTheme.textMuted}/>
             </button>
          </div>
       </div>

       {/* ÜST BİLGİ KARTLARI */}
       <div className="grid grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div key={i} whileHover={{ y: -2 }} className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.card}`}>
               <div className="flex justify-between items-start mb-3">
                  <div className={`p-1.5 rounded-md bg-opacity-10 ${appTheme==='dark' ? 'bg-white text-slate-400' : 'bg-slate-800 text-slate-600'}`}>{stat.icon}</div>
                  <TrendingUp size={14} className="opacity-30" />
               </div>
               <div className="flex flex-col">
                  <span className="text-2xl font-bold tracking-tight">{stat.val}</span>
                  <div className="flex justify-between mt-1 items-end">
                     <span className={`text-[9px] font-bold uppercase tracking-wider ${currentTheme.textMuted}`}>{stat.label}</span>
                     <span className="text-[10px] font-bold text-indigo-500">{stat.sub}</span>
                  </div>
               </div>
            </motion.div>
          ))}
       </div>

       {/* GRAFİKLER */}
       <div className="grid grid-cols-2 gap-4">
           {/* Saatlik Tüketim (Line Chart) */}
           <div className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.card} flex flex-col`}>
               <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <BarChart2 size={14} className="text-indigo-400"/>
                      <span className={`text-xs font-bold uppercase tracking-widest ${currentTheme.textMuted}`}>Saatlik Harcama (Bugün)</span>
                   </div>
               </div>
               <div className="flex-1 min-h-0 w-full" style={{ minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={appTheme === 'dark' ? '#333' : '#e5e5e5'} />
                      <XAxis dataKey="name" stroke={appTheme === 'dark' ? '#666' : '#999'} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={formatYAxis} width={45} stroke={appTheme === 'dark' ? '#666' : '#999'} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="token" stroke={chartColor} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
           </div>

           {/* Günlük Tüketim (Bar Chart) */}
           <div className={`p-4 rounded-xl border ${currentTheme.border} ${currentTheme.card} flex flex-col`}>
               <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <BarChart2 size={14} className="text-emerald-400"/>
                      <span className={`text-xs font-bold uppercase tracking-widest ${currentTheme.textMuted}`}>Son 7 Günlük Kullanım</span>
                   </div>
               </div>
               <div className="flex-1 min-h-0 w-full" style={{ minHeight: '300px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={appTheme === 'dark' ? '#333' : '#e5e5e5'} />
                      <XAxis dataKey="name" stroke={appTheme === 'dark' ? '#666' : '#999'} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={formatYAxis} width={45} stroke={appTheme === 'dark' ? '#666' : '#999'} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: appTheme === 'dark' ? '#222' : '#f0f0f0' }} />
                      <Bar dataKey="token" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
           </div>
       </div>

       {/* ALT PANELLER (Loglar ve Eval) */}
       <div className="grid grid-cols-2 gap-4 h-[350px] min-h-[350px]">
          <div className={`rounded-xl border ${currentTheme.border} flex flex-col overflow-hidden ${currentTheme.card}`}>
             <div className={`p-3 border-b ${currentTheme.border} flex items-center justify-between bg-black/5`}>
                <div className="flex items-center gap-2">
                   <Activity size={12} className="text-indigo-400" />
                   <span className={`text-[10px] font-bold uppercase tracking-widest ${currentTheme.textMuted}`}>Olay Günlüğü ($ Maliyetli)</span>
                </div>
                <span className={`text-[9px] ${currentTheme.textMuted}`}>Son 30 Olay</span>
             </div>
             <div className="flex-1 overflow-y-auto p-3 custom-scrollbar font-mono text-[10px]">
                {(summary?.records || []).slice().reverse().map((t, idx) => {
                   const inTok = t.usage?.promptTokens || 0;
                   const outTok = t.usage?.completionTokens || 0;
                   const totTok = t.usage?.totalTokens || 0;
                   const recordCost = ((totTok / 1000000) * 0.50).toFixed(5);
                   return (
                      <div key={idx} className={`py-2 border-b ${currentTheme.border} flex flex-col gap-1`}>
                         <div className="flex justify-between opacity-50">
                            <span>{new Date(t.timestamp).toLocaleString()}</span>
                            <span>{t.model}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                            <span className="font-bold">[{t.agentId || 'Sistem'}]</span>
                            <span className="flex gap-2">
                               <span className="text-blue-500">In:{inTok}</span>
                               <span className="text-emerald-500">Out:{outTok}</span>
                               <span className="font-bold opacity-80">= {totTok} </span>
                            </span>
                            <span className="text-indigo-400 font-bold tracking-wider">${recordCost}</span>
                            <span>{t.performance?.latencyMs || 0}ms</span>
                         </div>
                         {t.tools && t.tools.length > 0 && (
                            <div className="text-[9px] opacity-60 mt-0.5">Araçlar: {t.tools.map(x=>x.name).join(', ')}</div>
                         )}
                      </div>
                   )
                })}
                {(!summary?.records || summary.records.length === 0) && (
                  <div className="text-center py-8 opacity-40">Henüz kaydedilmiş telemetri yok. (Kalıcılık aktif, işlem bekliyor)</div>
                )}
             </div>
          </div>

          <div className={`rounded-xl border ${currentTheme.border} flex flex-col overflow-hidden ${currentTheme.card}`}>
             <div className={`p-3 border-b ${currentTheme.border} flex items-center gap-2 bg-black/5`}>
                <Cpu size={12} className="text-emerald-400" />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${currentTheme.textMuted}`}>Hücresel Vicdan (EVAL)</span>
             </div>
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <pre className={`text-[11px] leading-relaxed whitespace-pre-wrap font-mono ${appTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                   {evaluation || 'Kognitif evrim ve değerlendirme kaydı bekleniyor...'}
                </pre>
             </div>
          </div>
       </div>

    </div>
  );
}
