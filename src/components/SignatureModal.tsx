import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, PenTool } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState('#0F172A'); // Default dark obsidian ink
  const [lineWidth, setLineWidth] = useState(2.5);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawn(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0E1422] p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Create Digital Signature</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Draw your official signature or initials inside the box below to stamp onto your document.
        </p>

        {/* Canvas area */}
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-white/95 p-2 overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={480}
            height={200}
            className="w-full h-44 cursor-crosshair touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Controls row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {/* Pen Color */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ink:</span>
            <div className="flex items-center gap-1.5">
              {[
                { name: 'Obsidian Ink', hex: '#0F172A' },
                { name: 'Royal Navy', hex: '#1E3A8A' },
                { name: 'Warm Amber', hex: '#B45309' },
                { name: 'Pure White', hex: '#FFFFFF' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setPenColor(c.hex)}
                  title={c.name}
                  className={`h-6 w-6 rounded-full border transition-all ${
                    penColor === c.hex
                      ? 'border-amber-400 scale-110 shadow-sm'
                      : 'border-slate-600 hover:border-slate-400'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Stroke:</span>
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              {[
                { label: 'Fine', val: 1.5 },
                { label: 'Medium', val: 2.5 },
                { label: 'Bold', val: 4 },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setLineWidth(s.val)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    lineWidth === s.val
                      ? 'bg-slate-700 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear button */}
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Modal actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasDrawn}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
              hasDrawn
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/20 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span>Apply Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
};
