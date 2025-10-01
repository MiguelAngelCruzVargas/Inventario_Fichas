import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';

const ImageLightbox = ({ open, images = [], title = '', initialIndex = 0, onClose }) => {
  const [index, setIndex] = useState(initialIndex || 0);

  useEffect(() => {
    if (open) setIndex(initialIndex || 0);
  }, [open, initialIndex]);

  if (!open) return null;

  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setIndex(i => (i + 1) % images.length);

  const currentUrl = images[index];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-6xl max-h-[88vh] w-full sm:w-auto relative p-4 flex flex-col items-center">
        <div className="relative flex items-center justify-center w-full">
          {images.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <img
            src={currentUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded shadow-lg select-none"
          />
          {images.length > 1 && (
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
              {index + 1} / {images.length}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-sm text-white/80 flex flex-col items-center gap-3 w-full">
          {title ? <span className="font-medium text-white">{title}</span> : null}
          <div className="flex gap-3 flex-wrap justify-center">
            <a href={currentUrl} download className="px-3 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 border border-white/20">Descargar</a>
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 border border-white/20 inline-flex items-center gap-1">Abrir <ExternalLink className="w-3 h-3" /></a>
            <button onClick={onClose} className="px-3 py-1 rounded-md bg-white/10 text-white text-xs hover:bg-white/20 border border-white/20">Cerrar</button>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-center max-w-full">
              {images.map((img,i)=>(
                <button
                  key={i}
                  onClick={()=>setIndex(i)}
                  className={"w-14 h-14 rounded border overflow-hidden " + (i===index ? 'ring-2 ring-blue-400' : 'opacity-60 hover:opacity-100')}
                >
                  <img src={img} alt={`lb-thumb-${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
