import React, { useEffect, useState } from 'react';
import { X, UploadCloud, Image as ImageIcon, Save } from 'lucide-react';
import brandingService from '@services/brandingService';
import { compressImageFile, humanFileSize } from '@utils/imageCompression';

const BrandingModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [imgInfo, setImgInfo] = useState(null); // { width, height, bytes }
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const b = await brandingService.getBranding();
        setName(b?.name || '');
        setTagline(b?.tagline || '');
        setLogoDataUrl(b?.logoDataUrl || null);
      } catch (e) {
        setError('No se pudo cargar la configuración de marca');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    try {
      // Intentar comprimir/redimensionar automáticamente para encajar en ~300KB
      const compressedDataUrl = await compressImageFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        maxBytes: 300 * 1024
      });
      setLogoDataUrl(compressedDataUrl);

      // Calcular dimensiones y tamaño para mostrar al usuario
      const estimateBytes = (dataUrl) => {
        try {
          const base64 = (dataUrl.split(',')[1]) || '';
          return Math.ceil((base64.length * 3) / 4);
        } catch { return dataUrl?.length || 0; }
      };
      const bytes = estimateBytes(compressedDataUrl);
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          setImgInfo({ width: img.width, height: img.height, bytes });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = compressedDataUrl;
      });
    } catch (err) {
      setError(err?.message || 'No se pudo procesar la imagen. Intenta con otro archivo.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await brandingService.setBranding({ name, tagline, logoDataUrl });
      onClose?.();
      // Propagar cambio
      window.dispatchEvent(new CustomEvent('brandingChanged', { detail: { name, tagline, logoDataUrl } }));
    } catch (e) {
      setError(e?.response?.data?.detail || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Personalizar marca</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-500">Cargando…</div>
        ) : (
          <div className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-100 border flex items-center justify-center overflow-hidden">
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Logo (opcional)</div>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <UploadCloud className="w-4 h-4" />
                  <span>Subir imagen</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Recomendado: imagen cuadrada (1:1), 256–320 px por lado, sin márgenes alrededor. Peso &lt; 300 KB. Formato PNG/JPG.
                </p>
                {imgInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Seleccionada: {imgInfo.width}×{imgInfo.height} px, ~{humanFileSize(imgInfo.bytes)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Nombre del negocio</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Ej. Plaza Wifi" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Lema (opcional)</label>
              <input value={tagline} onChange={(e)=>setTagline(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Ej. Sistema de Gestión v2.0" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border">Cancelar</button>
              <button onClick={save} disabled={saving || !name?.trim()} className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-60 inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando…' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandingModal;
