/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'iwtkjlcfnhyfgmbbocyx.supabase.co',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
            },
        ],
    },
    outputFileTracingRoot: __dirname,
}

export default nextConfig
