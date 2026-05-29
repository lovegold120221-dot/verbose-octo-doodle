import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

const GENERIC_LOGS = [
  '[00:00:01] init runtime session prepared',
  '[00:00:02] queue task accepted into pipeline',
  '[00:00:03] scan context synchronized',
  '[00:00:04] ok input structure validated',
  '[00:00:05] build generation pipeline active',
  '[00:00:06] stream intermediate output buffered',
  '[00:00:07] wait processing next segment',
  '[00:00:08] merge segments composed',
  '[00:00:09] refine output stabilized',
  '[00:00:10] sync final pass running',
];

const LOG_INTERVAL_MS = 700;

interface GeneratingOverlayProps {
  open: boolean;
  onClose?: () => void;
}

export function GeneratingOverlay({ open, onClose }: GeneratingOverlayProps) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
  const logIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setVisibleLogs([]);
      logIndexRef.current = 0;
      timerRef.current = setInterval(() => {
        if (logIndexRef.current < GENERIC_LOGS.length) {
          setVisibleLogs(prev => [...prev, GENERIC_LOGS[logIndexRef.current]]);
          logIndexRef.current++;
        } else {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, LOG_INTERVAL_MS);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-[#0b0908] flex flex-col"
        >
          <header className="sticky top-0 w-full bg-[#0b0908]/95 backdrop-blur-md border-b border-zinc-800/60 px-4 py-3 flex items-center justify-between z-10 shrink-0">
            <div className="w-6" />
            <h1 className="text-sm font-semibold tracking-wide text-[#d0a78b] uppercase">
              Generating...
            </h1>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {!onClose && <div className="w-6" />}
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(208,167,139,0.04),transparent_70%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-md">
              <div className="flex flex-col items-center gap-6">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-2xl font-light tracking-wide text-zinc-200"
                >
                  Generating
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    ...
                  </motion.span>
                </motion.h2>

                <div className="relative w-64 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '400%' }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-0 left-0 w-1/4 h-full rounded-full bg-gradient-to-r from-transparent via-[#d0a78b] to-transparent"
                  />
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '80%' }}
                    transition={{ duration: 4, ease: 'easeOut' }}
                    className="h-full rounded-full bg-[#d0a78b]/30"
                  />
                </div>
              </div>

              <div className="w-full rounded-2xl border border-zinc-800/60 bg-black/30 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-zinc-800/30 bg-[#0a0a0c]">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/40" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                  </div>
                  <span className="flex-1 text-center text-[9px] text-zinc-600 tracking-wider uppercase">
                    process.log
                  </span>
                </div>
                <div className="p-4 space-y-1.5 min-h-[200px] max-h-[300px] overflow-y-auto font-mono">
                  {visibleLogs.map((log, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-[11px] text-zinc-400 leading-relaxed tracking-wide"
                    >
                      <span className="text-zinc-600">{log.split(']')[0]}]</span>
                      <span className="text-zinc-500">{log.split(']')[1]}</span>
                    </motion.p>
                  ))}
                  {visibleLogs.length < GENERIC_LOGS.length && (
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-2 h-3 bg-zinc-500 ml-1"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      opacity: [0.2, 0.5, 0.2],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeInOut',
                    }}
                    className="w-2 h-2 rounded-full bg-[#d0a78b]"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
