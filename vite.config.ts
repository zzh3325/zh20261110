import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())
	const target = env.VITE_API_BASE_URL || 'http://10.20.148.252:9191'
	return {
		plugins: [uni()],
		server: {
			host: '0.0.0.0',
			port: 8084,
			proxy: {
				'/api': { target, changeOrigin: true },
				'/get': { target, changeOrigin: true },
				'/admin': { target, changeOrigin: true },
				'/superadmin': { target, changeOrigin: true },
				'/login': { target, changeOrigin: true },
				'/register': { target, changeOrigin: true },
				'/public-key': { target, changeOrigin: true },
				'/userInfo': { target, changeOrigin: true }
			}
		},
		css: {
			preprocessorOptions: {
				scss: {
					// api: 'modern-compiler' // 或者改为 'modern'
					silenceDeprecations: ['legacy-js-api'] // 暂时屏蔽旧版API警告
				}
			}
		}
	}
})