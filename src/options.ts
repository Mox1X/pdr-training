import { signs } from './data/signs';
import type { RoadSign } from './data/signs';
import type { Progress } from './progress';

// Curated visual families: never infer sign meaning from pixel similarity.
const visualGroups: Record<string, string[]> = {
  triangle: ['1.'], circleBlue: ['4.'], circleRed: ['3.1','3.2','3.3','3.4','3.5','3.6','3.7','3.8','3.9','3.10','3.11','3.12','3.13','3.14','3.15','3.16','3.17','3.18','3.19','3.20','3.21','3.22','3.23','3.24','3.25','3.27','3.29','3.33','3.34','3.35','3.36','3.37','3.43','3.44','3.45'],
  service: ['6.'], plate: ['7.'], information: ['5.'], priority: ['2.'],
};
function groups(s: RoadSign) {
  if (/^1\.(4|31)\./.test(s.id)) return ['plateRed'];
  if (['1.29','1.30'].includes(s.id)) return ['railCross'];
  if (['4.23','4.24'].includes(s.id) || s.id.startsWith('4.20.')) return ['information'];
  const priority: Record<string,string> = {'2.1':'invertedTriangle','2.2':'octagon','2.3':'diamond','2.4':'diamond','2.5':'circleRed','2.6':'information'};
  if(priority[s.id]) return [priority[s.id]];
  return Object.entries(visualGroups).filter(([, ids]) => ids.some(id => id.endsWith('.') ? s.id.startsWith(id) : id === s.id)).map(([key]) => key);
}
const features = new Map(signs.map(s => [s.id, { groups: groups(s), words: new Set(s.answerLabel.toLowerCase().split(/[^\p{L}]+/u).filter(w => w.length > 3)) }]));
export function compatible(target: RoadSign, other: RoadSign): boolean {
  if (target.id === other.id || target.answerLabel === other.answerLabel) return false;
  // Family-generic prompts must not offer another member as an alternative correct image.
  if (target.name === other.name && (target.answerLabel === target.name || other.answerLabel === other.name)) return false;
  return !(target.images ?? [target.image]).some(img => (other.images ?? [other.image]).includes(img));
}
function similarity(a: RoadSign, b: RoadSign) {
  const x = features.get(a.id)!, y = features.get(b.id)!;
  return Number(a.category === b.category) * 10 + x.groups.filter(g => y.groups.includes(g)).length * 8 + Number(a.name === b.name) * 12 + [...x.words].filter(w => y.words.has(w)).length;
}
export function generateOptions(target: RoadSign, progress: Progress, random = Math.random, blocked = new Set<string>()): string[] {
  const pool = signs.filter(s => compatible(target,s) && (s.images??[s.image]).some(img=>!blocked.has(img)));
  const chosen: RoadSign[] = [];
  const take = (candidates: RoadSign[], weight: (s: RoadSign) => number) => {
    const eligible = candidates.filter(s => !chosen.some(c => c.id === s.id || c.answerLabel === s.answerLabel));
    if (!eligible.length) return false;
    let cursor = random() * eligible.reduce((sum,s) => sum + weight(s),0);
    const candidate = eligible.find(s => (cursor -= weight(s)) < 0) ?? eligible[eligible.length-1];
    chosen.push(candidate); return true;
  };
  const confused = progress.signs[target.id]?.confusions ?? {};
  // Reserve at most two slots for demonstrated personal confusions.
  for (let i=0;i<2;i++) if (!take(pool.filter(s => (confused[s.id] ?? 0)>0), s => confused[s.id])) break;
  const ranked = pool.map(s => ({ s, rank: similarity(target,s) })).sort((a,b) => b.rank-a.rank);
  while (chosen.length<3) {
    const eligible = ranked.filter(({s}) => !chosen.some(c => c.id===s.id || c.answerLabel===s.answerLabel));
    const best = eligible[0]?.rank;
    if (best === undefined || !take(eligible.filter(x => x.rank>=best-2).slice(0,16).map(x=>x.s), () => 1)) throw Error('Insufficient distinct answers');
  }
  const ids = [target.id,...chosen.map(s=>s.id)];
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
}
