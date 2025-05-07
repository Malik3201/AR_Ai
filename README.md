# AR Ai - Personal AI Assistant

A modern, feature-rich AI chatbot using HTML, CSS, and JavaScript with DeepSeek API integration.

## Features

- Sleek, modern UI with dark/light mode
- Multiple chat conversations
- Real-time response streaming with typewriter effect
- Chat history with localStorage persistence
- Predefined responses for common questions
- Mobile-responsive design
- Regenerate responses
- Stop generation mid-response

## Usage

1. Open `index.html` in a modern web browser
2. Start chatting with AR Ai
3. Use the sidebar to manage multiple conversations
4. Toggle between dark and light modes using the theme button

## Technology

- Pure HTML, CSS, and JavaScript (no frameworks or libraries)
- DeepSeek API integration for AI responses
- LocalStorage for persistent chat history
- Responsive design for desktop and mobile

## API Configuration

The chatbot is configured to use DeepSeek's API. The API key is set in the `script.js` file:

```javascript
const API_CONFIG = {
    API_KEY: 'sk-dbfd29df1c0d412889264c78b69a327a',
    API_URL: 'https://api.deepseek.com/v1/chat/completions',
    MODEL: 'deepseek-chat',
};
```

## Credits

Created by AbdulRehman 