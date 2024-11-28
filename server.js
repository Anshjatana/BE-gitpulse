import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import OpenAI from 'openai';
import analyzerRoutes from './src/routes/analyzerRoutes.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', analyzerRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

// Utility function to analyze GitHub profile with AI
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

  return openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    stream: true
  });
}

app.post('/api/analyze/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Fetch GitHub data
    const githubData = await fetchGitHubData(username);
    
    // Get the streaming response from OpenAI
    const stream = await analyzeProfile(githubData);
    
    // Stream the analysis to the client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

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