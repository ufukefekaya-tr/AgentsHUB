import React, { useState } from 'react';
import { UserCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { UI_API } from '../api';

export default function UserProfileModal({ profile, setProfile, onClose, currentTheme, appTheme }) {
  const [form, setForm] = useState({ name: profile.name || '', surname: profile.surname || '', bio: profile.bio || '' });
  const handleSave = () => {
    setProfile(form);
    const md = `# Kullanıcı Profili\n\n**İsim:** ${form.name} ${form.surname}\n\n**Hakkında:** ${form.bio}\n`;
    UI_API.saveUserProfile(md).catch(() => {});
    onClose();
  };
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-10 ${currentTheme.modalOverlay}`}>
      <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className={`${currentTheme.bg} border ${currentTheme.border} rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden`}>
        <div className={`h-20 flex items-center justify-between px-8 border-b ${currentTheme.border} ${currentTheme.headerBg}`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400"><UserCircle size={24}/></div>
            <div>
              <h2 className="text-xl font-bold tracking-tighter uppercase">Kullanıcı Profili</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">USER.md Otomatik Güncellenir</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all"><X size={24}/></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-6 mb-2">
            <div className={`w-20 h-20 rounded-3xl border-2 border-dashed ${currentTheme.border} flex flex-col items-center justify-center text-slate-600 gap-1 opacity-50`}>
              <UserCircle size={28}/>
              <span className="text-[8px] font-bold uppercase">No Image</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
              Profil resmi yükleme bu<br/>sürümde desteklenmez.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">İsim</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={`w-full ${currentTheme.input} border ${currentTheme.border} rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all`} placeholder="Ufuk" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Soyisim</label>
              <input value={form.surname} onChange={e=>setForm(f=>({...f,surname:e.target.value}))} className={`w-full ${currentTheme.input} border ${currentTheme.border} rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all`} placeholder="Kaya" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kullanıcı Hakkında</label>
            <textarea rows={4} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} className={`w-full ${currentTheme.input} border ${currentTheme.border} rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 resize-none transition-all`} placeholder="Sistem mimarı, yapay zeka geliştiricisi..." />
          </div>
          <button onClick={handleSave} className={`w-full py-4 ${appTheme==='dark'?'bg-white text-black':'bg-slate-800 text-white'} text-xs font-bold uppercase tracking-widest rounded-xl shadow-2xl hover:scale-105 transition-all`}>
            Profili Kaydet &amp; USER.md Güncelle
          </button>
        </div>
      </motion.div>
    </div>
  );
}
