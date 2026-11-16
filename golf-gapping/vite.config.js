import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			// No auth, home network only, served over plain http on a LAN IP:
			// the default origin check would reject every form post unless ORIGIN
			// were set to the exact address the phone uses.
			csrf: { trustedOrigins: ['*'] }
		})
	]
});
