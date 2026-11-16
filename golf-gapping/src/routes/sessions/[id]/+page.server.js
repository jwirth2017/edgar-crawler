import { error, fail, redirect } from '@sveltejs/kit';
import { all, get, run, bagsWithClubs, num } from '#lib/server/db.js';

export function load({ params }) {
	const session = get('SELECT * FROM sessions WHERE id = ?', Number(params.id));
	if (!session) error(404, 'Session not found');

	const bags = bagsWithClubs().map((b) => ({
		id: b.id,
		name: b.name,
		is_active: b.is_active,
		clubs: b.clubs
			.filter((c) => c.kind !== 'putter')
			.map((c) => ({ id: c.id, short: c.short, name: c.name }))
	}));

	return {
		session,
		bags,
		shots: all(
			`SELECT sh.*, c.short AS club FROM shots sh JOIN clubs c ON c.id = sh.club_id
			 WHERE sh.session_id = ? ORDER BY sh.id DESC`,
			session.id
		)
	};
}

export const actions = {
	add: async ({ request, params }) => {
		const f = await request.formData();
		const club_id = num(f.get('club_id'));
		const carry = num(f.get('carry'));
		if (club_id == null) return fail(400, { error: 'Pick a club first.' });
		if (carry == null || carry <= 0 || carry > 450)
			return fail(400, { error: 'Carry should be a number of yards.' });

		// Offline is typed as a plain number plus an L/R toggle; stored signed.
		let offline = num(f.get('offline'));
		if (offline != null) offline = Math.abs(offline) * (f.get('side') === 'L' ? -1 : 1);

		run(
			`INSERT INTO shots
			 (session_id, club_id, carry, total, ball_speed, launch_angle, spin, club_speed, offline)
			 VALUES (?,?,?,?,?,?,?,?,?)`,
			Number(params.id),
			club_id,
			carry,
			num(f.get('total')),
			num(f.get('ball_speed')),
			num(f.get('launch_angle')),
			num(f.get('spin')),
			num(f.get('club_speed')),
			offline
		);
		return { added: true };
	},

	deleteShot: async ({ request, params }) => {
		const id = num((await request.formData()).get('shot_id'));
		run('DELETE FROM shots WHERE id = ? AND session_id = ?', id, Number(params.id));
	},

	deleteSession: async ({ params }) => {
		run('DELETE FROM sessions WHERE id = ?', Number(params.id));
		redirect(303, '/sessions');
	}
};
