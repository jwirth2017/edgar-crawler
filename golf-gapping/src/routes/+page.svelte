<script>
	import { enhance } from '$app/forms';
	import { GAP_TOO_BIG, GAP_TOO_SMALL } from '#lib/stats.js';

	let { data } = $props();

	const r0 = (/** @type {number} */ n) => Math.round(n);
	// Axis runs from 0 to the longest shot, rounded up to a tidy 50.
	const scaleMax = $derived(
		Math.max(50, Math.ceil(Math.max(0, ...data.rows.map((r) => r.total ?? r.carry)) / 50) * 50)
	);
	const pct = (/** @type {number} */ v) => `${(v / scaleMax) * 100}%`;
	const ticks = $derived(Array.from({ length: scaleMax / 50 + 1 }, (_, i) => i * 50));
	const flagged = $derived(data.rows.filter((r) => r.flag).length);
</script>

<svelte:head><title>Gapping</title></svelte:head>

<h1>Gapping</h1>

<form method="POST" action="?/activate" use:enhance class="seg" aria-label="Bag">
	{#each data.bags as b (b.id)}
		<button name="bag_id" value={b.id} aria-pressed={b.id === data.bagId}>{b.name}</button>
	{/each}
</form>
{#if data.notes}<p class="muted small">{data.notes}</p>{/if}

{#if data.rows.length === 0}
	<div class="card empty">
		<p><strong>No shots logged for this bag yet.</strong></p>
		<p class="muted">Start a session, hit a few with each club, and the ladder builds itself.</p>
		<a class="btn primary" href="/sessions">Log a session</a>
	</div>
{:else}
	<p class="muted small summary">
		Trimmed average carry, longest first.
		{#if flagged}
			<strong>{flagged} spot{flagged === 1 ? '' : 's'} to look at.</strong>
		{:else if data.rows.length > 1}
			No gaps over {GAP_TOO_BIG} yd, no two clubs within {GAP_TOO_SMALL}.
		{/if}
	</p>

	<div class="card ladder">
		<div class="legend small muted" aria-hidden="true">
			<span><i class="sw carry"></i>Carry</span>
			<span><i class="sw total"></i>Roll-out to total</span>
		</div>
		<ol>
			{#each data.rows as r (r.id)}
				<li>
					<div class="head">
						<span class="club">
							<strong>{r.short}</strong>
							{#if r.loft != null && !r.short.includes('°')}<span class="muted small">{r.loft}°</span>{/if}
						</span>
						<span class="vals num">
							<strong>{r0(r.carry)}</strong>
							{#if r.total != null}<span class="muted"> / {r0(r.total)}</span>{/if}
						</span>
					</div>
					<div
						class="track"
						role="img"
						aria-label="{r.name}: carry {r0(r.carry)} yards{r.total != null
							? `, total ${r0(r.total)}`
							: ''}"
					>
						{#each ticks as t (t)}<i class="tick" style:left={pct(t)}></i>{/each}
						<i class="bar carry" style:width={pct(r.carry)}></i>
						{#if r.total != null && r.total > r.carry}
							<i
								class="bar total"
								style:left="calc({pct(r.carry)} + 2px)"
								style:width="calc({pct(r.total - r.carry)} - 2px)"
							></i>
						{/if}
					</div>
					<div class="meta small muted num">
						{r.name} · {r.n} shot{r.n === 1 ? '' : 's'}{r.used < r.n
							? ` (${r.used} after trim)`
							: ''}
						· {r0(r.min)}–{r0(r.max)}
					</div>
				</li>
				{#if r.gap != null}
					<li class="gap {r.flag ?? ''}">
						{#if r.flag === 'gap'}
							<span class="chip"
								><b aria-hidden="true">▲</b> {r.gap} yd gap — over {GAP_TOO_BIG}</span
							>
						{:else if r.flag === 'overlap'}
							<span class="chip"
								><b aria-hidden="true">≈</b> {r.gap} yd apart — overlap</span
							>
						{:else}
							<span class="plain num">{r.gap} yd</span>
						{/if}
					</li>
				{/if}
			{/each}
		</ol>
		<div class="axis muted num" aria-hidden="true">
			{#each ticks as t (t)}<span style:left={pct(t)}>{t}</span>{/each}
		</div>
	</div>
{/if}

{#if data.noData.length}
	<h2>No data yet</h2>
	<ul class="nodata">
		{#each data.noData as c (c.id)}
			<li>
				{c.short}
				{#if c.loft != null && !c.short.includes('°')}<span class="muted small">&nbsp;{c.loft}°</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.summary {
		margin: 12px 0 8px;
	}
	.empty {
		margin-top: 16px;
	}
	.empty p {
		margin: 0 0 8px;
	}
	.legend {
		display: flex;
		gap: 16px;
		margin-bottom: 10px;
	}
	.sw {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 3px;
		margin-right: 6px;
		vertical-align: -1px;
	}
	.sw.carry {
		background: var(--bar-carry);
	}
	.sw.total {
		background: var(--bar-total);
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
	}
	.vals strong {
		font-size: 1.15rem;
	}
	.track {
		position: relative;
		height: 14px;
		margin: 4px 0;
	}
	.tick {
		position: absolute;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--hair);
	}
	.bar {
		position: absolute;
		top: 0;
		height: 100%;
	}
	.bar.carry {
		left: 0;
		background: var(--bar-carry);
		border-radius: 0 4px 4px 0;
	}
	.bar.total {
		background: var(--bar-total);
		border-radius: 0 4px 4px 0;
	}
	/* When roll-out is drawn, the carry bar's end is no longer the data end. */
	.bar.carry:has(+ .bar.total) {
		border-radius: 0;
	}
	.gap {
		display: flex;
		justify-content: center;
		padding: 6px 0;
	}
	.gap .plain {
		font-size: 0.8rem;
		color: var(--muted);
	}
	.chip {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 3px 10px;
		border-radius: 999px;
	}
	.gap.gap .chip {
		background: var(--warn-bg);
		color: var(--warn-ink);
	}
	.gap.gap .chip b {
		color: var(--warn-mark);
	}
	.gap.overlap .chip {
		background: var(--over-bg);
		color: var(--over-ink);
	}
	.gap.overlap .chip b {
		color: var(--over-mark);
	}
	.axis {
		position: relative;
		height: 1.3em;
		margin-top: 6px;
		border-top: 1px solid var(--axis);
		font-size: 0.72rem;
	}
	.axis span {
		position: absolute;
		top: 2px;
		transform: translateX(-50%);
	}
	.axis span:first-child {
		transform: none;
	}
	.axis span:last-child {
		transform: translateX(-100%);
	}
	.nodata {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding: 0;
		margin: 0;
	}
	.nodata li {
		border: 1px dashed var(--axis);
		border-radius: 999px;
		padding: 4px 10px;
		font-size: 0.9rem;
	}
</style>
