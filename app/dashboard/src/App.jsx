import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageSquare, Plus, FolderClosed, Settings, Archive, Trash2, 
  MoreVertical, Bot, Sparkles, BrainCircuit, Wand2, 
  Paperclip, Send, X, TerminalSquare, Activity, ShieldAlert,
  ChevronDown, ChevronRight, Zap, Database, Lock, Palette,
  CheckCircle2, FileCode2, Sun, Moon, User, Key, MessageCircle, FileText,
  UserCircle, ImagePlus, Cpu, Globe, Menu, PanelLeftClose, Search, DownloadCloud, Check,
  Edit2, FolderInput, Loader, Power, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UI_API } from './api';
import './index.css';

// --- Views ---
import HomeView from './views/HomeView.jsx';
import ArenaView from './views/ArenaView.jsx';
import AgentHubView, { FolderActionMenu, ChatActionMenu } from './views/AgentHubView.jsx';
import AgentForgeView from './views/AgentForgeView.jsx';
import AgentSettingsView from './views/AgentSettingsView.jsx';
import SettingsView from './views/SettingsView.jsx';
import LogsView from './views/LogsView.jsx';
import ArchiveView from './views/ArchiveView.jsx';

// --- Components ---
import { NavItem, MdBlock } from './components/SharedUI.jsx';
import { SkillMarketModal } from './components/SkillMarket.jsx';
import TelemetryView from './components/TelemetryView.jsx';
import UserProfileModal from './components/UserProfileModal.jsx';

// --- MAIN APP ---
export default function App() {
  const [activeView, setActiveView] = useState('home'); 
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [canvasContent, setCanvasContent] = useState(null);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [isSkillMarketOpen, setSkillMarketOpen] = useState(false);
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [selectedAgentForConfig, setSelectedAgentForConfig] = useState(null);
  const [temperature, setTemperature] = useState(0.7);
  const [imageQuality, setImageQuality] = useState('fast');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [userProfile, setUserProfile] = useState({ name: '', surname: '', bio: '' });
  
  // Real Data States
  const [agents, setAgents] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null); 
  const [folders, setFolders] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [marketSkills, setMarketSkills] = useState([]);
  const [systemLogs, setSystemLogs] = useState("");
  const [isLoadingAgents, setLoadingAgents] = useState(true);
  const [isLoadingThreads, setLoadingThreads] = useState(false);
  const [activeThreadTitle, setActiveThreadTitle] = useState(null);
  const [errorToast, setErrorToast] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const cancelStreamRef = useRef(null);

  const showError = (msg) => { setErrorToast(msg); setTimeout(() => setErrorToast(null), 4000); };

  // S2: Offline/Online dinleyici
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  // UI Interactive States
  const [chatDropdownOpen, setChatDropdownOpen] = useState(null);
  const [chatMenuPos, setChatMenuPos] = useState({ top: 0, right: 0 });
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(null);
  const [folderMenuPos, setFolderMenuPos] = useState({ top: 0, right: 0 });
  const [isWorkspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [isAddingFolder, setAddingFolder] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // Theme & Security Controllers
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('appTheme') || 'sepia');
  const [glowTheme, setGlowTheme] = useState(() => localStorage.getItem('glowTheme') || 'indigo');
  const [shieldActive, setShieldActive] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    setLoadingAgents(true);
    UI_API.fetchAgents().then(async data => {
      const agentList = data || [];
      setAgents(agentList);
      setLoadingAgents(false);
      const lastId = localStorage.getItem('lastAgentId');
      if (lastId && agentList.length > 0) {
        const agent = agentList.find(a => a.id === lastId);
        if (agent) {
          try {
            setLoadingThreads(true);
            const [f, t, cfg] = await Promise.all([
              UI_API.fetchFolders(agent.id),
              UI_API.fetchThreads(agent.id),
              UI_API.fetchAgentConfig(agent.id).catch(() => null)
            ]);
            setActiveAgent(agent);
            setFolders(f || []);
            setThreads(t || []);
            if (cfg?.model) setSelectedModel(cfg.model);
            if (typeof cfg?.temperature === 'number') setTemperature(cfg.temperature);
            if (typeof cfg?.thinking_mode === 'boolean') setThinkingMode(cfg.thinking_mode);
            setLoadingThreads(false);
          } catch (e) { setLoadingThreads(false); }
        }
      }
    }).catch(() => setLoadingAgents(false));
    UI_API.fetchMarketSkills().then(data => setMarketSkills(data || []));
    UI_API.fetchUserProfile().then(data => {
      if (data?.name) setUserProfile({ name: data.name, surname: data.surname || '', bio: data.bio || '' });
    }).catch(() => {});
    
    const logInterval = setInterval(() => {
      UI_API.fetchLogs().then(data => {
        if (data && data.logs) setSystemLogs(data.logs);
      }).catch(() => {});
    }, 2000);
    
    return () => clearInterval(logInterval);
  }, []);

  useEffect(() => {
    localStorage.setItem('appTheme', appTheme);
    document.documentElement.setAttribute('data-theme', appTheme === 'dark' ? 'dark' : 'sepia');
  }, [appTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-glow', glowTheme);
    localStorage.setItem('glowTheme', glowTheme);
  }, [glowTheme]);

  // Click Outside Handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chatDropdownOpen && !e.target.closest('.chat-item-menu') && !e.target.closest('.chat-portal-menu')) setChatDropdownOpen(null);
      if (folderDropdownOpen && !e.target.closest('.folder-item-menu') && !e.target.closest('.folder-portal-menu')) setFolderDropdownOpen(null);
      if (isWorkspaceDropdownOpen && !e.target.closest('.workspace-selector')) setWorkspaceDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chatDropdownOpen, folderDropdownOpen, isWorkspaceDropdownOpen]);

  // --- HANDLERS ---
  const handleAgentSwitch = useCallback(async (agent) => {
    if (!agent) return;
    if (cancelStreamRef.current) { cancelStreamRef.current(); cancelStreamRef.current = null; }
    setIsStreaming(false);
    setApprovalRequest(null);
    setActiveAgent(agent);
    localStorage.setItem('lastAgentId', agent.id);
    setWorkspaceDropdownOpen(false);
    setActiveThreadId(null);
    setChatHistory([]);
    setActiveThreadTitle(null);
    try {
      setLoadingThreads(true);
      const [f, t, cfg] = await Promise.all([
        UI_API.fetchFolders(agent.id),
        UI_API.fetchThreads(agent.id),
        UI_API.fetchAgentConfig(agent.id).catch(() => null)
      ]);
      setFolders(f || []);
      setThreads(t || []);
      if (cfg?.model) setSelectedModel(cfg.model);
      if (typeof cfg?.temperature === 'number') setTemperature(cfg.temperature);
      if (typeof cfg?.thinking_mode === 'boolean') setThinkingMode(cfg.thinking_mode);
      setLoadingThreads(false);
      if (activeView !== 'telemetry' && activeView !== 'settings' && activeView !== 'logs' && activeView !== 'archive') {
        setActiveView('arena');
      }
    } catch (err) { setLoadingThreads(false); console.error("Failed to switch agent:", err); }
  }, [activeView]);

  const handleCreateAgent = async (name, opts = {}) => {
    if (!name?.trim()) return;
    try {
      const newAgent = await UI_API.createAgent(name);
      setAgents(prev => [...prev, newAgent]);
      if (opts.model || opts.system_prompt || opts.api_key || opts.telegram_bot_token || opts.vertex_project) {
        await UI_API.updateAgentConfig(newAgent.id, {
          model: opts.model || 'gemini-2.5-flash',
          system_prompt: opts.system_prompt || '',
          api_key: opts.api_key || '',
          telegram_bot_token: opts.telegram_bot_token || '',
          vertex_project: opts.vertex_project || '',
          vertex_location: opts.vertex_location || '',
          temperature: 0.7, token_limit: 20000, thinking_mode: false,
        }).catch(() => {});
      }
      handleAgentSwitch(newAgent);
    } catch (err) { console.error("Failed to create agent:", err); showError('Ajan oluşturulamadı: ' + err.message); }
  };

  const handleThreadAction = async (action, threadId, value) => {
    if (!activeAgent) return;
    try {
      if (action === 'rename') await UI_API.renameThread(activeAgent.id, threadId, value);
      if (action === 'archive') await UI_API.archiveThread(activeAgent.id, threadId);
      if (action === 'unarchive') await UI_API.unarchiveThread(activeAgent.id, threadId);
      if (action === 'delete') {
        await UI_API.deleteThread(activeAgent.id, threadId);
        if (activeThreadId === threadId) { setActiveThreadId(null); setChatHistory([]); setActiveThreadTitle(null); }
      }
      if (action === 'move') await UI_API.moveThread(activeAgent.id, threadId, value);
      const t = await UI_API.fetchThreads(activeAgent.id);
      setThreads(t || []);
      setChatDropdownOpen(null);
    } catch (err) { console.error(`Thread action ${action} failed:`, err); showError(`İşlem başarısız: ${err.message}`); }
  };

  const handleThreadSelect = async (threadId) => {
    setActiveThreadId(threadId);
    setActiveView('arena');
    const selectedThread = threads.find(t => t.id === threadId);
    setActiveThreadTitle(selectedThread?.title || null);
    try {
      const history = await UI_API.fetchThreadHistory(activeAgent.id, threadId);
      setChatHistory(history || []);
    } catch (err) { console.error("Failed to fetch thread history:", err); }
  };

  const handleSendMessage = async (text, attachedImages = [], attachedFiles = []) => {
    if (!activeAgent || (!text.trim() && attachedImages.length === 0 && attachedFiles.length === 0)) return;
    const prevHistory = chatHistory.filter(m => m.content || (m.images && m.images.length > 0) || (m.files && m.files.length > 0));
    const userMsg = { role: 'user', content: text, images: attachedImages, files: attachedFiles };
    setChatHistory(prev => [...prev, userMsg, { role: 'agent', content: '', thinking: '' }]);
    setIsStreaming(true);
    
    let hiddenSystemText = '';
    if (attachedFiles.length > 0) {
        hiddenSystemText = `\n\n[SİSTEM BİLGİSİ - YENİ DOSYALAR EKLENDİ]\nKullanıcı aşağıdaki dosyaları çalışma alanına yükledi. Mimar talimat vermese dahi, inisiyatif alarak bu dosyaları analiz et ve içeriğini kullanıcının talebine göre değerlendir:\n${attachedFiles.map(f => f.absolutePath).join('\n')}`;
    }

    try {
      const cancelFn = UI_API.streamChat(
        activeAgent.id,
        { 
          message: text + hiddenSystemText, 
          images: attachedImages, 
          history: prevHistory, 
          threadId: activeThreadId, 
          configOverrides: { thinkingEnabled: thinkingMode, temperature, model: selectedModel, imageQuality, aspectRatio } 
        },
        (data) => {
          if (data.partial) {
            if (data.type === 'approval_required') {
              setApprovalRequest({ requestId: data.requestId, tool: data.tool, message: data.message || `Güvenlik onayı bekleniyor: ${data.tool}` });
            }
            setChatHistory(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (!last || last.role !== 'agent') return prev;
              if (data.type === 'thinking_chunk') { last.thinking = (last.thinking || '') + data.text; last.agentStatus = "🤔 Düşünüyor..."; }
              else if (data.type === 'tool_call') { last.agentStatus = `🔧 ARAÇ ÇAĞRILDI: ${data.name}`; }
              else if (data.type === 'approval_required') { last.agentStatus = `⚠️ ONAY BEKLENİYOR (FRONTEND ALDI): ${data.tool}`; }
              else if (data.type === 'tool_result') { last.agentStatus = `✅ ARAÇ BİTTİ: ${data.name}`; }
              else if (data.type === 'react_loop') { last.agentStatus = `🔄 DÖNGÜ #${data.loop}`; }
              else if (data.type === 'status') { last.agentStatus = data.text; }
              else if (data.type === 'content_chunk') { last.content = (last.content || '') + data.text; }
              return [...updated];
            });
            return;
          }
          setChatHistory(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last) { last.content = data.content != null ? data.content : last.content; last.thinking = data.thinking != null ? data.thinking : last.thinking; last.agentStatus = null; }
            if (data.threadId && !activeThreadId) setActiveThreadId(data.threadId);
            return updated;
          });
        },
        (err) => {
          setIsStreaming(false); setApprovalRequest(null);
          setChatHistory(prev => {
            const updated = [...prev]; const last = updated[updated.length - 1];
            if (last && last.role === 'agent' && !last.content) {
              const errStr = String(err || '');
              if (errStr.includes('SECURITY_SHIELD_BLOCK')) { last.content = '🛡️ **Güvenlik Kalkanı Devreye Girdi**\n\nMesajınız güvenlik protokolleri tarafından engellenmiştir.'; }
              else if (errStr.includes('SHIELD_WALLET_ERROR')) { last.content = '🔑 **API Anahtarı Eksik**\n\nGüvenlik kalkanı için geçerli bir API anahtarına ihtiyaç var.'; }
              else if (errStr.includes('rate limit') || errStr.includes('429')) { last.content = '⏱️ **Çok Fazla İstek**\n\nLütfen bir dakika bekleyip tekrar deneyin.'; }
              else { last.content = `⚠️ **Sistem Hatası**\n\n\`${errStr}\``; }
            }
            return updated;
          });
        },
        () => { setIsStreaming(false); setApprovalRequest(null); cancelStreamRef.current = null; UI_API.fetchThreads(activeAgent.id).then(setThreads); }
      );
      cancelStreamRef.current = cancelFn;
    } catch (e) { setIsStreaming(false); }
  };

  const handleStopStream = () => {
    if (cancelStreamRef.current) { cancelStreamRef.current(); cancelStreamRef.current = null; }
    setIsStreaming(false); setApprovalRequest(null);
    setChatHistory(prev => {
      const updated = [...prev]; const last = updated[updated.length - 1];
      if (last && last.role === 'agent' && !last.content) { last.content = '_(Durduruldu)_'; }
      else if (last && last.role === 'agent') { last.content = (last.content || '') + '\n\n_(Kullanıcı tarafından durduruldu)_'; }
      if (last) last.agentStatus = null;
      return updated;
    });
  };

  const handleFolderAction = async (action, folderId, value) => {
    if (!activeAgent) return;
    try {
      if (action === 'create') await UI_API.createFolder(activeAgent.id, value);
      if (action === 'rename') await UI_API.renameFolder(activeAgent.id, folderId, value);
      if (action === 'delete') await UI_API.deleteFolder(activeAgent.id, folderId);
      const f = await UI_API.fetchFolders(activeAgent.id);
      setFolders(f || []); setFolderDropdownOpen(null); setAddingFolder(false);
    } catch (err) { console.error(`Folder action ${action} failed:`, err); showError(`Klasör işlemi başarısız: ${err.message}`); }
  };

  const navigateToAgentConfig = (agent) => { setSelectedAgentForConfig(agent); setActiveView('agentSettings'); };

  const handleAgentDelete = async (agentId) => {
    if (!confirm('Bu ajanı yok etmek istediğinize emin misiniz?')) return;
    try {
      await UI_API.deleteAgent(agentId);
      const updated = agents.filter(a => a.id !== agentId);
      setAgents(updated);
      if (activeAgent?.id === agentId) { setActiveAgent(updated.length > 0 ? updated[0] : null); }
      setActiveView('agentHub');
    } catch (err) { console.error("Agent deletion failed:", err); }
  };

  // --- THEME ---
  const theme = {
    dark: { bg: 'bg-[#050505]', sidebarBg: 'bg-[#0A0A0A]/95', headerBg: 'bg-[#0A0A0A]/80', textMain: 'text-slate-300', textMuted: 'text-slate-500', border: 'border-white/10', card: 'bg-[#0A0A0A]', cardHover: 'hover:bg-white/5', input: 'bg-[#050505] text-slate-200 placeholder:text-slate-600', bottomBar: 'bg-[#0A0A0A] border-white/10', canvasBg: 'bg-[#050505]', consoleBg: 'bg-black', modalOverlay: 'bg-black/80 backdrop-blur-md' },
    sepia: { bg: 'bg-[#FDFBF7]', sidebarBg: 'bg-[#F4F1EA]/95', headerBg: 'bg-[#F4F1EA]/80', textMain: 'text-slate-800', textMuted: 'text-slate-500', border: 'border-amber-900/10', card: 'bg-white', cardHover: 'hover:bg-amber-900/5', input: 'bg-white text-slate-800 placeholder:text-slate-400', bottomBar: 'bg-white border-amber-900/10 shadow-xl', canvasBg: 'bg-[#FDFBF7]', consoleBg: 'bg-[#F4F1EA]', modalOverlay: 'bg-amber-900/20 backdrop-blur-md' }
  };
  const currentTheme = theme[appTheme];
  const glowStyles = {
    indigo: 'bg-indigo-500/15 shadow-indigo-500/20 text-indigo-400 border-indigo-500/50',
    cyan: 'bg-cyan-500/15 shadow-cyan-500/20 text-cyan-400 border-cyan-500/50',
    emerald: 'bg-emerald-500/15 shadow-emerald-500/20 text-emerald-400 border-emerald-500/50',
    rose: 'bg-rose-500/15 shadow-rose-500/20 text-rose-400 border-rose-500/50',
  };
  const getGlowColor = (type, index) => { const style = glowStyles[type] || glowStyles.indigo; return style.split(' ')[index] || ''; };

  // --- RENDER ---
  return (
    <div className={`flex h-screen w-full ${currentTheme.bg} ${currentTheme.textMain} font-sans overflow-hidden transition-colors duration-500`}>
      
      {appTheme === 'dark' && (
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[400px] blur-[140px] rounded-full pointer-events-none transition-colors duration-1000 ${getGlowColor(glowTheme, 0)}`} />
      )}

      {/* --- SIDEBAR --- */}
      <nav aria-label="Ana Gezinme" className={`${isSidebarOpen ? 'w-64 md:w-64' : 'w-0 opacity-0 overflow-hidden'} flex-shrink-0 transition-all duration-300 ease-in-out border-r ${currentTheme.border} ${currentTheme.sidebarBg} backdrop-blur-2xl flex flex-col z-20`}>
        <div className={`h-14 px-4 flex items-center justify-between border-b ${currentTheme.border}`}>
          <div onClick={() => window.open("https://AgentsHUB.com.tr", "_blank")} className="flex items-center gap-2 font-bold tracking-widest text-sm uppercase hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/Logo.png" alt="AgentsHUB" className="w-14 h-14 object-contain" style={{filter:'drop-shadow(0 0 6px rgba(99,102,241,0.5))'}} onError={e => { e.target.style.display='none'; }} />
            <span className="whitespace-nowrap overflow-hidden">AgentsHUB</span>
          </div>
        </div>

        <div className="p-4">
          <button onClick={() => { setActiveView('home'); setActiveThreadId(null); setChatHistory([]); }} className={`w-full flex items-center justify-center gap-2 border ${currentTheme.border} ${currentTheme.cardHover} rounded-md p-2.5 transition-all duration-300 whitespace-nowrap overflow-hidden`}>
            <Plus size={16} />
            <span className="font-semibold tracking-wide text-xs uppercase">Yeni Görev</span>
          </button>
        </div>

        <div className={`px-4 pb-4 flex flex-col gap-1 border-b ${currentTheme.border}`}>
            <NavItem active={activeView === 'arena'} onClick={() => setActiveView('arena')} icon={<MessageSquare size={16} />} label="Sohbet" currentTheme={currentTheme} isSidebarOpen={isSidebarOpen} />
            <NavItem active={activeView === 'agentHub' || activeView === 'agentSettings' || activeView === 'forge'} onClick={() => setActiveView('agentHub')} icon={<Bot size={16} />} label="Ajan Merkezi" currentTheme={currentTheme} isSidebarOpen={isSidebarOpen} />
        </div>

        <div className="flex-1 overflow-y-auto py-4 flex flex-col custom-scrollbar">
          {/* Workspace Selector */}
          <div className={`px-3 mb-6 workspace-selector relative ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
             <div className="flex items-center justify-between mb-2 px-1">
               <label className={`text-[10px] font-bold ${currentTheme.textMuted} uppercase tracking-widest block`}>Aktif Ajan</label>
               <button onClick={() => activeAgent ? navigateToAgentConfig(activeAgent) : setActiveView('agentHub')} className={`p-1.5 rounded-lg ${currentTheme.cardHover} text-indigo-400 border border-transparent hover:border-indigo-500/30 transition-all flex items-center gap-1.5 group`} title="Ajan Ayarları">
                 <Settings size={12} className="group-hover:rotate-45 transition-transform" />
                 <span className="text-[8px] font-bold uppercase hidden group-hover:block">Ayarlar</span>
               </button>
             </div>

             <button onClick={() => setWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)} className={`w-full flex items-center justify-between ${activeAgent ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/20 border-white/5'} border rounded-xl px-4 py-3 text-xs font-bold tracking-wider uppercase transition-all hover:scale-[1.02]`}>
               <div className="flex items-center gap-2 overflow-hidden">
                 {isLoadingAgents ? (<Loader size={10} className="animate-spin text-slate-400 flex-shrink-0" />) : (<div className={`w-2 h-2 rounded-full flex-shrink-0 ${activeAgent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />)}
                 <span className="truncate">{isLoadingAgents ? 'Yükleniyor...' : (activeAgent?.name || activeAgent?.id || 'Ajan Seçilmedi')}</span>
               </div>
               <ChevronDown size={14} className={currentTheme.textMuted} />
             </button>

             <AnimatePresence>
               {isWorkspaceDropdownOpen && (
                 <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className={`absolute top-14 left-3 right-3 ${currentTheme.card} border ${currentTheme.border} rounded-lg shadow-2xl z-50 overflow-hidden`}>
                    <div className={`p-2 text-[9px] font-bold ${currentTheme.textMuted} uppercase tracking-widest border-b ${currentTheme.border}`}>Ajan Listesi</div>
                   <div className="max-h-48 overflow-y-auto">
                     {agents.map(a => (
                       <div key={a.id} onClick={() => handleAgentSwitch(a)} className={`px-4 py-2.5 cursor-pointer text-xs font-bold uppercase hover:${currentTheme.textMain} ${activeAgent?.id === a.id ? 'bg-indigo-500/10 text-indigo-400' : currentTheme.textMuted}`}>
                         {a.name || a.id}
                       </div>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          <div className="px-2 space-y-4">
              <div className="px-3 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Klasörler</div>
                <button onClick={() => setAddingFolder(true)} className={`p-1 rounded hover:bg-white/5 text-slate-500 hover:text-indigo-400 transition-colors ${!activeAgent ? 'opacity-0 pointer-events-none' : ''}`} title="Klasör Ekle"><Plus size={12} /></button>
              </div>

              {isAddingFolder && (
                <div className="px-3 py-2 animate-in slide-in-from-top-2">
                  <input autoFocus
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && !e.currentTarget.dataset.submitting) handleFolderAction('create', null, v); else setAddingFolder(false); }}
                    onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { e.preventDefault(); e.currentTarget.dataset.submitting = 'true'; handleFolderAction('create', null, e.target.value.trim()); } if (e.key === 'Escape') setAddingFolder(false); }}
                    placeholder="Klasör Adı... (Enter)"
                    className={`w-full bg-black/20 border-b ${currentTheme.border} px-1 py-1 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-indigo-500`} />
                </div>
              )}
              
              {folders.map(folder => (
                <div key={folder.id} className="space-y-1">
                  <div onClick={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)} className={`group flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${currentTheme.textMuted} hover:${currentTheme.textMain} cursor-pointer relative`}>
                     <div className="flex items-center gap-2">
                       {activeFolderId === folder.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                       <FolderClosed size={12} />
                       {folder.name}
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setFolderMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right + 4 }); setFolderDropdownOpen(folderDropdownOpen === folder.id ? null : folder.id); }} className="folder-item-menu opacity-0 group-hover:opacity-100 p-1 rounded-sm"><MoreVertical size={10}/></button>
                     {folderDropdownOpen === folder.id && <FolderActionMenu folder={folder} onAction={handleFolderAction} currentTheme={currentTheme} position={folderMenuPos} />}
                   </div>
                  {activeFolderId === folder.id && (
                    <div className="pl-6 space-y-1">
                      {threads.filter(t => t.folder_id === folder.id).map(t => (
                        <div key={t.id} onClick={() => handleThreadSelect(t.id)} className={`chat-item-menu group flex items-center justify-between px-3 py-1.5 rounded text-xs transition-all ${activeThreadId === t.id ? currentTheme.textMain + ' bg-white/5' : currentTheme.textMuted} hover:${currentTheme.textMain} cursor-pointer`}>
                          <span className="truncate">{t.title || 'İsimsiz Sohbet'}</span>
                          <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setChatMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right + 4 }); setChatDropdownOpen(chatDropdownOpen === t.id ? null : t.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded-sm flex-shrink-0"><MoreVertical size={10}/></button>
                          {chatDropdownOpen === t.id && <ChatActionMenu thread={t} onAction={handleThreadAction} currentTheme={currentTheme} folders={folders} position={chatMenuPos} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* General Chats (No Folder) */}
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4 flex items-center gap-2">
                Geçmiş
                {isLoadingThreads && <Loader size={8} className="animate-spin text-slate-500" />}
              </div>
              <div className="space-y-1 mt-2">
                 {isLoadingThreads ? (
                   <div className="px-3 space-y-2">{[1,2,3].map(i => <div key={i} className="h-6 rounded bg-white/5 animate-pulse" />)}</div>
                 ) : threads.filter(t => !t.folder_id && !t.is_archived).map(t => (
                   <div key={t.id} onClick={() => handleThreadSelect(t.id)} className={`chat-item-menu group flex items-center justify-between px-3 py-1.5 rounded-md text-xs ${activeThreadId === t.id ? 'bg-white/5 ' + currentTheme.textMain : currentTheme.textMuted} hover:${currentTheme.textMain} cursor-pointer`}>
                     <span className="truncate min-w-0">{t.title || 'İsimsiz Sohbet'}</span>
                     <button onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setChatMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right + 4 }); setChatDropdownOpen(chatDropdownOpen === t.id ? null : t.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded-sm flex-shrink-0"><MoreVertical size={10}/></button>
                     {chatDropdownOpen === t.id && <ChatActionMenu thread={t} onAction={handleThreadAction} currentTheme={currentTheme} folders={folders} position={chatMenuPos} />}
                   </div>
                 ))}
              </div>
          </div>
        </div>

        <div className={`p-3 border-t ${currentTheme.border} transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1 mb-2">
            <button onClick={() => setActiveView('telemetry')} title="Sistem Gözetimi" className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeView === 'telemetry' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : currentTheme.textMuted + ' hover:bg-white/5 border border-transparent'}`}>
              <Activity size={12} /> <span>İzleme</span>
            </button>
            <button onClick={() => setActiveView('logs')} title="Konsol" className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeView === 'logs' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : currentTheme.textMuted + ' hover:bg-white/5 border border-transparent'}`}>
              <TerminalSquare size={12} /> <span>Konsol</span>
            </button>
            <button onClick={() => setActiveView('archive')} title="Arşiv" className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${activeView === 'archive' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : currentTheme.textMuted + ' hover:bg-white/5 border border-transparent'}`}>
              <Archive size={12} /> <span>Arşiv</span>
            </button>
          </div>
          <button onClick={() => setActiveView('settings')} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeView === 'settings' ? 'bg-white/10 text-indigo-400' : currentTheme.textMuted + ' hover:bg-white/5'}`}>
            <Settings size={13} /> Global Ayarlar
          </button>
        </div>
        <div className={`px-5 py-3 text-[11px] font-bold tracking-widest uppercase text-white bg-indigo-500 border-t ${currentTheme.border} select-none text-center shadow-[0_0_15px_rgba(99,102,241,0.5)]`}>
            BETA V1.5
        </div>
      </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <header className={`h-14 flex items-center justify-between px-4 border-b ${currentTheme.border} ${currentTheme.headerBg} backdrop-blur-md z-10`}>
           <div className="flex items-center gap-4">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-md ${currentTheme.cardHover} ${currentTheme.textMuted}`}>
               {isSidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
             </button>
             <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase truncate max-w-[400px]">
               <span className={activeView !== 'home' ? 'opacity-40 cursor-pointer hover:opacity-70' : ''} onClick={() => setActiveView('home')}>HOME</span>
               {activeAgent && (activeView === 'arena' || activeView === 'agentSettings') && <><span className="opacity-30">/</span><span className="opacity-60">{activeAgent.name || activeAgent.id}</span></>}
               {activeView === 'arena' && activeThreadTitle && <><span className="opacity-30">/</span><span className="truncate max-w-[160px]">{activeThreadTitle}</span></>}
               {activeView === 'arena' && !activeThreadTitle && <><span className="opacity-30">/</span><span className="opacity-50">Yeni Sohbet</span></>}
               {activeView !== 'arena' && activeView !== 'home' && <><span className="opacity-30">/</span><span>{{agentHub:'Ajan Merkezi',forge:'Forge',agentSettings:'Ajan Ayarları',telemetry:'Telemetri',logs:'Konsol',archive:'Arşiv',settings:'Ayarlar'}[activeView] || activeView}</span></>}
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             {appTheme === 'dark' && (
               <div className="flex items-center gap-2">
                 {Object.keys(glowStyles).map(g => (
                    <button key={g} onClick={() => setGlowTheme(g)} className={`w-3.5 h-3.5 rounded-full border border-white/20 transition-all ${glowTheme === g ? 'scale-125 ring-2 ring-white/10' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: g === 'indigo' ? '#6366f1' : g === 'cyan' ? '#06b6d4' : g === 'emerald' ? '#10b981' : '#f43f5e' }} />
                 ))}
               </div>
             )}
             <div className={`w-px h-4 ${appTheme === 'dark' ? 'bg-white/10' : 'bg-amber-900/10'}`}></div>
             <button onClick={() => setAppTheme(appTheme === 'dark' ? 'sepia' : 'dark')} className={`p-2 rounded-full ${currentTheme.cardHover} ${currentTheme.textMuted}`}>
               {appTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button onClick={() => setUserModalOpen(true)} title="Profil" className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${appTheme === 'dark' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-white'}`}>
                {userProfile.name ? userProfile.name.slice(0,1).toUpperCase() + (userProfile.surname || '').slice(0,1).toUpperCase() : 'UK'}
             </button>
           </div>
        </header>

        <main role="main" aria-label="Ana İçerik" className="flex-1 relative overflow-hidden overflow-y-auto custom-scrollbar">
           <AnimatePresence>
             <motion.div key={activeView} initial={{opacity:0, filter:'blur(4px)'}} animate={{opacity:1, filter:'blur(0px)'}} exit={{opacity:0, position:'absolute', top:0, left:0, right:0}} transition={{duration:0.15}} className="h-full w-full">
               {activeView === 'home' && <HomeView setActiveView={setActiveView} currentTheme={currentTheme} appTheme={appTheme} agents={agents} handleAgentSwitch={handleAgentSwitch} activeAgent={activeAgent} />}
               {activeView === 'arena' && (
                 activeAgent ? (
                   <ArenaView history={chatHistory} onSend={handleSendMessage} isStreaming={isStreaming} approvalRequest={approvalRequest}
                     onApprove={async (approved) => { try { await UI_API.approveRequest(approvalRequest.requestId, approved); setApprovalRequest(null); } catch (e) { showError(e.message); } }}
                     currentTheme={currentTheme} appTheme={appTheme} activeAgent={activeAgent} thinkingMode={thinkingMode} setThinkingMode={setThinkingMode}
                     setCanvasContent={setCanvasContent} canvasContent={canvasContent} temperature={temperature} setTemperature={setTemperature}
                     selectedModel={selectedModel} setSelectedModel={setSelectedModel} onModelChange={() => {}} onStop={handleStopStream} />
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center p-20 text-center animate-in fadeIn">
                      <div className="p-8 bg-indigo-500/10 rounded-full text-indigo-400 mb-6 animate-bounce"><Bot size={48}/></div>
                      <h2 className="text-2xl font-bold uppercase tracking-widest mb-4">Ajan Seçilmedi</h2>
                      <p className="max-w-md text-slate-500 text-sm font-medium leading-relaxed mb-8 uppercase tracking-wide">Sohbet başlatmak için bir ajan seç veya yenisini oluştur.</p>
                      <button onClick={() => setActiveView('agentHub')} className="px-12 py-4 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-indigo-500 transition-all">Ajan Merkezine Git</button>
                   </div>
                 )
               )}
               {activeView === 'agentHub' && <AgentHubView setActiveView={setActiveView} agents={agents} currentTheme={currentTheme} appTheme={appTheme} handleAgentSwitch={handleAgentSwitch} navigateToAgentConfig={navigateToAgentConfig} setSkillMarketOpen={setSkillMarketOpen} />}
               {activeView === 'forge' && <AgentForgeView onCreate={handleCreateAgent} currentTheme={currentTheme} appTheme={appTheme} setActiveView={setActiveView} setSkillMarketOpen={setSkillMarketOpen} />}
               {activeView === 'agentSettings' && <AgentSettingsView agent={selectedAgentForConfig} currentTheme={currentTheme} appTheme={appTheme} setSkillMarketOpen={setSkillMarketOpen} handleAgentDelete={handleAgentDelete} />}
               {activeView === 'telemetry' && <TelemetryView currentTheme={currentTheme} appTheme={appTheme} activeAgent={activeAgent} agents={agents} systemLogs={systemLogs} />}
               {activeView === 'logs' && <LogsView currentTheme={currentTheme} appTheme={appTheme} systemLogs={systemLogs} />}
               {activeView === 'archive' && <ArchiveView currentTheme={currentTheme} activeAgent={activeAgent} onRestore={handleThreadAction} activeView={activeView} />}
               {activeView === 'settings' && <SettingsView currentTheme={currentTheme} appTheme={appTheme} shieldActive={shieldActive} setShieldActive={setShieldActive} />}
             </motion.div>
           </AnimatePresence>
        </main>
      </div>

      {/* --- GLOBAL TOAST & BANNERS --- */}
      <AnimatePresence>
        {errorToast && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 bg-red-500/90 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-md">
            <ShieldAlert size={14}/> {errorToast}
            <button onClick={() => setErrorToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={12}/></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOffline && (
          <motion.div initial={{opacity:0,y:-40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-40}}
            className="fixed top-0 left-0 right-0 z-[600] px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold uppercase tracking-widest text-center shadow-2xl flex items-center justify-center gap-2">
            <span className="animate-pulse">🔴</span> İnternet bağlantısı kesildi — Çevrimiçi olduğunuzda otomatik devam edecek.
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {canvasContent && (
          <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring', damping:25, stiffness:200}} className={`fixed right-0 top-0 h-full w-[500px] ${currentTheme.canvasBg} border-l ${currentTheme.border} shadow-2xl z-40 flex flex-col`}>
             <div className={`h-14 flex items-center justify-between px-6 border-b ${currentTheme.border}`}>
               <div className="flex items-center gap-2 font-bold tracking-widest text-xs uppercase">
                 <TerminalSquare size={16} className={currentTheme.textMuted} />
                 <span>Kanvas Yüzeyi</span>
               </div>
               <button onClick={() => setCanvasContent(null)} className={`p-1.5 ${currentTheme.textMuted} hover:${currentTheme.textMain} ${currentTheme.cardHover} rounded-md`}>
                 <X size={16} />
               </button>
             </div>
             <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className={`text-[10px] ${currentTheme.textMuted} uppercase tracking-widest font-bold mb-4`}>Workspace/Active_Analysis.md</div>
                 <div className={`${currentTheme.consoleBg} border ${currentTheme.border} rounded-md p-5 text-sm leading-relaxed overflow-x-auto`}>
                   <div className={appTheme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                     {typeof canvasContent === 'string' ? <MdBlock text={canvasContent} /> : "Ajan analiz süreci burada görselleştirilecek..."}
                   </div>
                 </div>
             </div>
          </motion.div>
        )}
        {isSkillMarketOpen && <SkillMarketModal skills={marketSkills} onClose={() => setSkillMarketOpen(false)} currentTheme={currentTheme} appTheme={appTheme} activeAgent={activeView === 'agentSettings' ? selectedAgentForConfig : activeAgent} />}
        {isUserModalOpen && <UserProfileModal profile={userProfile} setProfile={setUserProfile} onClose={() => setUserModalOpen(false)} currentTheme={currentTheme} appTheme={appTheme} />}
      </AnimatePresence>
    </div>
  );
}
