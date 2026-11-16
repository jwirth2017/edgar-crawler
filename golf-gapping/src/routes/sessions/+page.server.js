import { fail, redirect } from '@sveltejs/kit';
import { all, run } from '#lib/server/db.js';

const LOCATIONS = ['sim', 'range', 'course'];

export function load() {
	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	return {
		today,
		sessions: all(
			`SELECT s.*, COUNT(sh.id) AS shots, COUNT(DISTINCT sh.club_id) AS clubs
			 FROM sessions s LEFT JOIN shots sh ON sh.session_id = s.id
			 GROUP BY s.id ORDER BY s.date DESC, s.id DESC`
		),
		balls: all(`SELECT DISTINCT ball_type FROM sessions WHERE ball_type <> '' ORDER BY 1`).map(
			(r) => r.ball_type
		)
	};
}

export const actions = {
	create: async ({ request }) => {
		const f = await request.formData();
		const date = String(f.get('date') ?? '');
		const location = String(f.get('location') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'Pick a date.' });
		if (!LOCATIONS.includes(location)) return fail(400, { error: 'Pick a location.' });
		const { lastInsertRowid } = run(
			'INSERT INTO sessions (date, location, ball_type, is_demo) VALUES (?,?,?,?)',
			date,
			location,
			String(f.get('ball_type') ?? '').trim(),
			f.get('is_demo') ? 1 : 0
		);
		redirect(303, `/sessions/${lastInsertRowid}`);
	}
};
