<script>
	import '../app.css';
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		{ href: '/', label: 'Gapping' },
		{ href: '/sessions', label: 'Sessions' },
		{ href: '/bags', label: 'Bags' }
	];
	/** @param {string} href */
	const current = (href) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<main>
	{@render children()}
</main>

<nav class="tabs" aria-label="Sections">
	{#each tabs as t (t.href)}
		<a href={t.href} aria-current={current(t.href) ? 'page' : undefined}>{t.label}</a>
	{/each}
</nav>
