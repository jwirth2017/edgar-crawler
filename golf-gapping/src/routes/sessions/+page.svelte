<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	/** @param {string} iso */
	const pretty = (iso) =>
		new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
</script>

<svelte:head><title>Sessions</title></svelte:head>

<h1>Sessions</h1>

<form method="POST" action="?/create" use:enhance class="card new">
	<div class="grid2">
		<label>Date <input type="date" name="date" value={data.today} required /></label>
		<label
			>Location
			<select name="location">
				<option value="sim">Sim</option>
				<option value="range">Range</option>
				<option value="course">Course</option>
			</select>
		</label>
	</div>
	<label
		>Ball
		<input name="ball_type" list="balls" placeholder="e.g. Pro V1, range ball" autocomplete="off" />
	</label>
	<datalist id="balls">
		{#each data.balls as b (b)}<option value={b}></option>{/each}
	</datalist>
	<label class="check">
		<input type="checkbox" name="is_demo" /> Demo / fitting session
	</label>
	{#if form?.error}<p class="err">{form.error}</p>{/if}
	<button class="primary">Start session</button>
</form>

<h2>History</h2>
{#if data.sessions.length === 0}
	<p class="muted">Nothing logged yet.</p>
{:else}
	<ul class="list">
		{#each data.sessions as s (s.id)}
			<li>
				<a href="/sessions/{s.id}" class="card">
					<span>
						<strong>{pretty(s.date)}</strong>
						<span class="muted small">
							<br />{s.location}{s.ball_type ? ` · ${s.ball_type}` : ''}{s.is_demo
								? ' · demo/fitting'
								: ''}
						</span>
					</span>
					<span class="muted small num">{s.shots} shot{s.shots === 1 ? '' : 's'}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.new {
		display: grid;
		gap: 10px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1rem;
		color: var(--ink);
		min-height: 32px;
	}
	.err {
		color: var(--danger);
		margin: 0;
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 8px;
	}
	.list a {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: var(--ink);
	}
</style>
