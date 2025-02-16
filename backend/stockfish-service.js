const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const redis = require('redis');

const app = express();
const client = redis.createClient({ url: 'redis://redis:6379' });

(async () => {
  await client.connect();
})();

app.use(cors());
app.use(express.json());

const analyzePosition = async (fen, difficulty) => {
  const cacheKey = `analysis:${fen}:${difficulty}`;
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);

  return new Promise((resolve, reject) => {
    const stockfish = spawn('stockfish');
    let analysis = '';

    stockfish.stdin.write(`setoption name Skill Level value ${difficulty}\n`);
    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write('go depth 16\n');

    stockfish.stdout.on('data', (data) => {
      analysis += data.toString();
      if (analysis.includes('bestmove')) {
        const bestMove = analysis.match(/bestmove (\w+)/)[1];
        const evaluation = analysis.match(/cp (-?\d+)/)?.[1] || analysis.match(/mate (-?\d+)/)?.[1];
        const suggestedArrows = analysis.includes('pv') ? 
          [analysis.match(/pv (\w+)/)[1].match(/.{2}/g)] : [];

        const result = {
          bestMove,
          evaluation: evaluation ? `${evaluation} ${evaluation > 0 ? '⚪' : '⚫'}` : 'Checkmate!',
          suggestedArrows: suggestedArrows.slice(0, 2)
        };

        client.setEx(cacheKey, 3600, JSON.stringify(result));
        resolve(result);
        stockfish.kill();
      }
    });

    stockfish.on('error', reject);
  });
};

app.post('/api/analyze', async (req, res) => {
  try {
    const result = await analyzePosition(req.body.fen, req.body.difficulty);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.listen(3001, () => console.log('AI Service running on port 3001'));