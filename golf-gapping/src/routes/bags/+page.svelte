<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let bagId = $state(data.bags.find((b) => b.is_active)?.id ?? data.bags[0]?.id);
	let editing = $state(/** @type {number | null} */ (null));
	let adding = $state(false);

	const bag = $derived(data.bags.find((b) => b.id === bagId));
	const outside = $derived(
		data.allClubs.filter((c) => !bag?.clubs.some((/** @type {any} */ b) => b.id === c.id))
	);

	/** Close the open editor once a save succeeds. */
	const closeAfter = () => {
		return async (/** @type {any} */ { result, update }) => {
			await update();
			if (result.type === 'success') {
				editing = null;
				adding = false;
			}
		};
	};
</script>

<svelte:head><title>Bags</title></svelte:head>

<h1>Bags</h1>

<div class="seg" role="group" aria-label="Bag">
	{#each data.bags as b (b.id)}
		<button
			type="button"
			aria-pressed={b.id === bagId}
			onclick={() => {
				bagId = b.id;
				editing = null;
				adding = false;
			}}>{b.name}</button
		>
	{/each}
</div>

{#if form?.error}<p class="err">{form.error}</p>{/if}

{#if bag}
	{#key bag.id}
		<form method="POST" action="?/saveBag" use:enhance class="card bagform">
			<input type="hidden" name="bag_id" value={bag.id} />
			<label>Bag name <input name="name" value={bag.name} required /></label>
			<label>Notes <input name="notes" value={bag.notes} placeholder="Shafts, length, lie…" /></label>
			<button>Save bag details</button>
		</form>
	{/key}

	<h2>{bag.clubs.length} clubs</h2>
	<ul class="clubs">
		{#each bag.clubs as c, i (c.id)}
			<li class="card">
				{#if editing === c.id}
					<form method="POST" action="?/saveClub" use:enhance={closeAfter} class="edit">
						<input type="hidden" name="club_id" value={c.id} />
						<label>Name <input name="name" value={c.name} required /></label>
						<div class="grid3">
							<label>Button label <input name="short" value={c.short} maxlength="10" /></label>
							<label
								>Loft °
								<input name="loft" inputmode="decimal" value={c.loft ?? ''} />
							</label>
							<label
								>Type
								<select name="kind" value={c.kind}>
									{#each data.kinds as k (k)}<option value={k}>{k}</option>{/each}
								</select>
							</label>
						</div>
						<div class="spread">
							<button type="button" class="quiet" onclick={() => (editing = null)}>Cancel</button>
							<button class="primary">Save</button>
						</div>
					</form>
					<div class="spread tools">
						<form method="POST" action="?/move" use:enhance class="row">
							<input type="hidden" name="bag_id" value={bag.id} />
							<input type="hidden" name="club_id" value={c.id} />
							<button name="dir" value="up" disabled={i === 0} aria-label="Move up">↑</button>
							<button
								name="dir"
								value="down"
								disabled={i === bag.clubs.length - 1}
								aria-label="Move down">↓</button
							>
						</form>
						<form method="POST" action="?/remove" use:enhance={closeAfter}>
							<input type="hidden" name="bag_id" value={bag.id} />
							<input type="hidden" name="club_id" value={c.id} />
							<button class="quiet danger">Remove from bag</button>
						</form>
					</div>
					<p class="muted small note">
						Removing keeps the club and its shots — add it back any time. Edits apply in every bag
						that carries this club.
					</p>
				{:else}
					<button type="button" class="line" onclick={() => (editing = c.id)}>
						<span>
							<strong>{c.short}</strong>
							<span class="muted small"> {c.name}</span>
						</span>
						<span class="muted small num right">
							{c.loft != null ? `${c.loft}° · ` : c.kind === 'putter' ? '' : 'loft? · '}Edit
						</span>
					</button>
				{/if}
			</li>
		{/each}
	</ul>

	{#if adding}
		<div class="card addbox">
			<form method="POST" action="?/addClub" use:enhance={closeAfter} class="edit">
				<input type="hidden" name="bag_id" value={bag.id} />
				<label>Name <input name="name" required placeholder="e.g. Titleist TSR2 Hybrid" /></label>
				<div class="grid3">
					<label>Button label <input name="short" maxlength="10" placeholder="Hyb" /></label>
					<label>Loft ° <input name="loft" inputmode="decimal" /></label>
					<label
						>Type
						<select name="kind">
							{#each data.kinds as k (k)}<option value={k} selected={k === 'iron'}>{k}</option
								>{/each}
						</select>
					</label>
				</div>
				<div class="spread">
					<button type="button" class="quiet" onclick={() => (adding = false)}>Cancel</button>
					<button class="primary">Add new club</button>
				</div>
			</form>
			{#if outside.length}
				<form method="POST" action="?/addExisting" use:enhance={closeAfter} class="edit existing">
					<input type="hidden" name="bag_id" value={bag.id} />
					<label
						>…or bring in a club you already have (its shots come with it)
						<select name="club_id">
							{#each outside as c (c.id)}
								<option value={c.id}
									>{c.name}{c.loft != null ? ` (${c.loft}°)` : ''} — {c.shots} shots</option
								>
							{/each}
						</select>
					</label>
					<button>Add to {bag.name}</button>
				</form>
			{/if}
		</div>
	{:else}
		<button class="addbtn" onclick={() => ((adding = true), (editing = null))}>+ Add a club</button>
	{/if}
{/if}

<style>
	.bagform,
	.edit {
		display: grid;
		gap: 8px;
	}
	.bagform {
		margin-top: 12px;
	}
	.clubs {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 6px;
	}
	.clubs li.card {
		padding: 0;
	}
	.clubs li.card:has(.edit) {
		padding: 12px;
	}
	.line {
		width: 100%;
		border: 0;
		background: transparent;
		justify-content: space-between;
		text-align: left;
		padding: 8px 12px;
		min-height: 48px;
	}
	.right {
		white-space: nowrap;
	}
	.tools {
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--hair);
	}
	.tools .row button {
		min-width: 44px;
	}
	.note {
		margin: 8px 0 0;
	}
	.addbtn {
		width: 100%;
		margin-top: 10px;
		border-style: dashed;
	}
	.addbox {
		margin-top: 10px;
	}
	.existing {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--hair);
	}
	.err {
		color: var(--danger);
	}
</style>
