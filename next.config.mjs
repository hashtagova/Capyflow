/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Never serve stale RSC payloads from the client-side router cache.
    // Without this, router.push("/") can show cached XP/level even after
    // server-side data has changed.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
