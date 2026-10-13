/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // keep the dev-mode toolbar out of the bottom-left, where the sound button lives
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
