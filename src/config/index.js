import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  github: {
    token: process.env.GITHUB_TOKEN
  },
  google: {
    apiKey: process.env.API_KEY
  },
};