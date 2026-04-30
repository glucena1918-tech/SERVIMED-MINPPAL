import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const roboto = Roboto({
    weight: ["300", "400", "500", "700"],
    subsets: ["latin"],
    variable: "--font-roboto",
});

export const metadata: Metadata = {
    title: "Sistema de Salud Institucional MINPPAL - Tu Salud en Buenas Manos",
    description: "Plataforma integral de salud para agendar citas médicas, gestionar historiales clínicos y conectar con especialistas",
};

import { Toaster } from 'react-hot-toast';
import AccessibilityPanel from "@/components/AccessibilityPanel";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={`${inter.variable} ${roboto.variable} font-sans antialiased`} suppressHydrationWarning>
                {children}
                <AccessibilityPanel />
                <Toaster position="top-right" />
            </body>
        </html>
    );
}
