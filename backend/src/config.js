require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  llm: {
    mode: process.env.LLM_MODE || 'mock',
    apiKey: process.env.LLM_API_KEY || '',
    endpoint: process.env.LLM_ENDPOINT || 'https://api.llm-provider.example/v1/chat/completions',
    model: process.env.LLM_MODEL || 'generic-chat-model'
  },
  dbPath: process.env.DB_PATH || './data/chatbot.sqlite'
};

module.exports = config;
