import type { Config } from "tailwindcss";

export default {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0A2463',
                    50: '#E6EAF3',
                    100: '#CCD5E7',
                    200: '#99ABCF',
                    300: '#6681B7',
                    400: '#33579F',
                    500: '#0A2463',
                    600: '#081D4F',
                    700: '#06163B',
                    800: '#040E28',
                    900: '#020714',
                },
                accent: {
                    DEFAULT: '#06D6A0',
                    50: '#E6FAF4',
                    100: '#CCF5E9',
                    200: '#99EBD3',
                    300: '#66E1BD',
                    400: '#33D7A7',
                    500: '#06D6A0',
                    600: '#05AB80',
                    700: '#048060',
                    800: '#035540',
                    900: '#012A20',
                },
                danger: {
                    DEFAULT: '#EF476F',
                    50: '#FEF0F3',
                    100: '#FDE1E7',
                    200: '#FBC3CF',
                    300: '#F9A5B7',
                    400: '#F7879F',
                    500: '#EF476F',
                    600: '#BF3959',
                    700: '#8F2B43',
                    800: '#5F1D2C',
                    900: '#2F0E16',
                },
            },
            fontFamily: {
                sans: ['var(--font-inter)'],
                serif: ['var(--font-roboto)'],
            },
        },
    },
    plugins: [],
} satisfies Config;
