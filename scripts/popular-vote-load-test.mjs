// Mock load smoke test for Popular Vote in-memory counting.
// This does not hit production Firebase.
const candidates = Array.from({ length: 20 }, (_, i) => ({ candidateId: `c-${i + 1}`, votes: 0 }));
const voters = 2000;
const started = Date.now();
const seen = new Set();
for (let i = 0; i < voters; i += 1) {
  const uid = `anon-${i}`;
  if (seen.has(uid)) throw new Error("duplicate uid accepted");
  seen.add(uid);
  candidates[i % candidates.length].votes += 1;
}
const ranked = [...candidates].sort((a, b) => b.votes - a.votes);
console.log(JSON.stringify({ voters, candidates: candidates.length, top: ranked.slice(0, 3), elapsedMs: Date.now() - started }, null, 2));
