import express from 'express';
import { fetchGitHubData } from '../services/githubService.js';
import { generateProfileAnalysis } from '../services/aiService.js';

const router = express.Router();

router.post('/analyze/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Fetch GitHub data
    const githubData = await fetchGitHubData(username);
    
    // Get the streaming response from OpenAI
    const stream = await generateProfileAnalysis(githubData);
    
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

export default router;