import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, FileText, Code, CheckCircle2, Download } from 'lucide-react';

export default function CanvasPanel({ content, isOpen, onClose }) {
  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      className="absolute top-0 right-0 bottom-0 w-[45%] glass border-l border-white/10 z-40 flex flex-col shadow-2xl"
    >
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
               <FileText size={18} />
            </div>
            <div>
               <h3 className="font-display font-bold text-sm">Otonom Rapor</h3>
               <p className="text-[10px] text-meta opacity-60 uppercase tracking-widest">Çıktı Analizi Hazır</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button className="p-2 interactive rounded-lg text-dim"><Download size={18} /></button>
            <button onClick={onClose} className="p-2 interactive rounded-lg text-dim hover:text-white"><X size={18} /></button>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
         <div className="max-w-2xl mx-auto prose prose-invert font-inter">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
               <pre className="bg-white/5 p-8 rounded-2xl border border-white/5 text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {content}
               </pre>
            </motion.div>
         </div>
      </div>

      <div className="p-6 border-t border-white/5 glass flex items-center justify-between text-xs font-bold uppercase tracking-widest text-dim">
         <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500"/> Otomatik Doğrulandı
         </div>
         <span>V7.0 CANV-PROTOCOL</span>
      </div>
    </motion.aside>
  );
}
