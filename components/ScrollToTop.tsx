'use client';

import { useState, useEffect } from 'react';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // Mostrar botón cuando el usuario hace scroll hacia abajo
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // Hacer scroll suave hacia arriba
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] p-3 md:p-4 rounded-full bg-gradient-to-tr from-[#0a2463] to-[#1e3a8a] text-white shadow-[0_0_20px_rgba(10,36,99,0.4)] hover:shadow-[0_0_30px_rgba(6,214,160,0.5)] hover:scale-110 transition-all duration-300 group border border-white/10 backdrop-blur-md"
                    aria-label="Volver arriba"
                >
                    <svg 
                        className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-y-1 transition-transform duration-300 text-[#06D6A0]" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                </button>
            )}
        </>
    );
}
