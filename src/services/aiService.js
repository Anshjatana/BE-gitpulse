import { config } from '../config/index.js';
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(config.google.apiKey); // Replace with your Google API Key
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateProfileAnalysis(githubData) {
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

  const result = await model.generateContent(prompt);
  return result.response.text();
}