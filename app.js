/**
 * AR Ai - AbdulRehman Ai Chatbot
 * A lightweight chatbot with modern UI and multiple features
 */

class ARChatbot {
    constructor() {
        // DOM Elements
        this.elements = {
            chatContainer: document.getElementById('chat-container'),
            welcomeScreen: document.getElementById('welcome-screen'),
            messagesContainer: document.getElementById('messages'),
            chatForm: document.getElementById('chat-form'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            stopButton: document.getElementById('stop-button'),
            regenerateButton: document.getElementById('regenerate-button'),
            newChatButton: document.getElementById('new-chat-btn'),
            themeToggle: document.getElementById('theme-toggle'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            sidebar: document.querySelector('.sidebar'),
            chatsContainer: document.getElementById('chats-container'),
            deleteAllButton: document.getElementById('delete-all-btn'),
            fileInput: document.createElement('input'),
            fileUploadWrapper: document.createElement('div'),
            // Settings modal elements
            settingsButton: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            geminiApiKeyInput: document.getElementById('gemini-api-key'),
            deepseekApiKeyInput: document.getElementById('deepseek-api-key'),
            selectGemini: document.getElementById('select-gemini'),
            selectDeepseek: document.getElementById('select-deepseek')
        };

        // Create and configure file input
        this.elements.fileInput.type = 'file';
        this.elements.fileInput.id = 'file-input';
        this.elements.fileInput.style.display = 'none';
        this.elements.fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt'; // Accept common file types
        this.elements.chatForm.appendChild(this.elements.fileInput);

        // Create file upload UI
        this.elements.fileUploadWrapper.className = 'file-upload-wrapper';
        this.elements.fileUploadWrapper.innerHTML = `
            <img class="file-preview">
            <button id="cancel-file-btn" type="button"><i class="fas fa-times"></i></button>
        `;
        this.elements.chatForm.querySelector('.input-wrapper').appendChild(this.elements.fileUploadWrapper);

        // Add file upload button
        const addFileButton = document.createElement('button');
        addFileButton.type = 'button';
        addFileButton.id = 'add-file-btn';
        addFileButton.className = 'add-file-btn';
        addFileButton.innerHTML = '<i class="fas fa-paperclip"></i>';
        addFileButton.title = 'Attach file';
        this.elements.chatForm.querySelector('.input-wrapper').insertBefore(
            addFileButton, 
            this.elements.sendButton
        );

        // State
        this.state = {
            conversations: this.loadConversations(),
            currentConversationId: null,
            isGenerating: false,
            controller: null,
            typingInterval: null,
            lastUserInput: '',
            darkMode: localStorage.getItem('darkMode') === 'true',
            userData: { message: '', file: {} },
            activeAPI: localStorage.getItem('activeAPI') || 'gemini' // Default to Gemini
        };

        // API configurations
        this.apiConfigs = {
            gemini: {
                key: 'AIzaSyBQNn96Eq0nE2wYtU9iXgc7uJXuA615Qss',
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
                modelName: 'Gemini 1.5 Flash'
            },
            deepseek: {
                key: localStorage.getItem('deepseekApiKey') || 'YOUR_DEEPSEEK_API_KEY', // Get from localStorage or use placeholder
                url: 'https://api.deepseek.com/v1/chat/completions',
                modelName: 'DeepSeek'
            },
            claude: {
                key: localStorage.getItem('claudeApiKey') || 'YOUR_CLAUDE_API_KEY',
                url: 'https://api.anthropic.com/v1/messages',
                modelName: 'Claude 3 Sonnet'
            }
        };

        // Set current API based on state
        this.apiKey = this.apiConfigs[this.state.activeAPI].key;
        this.apiUrl = `${this.apiConfigs[this.state.activeAPI].url}?key=${this.apiKey}`;
        this.modelName = this.apiConfigs[this.state.activeAPI].modelName;

        // Initialize app
        this.init();
    }

    init() {
        // Apply theme first
        this.applyTheme();

        // Handle splash screen
        const splashScreen = document.getElementById('splash-screen');
        
        // Ensure splash screen is visible for at least 5 seconds
        if (splashScreen) {
            // Listen for the end of the animation
            splashScreen.addEventListener('animationend', () => {
                // Remove splash screen from DOM after animation completes
                splashScreen.parentNode.removeChild(splashScreen);
                
                // Focus on input after splash screen finishes
                setTimeout(() => {
                    this.elements.userInput?.focus();
                }, 100);
            });
        }

        // Make sure DOM is ready before proceeding
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
        
        // Add diagnostic handler for debugging issues
        window.diagnoseARAi = () => this.runDiagnostics();
    }

    // Set up the application after DOM is ready
    setupApplication() {
        // Set up UI references first
        this.setupEventListeners();
        this.setupAutoResizeTextarea();

        // Click event for example prompts
        const examplePrompts = document.querySelectorAll('.example-prompt');
        examplePrompts.forEach(prompt => {
            prompt.addEventListener('click', () => {
                const promptText = prompt.querySelector('p').textContent.replace(/"/g, '');
                this.elements.userInput.value = promptText;
                this.elements.userInput.focus();
                // Auto-submit the example prompt
                this.sendMessage();
            });
        });

        // Load conversations
        this.renderConversationsList();

        // Create new conversation if none exists
        if (Object.keys(this.state.conversations).length === 0) {
            this.createNewConversation();
        } else {
            // Load most recent conversation
            const mostRecentId = this.getMostRecentConversationId();
            if (mostRecentId) {
                this.loadConversation(mostRecentId);
            } else {
                this.createNewConversation();
            }
        }
        
        // Expose API switching in console for debugging
        window.switchAPI = (apiName) => this.switchAPI(apiName);
    }

    setupEventListeners() {
        // Submit chat form
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // New chat button
        this.elements.newChatButton.addEventListener('click', () => {
            this.createNewConversation();
        });

        // Stop generating button
        this.elements.stopButton.addEventListener('click', () => {
            this.stopGenerating();
        });

        // Regenerate button
        this.elements.regenerateButton.addEventListener('click', () => {
            this.regenerateResponse();
        });

        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Delete All Chats button
        this.elements.deleteAllButton.addEventListener('click', () => {
            this.deleteAllConversations();
        });

        // Mobile sidebar toggle
        this.elements.sidebarToggle?.addEventListener('click', () => {
            this.elements.sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                this.elements.sidebar.classList.contains('show') && 
                !this.elements.sidebar.contains(e.target) && 
                e.target !== this.elements.sidebarToggle) {
                this.elements.sidebar.classList.remove('show');
            }
        });

        // Auto-adjust textarea height on input
        this.elements.userInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });

        // Key press event for Enter to send (but Shift+Enter for new line)
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Special commands handler
        this.elements.userInput.addEventListener('input', (e) => {
            const input = e.target.value.trim().toLowerCase();
            
            // Check for commands
            if (input === '/use gemini') {
                this.switchAPI('gemini');
                this.elements.userInput.value = '';
                this.appendMessage('assistant', `Switched to Gemini API. You can now chat using Gemini.`);
                return;
            }
            
            if (input === '/use deepseek') {
                if (this.apiConfigs.deepseek.key === 'YOUR_DEEPSEEK_API_KEY') {
                    this.appendMessage('assistant', `DeepSeek API key not configured. Use /setkey deepseek YOUR_API_KEY to configure.`);
                    this.elements.userInput.value = '';
                    return;
                }
                this.switchAPI('deepseek');
                this.elements.userInput.value = '';
                this.appendMessage('assistant', `Switched to DeepSeek API. You can now chat using DeepSeek.`);
                return;
            }
            
            // New command: set API key
            if (input.startsWith('/setkey ')) {
                const parts = input.split(' ');
                if (parts.length >= 3) {
                    const apiName = parts[1];
                    const apiKey = parts.slice(2).join(' ').trim();
                    this.setApiKey(apiName, apiKey);
                    this.elements.userInput.value = '';
                } else {
                    this.appendMessage('assistant', `Invalid format. Use: /setkey [api_name] [your_api_key]`);
                    this.elements.userInput.value = '';
                }
                return;
            }
            
            // New command: help
            if (input === '/help') {
                this.showHelpCommands();
                this.elements.userInput.value = '';
                return;
            }
            
            // New command: show current API
            if (input === '/api') {
                this.showCurrentApi();
                this.elements.userInput.value = '';
                return;
            }
            
            // New command: clear current chat
            if (input === '/clear') {
                this.clearCurrentChat();
                this.elements.userInput.value = '';
                return;
            }
        });

        // File input change
        this.elements.fileInput.addEventListener('change', () => {
            const file = this.elements.fileInput.files[0];
            if (!file) return;
            
            const isImage = file.type.startsWith('image/');
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (e) => {
                this.elements.fileInput.value = '';
                const base64String = e.target.result.split(',')[1];
                this.elements.fileUploadWrapper.querySelector('.file-preview').src = e.target.result;
                this.elements.fileUploadWrapper.classList.add('active', isImage ? 'img-attached' : 'file-attached');
                
                // Store file data
                this.state.userData.file = { 
                    fileName: file.name, 
                    data: base64String, 
                    mime_type: file.type, 
                    isImage 
                };
            };
        });

        // Cancel file upload
        document.getElementById('cancel-file-btn').addEventListener('click', () => {
            this.state.userData.file = {};
            this.elements.fileUploadWrapper.classList.remove('file-attached', 'img-attached', 'active');
        });

        // Add file button
        document.getElementById('add-file-btn').addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // Settings button
        this.elements.settingsButton?.addEventListener('click', () => {
            this.openSettingsModal();
        });

        // Close settings button
        this.elements.closeSettings?.addEventListener('click', () => {
            this.closeSettingsModal();
        });

        // Save API key buttons
        const saveButtons = document.querySelectorAll('.save-api-btn');
        saveButtons.forEach(button => {
            button.addEventListener('click', () => {
                const api = button.dataset.api;
                const input = document.getElementById(`${api}-api-key`);
                if (input && input.value) {
                    this.setApiKey(api, input.value);
                    input.value = '';
                }
            });
        });

        // API selection radio buttons
        this.elements.selectGemini?.addEventListener('change', () => {
            if (this.elements.selectGemini.checked) {
                this.switchAPI('gemini');
            }
        });

        this.elements.selectDeepseek?.addEventListener('change', () => {
            if (this.elements.selectDeepseek.checked) {
                if (this.apiConfigs.deepseek.key === 'YOUR_DEEPSEEK_API_KEY') {
                    alert('DeepSeek API key not configured. Please set an API key first.');
                    this.elements.selectGemini.checked = true;
                    return;
                }
                this.switchAPI('deepseek');
            }
        });

        // Close settings when clicking outside modal
        this.elements.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettingsModal();
            }
        });
    }

    setupAutoResizeTextarea() {
        this.elements.userInput.setAttribute('style', 'height: auto;');
        this.elements.userInput.setAttribute('style', `height: ${this.elements.userInput.scrollHeight}px;`);
    }

    adjustTextareaHeight() {
        const textarea = this.elements.userInput;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        
        // Limit max height
        if (textarea.scrollHeight > 200) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }

    // Toggle theme between light and dark
    toggleTheme() {
        this.state.darkMode = !this.state.darkMode;
        localStorage.setItem('darkMode', this.state.darkMode);
        this.applyTheme();
    }

    // Apply current theme
    applyTheme() {
        if (this.state.darkMode) {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i> Toggle Theme';
        }
    }

    // Create a new conversation
    createNewConversation() {
        const id = Date.now().toString();
        const title = 'New Chat';
        
        this.state.conversations[id] = {
            id,
            title,
            messages: [],
            chatHistory: [], // for API conversation history
            lastUpdated: Date.now()
        };

        this.saveConversations();
        this.renderConversationsList();
        this.loadConversation(id);
        
        // Make sure the welcome screen is visible for new chats
        this.elements.welcomeScreen.classList.remove('hidden');
    }

    // Load conversation by ID
    loadConversation(id) {
        if (!this.state.conversations[id]) return;
        
        this.state.currentConversationId = id;
        this.elements.messagesContainer.innerHTML = '';
        
        // Show welcome screen only for empty conversations
        const conversation = this.state.conversations[id];
        
        // Create chatHistory array if it doesn't exist
        if (!conversation.chatHistory) {
            conversation.chatHistory = [];
            
            // Migrate old conversations if needed
            if (conversation.messages && conversation.messages.length > 0) {
                conversation.messages.forEach(msg => {
                    conversation.chatHistory.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    });
                });
            }
        }
        
        if (conversation.messages.length === 0) {
            this.elements.welcomeScreen.classList.remove('hidden');
        } else {
            this.elements.welcomeScreen.classList.add('hidden');
        }
        
        // Mark active chat in sidebar
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            if (item.dataset.id === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Load messages
        conversation.messages.forEach(message => {
            this.appendMessage(message.role, message.content, false, message.fileData);
        });

        // Show/hide action buttons based on conversation state
        this.updateActionButtons();

        // Scroll to bottom
        this.scrollToBottom();
    }

    // Get conversation title from first user message or generate one
    generateConversationTitle(userMessage) {
        // Use the first 25 characters of the first user message as the title
        return userMessage.length > 30 
            ? userMessage.substring(0, 30) + '...' 
            : userMessage;
    }

    // Send a message
    sendMessage() {
        const userInput = this.elements.userInput.value.trim();
        if (!userInput || this.state.isGenerating) return;

        // Store user input and file data
        this.state.userData.message = userInput;
        this.state.lastUserInput = userInput;

        // Clear input
        this.elements.userInput.value = '';
        this.adjustTextareaHeight();

        // Add user message to UI
        const fileData = this.state.userData.file;
        this.appendMessage('user', userInput, false, fileData);

        // Reset file upload UI
        this.elements.fileUploadWrapper.classList.remove('file-attached', 'img-attached', 'active');

        // Create a new history array if needed
        const conversation = this.state.conversations[this.state.currentConversationId];
        if (!conversation.chatHistory) {
            conversation.chatHistory = [];
        }
        
        // Update conversation title if it's the first message
        if (conversation.messages.length === 0) {
            conversation.title = this.generateConversationTitle(userInput);
            this.renderConversationsList();
        }

        // Add message to conversation
        conversation.messages.push({ 
            role: 'user', 
            content: userInput,
            fileData: this.state.userData.file.data ? this.state.userData.file : null
        });
        conversation.lastUpdated = Date.now();
        
        // Update chatHistory for API
        conversation.chatHistory.push({
            role: 'user',
            parts: [
                { text: userInput },
                ...(this.state.userData.file.data ? [{ 
                    inline_data: {
                        data: this.state.userData.file.data,
                        mime_type: this.state.userData.file.mime_type
                    }
                }] : [])
            ],
        });
        
        // Save conversations
        this.saveConversations();

        // Generate AI response
        this.generateResponse();

        // Scroll to bottom
        this.scrollToBottom();
    }

    // Get AI response through API
    async generateResponse() {
        // Show loading indicator
        this.appendMessage('assistant', '', true);
        this.elements.stopButton.style.display = 'flex';
        this.state.isGenerating = true;
        
        const conversation = this.state.conversations[this.state.currentConversationId];
        
        try {
            this.state.controller = new AbortController();
            let responseText = '';

            // First, check if this is about AbdulRehman or a self-introduction request
            const lastMessage = conversation.messages[conversation.messages.length - 1].content.toLowerCase();
            if (lastMessage.includes('abdulrehman') || 
                lastMessage.includes('abdul rehman') ||
                lastMessage.includes('creator') ||
                lastMessage.includes('who made you')) {
                
                responseText = "I was created by AbdulRehman, a talented developer. He designed me to be a helpful AI assistant that can assist with various tasks and provide information. If you'd like to know more about my creator, just ask!";
            }
            else if (lastMessage.includes('who are you') || 
                    lastMessage.includes('tell me about yourself') ||
                    lastMessage.includes('what are you')) {
                
                responseText = "I'm AR Ai (AbdulRehman Ai), a chatbot created by AbdulRehman. I'm designed to provide helpful, informative, and friendly assistance on a wide range of topics. I can answer questions, engage in conversation, and help with various tasks to the best of my abilities.";
            }
            
            // If not a special case, proceed with API call
            if (!responseText) {
                try {
                    // Check which API to use
                    if (this.state.activeAPI === 'gemini') {
                        // Gemini API call
                        console.log("Making API request to Gemini...");
                        
                        const response = await fetch(this.apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                contents: conversation.chatHistory
                            }),
                            signal: this.state.controller.signal
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            console.error('API error:', errorData);
                            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
                        }
                        
                        const data = await response.json();
                        console.log("API response:", data);
                        
                        // Extract the response text
                        if (data && data.candidates && data.candidates[0] && data.candidates[0].content) {
                            const parts = data.candidates[0].content.parts;
                            if (parts && parts.length > 0) {
                                responseText = parts[0].text || '';
                            }
                        }
                    } 
                    else if (this.state.activeAPI === 'deepseek') {
                        // DeepSeek API call
                        console.log("Making API request to DeepSeek...");
                        
                        // Format messages for DeepSeek
                        const messages = conversation.messages.map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        }));
                        
                        // Add system message
                        messages.unshift({
                            role: 'system',
                            content: 'You are AR Ai, a helpful assistant created by AbdulRehman. Be helpful, concise, and friendly.'
                        });
                        
                        const response = await fetch(this.apiConfigs.deepseek.url, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.apiConfigs.deepseek.key}`
                            },
                            body: JSON.stringify({
                                model: 'deepseek-chat',
                                messages: messages,
                                temperature: 0.7,
                                max_tokens: 800
                            }),
                            signal: this.state.controller.signal
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            console.error('DeepSeek API error:', errorData);
                            throw new Error(errorData.error?.message || `DeepSeek API request failed with status ${response.status}`);
                        }
                        
                        const data = await response.json();
                        console.log("DeepSeek API response:", data);
                        
                        // Extract response from DeepSeek format
                        if (data && data.choices && data.choices.length > 0) {
                            responseText = data.choices[0].message.content || '';
                        }
                    }
                } catch (apiError) {
                    console.error("Primary API call failed:", apiError);
                    
                    // Try fallback if we're using Gemini
                    if (this.state.activeAPI === 'gemini') {
                        try {
                            console.log("Attempting fallback API call...");
                            const userMessage = conversation.messages[conversation.messages.length - 1].content;
                            
                            const fallbackResponse = await fetch(
                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, 
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: `You are AR Ai, a helpful assistant created by AbdulRehman. Be helpful, concise, and friendly. The user asked: ${userMessage}` }] }],
                                        generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
                                    })
                                }
                            );
                            
                            if (fallbackResponse.ok) {
                                const fallbackData = await fallbackResponse.json();
                                if (fallbackData && fallbackData.candidates && fallbackData.candidates[0]?.content?.parts?.[0]?.text) {
                                    responseText = fallbackData.candidates[0].content.parts[0].text;
                                    console.log("Fallback API succeeded");
                                }
                            }
                        } catch (fallbackError) {
                            console.error("Fallback API also failed:", fallbackError);
                        }
                    }
                    
                    // If we still don't have a response, create a helpful error response
                    if (!responseText) {
                        responseText = this.createErrorResponse(apiError, conversation);
                    }
                }
            }
            
            // Ensure we have some response text
            if (!responseText) {
                responseText = "I'm sorry, I couldn't generate a proper response. Please try asking in a different way.";
            }
            
            // Remove loading message
            if (this.elements.messagesContainer.lastElementChild) {
                this.elements.messagesContainer.removeChild(
                    this.elements.messagesContainer.lastElementChild
                );
            }
            
            // Add the AI response with typing effect
            const messageEl = this.appendMessage('assistant', responseText);
            this.typewriterEffect(responseText);
            
            // Add message to conversation history
            conversation.messages.push({ role: 'assistant', content: responseText });
            
            // Add to API format history
            if (this.state.activeAPI === 'gemini') {
                conversation.chatHistory.push({ 
                    role: 'model', 
                    parts: [{ text: responseText }]
                });
            } else {
                // If we're using a different API format, make sure to maintain both formats
                if (!conversation.chatHistory) {
                    conversation.chatHistory = [];
                    // Recreate history in Gemini format for potential switching
                    conversation.messages.forEach((msg, i) => {
                        if (i < conversation.messages.length - 1) { // Skip the message we just added
                            conversation.chatHistory.push({
                                role: msg.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: msg.content }]
                            });
                        }
                    });
                }
                // Now add the new message
                conversation.chatHistory.push({ 
                    role: 'model', 
                    parts: [{ text: responseText }]
                });
            }
            
            conversation.lastUpdated = Date.now();
            
            // Save conversations
            this.saveConversations();
            
        } catch (error) {
            console.error('Unhandled error in response generation:', error);
            
            if (error.name === 'AbortError') {
                // Request was aborted
                if (this.elements.messagesContainer.lastElementChild) {
                    this.elements.messagesContainer.removeChild(
                        this.elements.messagesContainer.lastElementChild
                    );
                }
                this.appendMessage('assistant', 'Response generation stopped.');
            } else {
                // Handle other errors
                if (this.elements.messagesContainer.lastElementChild) {
                    this.elements.messagesContainer.removeChild(
                        this.elements.messagesContainer.lastElementChild
                    );
                }
                
                // Show error message
                const errorMessage = error.message || "An unknown error occurred";
                this.appendMessage('assistant', `Sorry, I encountered an error: ${errorMessage}`);
                
                // Add error message to conversation
                conversation.messages.push({ 
                    role: 'assistant', 
                    content: `Sorry, I encountered an error: ${errorMessage}` 
                });
                conversation.lastUpdated = Date.now();
                this.saveConversations();
            }
        } finally {
            // Reset state
            this.state.isGenerating = false;
            this.elements.stopButton.style.display = 'none';
            this.elements.regenerateButton.style.display = 'flex';
            this.state.controller = null;
            this.state.userData.file = {};
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    // Create a helpful error response based on the error and context
    createErrorResponse(error, conversation) {
        const lastUserMessage = conversation.messages.length > 0 
            ? conversation.messages[conversation.messages.length - 1].content
            : '';
        
        // API quota exceeded or rate limited
        if (error.message && error.message.includes('quota') || error.message?.includes('rate')) {
            return "I'm sorry, but it looks like we've reached the API usage limit. Please try again in a few minutes.";
        }
        
        // Content filtering/moderation
        if (error.message && error.message.includes('safety') || error.message?.includes('content filters')) {
            return "I apologize, but I cannot provide a response to that query due to content safety restrictions. Please try asking something else.";
        }
        
        // Network error
        if (error.message && error.message.includes('network') || error.name === 'TypeError') {
            return "I'm having trouble connecting to my knowledge service. Please check your internet connection and try again.";
        }
        
        // Questions about AbdulRehman
        if (lastUserMessage.toLowerCase().includes('abdulrehman') || 
            lastUserMessage.toLowerCase().includes('abdul rehman') ||
            lastUserMessage.toLowerCase().includes('creator') ||
            lastUserMessage.toLowerCase().includes('who made you')) {
            return "I was created by AbdulRehman, a talented developer. He designed me to be a helpful AI assistant that can assist with various tasks and provide information. If you'd like to know more about my creator, just ask!";
        }
        
        // Ask about self
        if (lastUserMessage.toLowerCase().includes('who are you') || 
            lastUserMessage.includes('tell me about yourself') ||
            lastUserMessage.toLowerCase().includes('what are you')) {
            return "I'm AR Ai (AbdulRehman Ai), a chatbot created by AbdulRehman. I'm designed to provide helpful, informative, and friendly assistance on a wide range of topics. I can answer questions, engage in conversation, and help with various tasks to the best of my abilities.";
        }
        
        // Generic but helpful response
        return `I apologize, but I'm having trouble generating a response right now. Could you try phrasing your question differently?`;
    }

    // Typewriter effect for AI responses
    typewriterEffect(text) {
        if (!text) return;
        
        // Find the AI message element (the last one in the container)
        const messageElement = this.elements.messagesContainer.lastElementChild;
        const aiMessageElement = messageElement.querySelector('.message-text');
        
        if (!aiMessageElement) {
            console.error("Could not find message element for typing simulation");
            return;
        }
        
        // Add typing class for cursor animation
        messageElement.classList.add('typing');
        
        let displayedText = '';
        const words = text.split(' ');
        let wordIndex = 0;
        
        // Clear any existing interval
        if (this.state.typingInterval) {
            clearInterval(this.state.typingInterval);
        }
        
        // Set new interval for typing effect
        this.state.typingInterval = setInterval(() => {
            if (wordIndex < words.length) {
                displayedText += (wordIndex === 0 ? '' : ' ') + words[wordIndex++];
                aiMessageElement.innerHTML = this.formatMessageContent(displayedText);
                this.scrollToBottom();
            } else {
                clearInterval(this.state.typingInterval);
                this.state.typingInterval = null;
                // Remove typing class when done
                messageElement.classList.remove('typing');
            }
        }, 40);
    }

    // Stop generating response
    stopGenerating() {
        if (this.state.controller) {
            this.state.controller.abort();
            this.state.controller = null;
        }
        
        if (this.state.typingInterval) {
            clearInterval(this.state.typingInterval);
            this.state.typingInterval = null;
        }
        
        this.state.isGenerating = false;
        this.elements.stopButton.style.display = 'none';
        this.elements.regenerateButton.style.display = 'flex';
    }

    // Regenerate last response
    regenerateResponse() {
        if (this.state.isGenerating) return;
        
        // Remove last AI message from UI and conversation
        const conversation = this.state.conversations[this.state.currentConversationId];
        if (conversation.messages.length > 0 && conversation.messages[conversation.messages.length - 1].role === 'assistant') {
            // Remove from conversation
            conversation.messages.pop();
            conversation.chatHistory.pop();
            
            // Remove from UI
            this.elements.messagesContainer.removeChild(
                this.elements.messagesContainer.lastElementChild
            );
            
            // Save updated conversation
            this.saveConversations();
        }
        
        // Generate new response
        this.generateResponse();
    }

    // Append message to chat
    appendMessage(role, content, isLoading = false, fileData = null) {
        // Ensure content is a string to avoid 'undefined' display
        const messageContent = content || '';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        // Create avatar element
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `message-avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
        avatarDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        // Create content wrapper
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Create message text element
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        if (isLoading) {
            // Show loading animation
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-dots';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                loadingDiv.appendChild(dot);
            }
            textDiv.appendChild(loadingDiv);
        } else {
            // Set content with safeguard against undefined
            textDiv.innerHTML = this.formatMessageContent(messageContent);
            
            // Add file attachment if present
            if (fileData && role === 'user' && fileData.data) {
                const fileElement = document.createElement('div');
                
                if (fileData.isImage) {
                    // Display image
                    const img = document.createElement('img');
                    img.src = `data:${fileData.mime_type};base64,${fileData.data}`;
                    img.className = 'img-attachment';
                    fileElement.appendChild(img);
                } else {
                    // Display file name
                    fileElement.className = 'file-attachment';
                    fileElement.innerHTML = `<i class="fas fa-file"></i> ${fileData.fileName}`;
                }
                
                contentDiv.appendChild(fileElement);
            }
        }
        
        // Assemble message
        contentDiv.appendChild(textDiv);
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add to messages container
        this.elements.messagesContainer.appendChild(messageDiv);
        
        // Hide welcome screen if visible
        if (!this.elements.welcomeScreen.classList.contains('hidden')) {
            this.elements.welcomeScreen.classList.add('hidden');
        }
        
        // Scroll to new message
        this.scrollToBottom();
        
        return messageDiv;
    }

    // Format message content with Markdown-like formatting
    formatMessageContent(text) {
        if (!text || typeof text !== 'string') return '';
        
        try {
            // Convert line breaks to <br> tags
            let formatted = text.replace(/\n/g, '<br>');
            
            // Format code blocks with ```
            formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
            
            // Format inline code with `
            formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Format bold text with ** or __
            formatted = formatted.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
            
            // Format italic text with * or _
            formatted = formatted.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
            
            return formatted;
        } catch (error) {
            console.error("Error formatting message:", error);
            return text; // Return original text if formatting fails
        }
    }

    // Scroll chat to bottom
    scrollToBottom() {
        this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
    }

    // Update action buttons based on conversation state
    updateActionButtons() {
        const conversation = this.state.conversations[this.state.currentConversationId];
        
        // Show regenerate button if there's at least one AI message
        if (conversation.messages.some(m => m.role === 'assistant')) {
            this.elements.regenerateButton.style.display = 'flex';
        } else {
            this.elements.regenerateButton.style.display = 'none';
        }
        
        // Hide stop button when not generating
        if (!this.state.isGenerating) {
            this.elements.stopButton.style.display = 'none';
        }
    }

    // Render conversations list in the sidebar
    renderConversationsList() {
        this.elements.chatsContainer.innerHTML = '';
        
        // Get sorted conversations (newest first)
        const sortedConversations = Object.values(this.state.conversations)
            .sort((a, b) => b.lastUpdated - a.lastUpdated);
        
        // Create chat item for each conversation
        sortedConversations.forEach(conversation => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${this.state.currentConversationId === conversation.id ? 'active' : ''}`;
            chatItem.dataset.id = conversation.id;
            
            // Chat title
            const title = document.createElement('div');
            title.className = 'chat-title';
            title.textContent = conversation.title;
            
            // Chat actions
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'chat-actions';
            
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.title = 'Delete conversation';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteConversation(conversation.id);
            });
            
            actionsDiv.appendChild(deleteButton);
            
            // Assemble chat item
            chatItem.appendChild(title);
            chatItem.appendChild(actionsDiv);
            
            // Load this conversation when clicked
            chatItem.addEventListener('click', () => {
                this.loadConversation(conversation.id);
            });
            
            this.elements.chatsContainer.appendChild(chatItem);
        });
    }

    // Delete a conversation
    deleteConversation(id) {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this conversation?')) {
            return;
        }
        
        // Delete conversation
        delete this.state.conversations[id];
        this.saveConversations();
        this.renderConversationsList();
        
        // If current conversation is deleted, create new one
        if (id === this.state.currentConversationId) {
            if (Object.keys(this.state.conversations).length > 0) {
                // Load most recent
                this.loadConversation(this.getMostRecentConversationId());
            } else {
                // Create new
                this.createNewConversation();
            }
        }
    }

    // Delete all conversations
    deleteAllConversations() {
        if (!confirm('Are you sure you want to delete all conversations?')) {
            return;
        }
        
        // Clear all conversations
        this.state.conversations = {};
        this.saveConversations();
        
        // Reset UI
        this.elements.messagesContainer.innerHTML = '';
        this.elements.welcomeScreen.classList.remove('hidden');
        this.elements.stopButton.style.display = 'none';
        this.elements.regenerateButton.style.display = 'none';
        
        // Reset state
        this.state.currentConversationId = null;
        this.state.isGenerating = false;
        this.state.controller = null;
        if (this.state.typingInterval) {
            clearInterval(this.state.typingInterval);
            this.state.typingInterval = null;
        }
        
        // Create a new conversation
        this.createNewConversation();
    }

    // Get most recent conversation ID
    getMostRecentConversationId() {
        const conversations = Object.values(this.state.conversations);
        if (conversations.length === 0) return null;
        
        return conversations.sort((a, b) => b.lastUpdated - a.lastUpdated)[0].id;
    }

    // Save conversations to localStorage
    saveConversations() {
        localStorage.setItem('araiConversations', JSON.stringify(this.state.conversations));
    }

    // Load conversations from localStorage
    loadConversations() {
        const saved = localStorage.getItem('araiConversations');
        return saved ? JSON.parse(saved) : {};
    }

    // Run diagnostics on the chatbot state
    runDiagnostics() {
        console.group('AR Ai Diagnostics');
        
        // Check DOM elements
        console.log('DOM Elements:');
        const missingElements = [];
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                missingElements.push(key);
                console.error(`Missing element: ${key}`);
            }
        });
        
        if (missingElements.length === 0) {
            console.log('✓ All DOM elements are present');
        }
        
        // Check conversations state
        console.log('Conversations:');
        const conversationCount = Object.keys(this.state.conversations).length;
        console.log(`Total conversations: ${conversationCount}`);
        
        if (this.state.currentConversationId) {
            const currentConversation = this.state.conversations[this.state.currentConversationId];
            console.log('Current conversation:', currentConversation);
            
            if (currentConversation) {
                console.log(`Messages in current conversation: ${currentConversation.messages.length}`);
                console.log(`Chat history entries: ${currentConversation.chatHistory ? currentConversation.chatHistory.length : 'none'}`);
            } else {
                console.error('Current conversation ID is set but conversation not found');
            }
        } else {
            console.warn('No current conversation ID set');
        }
        
        // Check API configuration
        console.log('API Configuration:');
        console.log(`API Key set: ${this.apiKey ? '✓' : '✗'}`);
        console.log(`API URL: ${this.apiUrl}`);
        
        // Print state
        console.log('Application State:', this.state);
        
        console.groupEnd();
        
        return {
            elementsOk: missingElements.length === 0,
            conversationCount,
            apiConfigured: !!this.apiKey,
            currentState: {...this.state}
        };
    }

    // Switch API between Gemini and DeepSeek
    switchAPI(apiName) {
        if (!this.apiConfigs[apiName]) {
            console.error(`API ${apiName} not configured`);
            return false;
        }
        
        this.state.activeAPI = apiName;
        localStorage.setItem('activeAPI', apiName);
        
        // Update API configuration
        this.apiKey = this.apiConfigs[apiName].key;
        
        // DeepSeek uses Authorization header instead of a URL parameter
        if (apiName === 'gemini') {
            this.apiUrl = `${this.apiConfigs[apiName].url}?key=${this.apiKey}`;
        } else {
            this.apiUrl = this.apiConfigs[apiName].url;
        }
        
        this.modelName = this.apiConfigs[apiName].modelName;
        
        console.log(`Switched to ${apiName} API`);
        return true;
    }

    // Add this method to the ARChatbot class
    setApiKey(apiName, apiKey) {
        if (!this.apiConfigs[apiName]) {
            this.appendMessage('assistant', `Unknown API: ${apiName}. Available APIs: gemini, deepseek`);
            return false;
        }
        
        // Store API key in localStorage
        localStorage.setItem(`${apiName}ApiKey`, apiKey);
        
        // Update the API config
        this.apiConfigs[apiName].key = apiKey;
        
        // If current API is the one being updated, refresh the URL
        if (this.state.activeAPI === apiName) {
            this.apiKey = apiKey;
            this.apiUrl = `${this.apiConfigs[apiName].url}${apiName === 'gemini' ? '?key=' + apiKey : ''}`;
        }
        
        this.appendMessage('assistant', `API key for ${apiName} has been set successfully.`);
        return true;
    }
    
    // Show available commands
    showHelpCommands() {
        const helpMessage = `
**Available Commands:**

- **/use gemini** - Switch to Gemini API
- **/use deepseek** - Switch to DeepSeek API
- **/setkey [api_name] [your_api_key]** - Set API key for a specific model
- **/api** - Show current active API
- **/clear** - Clear current chat history
- **/help** - Show this help message

You can also use window.diagnoseARAi() in the browser console to run diagnostics.
        `;
        
        this.appendMessage('assistant', helpMessage);
    }
    
    // Show current API information
    showCurrentApi() {
        const apiInfo = `
**Current API Information:**

- Active API: ${this.state.activeAPI}
- Model Name: ${this.modelName}
- API Key set: ${this.apiKey && this.apiKey !== 'YOUR_DEEPSEEK_API_KEY' ? 'Yes' : 'No'}
        `;
        
        this.appendMessage('assistant', apiInfo);
    }
    
    // Clear current chat
    clearCurrentChat() {
        const id = this.state.currentConversationId;
        if (!id || !this.state.conversations[id]) return;
        
        // Reset conversation
        this.state.conversations[id].messages = [];
        this.state.conversations[id].chatHistory = [];
        this.saveConversations();
        
        // Clear UI
        this.elements.messagesContainer.innerHTML = '';
        this.elements.welcomeScreen.classList.remove('hidden');
        
        this.appendMessage('assistant', 'Chat history has been cleared.');
    }

    // Add these methods to handle the settings modal
    openSettingsModal() {
        // Update radio buttons based on current API
        if (this.elements.selectGemini && this.elements.selectDeepseek) {
            this.elements.selectGemini.checked = this.state.activeAPI === 'gemini';
            this.elements.selectDeepseek.checked = this.state.activeAPI === 'deepseek';
        }
        
        // Show modal
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('active');
        }
    }
    
    closeSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.remove('active');
        }
    }
}

// Initialize the chatbot when the page is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.arChatbot = new ARChatbot();
}); 