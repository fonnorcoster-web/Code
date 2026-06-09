import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import recommendationsRouter from './routes/recommendations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/recommendations', recommendationsRouter);

// Image proxy endpoint - fetches remote images to avoid CORS issues on frontend
app.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // Validate the URL is actually a URL
    new URL(decodedUrl);

    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': decodedUrl,
      },
      maxRedirects: 5,
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Only allow image content types
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });

    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Image proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleKey: !!process.env.GOOGLE_PLACES_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Coffee Recommender API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
