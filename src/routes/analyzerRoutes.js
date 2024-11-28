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
    
    for await (const chunk of stream) {
      console.log('Received chunk:', chunk);
      if (chunk.choices && Array.isArray(chunk.choices) && chunk.choices.length > 0) {
        const choice = chunk.choices[0];
        const content = choice?.delta?.content || '';  // Check delta and content
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        } else {
          console.warn('Content missing in chunk choice:', choice);
        }
      } else {
        console.error('No valid choices found in chunk:', chunk);
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