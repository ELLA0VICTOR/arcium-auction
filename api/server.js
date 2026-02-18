import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import encryptionRoutes from './routes/encryption.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Arcium Auction API',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/encryption', encryptionRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(` Arcium Auction API running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Encryption endpoint: http://localhost:${PORT}/api/encryption`);
});