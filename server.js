import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import Gemini library
import analyzerRoutes from './src/routes/analyzerRoutes.js';

dotenv.config();

const app = express();

// Define the allowed origins
const allowedOrigins = ['http://localhost:3000', 'https://gitpulse.anshjatana.online'];

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow specific origins or none (i.e., * for all origins)
    const allowedOrigins = ['http://localhost:3000', 'https://gitpulse.anshjatana.online'];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS'), false); // Reject the request
    }
  },
  methods: 'GET, POST, PUT, DELETE, OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  credentials: true, // Allow cookies/credentials
  preflightContinue: true, // Handle preflight requests
};
app.use(cors(corsOptions));

// Handle OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.use(express.json());

app.use('/api', analyzerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize the Google Gemini API client
const genAI = new GoogleGenerativeAI(process.env.API_KEY); // Use your Gemini API key here
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Utility function to fetch GitHub user data
async function fetchGitHubData(username) {
  try {
    const userResponse = await octokit.request('GET /users/{username}', {
      username,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const reposResponse = await octokit.request('GET /users/{username}/repos', {
      username,
      sort: 'updated',
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return {
      user: userResponse.data,
      repos: reposResponse.data
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    throw error;
  }
}

// Utility function to analyze GitHub profile with Gemini API
async function analyzeProfile(githubData) {
  const userInfo = githubData.user;
  const repos = githubData.repos;

  const prompt = `Analyze this GitHub profile and provide a detailed, friendly analysis with a chill score (0-100):
    User: ${userInfo.login}
    Name: ${userInfo.name}
    Bio: ${userInfo.bio}
    Public Repos: ${userInfo.public_repos}
    Followers: ${userInfo.followers}
    Following: ${userInfo.following}
    Top Repositories: ${repos.slice(0, 5).map(repo => 
      `${repo.name} (Stars: ${repo.stargazers_count}, Forks: ${repo.forks_count})`
    ).join(', ')}
    
    Consider factors like:
    1. Contribution frequency
    2. Project diversity
    3. Community engagement
    4. Documentation quality
    5. Code organization
    
    Format the response as a friendly, conversational analysis with specific observations and a final chill score.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating profile analysis:', error);
    throw error;
  }
}

app.post('/api/analyze/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Set the necessary CORS headers to allow the frontend to access the response
    res.setHeader('Access-Control-Allow-Origin', '*');  // Allows all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Fetch GitHub data
    const githubData = await fetchGitHubData(username);
    
    // Get the analysis from Gemini API
    const analysis = await analyzeProfile(githubData);

    // Send the analysis result to the client
    res.write(`data: ${JSON.stringify({ content: analysis })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the profile' });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
