'use client';

import { useState, useEffect } from 'react';

export default function AccessibilityPanel() {
    const [fontSize, setFontSize] = useState(16);
    const [highContrast, setHighContrast] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const savedSize = localStorage.getItem('ssi-font-size');
        const savedContrast = localStorage.getItem('ssi-high-contrast');
        
        if (savedSize) {
            const size = parseInt(savedSize);
            setFontSize(size);
            document.documentElement.style.setProperty('--text-base-size', `${size}px`);
        }
        
        if (savedSize) {
            const size = parseInt(savedSize);
            setFontSize(size);
            document.documentElement.style.setProperty('--text-base-size', `${size}px`);
        }
    }, []);

    const updateFontSize = (newSize: number) => {
        setFontSize(newSize);
        document.documentElement.style.setProperty('--text-base-size', `${newSize}px`);
        localStorage.setItem('ssi-font-size', newSize.toString());
    };

    const toggleHighContrast = () => {
        const newValue = !highContrast;
        setHighContrast(newValue);
        if (newValue) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem('ssi-high-contrast', newValue.toString());
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
            {/* Panel */}
            {isOpen && (
                <div className="mb-2 p-6 rounded-3xl bg-white border border-gray-200 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 w-72">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Accesibilidad</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Font Size */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-gray-700">Tamaño de letra</span>
                                <span className="text-xs font-black text-[#0F75C1] bg-[#0F75C1]/10 px-2 py-1 rounded-lg">{fontSize}px</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => updateFontSize(Math.max(14, fontSize - 2))}
                                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50 transition-all"
                                >
                                    A-
                                </button>
                                <input 
                                    type="range" 
                                    min="14" 
                                    max="24" 
                                    step="2"
                                    value={fontSize}
                                    onChange={(e) => updateFontSize(parseInt(e.target.value))}
                                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0F75C1]"
                                />
                                <button 
                                    onClick={() => updateFontSize(Math.min(24, fontSize + 2))}
                                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-50 transition-all"
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                    </div>

                    <p className="mt-6 text-[10px] text-gray-400 text-center font-medium italic">
                        "Tecnología con empatía humana"
                    </p>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 ${isOpen ? 'bg-gray-900 text-white' : 'bg-[#0F75C1] text-white'}`}
                title="Ajustes de Accesibilidad"
            >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {/* Badge if active */}
                {fontSize !== 16 && !isOpen && (
                    <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full" />
                )}
            </button>
        </div>
    );
}
