import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

const backendTarget = process.env.BACKEND_URL ?? 'http://localhost:8787';

export default defineConfig({
  plugins: process.env.HTTPS === '1' ? [basicSsl()] : [],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/llm': backendTarget,
      '/actuator': backendTarget,
      '/api': backendTarget,
      '/telemetry': {
        target: backendTarget,
        ws: true
      }
    }
  }
});
