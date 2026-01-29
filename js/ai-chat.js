/**
 * AI Chat System for Korean Classroom VR
 * Uses WebLLM for browser-based LLM inference
 */

class AIChat {
  constructor() {
    this.engine = null;
    this.isLoaded = false;
    this.isGenerating = false;
    this.currentNPC = null;
    this.conversationHistory = {};
    this.speechSynthesis = window.speechSynthesis;
    this.speechRecognition = null;
    this.isRecording = false;

    // Model configuration - using a small, fast model for Quest
    this.modelId = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

    // UI elements
    this.chatUI = null;
    this.chatMessages = null;
    this.chatInput = null;
    this.voiceBtn = null;
    this.sendBtn = null;
    this.currentNPCLabel = null;
    this.aiStatusEl = null;

    // Initialize speech recognition if available
    this.initSpeechRecognition();
  }

  async init() {
    console.log('Initializing AI Chat system...');

    // Get UI elements
    this.chatUI = document.getElementById('chat-ui');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.voiceBtn = document.getElementById('voice-btn');
    this.sendBtn = document.getElementById('send-btn');
    this.currentNPCLabel = document.getElementById('current-npc');

    // Create AI status indicator
    this.createStatusIndicator();

    // Set up event listeners
    this.setupEventListeners();

    // Load the AI model
    await this.loadModel();
  }

  createStatusIndicator() {
    this.aiStatusEl = document.createElement('div');
    this.aiStatusEl.id = 'ai-status';
    this.aiStatusEl.innerHTML = '<span class="status-dot"></span><span class="status-text">Loading AI...</span>';
    document.body.appendChild(this.aiStatusEl);
  }

  updateStatus(status, isReady = false, isError = false) {
    if (this.aiStatusEl) {
      this.aiStatusEl.querySelector('.status-text').textContent = status;
      this.aiStatusEl.classList.toggle('ready', isReady);
      this.aiStatusEl.classList.toggle('error', isError);
    }
  }

  async loadModel() {
    const progressCallback = (report) => {
      const progressFill = document.getElementById('progress-fill');
      const loadingStatus = document.getElementById('loading-status');

      if (report.progress !== undefined) {
        const percent = Math.round(report.progress * 100);
        if (progressFill) progressFill.style.width = `${percent}%`;
        this.updateStatus(`Loading: ${percent}%`);
      }

      if (report.text) {
        if (loadingStatus) loadingStatus.textContent = report.text;
        console.log('WebLLM:', report.text);
      }
    };

    try {
      this.updateStatus('Initializing WebLLM...');

      // Check if WebLLM is available
      if (typeof webllm === 'undefined') {
        throw new Error('WebLLM library not loaded');
      }

      // Create the engine
      this.engine = await webllm.CreateMLCEngine(this.modelId, {
        initProgressCallback: progressCallback,
      });

      this.isLoaded = true;
      this.updateStatus('AI Ready', true);
      console.log('AI model loaded successfully');

      // Hide loading screen
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }

    } catch (error) {
      console.error('Failed to load AI model:', error);
      this.updateStatus('AI unavailable - using fallback', false, true);

      // Still hide loading screen and allow interaction with fallback
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }

      // Enable fallback mode
      this.isLoaded = false;
    }
  }

  setupEventListeners() {
    // Send button
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // Enter key in input
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // Voice button
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('mousedown', () => this.startRecording());
      this.voiceBtn.addEventListener('mouseup', () => this.stopRecording());
      this.voiceBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.startRecording();
      });
      this.voiceBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.stopRecording();
      });
    }

    // Close chat when clicking outside in VR
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.endConversation();
      }
    });
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.chatInput) {
          this.chatInput.value = transcript;
        }
        this.sendMessage();
      };

      this.speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isRecording = false;
        if (this.voiceBtn) this.voiceBtn.classList.remove('recording');
      };

      this.speechRecognition.onend = () => {
        this.isRecording = false;
        if (this.voiceBtn) this.voiceBtn.classList.remove('recording');
      };
    }
  }

  startRecording() {
    if (this.speechRecognition && !this.isRecording) {
      this.isRecording = true;
      if (this.voiceBtn) this.voiceBtn.classList.add('recording');
      this.speechRecognition.start();
    }
  }

  stopRecording() {
    if (this.speechRecognition && this.isRecording) {
      this.speechRecognition.stop();
    }
  }

  startConversation(npcId, config) {
    this.currentNPC = { id: npcId, config };

    // Initialize conversation history for this NPC if not exists
    if (!this.conversationHistory[npcId]) {
      this.conversationHistory[npcId] = [];
    }

    // Update NPC manager
    if (window.npcManager) {
      window.npcManager.setActiveNPC(npcId);
    }

    // Show chat UI
    if (this.chatUI) {
      this.chatUI.classList.remove('hidden');
    }

    // Update NPC label
    if (this.currentNPCLabel) {
      this.currentNPCLabel.textContent = `Talking to: ${config.name} (${config.nameKorean})`;
    }

    // Clear previous messages display and show history
    if (this.chatMessages) {
      this.chatMessages.innerHTML = '';

      // Show conversation history
      this.conversationHistory[npcId].forEach(msg => {
        this.addMessageToUI(msg.role === 'user' ? 'user' : 'npc', msg.content);
      });

      // Welcome message if new conversation
      if (this.conversationHistory[npcId].length === 0) {
        this.addMessageToUI('system', `You approached ${config.name}. They look up at you.`);
      }
    }

    // Focus input
    if (this.chatInput) {
      this.chatInput.focus();
    }
  }

  endConversation() {
    if (this.currentNPC && window.npcManager) {
      window.npcManager.setActiveNPC(null);
    }

    this.currentNPC = null;

    if (this.chatUI) {
      this.chatUI.classList.add('hidden');
    }
  }

  async sendMessage() {
    if (!this.currentNPC || this.isGenerating) return;

    const message = this.chatInput?.value.trim();
    if (!message) return;

    // Clear input
    if (this.chatInput) this.chatInput.value = '';

    // Add user message to UI
    this.addMessageToUI('user', message);

    // Add to history
    this.conversationHistory[this.currentNPC.id].push({
      role: 'user',
      content: message
    });

    // Generate response
    await this.generateResponse(message);
  }

  async generateResponse(userMessage) {
    this.isGenerating = true;

    // Show loading indicator
    const loadingMsgEl = this.addMessageToUI('loading', 'Thinking');

    try {
      let response;

      if (this.isLoaded && this.engine) {
        // Use WebLLM
        response = await this.generateWithLLM(userMessage);
      } else {
        // Fallback to scripted responses
        response = this.generateFallbackResponse(userMessage);
      }

      // Remove loading message
      if (loadingMsgEl) loadingMsgEl.remove();

      // Add response to UI
      this.addMessageToUI('npc', response);

      // Add to history
      this.conversationHistory[this.currentNPC.id].push({
        role: 'assistant',
        content: response
      });

      // Trigger NPC reaction
      if (window.npcManager) {
        const reactions = ['nod', 'excited'];
        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        window.npcManager.triggerReaction(this.currentNPC.id, reaction);
      }

      // Text to speech
      this.speak(response);

    } catch (error) {
      console.error('Error generating response:', error);
      if (loadingMsgEl) loadingMsgEl.remove();
      this.addMessageToUI('system', 'Sorry, I had trouble responding. Try again?');
    }

    this.isGenerating = false;
  }

  async generateWithLLM(userMessage) {
    const config = this.currentNPC.config;

    // Build messages array with system prompt and history
    const messages = [
      { role: 'system', content: config.systemPrompt }
    ];

    // Add recent conversation history (last 6 messages to stay within context)
    const history = this.conversationHistory[this.currentNPC.id].slice(-6);
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    // Generate with WebLLM
    const reply = await this.engine.chat.completions.create({
      messages: messages,
      max_tokens: 100,
      temperature: 0.8,
      top_p: 0.95,
    });

    return reply.choices[0].message.content.trim();
  }

  generateFallbackResponse(userMessage) {
    // Simple fallback responses based on personality
    const config = this.currentNPC.config;
    const lowerMsg = userMessage.toLowerCase();

    const fallbacks = {
      'minjun': {
        greeting: ['Hello, teacher! How can I help you today?', 'Good day, 선생님!', 'Welcome to our classroom!'],
        question: ['That\'s an excellent question! I think...', 'Let me help with that, 선생님.', 'I\'d be happy to assist!'],
        default: ['Yes, 선생님!', 'I understand.', 'I\'ll do my best!']
      },
      'sooyeon': {
        greeting: ['Oh... hello...', 'Hi... *looks down shyly*', '...hello, teacher.'],
        question: ['Um... I think... maybe...', 'I\'m not sure, but... perhaps...', '*hesitates* ...I think so?'],
        default: ['...okay.', '*nods quietly*', 'I see...']
      },
      'jihoon': {
        greeting: ['Hey there, teach!', 'What\'s up, 선생님?', 'Yo! Welcome to the fun zone!'],
        question: ['Haha, good question! So basically...', 'Oh man, let me think... *dramatic pose*', 'That\'s easy! Or is it? Haha!'],
        default: ['Ha! Nice one!', 'You got it, boss!', 'This class just got interesting!']
      },
      'yuna': {
        greeting: ['Hello, teacher. I was just reviewing chapter 5.', 'Good day. Are we having a quiz today?', 'Hi. I\'ve completed all my homework.'],
        question: ['According to my notes, the answer is...', 'I\'ve studied this. The key points are...', 'Let me check my reference materials...'],
        default: ['I should note this down.', 'Understood. Back to studying.', 'That\'s useful information.']
      }
    };

    const npcFallbacks = fallbacks[this.currentNPC.id] || fallbacks['minjun'];

    let responseSet;
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
      responseSet = npcFallbacks.greeting;
    } else if (lowerMsg.includes('?')) {
      responseSet = npcFallbacks.question;
    } else {
      responseSet = npcFallbacks.default;
    }

    return responseSet[Math.floor(Math.random() * responseSet.length)];
  }

  addMessageToUI(type, content) {
    if (!this.chatMessages) return null;

    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${type}`;
    msgEl.textContent = content;

    this.chatMessages.appendChild(msgEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    return msgEl;
  }

  speak(text) {
    if (!this.speechSynthesis) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to find a suitable voice
    const voices = this.speechSynthesis.getVoices();

    // Prefer Korean or English voices based on NPC
    let selectedVoice = null;

    // Try to match voice to personality
    if (this.currentNPC) {
      const config = this.currentNPC.config;

      // Gender-based voice selection
      const femaleNames = ['sooyeon', 'yuna'];
      const isFemale = femaleNames.includes(this.currentNPC.id);

      // Find appropriate voice
      selectedVoice = voices.find(v =>
        v.lang.includes('en') &&
        ((isFemale && v.name.toLowerCase().includes('female')) ||
          (!isFemale && v.name.toLowerCase().includes('male')))
      ) || voices.find(v => v.lang.includes('en')) || voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.9;
    utterance.pitch = this.currentNPC?.id === 'jihoon' ? 1.1 : 1.0;

    this.speechSynthesis.speak(utterance);
  }
}

// Create global AI chat instance
window.aiChat = new AIChat();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIChat;
}
