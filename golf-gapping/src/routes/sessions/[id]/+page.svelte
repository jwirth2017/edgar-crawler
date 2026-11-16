<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// Which bag's clubs the buttons show. Defaults to the active bag; switch to
	// the planned bag to log a demo or fitting against a club you don't own yet.
	let bagId = $state(data.bags.find((b) => b.is_active)?.id ?? data.bags[0]?.id);
	let clubId = $state(/** @type {number | null} */ (null));
	let more = $state(false);
	let side = $state('R');
	let saving = $state(false);
	/** @type {HTMLFormElement} */
	let formEl;
	/** @type {HTMLInputElement} */
	let carryEl;

	const clubs = $derived(data.bags.find((b) => b.id === bagId)?.clubs ?? []);
	/** shots per club this session, for the little counters on the buttons */
	const counts = $derived(
		data.shots.reduce((/** @type {Record<number, number>} */ m, s) => {
			m[s.club_id] = (m[s.club_id] ?? 0) + 1;
			return m;
		}, {})
	);

	/** @param {number} id */
	function pick(id) {
		clubId = id;
		carryEl?.focus();
	}

	/** @param {string} iso */
	const pretty = (iso) =>
		new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});

	/** @param {any} s */
	function detail(s) {
		const parts = [];
		if (s.ball_speed != null) parts.push(`${s.ball_speed} mph ball`);
		if (s.club_speed != null) parts.push(`${s.club_speed} mph club`);
		if (s.launch_angle != null) parts.push(`${s.launch_angle}° launch`);
		if (s.spin != null) parts.push(`${s.spin} rpm`);
		if (s.offline != null && s.offline !== 0)
			parts.push(`${Math.abs(s.offline)} ${s.offline < 0 ? 'L' : 'R'}`);
		return parts.join(' · ');
	}
</script>

<svelte:head><title>Session {data.session.date}</title></svelte:head>

<p class="small back"><a href="/sessions">‹ Sessions</a></p>
<h1>{pretty(data.session.date)}</h1>
<p class="muted small sub">
	{data.session.location}{data.session.ball_type ? ` · ${data.session.ball_type}` : ''}{data.session
		.is_demo
		? ' · demo/fitting'
		: ''} · {data.shots.length} shot{data.shots.length === 1 ? '' : 's'}
</p>

{#if data.bags.length > 1}
	<div class="seg" role="group" aria-label="Clubs from bag">
		{#each data.bags as b (b.id)}
			<button type="button" aria-pressed={b.id === bagId} onclick={() => (bagId = b.id)}
				>{b.name}</button
			>
		{/each}
	</div>
{/if}

<div class="clubs" role="group" aria-label="Club">
	{#each clubs as c (c.id)}
		<button type="button" aria-pressed={c.id === clubId} title={c.name} onclick={() => pick(c.id)}>
			{c.short}
			{#if counts[c.id]}<span class="count num">{counts[c.id]}</span>{/if}
		</button>
	{/each}
</div>

<form
	bind:this={formEl}
	method="POST"
	action="?/add"
	class="card entry"
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			// Keep the club selected and the keyboard up; clear only the numbers.
			await update({ reset: false });
			saving = false;
			if (result.type === 'success') {
				formEl.reset();
				carryEl.focus();
			}
		};
	}}
>
	<input type="hidden" name="club_id" value={clubId ?? ''} />
	<div class="main">
		<label
			>Carry (yd)
			<input
				bind:this={carryEl}
				name="carry"
				inputmode="decimal"
				autocomplete="off"
				enterkeyhint="done"
				required
				class="big num"
			/>
		</label>
		<button class="primary add" disabled={clubId == null || saving}>
			{clubId == null ? 'Pick a club' : 'Add shot'}
		</button>
	</div>

	<button type="button" class="quiet toggle" aria-expanded={more} onclick={() => (more = !more)}>
		{more ? '− Fewer fields' : '+ Total, speed, launch…'}
	</button>

	<!-- Hidden rather than removed so values survive a toggle and still submit. -->
	<div class="extra" hidden={!more}>
		<div class="grid3">
			<label>Total (yd) <input name="total" inputmode="decimal" autocomplete="off" /></label>
			<label>Ball mph <input name="ball_speed" inputmode="decimal" autocomplete="off" /></label>
			<label>Launch ° <input name="launch_angle" inputmode="decimal" autocomplete="off" /></label>
		</div>
		<div class="grid3">
			<label>Club mph <input name="club_speed" inputmode="decimal" autocomplete="off" /></label>
			<label>Spin rpm <input name="spin" inputmode="numeric" autocomplete="off" /></label>
			<label
				>Offline (yd)
				<span class="row off">
					<input name="offline" inputmode="decimal" autocomplete="off" />
					<input type="hidden" name="side" value={side} />
					<button
						type="button"
						class="side"
						aria-label="Offline side: {side === 'L' ? 'left' : 'right'}. Tap to switch."
						onclick={() => (side = side === 'L' ? 'R' : 'L')}>{side}</button
					>
				</span>
			</label>
		</div>
		<p class="muted small hint">All optional — spin especially.</p>
	</div>

	{#if form?.error}<p class="err">{form.error}</p>{/if}
</form>

<h2>Shots</h2>
{#if data.shots.length === 0}
	<p class="muted">Pick a club, type the carry, hit Add.</p>
{:else}
	<ul class="shots">
		{#each data.shots as s, i (s.id)}
			<li>
				<span class="idx muted small num">{data.shots.length - i}</span>
				<span class="what">
					<strong>{s.club}</strong>
					<span class="num"> {s.carry}{s.total != null ? ` / ${s.total}` : ''}</span>
					{#if detail(s)}<br /><span class="muted small num">{detail(s)}</span>{/if}
				</span>
				<form method="POST" action="?/deleteShot" use:enhance>
					<input type="hidden" name="shot_id" value={s.id} />
					<button class="quiet" aria-label="Delete shot {data.shots.length - i}">✕</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}

<form
	method="POST"
	action="?/deleteSession"
	class="del"
	onsubmit={(e) => {
		if (!confirm('Delete this session and all its shots?')) e.preventDefault();
	}}
>
	<button class="quiet danger small">Delete session</button>
</form>

<style>
	.back {
		margin: 0;
	}
	.back a {
		text-decoration: none;
	}
	.sub {
		margin: -8px 0 12px;
	}
	.clubs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
		gap: 6px;
		margin: 10px 0;
	}
	.clubs button {
		position: relative;
		min-height: 48px;
		padding: 4px 6px;
		font-weight: 600;
		font-size: 0.95rem;
	}
	.clubs button[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.count {
		position: absolute;
		top: 2px;
		right: 5px;
		font-size: 0.68rem;
		font-weight: 400;
		opacity: 0.75;
	}
	.entry {
		display: grid;
		gap: 6px;
	}
	.main {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		align-items: end;
	}
	.big {
		font-size: 1.6rem;
		min-height: 56px;
		font-weight: 600;
	}
	.add {
		min-height: 56px;
	}
	.toggle {
		justify-self: start;
		padding-left: 0;
		min-height: 36px;
		font-size: 0.9rem;
	}
	.extra:not([hidden]) {
		display: grid;
		gap: 8px;
	}
	.off {
		gap: 4px;
		margin-top: 2px;
	}
	.off input {
		margin: 0;
		min-width: 0;
	}
	.side {
		padding: 8px 10px;
		font-weight: 600;
		min-width: 40px;
	}
	.hint,
	.err {
		margin: 0;
	}
	.err {
		color: var(--danger);
	}
	.shots {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.shots li {
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid var(--hair);
		padding: 4px 0;
	}
	.idx {
		width: 1.8em;
		text-align: right;
	}
	.what {
		flex: 1;
	}
	.del {
		margin-top: 32px;
		text-align: center;
	}
</style>
