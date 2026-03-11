// vite.config.js
import { defineConfig } from "file:///D:/React/Projects/TaskManagement/client/node_modules/vite/dist/node/index.js";
import react from "file:///D:/React/Projects/TaskManagement/client/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: mode === "development" ? {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", () => {
          });
        }
      }
    } : {}
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
          ui: ["framer-motion", "lucide-react"]
        }
      }
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxSZWFjdFxcXFxQcm9qZWN0c1xcXFxUYXNrTWFuYWdlbWVudFxcXFxjbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFJlYWN0XFxcXFByb2plY3RzXFxcXFRhc2tNYW5hZ2VtZW50XFxcXGNsaWVudFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovUmVhY3QvUHJvamVjdHMvVGFza01hbmFnZW1lbnQvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcclxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICAgIHByb3h5OiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnID8ge1xyXG4gICAgICAgICAgICAnL2FwaSc6IHsgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJywgY2hhbmdlT3JpZ2luOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICcvc29ja2V0LmlvJzoge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJyxcclxuICAgICAgICAgICAgICAgIHdzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgY29uZmlndXJlOiAocHJveHkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoKSA9PiB7IH0pOyAvLyBzdXBwcmVzcyBFQ09OTlJFRlVTRUQgbG9nIHNwYW0gb24gc3RhcnR1cFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSA6IHt9XHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgICBvdXREaXI6ICdkaXN0JyxcclxuICAgICAgICBzb3VyY2VtYXA6IGZhbHNlLFxyXG4gICAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxyXG4gICAgICAgICAgICAgICAgICAgIHJvdXRlcjogWydyZWFjdC1yb3V0ZXItZG9tJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgcXVlcnk6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXHJcbiAgICAgICAgICAgICAgICAgICAgdWk6IFsnZnJhbWVyLW1vdGlvbicsICdsdWNpZGUtcmVhY3QnXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpVCxTQUFTLG9CQUFvQjtBQUM5VSxPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN2QyxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ0osT0FBTyxTQUFTLGdCQUFnQjtBQUFBLE1BQzVCLFFBQVEsRUFBRSxRQUFRLHlCQUF5QixjQUFjLEtBQUs7QUFBQSxNQUM5RCxjQUFjO0FBQUEsUUFDVixRQUFRO0FBQUEsUUFDUixJQUFJO0FBQUEsUUFDSixjQUFjO0FBQUEsUUFDZCxXQUFXLENBQUMsVUFBVTtBQUNsQixnQkFBTSxHQUFHLFNBQVMsTUFBTTtBQUFBLFVBQUUsQ0FBQztBQUFBLFFBQy9CO0FBQUEsTUFDSjtBQUFBLElBQ0osSUFBSSxDQUFDO0FBQUEsRUFDVDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ0osY0FBYztBQUFBLFVBQ1YsUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLFVBQzdCLFFBQVEsQ0FBQyxrQkFBa0I7QUFBQSxVQUMzQixPQUFPLENBQUMsdUJBQXVCO0FBQUEsVUFDL0IsSUFBSSxDQUFDLGlCQUFpQixjQUFjO0FBQUEsUUFDeEM7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
