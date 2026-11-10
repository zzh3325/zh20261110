import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())
	const target ='http://10.20.148.252:9191'
	return {
		plugins: [uni()],
		server: {
			host: '0.0.0.0',
			port: 8084,
			proxy: {
				'/backend': { target, changeOrigin: true, rewrite: (path) => path.replace(/^\/backend/, '') },
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