// progress.js — 학습 진척도 저장(localStorage). 방 클리어 여부 / 전체 진척 / 완료.
const KEY = 'eduino.progress.v1';
// 현재 학습 가능한(잠금 해제) 방 목록 — 클리어 집계 기준
export const LEARNABLE = ['led', 'dht11'];

function load() { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } }
let cleared = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify([...cleared])); } catch {} }

export const progress = {
  isCleared: (id) => cleared.has(id),
  mark: (id) => { cleared.add(id); save(); },
  unmark: (id) => { cleared.delete(id); save(); },
  count: () => LEARNABLE.filter((id) => cleared.has(id)).length,
  total: () => LEARNABLE.length,
  allDone: () => LEARNABLE.length > 0 && LEARNABLE.every((id) => cleared.has(id)),
  reset: () => { cleared = new Set(); save(); },
};
