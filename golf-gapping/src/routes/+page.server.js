import { all, bagsWithClubs, run, tx, num } from '#lib/server/db.js';
import { trimmedStats, ladder } from '#lib/stats.js';

export function load() {
	const bags = bagsWithClubs();
	const bag = bags.find((b) => b.is_active) ?? bags[0];
	const clubs = (bag?.clubs ?? []).filter((c) => c.kind !== 'putter');

	// Full swings only: shots tagged with a partial swing length belong to the
	// wedge chart and would drag a club's stock number down.
	const shots = all(
		`SELECT s.club_id, s.carry, s.total FROM shots s
		 JOIN bag_clubs bc ON bc.club_id = s.club_id AND bc.bag_id = ?
		 WHERE s.swing_length IS NULL OR s.swing_length = 'full-to-full'`,
		bag?.id ?? 0
	);

	const withData = [];
	const noData = [];
	for (const c of clubs) {
		const st = trimmedStats(shots.filter((s) => s.club_id === c.id));
		if (st) withData.push({ id: c.id, name: c.name, short: c.short, loft: c.loft, ...st });
		else noData.push({ id: c.id, name: c.name, short: c.short, loft: c.loft });
	}

	return {
		bags: bags.map((b) => ({ id: b.id, name: b.name })),
		bagId: bag?.id ?? null,
		notes: bag?.notes ?? '',
		rows: ladder(withData),
		noData
	};
}

export const actions = {
	// Single user, so the bag you're looking at is simply the active one —
	// shot entry defaults to it too.
	activate: async ({ request }) => {
		const id = num((await request.formData()).get('bag_id'));
		if (id == null) return;
		tx(() => {
			run('UPDATE bags SET is_active = 0');
			run('UPDATE bags SET is_active = 1 WHERE id = ?', id);
		});
	}
};
