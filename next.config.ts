import type { NextConfig } from "next";
import os from "os";

const getLocalOrigins = (): string[] => {
  const origins = new Set<string>([
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '192.168.1.6',
    '192.168.1.6:3000',
    '192.168.6.1',
    '192.168.6.1:3000',
  ]);

  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4') {
          origins.add(net.address);
          origins.add(`${net.address}:3000`);
        }
      }
    }
  } catch (e) {
    console.error('Error detecting network interfaces for allowedDevOrigins:', e);
  }

  return Array.from(origins);
};

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalOrigins(),
};

export default nextConfig;
