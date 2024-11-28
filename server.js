import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';  // Add axios for HTTP requests
import { Octokit } from 'octokit';
import analyzerRoutes from './src/routes/analyzerRoutes.js';

dotenv.config();

const app = express();

// Define the allowed origins
const allowedOrigins = ['http://localhost:3000', 'https://gitpulse.anshjatana.online'];

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS'), false); // Reject the request
    }
  },
  methods: 'GET, POST, PUT, DELETE, OPTIONS', // Allow these methods
  allowedHeaders: 'Content-Type, Authorization', // Allow these headers
  credentials: true, // Allow cookies or credentials to be sent
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', analyzerRoutes);

// Set up proxy route for Gemini API
app.post('/api/proxy/analyze/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Prepare the request to the Gemini API
    const geminiAPIURL = `https://api.gemini.com/v1/analyze/${username}`; // Replace with actual Gemini API URL
    
    // Forward the request to the Gemini API
    const response = await axios.post(geminiAPIURL, req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Send the Gemini API response back to the client
    res.json(response.data);

  } catch (error) {
    console.error('Error in proxying the request:', error);
    res.status(500).json({ error: 'An error occurred while proxying the request' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
