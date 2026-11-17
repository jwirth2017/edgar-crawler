import { floors, meta } from './config/house.js';
import { deriveWalls, floorAreas, overlaps } from './model/layout.js';
import { floorPlanSVG, sitePlanSVG } from './plan/plan2d.js';

const VIEWS = [
  { key: 'main', label: 'Main floor' },
  { key: 'upper', label: 'Upper floor' },
  { key: 'basement', label: 'Walkout basement' },
  { key: 'site', label: 'Site plan' },
];

const tabs = document.getElementById('tabs');
const stage = document.getElementById('stage');
const facts = document.getElementById('facts');

function show(key) {
  for (const b of tabs.children) b.setAttribute('aria-pressed', String(b.dataset.key === key));
  stage.innerHTML = key === 'site' ? sitePlanSVG() : floorPlanSVG(key);
  stage.dataset.view = key;
  history.replaceState(null, '', `?view=${key}`);

  if (key === 'site') {
    facts.innerHTML = '<span>Front of the house faces east (bottom of the page). The lot falls to the west so the basement walks out to the patio and pool.</span>';
    return;
  }
  const f = floors[key];
  const a = floorAreas(f);
  const target = meta.targetAreas[key];
  const diff = Math.round(((a.finished - target) / target) * 100);
  const problems = [
    ...deriveWalls(f).unplaced.map((o) => `opening at ${o.on}=${o.at}, ${o.from}–${o.to} is not on a wall`),
    ...overlaps(f).map(([p, q]) => `rooms "${p}" and "${q}" overlap`),
  ];
  facts.innerHTML = `
    <span><b>${Math.round(a.finished).toLocaleString()} sq ft</b> finished (target ~${target.toLocaleString()}, ${diff >= 0 ? '+' : ''}${diff}%)</span>
    ${a.unfinished ? `<span>${Math.round(a.unfinished).toLocaleString()} sq ft unfinished / garage</span>` : ''}
    <span>${f.ceiling}' ceilings · floor at ${f.floor >= 0 ? '+' : ''}${f.floor}'</span>
    ${problems.map((p) => `<span class="warn">⚠ ${p}</span>`).join('')}`;
}

for (const v of VIEWS) {
  const b = document.createElement('button');
  b.textContent = v.label;
  b.dataset.key = v.key;
  b.addEventListener('click', () => show(v.key));
  tabs.appendChild(b);
}

const initial = new URLSearchParams(location.search).get('view');
show(VIEWS.some((v) => v.key === initial) ? initial : 'main');
