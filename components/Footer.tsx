'use client';

export default function Footer() {
    return (
        <footer className="relative z-10 border-t border-white/8" style={{ backgroundColor: 'rgba(2,7,20,0.95)' }}>
            <div className="container mx-auto px-6 py-16 text-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3">
                        <img
                            src="https://images.pexels.com/photos/37340896/pexels-photo-37340896.png"
                            className="w-10 h-10 object-cover rounded-xl border border-white/10"
                            alt="Logo MINPPAL"
                        />
                        <span className="text-white font-black tracking-tight text-xl uppercase">Sistema de Salud Institucional MINPPAL</span>
                    </div>
                    <p className="text-white/30 text-sm max-w-xs leading-relaxed">
                        Tecnología al servicio de la salud de la familia MINPPAL.
                    </p>
                    <div className="pt-6 border-t border-white/8 w-full text-white/20 text-[10px] uppercase tracking-[0.4em] font-bold">
                        &copy; 2026 Ministerio del Poder Popular para la Alimentación
                    </div>
                </div>
            </div>
        </footer>
    );
}
