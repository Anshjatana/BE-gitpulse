import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  github: {
    token: process.env.GITHUB_TOKEN
  }
};