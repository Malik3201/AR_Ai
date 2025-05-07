// Main ChatBot Application
const API_CONFIG = {
    API_KEY: 'sk-dbfd29df1c0d412889264c78b69a327a',
    API_URL: 'https://api.deepseek.com/v1/chat/completions',
    MODEL: 'deepseek-chat',
};

// Predefined responses for common questions
const PREDEFINED_RESPONSES = {
    'tell me about yourself': 'I am AR Ai, a personal AI assistant created by AbdulRehman. I can help you with information, answer questions, generate content, and have meaningful conversations. My goal is to be helpful, accurate, and friendly in all our interactions.',
    'what can you do': 'I can help you with a variety of tasks, including answering questions, providing information on different topics, engaging in conversation, offering creative ideas, and much more. Feel free to ask me anything, and I\'ll do my best to assist you!',
    'who created you': 'I was developed by AbdulRehman, a talented AI developer who specializes in creating innovative web interfaces.',
    'who is your creator': 'My creator is AbdulRehman, a talented AI developer who specializes in creating innovative web interfaces.',
    'who developed you': 'I was developed by AbdulRehman.',
    'what is your purpose': 'I am AR Ai, created by AbdulRehman to assist users with various tasks and engage in meaningful conversations.',
};

// DOM Elements
const elements = {
    // Chat UI
    messagesContainer: document.getElementById('messages'),
    chatForm: document.getElementById('chatForm'),
    userInput: document.getElementById('userInput'),
    sendButton: document.getElementById('sendButton'),
    stopGeneratingBtn: document.getElementById('stopGeneratingBtn'),
    regenerateBtn: document.getElementById('regenerateBtn'),
    chatTitle: document.getElementById('chatTitle'),
    
    // Sidebar
    chatsList: document.getElementById('chatsList'),
    newChatBtn: document.getElementById('newChatBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    menuToggleBtn: document.getElementById('menuToggleBtn'),
    
    // Containers
    sidebar: document.querySelector('.sidebar'),
};

// Main Chat Class
class ChatApp {
    constructor() {
        this.chats = {};
        this.currentChatId = null;
        this.controller = null;
        this.isGenerating = false;
        this.lastUserMessage = '';
        
        // Initialize the application
        this.init();
    }
    
    // Initialize the application
    init() {
        // Load saved chats from localStorage
        this.loadChats();
        
        // If no chats, create a new one
        if (Object.keys(this.chats).length === 0) {
            this.createNewChat();
        } else {
            // Load the most recent chat
            const sortedChatIds = Object.keys(this.chats).sort((a, b) => 
                new Date(this.chats[b].timestamp) - new Date(this.chats[a].timestamp)
            );
            this.switchChat(sortedChatIds[0]);
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load theme preference
        this.loadThemePreference();
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Form submission (send message)
        elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserMessage();
        });
        
        // Create new chat
        elements.newChatBtn.addEventListener('click', () => {
            this.createNewChat();
        });
        
        // Clear all chats
        elements.clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete all chats?')) {
                this.clearAllChats();
            }
        });
        
        // Regenerate last response
        elements.regenerateBtn.addEventListener('click', () => {
            this.regenerateResponse();
        });
        
        // Stop generating response
        elements.stopGeneratingBtn.addEventListener('click', () => {
            this.stopGenerating();
        });
        
        // Theme toggle
        elements.themeToggleBtn.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Mobile menu toggle
        elements.menuToggleBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('active');
        });
        
        // Handle suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const text = chip.getAttribute('data-text');
                elements.userInput.value = text;
                this.handleUserMessage();
            });
        });
        
        // Auto-resize textarea
        elements.userInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }
    
    // Handle user message submission
    handleUserMessage() {
        const message = elements.userInput.value.trim();
        
        if (!message || this.isGenerating) return;
        
        // Save the message for potential regeneration
        this.lastUserMessage = message;
        
        // Clear the input
        elements.userInput.value = '';
        this.autoResizeTextarea();
        
        // Add the message to the UI
        this.addMessageToUI('user', message);
        
        // Update chat title if it's the first message
        if (this.chats[this.currentChatId].messages.length === 0) {
            const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
            this.updateChatTitle(title);
        }
        
        // Add the message to the chat history
        this.chats[this.currentChatId].messages.push({
            role: 'user',
            content: message
        });
        
        // Save chats
        this.saveChats();
        
        // Process the message
        this.processUserMessage(message);
    }
    
    // Process user message and get AI response
    async processUserMessage(message) {
        // Check for predefined responses
        const lowerMessage = message.toLowerCase();
        let predefinedResponse = null;
        
        for (const [key, value] of Object.entries(PREDEFINED_RESPONSES)) {
            if (lowerMessage.includes(key)) {
                predefinedResponse = value;
                break;
            }
        }
        
        if (predefinedResponse) {
            // Use predefined response
            this.simulateTyping(predefinedResponse);
        } else {
            // Get response from API
            try {
                await this.getAIResponse(message);
            } catch (error) {
                console.error('Error getting AI response:', error);
                this.addErrorMessage('Sorry, I had trouble connecting. Please try again later.');
                this.isGenerating = false;
                document.body.classList.remove('generating');
            }
        }
        
        // Show regenerate button
        elements.regenerateBtn.style.display = 'flex';
    }
    
    // Get AI response from API
    async getAIResponse(message) {
        this.isGenerating = true;
        document.body.classList.add('generating');
        
        // Create loading message
        const loadingMessage = this.createLoadingMessage();
        elements.messagesContainer.appendChild(loadingMessage);
        this.scrollToBottom();
        
        try {
            // Create AbortController for cancellation
            this.controller = new AbortController();
            
            // Prepare chat history for context
            const chatHistory = this.chats[this.currentChatId].messages.slice(-5);
            
            // Make API request
            const response = await fetch(API_CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    model: API_CONFIG.MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are AR Ai, a helpful and friendly assistant created by AbdulRehman. You provide concise, helpful responses.'
                        },
                        ...chatHistory
                    ],
                    stream: true
                }),
                signal: this.controller.signal
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            // Process streaming response
            const reader = response.body.getReader();
            let fullResponse = '';
            let aiResponseContent = loadingMessage.querySelector('.content p');
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                // Convert the chunk to text
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            if (line.includes('[DONE]')) {
                                continue;
                            }
                            
                            const jsonData = JSON.parse(line.slice(6));
                            if (jsonData.choices && jsonData.choices[0].delta && jsonData.choices[0].delta.content) {
                                const content = jsonData.choices[0].delta.content;
                                fullResponse += content;
                                aiResponseContent.textContent = fullResponse;
                                this.scrollToBottom();
                            }
                        } catch (e) {
                            console.error('Error parsing JSON:', e);
                        }
                    }
                }
            }
            
            // Save the AI response
            if (fullResponse) {
                this.chats[this.currentChatId].messages.push({
                    role: 'assistant',
                    content: fullResponse
                });
                this.saveChats();
            }
            
            // Remove loading message and add actual message
            loadingMessage.classList.remove('loading');
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Response generation was stopped');
                loadingMessage.remove();
                return;
            }
            throw error;
        } finally {
            this.isGenerating = false;
            document.body.classList.remove('generating');
            this.controller = null;
        }
    }
    
    // Simulate typing for predefined responses
    simulateTyping(response) {
        this.isGenerating = true;
        document.body.classList.add('generating');
        
        // Create loading message
        const loadingMessage = this.createLoadingMessage();
        elements.messagesContainer.appendChild(loadingMessage);
        this.scrollToBottom();
        
        const aiResponseContent = loadingMessage.querySelector('.content p');
        const words = response.split(' ');
        let wordIndex = 0;
        let displayedText = '';
        
        const typingInterval = setInterval(() => {
            if (wordIndex < words.length) {
                displayedText += (wordIndex === 0 ? '' : ' ') + words[wordIndex++];
                aiResponseContent.textContent = displayedText;
                this.scrollToBottom();
            } else {
                clearInterval(typingInterval);
                this.isGenerating = false;
                document.body.classList.remove('generating');
                loadingMessage.classList.remove('loading');
                
                // Save the AI response
                this.chats[this.currentChatId].messages.push({
                    role: 'assistant',
                    content: response
                });
                this.saveChats();
            }
        }, 50);
    }
    
    // Create a loading message element
    createLoadingMessage() {
        const message = document.createElement('div');
        message.className = 'message ai loading';
        
        message.innerHTML = `
            <div class="avatar">
                <div class="avatar-placeholder">AR</div>
            </div>
            <div class="content">
                <p></p>
                <div class="loading-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        `;
        
        return message;
    }
    
    // Add message to UI
    addMessageToUI(role, content) {
        const message = document.createElement('div');
        message.className = `message ${role}`;
        
        const avatarPlaceholder = role === 'user' ? 'U' : 'AR';
        const avatarBg = role === 'user' ? 'user-avatar-placeholder' : 'ai-avatar-placeholder';
        
        message.innerHTML = `
            <div class="avatar">
                <div class="avatar-placeholder">${avatarPlaceholder}</div>
            </div>
            <div class="content">
                <p>${content}</p>
            </div>
        `;
        
        elements.messagesContainer.appendChild(message);
        this.scrollToBottom();
        
        // Remove suggestion chips after first user message
        const suggestionChips = document.querySelector('.suggestion-chips');
        if (suggestionChips) {
            suggestionChips.remove();
        }
    }
    
    // Add error message to UI
    addErrorMessage(text) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = text;
        elements.messagesContainer.appendChild(error);
        this.scrollToBottom();
        
        // Remove after 5 seconds
        setTimeout(() => {
            error.remove();
        }, 5000);
    }
    
    // Create a new chat
    createNewChat() {
        // Stop any ongoing generation
        if (this.isGenerating) {
            this.stopGenerating();
        }
        
        // Generate a unique ID
        const chatId = 'chat_' + Date.now();
        
        // Create new chat object
        this.chats[chatId] = {
            id: chatId,
            title: 'New Chat',
            messages: [],
            timestamp: new Date().toISOString()
        };
        
        // Switch to the new chat
        this.switchChat(chatId);
        
        // Save chats
        this.saveChats();
    }
    
    // Switch to a different chat
    switchChat(chatId) {
        // Stop any ongoing generation
        if (this.isGenerating) {
            this.stopGenerating();
        }
        
        this.currentChatId = chatId;
        
        // Update active chat in sidebar
        this.updateChatsList();
        
        // Clear messages container
        elements.messagesContainer.innerHTML = '';
        
        // Hide regenerate button
        elements.regenerateBtn.style.display = 'none';
        
        // Update chat title
        this.updateChatTitle(this.chats[chatId].title);
        
        // Load chat messages
        if (this.chats[chatId].messages.length === 0) {
            // Add welcome message for new chat
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'message ai';
            welcomeMessage.innerHTML = `
                <div class="avatar">
                    <div class="avatar-placeholder">AR</div>
                </div>
                <div class="content">
                    <p>Hello! I'm AR Ai, your personal AI assistant created by AbdulRehman. How can I help you today?</p>
                </div>
            `;
            elements.messagesContainer.appendChild(welcomeMessage);
            
            // Add suggestion chips
            const suggestionChips = document.createElement('div');
            suggestionChips.className = 'suggestion-chips';
            suggestionChips.innerHTML = `
                <button class="suggestion-chip" data-text="Tell me about yourself">
                    <i class="fas fa-robot"></i>
                    <span>Tell me about yourself</span>
                </button>
                <button class="suggestion-chip" data-text="What can you do?">
                    <i class="fas fa-question-circle"></i>
                    <span>What can you do?</span>
                </button>
                <button class="suggestion-chip" data-text="Who created you?">
                    <i class="fas fa-user"></i>
                    <span>Who created you?</span>
                </button>
            `;
            elements.messagesContainer.appendChild(suggestionChips);
            
            // Attach event listeners to new chips
            suggestionChips.querySelectorAll('.suggestion-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const text = chip.getAttribute('data-text');
                    elements.userInput.value = text;
                    this.handleUserMessage();
                });
            });
        } else {
            // Load existing messages
            this.chats[chatId].messages.forEach(msg => {
                this.addMessageToUI(msg.role, msg.content);
            });
            
            // Show regenerate button if there are AI responses
            const hasAiMessages = this.chats[chatId].messages.some(msg => msg.role === 'assistant');
            elements.regenerateBtn.style.display = hasAiMessages ? 'flex' : 'none';
        }
        
        // Close mobile sidebar
        elements.sidebar.classList.remove('active');
        
        // Focus on input
        elements.userInput.focus();
    }
    
    // Update chat title
    updateChatTitle(title) {
        elements.chatTitle.textContent = title;
        
        // Also update in chats object
        if (this.currentChatId) {
            this.chats[this.currentChatId].title = title;
            this.saveChats();
        }
    }
    
    // Update chats list in sidebar
    updateChatsList() {
        elements.chatsList.innerHTML = '';
        
        // Sort chats by timestamp (newest first)
        const sortedChatIds = Object.keys(this.chats).sort((a, b) => 
            new Date(this.chats[b].timestamp) - new Date(this.chats[a].timestamp)
        );
        
        if (sortedChatIds.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-chats-message';
            emptyState.textContent = 'No chats yet. Start a new conversation!';
            elements.chatsList.appendChild(emptyState);
            return;
        }
        
        sortedChatIds.forEach(chatId => {
            const chat = this.chats[chatId];
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item${chatId === this.currentChatId ? ' active' : ''}`;
            chatItem.innerHTML = `
                <div class="chat-title">${chat.title}</div>
                <button class="delete-chat-btn" data-id="${chatId}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            // Add click event to switch to this chat
            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-chat-btn')) {
                    this.switchChat(chatId);
                }
            });
            
            // Add delete button event
            const deleteBtn = chatItem.querySelector('.delete-chat-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(chatId);
            });
            
            elements.chatsList.appendChild(chatItem);
        });
    }
    
    // Delete a chat
    deleteChat(chatId) {
        if (confirm('Are you sure you want to delete this chat?')) {
            delete this.chats[chatId];
            
            // If current chat was deleted, switch to another or create new one
            if (chatId === this.currentChatId) {
                const remainingChatIds = Object.keys(this.chats);
                if (remainingChatIds.length > 0) {
                    this.switchChat(remainingChatIds[0]);
                } else {
                    this.createNewChat();
                }
            }
            
            // Save chats and update list
            this.saveChats();
            this.updateChatsList();
        }
    }
    
    // Clear all chats
    clearAllChats() {
        this.chats = {};
        this.saveChats();
        this.createNewChat();
    }
    
    // Regenerate the last AI response
    regenerateResponse() {
        if (!this.lastUserMessage || this.isGenerating) return;
        
        // Remove the last AI message from the UI
        const lastMessage = elements.messagesContainer.querySelector('.message.ai:last-child');
        if (lastMessage) {
            lastMessage.remove();
        }
        
        // Remove the last AI message from chat history
        const messages = this.chats[this.currentChatId].messages;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'assistant') {
                messages.splice(i, 1);
                break;
            }
        }
        
        // Save updated chat history
        this.saveChats();
        
        // Process the last user message again
        this.processUserMessage(this.lastUserMessage);
    }
    
    // Stop generating response
    stopGenerating() {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
        
        this.isGenerating = false;
        document.body.classList.remove('generating');
        
        // Remove loading message
        const loadingMessage = elements.messagesContainer.querySelector('.message.loading');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    // Toggle theme between light and dark
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Update icon
        elements.themeToggleBtn.innerHTML = isDarkMode ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
        
        // Save preference
        localStorage.setItem('ar_ai_theme', isDarkMode ? 'dark' : 'light');
    }
    
    // Load theme preference from localStorage
    loadThemePreference() {
        const savedTheme = localStorage.getItem('ar_ai_theme');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        if (savedTheme === 'light' && isDarkMode) {
            this.toggleTheme();
        } else if (savedTheme === 'dark' && !isDarkMode) {
            this.toggleTheme();
        }
    }
    
    // Auto-resize textarea
    autoResizeTextarea() {
        const textarea = elements.userInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }
    
    // Scroll to bottom of messages container
    scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
    
    // Save chats to localStorage
    saveChats() {
        try {
            localStorage.setItem('ar_ai_chats', JSON.stringify(this.chats));
        } catch (error) {
            console.error('Error saving chats to localStorage:', error);
        }
    }
    
    // Load chats from localStorage
    loadChats() {
        try {
            const savedChats = localStorage.getItem('ar_ai_chats');
            if (savedChats) {
                this.chats = JSON.parse(savedChats);
            }
        } catch (error) {
            console.error('Error loading chats from localStorage:', error);
            this.chats = {};
        }
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
}); 