import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, Link as LinkIcon, Loader2 } from 'lucide-react';

interface ReceiptScannerProps {
    onScan: (url: string) => void;
    onClose: () => void;
}

export function ReceiptScanner({ onScan, onClose }: ReceiptScannerProps) {
    const [manualUrl, setManualUrl] = useState('');
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (isScanning) {
            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
            );

            scannerRef.current.render((decodedText) => {
                if (decodedText.startsWith('http')) {
                    onScan(decodedText);
                    if (scannerRef.current) {
                        scannerRef.current.clear();
                    }
                }
            }, (error) => {
                // Silently ignore scan errors
            });
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [isScanning, onScan]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualUrl.trim().startsWith('http')) {
            onScan(manualUrl.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-400" />
                    Escanear Nota Fiscal
                </h2>

                <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                        <button
                            onClick={() => setIsScanning(true)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${isScanning ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Câmera
                        </button>
                        <button
                            onClick={() => setIsScanning(false)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!isScanning ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Link Manual
                        </button>
                    </div>

                    {isScanning ? (
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-square">
                            <div id="reader" className="w-full h-full"></div>
                            <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/50 rounded-2xl m-8 flex items-center justify-center">
                                <div className="w-full h-0.5 bg-indigo-500 animate-pulse"></div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">URL da Nota Fiscal</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        autoFocus
                                        type="url"
                                        value={manualUrl}
                                        onChange={e => setManualUrl(e.target.value)}
                                        placeholder="Cole o link do SEFAZ aqui..."
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-500"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!manualUrl.startsWith('http')}
                                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                            >
                                Processar Link
                            </button>
                        </form>
                    )}

                    <p className="text-xs text-slate-500 text-center">
                        {isScanning
                            ? "Aponte a câmera para o QR Code da nota fiscal impressa."
                            : "Copie o link da nota fiscal do site do SEFAZ e cole acima."}
                    </p>
                </div>
            </div>
        </div>
    );
}
