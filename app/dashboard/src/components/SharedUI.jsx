import React from 'react';

// --- MARKDOWN RENDERER ---
export function renderInline(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

export function MdBlock({ text, className }) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      out.push(<pre key={i} className="bg-black/30 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-slate-300 whitespace-pre-wrap">{codeLines.join('\n')}</pre>);
    } else if (line.startsWith('### ')) {
      out.push(<h3 key={i} className="text-sm font-bold mt-3 mb-1 text-indigo-300">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      out.push(<h2 key={i} className="text-base font-bold mt-4 mb-1">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      out.push(<h1 key={i} className="text-lg font-bold mt-4 mb-2">{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      out.push(<li key={i} className="ml-4 list-disc text-sm leading-relaxed">{renderInline(line.slice(2))}</li>);
    } else if (/^\d+\. /.test(line)) {
      out.push(<li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{renderInline(line.replace(/^\d+\. /, ''))}</li>);
    } else if (line.trim() === '' || line === '---') {
      out.push(<div key={i} className="h-2" />);
    } else {
      out.push(<p key={i} className="text-sm leading-relaxed mb-1">{renderInline(line)}</p>);
    }
    i++;
  }
  return <div className={className}>{out}</div>;
}

// --- COMMON UI COMPONENTS ---

export function NavItem({ active, onClick, icon, label, currentTheme, isSidebarOpen }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${active ? (currentTheme.bg.includes('0505') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-100 text-amber-700 border border-amber-900/10') : 'text-slate-500 border border-transparent hover:' + currentTheme.cardHover}`}>
      <span className={active ? '' : 'opacity-60'}>{icon}</span>
      <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>{label}</span>
    </button>
  );
}

export function SettingsInput({ label, type, placeholder, currentTheme, icon, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className={`text-[10px] font-bold ${currentTheme.textMuted} uppercase tracking-widest flex items-center gap-2`}>{icon} {label}</label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value}
        onChange={onChange}
        className={`w-full ${currentTheme.card} border ${currentTheme.border} rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all placeholder:opacity-30 font-mono`} 
      />
    </div>
  );
}

export function SkillToggle({ name, data, active, onClick, currentTheme }) {
  const displayName = data?.name || name;
  const emoji = data?.emoji || '⚙️';
  const desc = data?.desc || `${name} sistem yeteneği`;

  return (
    <div onClick={onClick} title={desc} className={`flex items-center justify-between p-3.5 rounded-xl border ${currentTheme.border} ${active ? 'bg-indigo-500/10 border-indigo-500/30' : currentTheme.card} cursor-pointer hover:scale-[1.02] transition-all`}>
      <div className="flex flex-col gap-1 max-w-[80%]">
        <span className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${active ? 'text-indigo-400' : currentTheme.textMuted}`}>
          <span>{emoji}</span> <span>{displayName}</span>
        </span>
        {data?.file && <span className="text-[9px] font-mono text-slate-500 opacity-60 ml-6 truncate">{data.file}</span>}
      </div>
      <div className={`w-8 h-4 shrink-0 rounded-full relative transition-colors shadow-inner ${active ? 'bg-indigo-500' : 'bg-slate-700'}`}>
        <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all shadow-sm ${active ? 'right-1' : 'left-1'}`}></div>
      </div>
    </div>
  );
}

export function LightbulbIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={active ? "animate-pulse text-indigo-400" : "text-slate-500"}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

export function AnsiLine({ text }) {
  const ANSI_COLORS = {
    '30': 'text-gray-500', '31': 'text-red-400', '32': 'text-green-400',
    '33': 'text-yellow-300', '34': 'text-blue-400', '35': 'text-purple-400',
    '36': 'text-cyan-400', '37': 'text-gray-200', '90': 'text-gray-600',
    '91': 'text-red-300', '92': 'text-green-300', '93': 'text-yellow-200',
    '1': 'font-bold', '0': '', '': '',
  };
  const parts = text.split(/\u001b\[([0-9;]*)m/);
  const spans = [];
  let currentClasses = '';
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const codes = part.split(';');
      currentClasses = codes.map(c => ANSI_COLORS[c] || '').filter(Boolean).join(' ');
    } else if (part) {
      spans.push(<span key={i} className={currentClasses || undefined}>{part}</span>);
    }
  });
  return <>{spans}</>;
}
