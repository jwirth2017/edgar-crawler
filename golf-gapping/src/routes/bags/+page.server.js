import { fail } from '@sveltejs/kit';
import { all, get, run, tx, bagsWithClubs, num } from '#lib/server/db.js';

const KINDS = ['driver', 'wood', 'hybrid', 'iron', 'wedge', 'putter'];

export function load() {
	return {
		kinds: KINDS,
		bags: bagsWithClubs(),
		// every club, so one can be dropped into another bag (data comes with it)
		allClubs: all(
			`SELECT c.id, c.name, c.loft, (SELECT COUNT(*) FROM shots s WHERE s.club_id = c.id) AS shots
			 FROM clubs c ORDER BY c.name`
		)
	};
}

/** @param {number} bagId */
const nextPosition = (bagId) =>
	get('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM bag_clubs WHERE bag_id = ?', bagId)?.p ?? 0;

/** @param {FormData} f */
function clubFields(f) {
	const name = String(f.get('name') ?? '').trim();
	const short = String(f.get('short') ?? '').trim() || name.slice(0, 8);
	const kind = String(f.get('kind') ?? 'iron');
	return { name, short, kind: KINDS.includes(kind) ? kind : 'iron', loft: num(f.get('loft')) };
}

export const actions = {
	saveBag: async ({ request }) => {
		const f = await request.formData();
		const name = String(f.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'A bag needs a name.' });
		run(
			'UPDATE bags SET name = ?, notes = ? WHERE id = ?',
			name,
			String(f.get('notes') ?? '').trim(),
			num(f.get('bag_id'))
		);
	},

	saveClub: async ({ request }) => {
		const f = await request.formData();
		const c = clubFields(f);
		if (!c.name) return fail(400, { error: 'A club needs a name.' });
		run(
			'UPDATE clubs SET name = ?, short = ?, kind = ?, loft = ? WHERE id = ?',
			c.name,
			c.short,
			c.kind,
			c.loft,
			num(f.get('club_id'))
		);
	},

	addClub: async ({ request }) => {
		const f = await request.formData();
		const bagId = num(f.get('bag_id'));
		const c = clubFields(f);
		if (bagId == null || !c.name) return fail(400, { error: 'A club needs a name.' });
		tx(() => {
			const { lastInsertRowid } = run(
				'INSERT INTO clubs (name, short, kind, loft) VALUES (?,?,?,?)',
				c.name,
				c.short,
				c.kind,
				c.loft
			);
			run(
				'INSERT INTO bag_clubs (bag_id, club_id, position) VALUES (?,?,?)',
				bagId,
				lastInsertRowid,
				nextPosition(bagId)
			);
		});
	},

	addExisting: async ({ request }) => {
		const f = await request.formData();
		const bagId = num(f.get('bag_id'));
		const clubId = num(f.get('club_id'));
		if (bagId == null || clubId == null) return fail(400, { error: 'Pick a club.' });
		run(
			'INSERT OR IGNORE INTO bag_clubs (bag_id, club_id, position) VALUES (?,?,?)',
			bagId,
			clubId,
			nextPosition(bagId)
		);
	},

	// Takes the club out of this bag only. The club and its shots are kept, so
	// it can be added back (here or to another bag) with its history intact.
	remove: async ({ request }) => {
		const f = await request.formData();
		run(
			'DELETE FROM bag_clubs WHERE bag_id = ? AND club_id = ?',
			num(f.get('bag_id')),
			num(f.get('club_id'))
		);
	},

	move: async ({ request }) => {
		const f = await request.formData();
		const bagId = num(f.get('bag_id'));
		const clubId = num(f.get('club_id'));
		const dir = f.get('dir') === 'up' ? -1 : 1;
		const ids = all(
			'SELECT club_id FROM bag_clubs WHERE bag_id = ? ORDER BY position, club_id',
			bagId
		).map((r) => r.club_id);
		const i = ids.indexOf(clubId);
		const j = i + dir;
		if (i < 0 || j < 0 || j >= ids.length) return;
		[ids[i], ids[j]] = [ids[j], ids[i]];
		tx(() =>
			ids.forEach((id, p) =>
				run('UPDATE bag_clubs SET position = ? WHERE bag_id = ? AND club_id = ?', p, bagId, id)
			)
		);
	}
};
