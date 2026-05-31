import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Bot, BrainCircuit, Paperclip, Send, X, FileCode2,
  ChevronDown, Wand2, Globe, Check, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MdBlock, LightbulbIcon } from '../components/SharedUI.jsx';
import { UI_API } from '../api.js';

const CANVAS_LENGTH_THRESHOLD = 1500;

export default function ArenaView({ history, onSend, isStreaming, approvalRequest, onApprove, currentTheme, appTheme, activeAgent, thinkingMode, setThinkingMode, setCanvasContent, canvasContent, temperature, setTemperature, selectedModel, setSelectedModel, onModelChange, onStop, imageQuality, setImageQuality, aspectRatio, setAspectRatio }) {

  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelMenuPos, setModelMenuPos] = useState({ bottom: 80, left: 80 });
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef(null);
  const modelBtnRef = useRef(null);
  const fileInputRef = useRef(null);

  const MODELS = [
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
    { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
    { id: 'gemini-3-pro-image-preview', label: 'Gemini 3.0 Pro Image' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
  ];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  useEffect(() => {
    if (!modelMenuOpen) return;
    const handleOutside = (e) => { if (!e.target.closest('.model-selector')) setModelMenuOpen(false); };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [modelMenuOpen]);

  const handleSend = () => {
    if ((!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || isStreaming) return;
    onSend(input, attachedImages, attachedFiles);
    setInput('');
    setAttachedImages([]);
    setAttachedFiles([]);
  };

  const removeAttachedImage = (index) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processImageFileForVision = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target.result.split(',')[1];
      setAttachedImages(prev => [...prev, {
        base64: base64Data,
        mimeType: file.type,
        preview: ev.target.result
      }]);
    };
    reader.readAsDataURL(file);
  };

  const processFilesAction = async (files) => {
      if (!files.length || !activeAgent) return;
      
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      const otherFiles = files.filter(f => !f.type.startsWith('image/'));

      imageFiles.forEach(processImageFileForVision);
      
      if (otherFiles.length > 0) {
          setIsUploading(true);
          try {
              for (const file of otherFiles) {
                  const res = await UI_API.uploadFile(activeAgent.id, file);
                  if (res.success && res.absolutePath) {
                      setAttachedFiles(prev => [...prev, { name: res.originalName || file.name, absolutePath: res.absolutePath }]);
                  }
              }
          } catch (err) {
              alert("Dosya yüklenirken hata oluştu: " + err.message);
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
              const file = items[i].getAsFile();
              if (file) files.push(file);
          }
      }
      if (files.length > 0) {
          processFilesAction(files);
      }
  };

  const handleFileChange = async (e) => {
      const files = Array.from(e.target.files);
      await processFilesAction(files);
      e.target.value = null;
  };

  return (
    <div className="h-full flex flex-col relative w-full max-w-5xl mx-auto">
      <div className="flex justify-center mt-6 mb-2 absolute top-0 left-0 right-0 z-10">
        <div className={`px-4 py-1.5 rounded-full border ${currentTheme.border} ${currentTheme.card} text-[10px] ${currentTheme.textMuted} font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl backdrop-blur-md`}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          Sistem Aktif - {activeAgent?.name || 'Ajan'}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-20 space-y-8 pb-40 custom-scrollbar">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center flex-col gap-4">
             <div className="p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5">
               <Bot size={56} className="text-indigo-400" />
             </div>
             <p className="font-bold tracking-widest uppercase text-sm text-slate-400">Operasyon Bekliyor</p>
             <p className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">{activeAgent?.name || activeAgent?.id} · {selectedModel}</p>
          </div>
        ) : (
          history.map((msg, idx) => (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded border flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-800' : currentTheme.card + ' ' + currentTheme.border}`}>
                {msg.role === 'user' ? <span className="text-[10px] font-bold text-white">UK</span> : <Bot size={16} className="text-indigo-400"/>}
              </div>
              <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'agent' && msg.thinking && thinkingMode && (
                   <details className="mb-3 text-[11px] group" open={isStreaming && idx === history.length-1}>
                     <summary className="cursor-pointer flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold tracking-widest">
                       <BrainCircuit size={14} className={isStreaming && idx === history.length-1 ? 'animate-pulse text-indigo-400' : ''} /> Düşünme Süreci
                       {isStreaming && idx === history.length-1 && (
                         <>
                           <span className="text-indigo-400 normal-case tracking-normal font-normal">({msg.thinking.length} karakter)</span>
                           <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStop?.(); }} className="ml-2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 text-[9px] font-bold uppercase tracking-widest border border-red-500/30 transition-colors flex items-center gap-1">
                             <X size={9}/> Durdur
                           </button>
                         </>
                       )}
                     </summary>
                     <div className="mt-2 pl-3 border-l-2 border-slate-800 text-slate-400 font-mono text-[10px] py-1 max-w-xl max-h-64 overflow-y-auto">
                       <MdBlock text={msg.thinking} className="" />
                     </div>
                   </details>
                )}
                {msg.role === 'agent' && isStreaming && idx === history.length-1 && msg.agentStatus && !msg.content && !msg.thinking && (
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500 font-mono animate-pulse">
                    {msg.agentStatus}
                  </div>
                )}
                {msg.role === 'agent' && isStreaming && idx === history.length-1 && msg.agentStatus && (msg.content || msg.thinking) && (
                  <div className="mb-2 flex items-center gap-2 text-[11px] text-indigo-400 font-mono">
                    {msg.agentStatus}
                  </div>
                )}
                <div className={`p-4 rounded-xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'border ' + currentTheme.border + ' bg-black/5 ring-1 ring-white/5'}`}>
                  {msg.role === 'agent' && msg.content?.length > CANVAS_LENGTH_THRESHOLD
                    ? <>
                        <MdBlock text={msg.content.slice(0, 400) + '...'} className="" />
                        <button onClick={() => setCanvasContent(msg.content)} className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase text-indigo-400 hover:underline">
                          <FileCode2 size={11}/> Tamamı Kanvas'ta Görüntüle ({msg.content.length.toLocaleString()} karakter)
                        </button>
                      </>
                    : msg.content
                      ? <MdBlock text={msg.content} className="" />
                      : (isStreaming && idx === history.length-1
                          ? (
                              <div className="space-y-4">
                                {msg.thinking && (
                                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg text-xs font-mono text-indigo-300 whitespace-pre-wrap">
                                    <div className="flex items-center gap-2 mb-2 opacity-70 font-bold uppercase tracking-widest text-[9px]">
                                      <BrainCircuit size={12}/> Düşünme Süreci
                                    </div>
                                    {msg.thinking}
                                  </div>
                                )}
                                <span className="animate-pulse text-indigo-400 font-bold">{msg.thinking ? 'Yanıt yazılıyor...' : 'Düşünüyor...'}</span>
                              </div>
                            )
                          : '')
                  }

                 {/* Native Görüntü Render Desteği (Vision & Generated Images) */}
                 {msg.images && msg.images.length > 0 && (
                   <div className="mt-3 flex flex-wrap gap-2">
                     {msg.images.map((img, i) => (
                       <img key={i} src={img.base64 ? `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}` : (img.preview || '')} alt="Eklenti" className="max-w-[400px] max-h-[300px] object-contain rounded-lg border border-white/10 shadow-md" />
                     ))}
                   </div>
                 )}
                 {/* Native Dosya Render Desteği (User attach) */}
                 {msg.files && msg.files.length > 0 && (
                   <div className="mt-2 flex flex-col gap-1">
                     {msg.files.map((file, i) => (
                       <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 text-[10px] font-bold tracking-widest uppercase border border-white/5 opacity-80 backdrop-blur-sm self-end">
                         <Paperclip size={12} /> {file.name}
                       </div>
                     ))}
                   </div>
                 )}
                </div>
                {msg.role === 'agent' && idx === history.length-1 && !isStreaming && msg.content?.length > 200 && (
                  <button onClick={() => setCanvasContent(msg.content)} className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/20 px-2.5 py-1.5 rounded-md hover:bg-indigo-500/10 transition-colors">
                     <FileCode2 size={12} /> Analizi Kanvas'ta Gör
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {approvalRequest && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] w-[90%] md:w-[600px]">
           <div className={`p-6 rounded-2xl border-2 border-amber-500 bg-black/90 shadow-[0_0_50px_rgba(245,158,11,0.3)] backdrop-blur-xl flex flex-col items-center justify-center gap-6 animate-in zoom-in-95`}>
              <div className="flex items-center gap-4 text-amber-500">
                <ShieldAlert size={48} className="animate-pulse" />
                <div>
                   <h3 className="text-xl font-bold uppercase tracking-widest text-amber-400">Mimar Onayı Bekleniyor</h3>
                   <p className="text-sm font-mono mt-1 opacity-80">{approvalRequest.message}</p>
                </div>
              </div>
              <div className="flex gap-4 w-full mt-2">
                 <button onClick={() => onApprove?.(true)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2">
                   <ShieldCheck size={18} /> Onayla ve Çalıştır
                 </button>
                 <button onClick={() => onApprove?.(false)} className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-500 font-bold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-2">
                   <ShieldAlert size={18} /> Reddet
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 px-6 z-30">
         <div className={`${currentTheme.bottomBar} rounded-2xl p-2 border ${currentTheme.border} shadow-2xl backdrop-blur-3xl relative z-10 flex flex-col`}>
             
            {/* Attached Images/Files Preview Row */}
            {(attachedImages.length > 0 || attachedFiles.length > 0) && (
              <div className="flex items-center gap-3 px-3 pt-2 pb-3 overflow-x-auto custom-scrollbar">
                {attachedImages.map((img, idx) => (
                  <div key={`img-${idx}`} className="relative group flex-shrink-0">
                    <img src={img.preview} className="h-16 w-16 object-cover rounded-lg border border-white/20 shadow-md" alt="Preview"/>
                    <button onClick={() => removeAttachedImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {attachedFiles.map((file, idx) => (
                  <div key={`file-${idx}`} className="relative group flex-shrink-0 flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-2 h-16 w-16" title={file.name}>
                    <FileCode2 size={24} className="text-indigo-400" />
                    <span className="absolute bottom-1 w-[90%] truncate text-[8px] text-center font-bold text-slate-300">{file.name}</span>
                    <button onClick={() => removeAttachedFile(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 px-2 pb-2">
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  multiple
                  accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.txt,.csv"
               />
               <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className={`p-2.5 rounded-xl ${currentTheme.cardHover} ${currentTheme.textMuted} ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                 <Paperclip size={20} className={isUploading ? 'animate-pulse text-indigo-400' : ''} />
               </button>
               <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  onPaste={handlePaste}
                  placeholder="Komut veya görsel yapıştırın (Ctrl+V)..."
                  className={`w-full bg-transparent border-none focus:ring-0 text-sm py-3 px-1 custom-scrollbar max-h-40 min-h-[44px] h-[44px] resize-none ${currentTheme.textMain}`}
               />
               {isStreaming ? (
                 <button onClick={() => onStop?.()} className="p-3 rounded-xl bg-red-500/80 text-white shadow-lg hover:bg-red-600 transition-all flex items-center gap-1.5" title="Durdur">
                   <X size={18} />
                 </button>
               ) : (
                 <button onClick={handleSend} className={`p-3 rounded-xl ${appTheme === 'dark' ? 'bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-slate-800 text-white'} shadow-lg hover:scale-105 transition-all`}>
                   <Send size={18} />
                 </button>
               )}
            </div>
            <div className={`flex items-center justify-between px-3 pt-2 pb-1 border-t ${currentTheme.border}`}>
               <div className="flex items-center gap-3 flex-wrap">
                  {/* Model Selector */}
                  <div className="relative model-selector">
                    <button ref={modelBtnRef} onClick={() => { if (modelBtnRef.current) { const r = modelBtnRef.current.getBoundingClientRect(); setModelMenuPos({ bottom: window.innerHeight - r.top + 8, left: r.left }); } setModelMenuOpen(!modelMenuOpen); }} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-colors border border-white/10 hover:border-indigo-500/40 rounded-lg px-2.5 py-1">
                      <Globe size={11} /> {MODELS.find(m => m.id === selectedModel)?.label || selectedModel} <ChevronDown size={10} />
                    </button>
                    {modelMenuOpen && createPortal(
                      <div className="model-selector fixed z-[300] w-44 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95"
                           style={{ bottom: modelMenuPos.bottom, left: modelMenuPos.left }}>
                        <div className="px-3 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/5 mb-1">Model Seç</div>
                        {MODELS.map(m => (
                          <button key={m.id} onClick={() => { setSelectedModel(m.id); onModelChange(m.id); setModelMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase hover:bg-white/5 flex items-center gap-2 transition-colors ${selectedModel === m.id ? 'text-indigo-400' : 'text-slate-400'}`}>
                            {selectedModel === m.id && <Check size={10}/>} {m.label}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                  <div className={`w-px h-3 bg-white/10`}></div>
                  <button onClick={() => setThinkingMode(!thinkingMode)} className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${thinkingMode ? 'text-indigo-400' : 'text-slate-500'}`}>
                     <LightbulbIcon active={thinkingMode} /> Düşünme {thinkingMode ? 'AKTİF' : 'PASİF'}
                  </button>
                  <div className={`w-px h-3 bg-white/10`}></div>
                   <div className="flex items-center gap-3 group">
                      <Wand2 size={12} className="group-hover:text-indigo-400 transition-colors text-slate-500" />
                      <div className="relative w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 bg-indigo-500 h-full" style={{ width: `${temperature * 100}%` }}></div>
                        <input type="range" min="0" max="1" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} aria-label="Sıcaklık ayarı" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-400 w-6 text-right font-mono">{temperature.toFixed(2)}</span>
                   </div>
                   <div className={`w-px h-3 bg-white/10`}></div>
                   <select 
                      value={imageQuality} 
                      onChange={(e) => setImageQuality(e.target.value)}
                      className="bg-transparent border border-white/10 rounded-lg px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 w-24 custom-scrollbar outline-none cursor-pointer p-1"
                   >
                     <option value="fast">Görsel Hızlı</option>
                     <option value="standard">Görsel Standart</option>
                     <option value="ultra">Görsel Ultra</option>
                   </select>
                   <select 
                      value={aspectRatio} 
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="bg-transparent border border-white/10 rounded-lg px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 w-20 custom-scrollbar outline-none cursor-pointer p-1"
                   >
                     <option value="1:1">Kare (1:1)</option>
                     <option value="16:9">Yatay (16:9)</option>
                     <option value="9:16">Dikey (9:16)</option>
                   </select>
               </div>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">AgentsHUB v1.0</span>
            </div>
         </div>
      </div>
    </div>
  );
}
