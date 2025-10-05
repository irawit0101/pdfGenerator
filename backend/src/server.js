import express from 'express';
import cors from 'cors';
import { generatePDF } from './pdfGenerator.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';

const app = express();
const port = process.env.PORT || 4002;

// Security headers
app.use(helmet());

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Handle server errors
process.on('uncaughtException', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please try a different port.`);
    process.exit(1);
  } else {
    console.error('Uncaught Exception:', error);
  }
});

// Store tenders in memory (replace with database in production)
let tenders = [];

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Body parser with size limit
app.use(express.json({ limit: '1mb' }));

// API endpoint to submit a tender
app.post('/api/tender', (req, res) => {
  try {
    const tender = req.body;
    tenders.push(tender);
    res.json({ message: 'Tender added successfully', tenderId: tenders.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to generate PDF
app.post('/api/generate-pdf', async (req, res) => {
  try {
    if (tenders.length === 0) {
      return res.status(400).json({ error: 'No tenders available' });
    }

    const pdfBuffer = await generatePDF(tenders);
    
    // Clear tenders after generating PDF
    tenders = [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tenders.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});