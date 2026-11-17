// Solar position from latitude, date and (solar) time of day, plus the
// lighting it drives: sun light + shadows, sky, ambient, and evening glow.
import * as THREE from 'three';

const DEG = Math.PI / 180;

export function solarPosition(latitude, month, day, hour) {
  const N = Math.floor(275 * month / 9) - 2 * Math.floor((month + 9) / 12) + day - 30; // day of year
  const decl = 23.44 * DEG * Math.sin((2 * Math.PI * (284 + N)) / 365);
  const H = 15 * (hour - 12) * DEG;
  const phi = latitude * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  // azimuth clockwise from north
  let az = Math.atan2(-Math.cos(decl) * Math.sin(H), Math.sin(decl) * Math.cos(phi) - Math.cos(decl) * Math.cos(H) * Math.sin(phi));
  if (az < 0) az += 2 * Math.PI;
  // world: X = north, Y = up, Z = east
  const dir = new THREE.Vector3(Math.cos(az) * Math.cos(alt), Math.sin(alt), Math.sin(az) * Math.cos(alt));
  return { dir, altitude: alt / DEG, azimuth: az / DEG };
}

export function compassName(az) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(az / 45) % 8];
}

const SKY_DAY = new THREE.Color('#d6e6ff');
const SKY_DUSK = new THREE.Color('#ffc9a0');
const SKY_NIGHT = new THREE.Color('#5a6a9a');
const FOG_DAY = new THREE.Color('#bccbd8');
const FOG_DUSK = new THREE.Color('#d9a988');
const FOG_NIGHT = new THREE.Color('#1c2333');

const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function applySun({ sun, hemi, ambient, sky, renderer, scene, M }, pos) {
  const { dir, altitude } = pos;
  const day = smooth(-4, 6, altitude);          // 0 at night → 1 in daylight
  const low = 1 - smooth(4, 30, altitude);       // warm near the horizon
  const target = sun.target.position;
  sun.position.copy(target).addScaledVector(dir, 600);
  sun.intensity = 3.2 * smooth(-1, 5, altitude);
  sun.color.setHSL(0.09 - 0.05 * low, 0.15 + 0.75 * low, 0.6 + 0.2 * (1 - low));
  hemi.intensity = 0.45 + 0.75 * day;
  // blend real colors (blue sky → warm dusk → night blue) instead of sweeping the hue through green
  hemi.color.lerpColors(SKY_DAY, SKY_DUSK, low * day).lerp(SKY_NIGHT, 1 - day);
  ambient.intensity = 0.22 + 0.25 * day;
  const su = sky.material.uniforms;
  su.sunPosition.value.copy(dir);
  su.turbidity.value = 4 + 6 * low;
  su.rayleigh.value = 1.2 + 2.2 * low;
  su.mieCoefficient.value = 0.004 + 0.008 * low;
  renderer.toneMappingExposure = 0.5 + 0.2 * day;
  // windows and lanterns glow as the light fades
  const dusk = 1 - smooth(-3, 9, altitude);
  M.glass.emissiveIntensity = 0.9 * dusk;
  M.lantern.emissiveIntensity = 3.5 * dusk;
  M.screen.emissiveIntensity = 0.05 + 0.4 * dusk;
  scene.fog.color.lerpColors(FOG_DAY, FOG_DUSK, low).lerp(FOG_NIGHT, 1 - day);
}
