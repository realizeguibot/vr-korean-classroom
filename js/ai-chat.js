/**
 * AI Chat System for Korean Classroom VR
 * Smart response system with Speech Recognition and Text-to-Speech
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
    this.voicesLoaded = false;

    // UI elements
    this.chatUI = null;
    this.chatMessages = null;
    this.chatInput = null;
    this.voiceBtn = null;
    this.sendBtn = null;
    this.currentNPCLabel = null;
    this.aiStatusEl = null;

    // Preload voices
    this.preloadVoices();
  }

  preloadVoices() {
    // Voices load asynchronously in many browsers
    if (this.speechSynthesis) {
      const loadVoices = () => {
        const voices = this.speechSynthesis.getVoices();
        if (voices.length > 0) {
          this.voicesLoaded = true;
          console.log(`Loaded ${voices.length} voices for TTS`);
        }
      };

      loadVoices();
      this.speechSynthesis.onvoiceschanged = loadVoices;
    }
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

    // Initialize speech recognition
    this.initSpeechRecognition();

    // Try to load WebLLM (may fail on devices without WebGPU)
    await this.loadModel();
  }

  createStatusIndicator() {
    this.aiStatusEl = document.createElement('div');
    this.aiStatusEl.id = 'ai-status';
    this.aiStatusEl.innerHTML = '<span class="status-dot"></span><span class="status-text">Initializing...</span>';
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
    // Show progress
    const progressFill = document.getElementById('progress-fill');
    const loadingStatus = document.getElementById('loading-status');

    if (progressFill) progressFill.style.width = '50%';
    if (loadingStatus) loadingStatus.textContent = 'Loading AI system...';
    this.updateStatus('Initializing...');

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));

    if (progressFill) progressFill.style.width = '100%';
    if (loadingStatus) loadingStatus.textContent = 'Ready!';

    // Use smart response mode (works on all devices)
    this.isLoaded = false;
    this.updateStatus('AI Ready', true);
    console.log('AI Chat system ready (Smart Mode)');

    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
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

    // Voice button - click to toggle recording
    if (this.voiceBtn) {
      this.voiceBtn.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopRecording();
        } else {
          this.startRecording();
        }
      });
    }

    // Close chat when pressing Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.endConversation();
      }
    });
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      if (this.voiceBtn) {
        this.voiceBtn.style.opacity = '0.5';
        this.voiceBtn.title = 'Speech not supported in this browser';
      }
      return;
    }

    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.continuous = false;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = 'en-US';

    this.speechRecognition.onstart = () => {
      console.log('Speech recognition started');
      this.isRecording = true;
      if (this.voiceBtn) {
        this.voiceBtn.classList.add('recording');
        this.voiceBtn.textContent = '🔴';
      }
      this.addMessageToUI('system', '🎤 Listening...');
    };

    this.speechRecognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim results
      if (interimTranscript && this.chatInput) {
        this.chatInput.value = interimTranscript;
      }

      // Send final result
      if (finalTranscript) {
        if (this.chatInput) {
          this.chatInput.value = finalTranscript;
        }
        // Remove "Listening..." message
        const systemMsgs = this.chatMessages?.querySelectorAll('.chat-message.system');
        systemMsgs?.forEach(msg => {
          if (msg.textContent.includes('Listening')) msg.remove();
        });
        this.sendMessage();
      }
    };

    this.speechRecognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopRecording();

      if (event.error === 'not-allowed') {
        this.addMessageToUI('system', '⚠️ Microphone access denied. Please allow microphone access.');
      } else if (event.error !== 'aborted') {
        this.addMessageToUI('system', '⚠️ Could not hear you. Try again?');
      }
    };

    this.speechRecognition.onend = () => {
      console.log('Speech recognition ended');
      this.stopRecording();
    };
  }

  startRecording() {
    if (!this.speechRecognition) {
      this.addMessageToUI('system', '⚠️ Speech recognition not available in this browser');
      return;
    }

    if (!this.currentNPC) {
      this.addMessageToUI('system', '⚠️ Click on a student first to start talking');
      return;
    }

    try {
      this.speechRecognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }

  stopRecording() {
    this.isRecording = false;
    if (this.voiceBtn) {
      this.voiceBtn.classList.remove('recording');
      this.voiceBtn.textContent = '🎤';
    }
    try {
      this.speechRecognition?.stop();
    } catch (e) {
      // Ignore
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
        const greeting = this.getGreeting(npcId, config);
        this.addMessageToUI('npc', greeting);
        this.speak(greeting);
      }
    }

    // Focus input
    if (this.chatInput) {
      this.chatInput.focus();
    }
  }

  getGreeting(npcId, config) {
    const greetings = {
      'minjun': "Hello, teacher! 안녕하세요! I'm Min-jun, the class president. How can I help you today?",
      'sooyeon': "Oh... hello, teacher... *looks up shyly* I was just... drawing something...",
      'jihoon': "Hey, 선생님! What's up? Finally someone to talk to! This class was getting boring, haha!",
      'yuna': "Good day, teacher. I've completed all my assignments. Did you want to discuss the upcoming exam?"
    };
    return greetings[npcId] || `Hello, I'm ${config.name}.`;
  }

  endConversation() {
    if (this.currentNPC && window.npcManager) {
      window.npcManager.setActiveNPC(null);
    }

    // Stop any ongoing speech
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
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
      // Generate smart response
      const response = await this.generateSmartResponse(userMessage);

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
      const fallback = "Sorry, I didn't quite catch that. Could you say it again?";
      this.addMessageToUI('npc', fallback);
      this.speak(fallback);
    }

    this.isGenerating = false;
  }

  async generateSmartResponse(userMessage) {
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const npcId = this.currentNPC.id;
    const lowerMsg = userMessage.toLowerCase();
    const history = this.conversationHistory[npcId] || [];

    // Personality-based response generation
    const personalities = {
      'minjun': {
        style: 'formal and helpful',
        traits: ['eager', 'responsible', 'polite'],
        responses: {
          greeting: ["Hello! How can I assist you, 선생님?", "Good to see you, teacher! What would you like to discuss?"],
          question: ["That's a great question! Let me think... I believe the answer involves careful consideration of all factors.", "I've actually studied this! The key point is to approach it systematically."],
          name: ["I'm Min-jun, 민준 in Korean. I'm the class president this year!", "My name is Min-jun! I try my best to help everyone in class."],
          hobby: ["I enjoy organizing study groups and helping classmates. I also like reading history books!", "Besides studying, I volunteer at the school library. It's important to give back!"],
          feeling: ["I'm doing well, thank you for asking! Ready to learn as always.", "I feel motivated today! There's so much to accomplish."],
          school: ["School is very important to me. Education opens many doors!", "I love our school! The teachers here are wonderful."],
          default: ["Yes, 선생님! I understand.", "I'll do my best to help!", "That's interesting! Tell me more."]
        }
      },
      'sooyeon': {
        style: 'shy and artistic',
        traits: ['quiet', 'creative', 'thoughtful'],
        responses: {
          greeting: ["Oh... hi... *looks down*", "H-hello, teacher..."],
          question: ["Um... I think... maybe... *pauses* ...I'm not entirely sure, but perhaps...", "That's... that's a hard question... let me think..."],
          name: ["I'm... Soo-yeon... 수연... *quietly*", "My name is Soo-yeon. Most people don't notice me much..."],
          hobby: ["I... I like to draw... *shows sketchbook nervously* ...would you like to see?", "I spend most of my time drawing. It helps me express things I can't say..."],
          feeling: ["I'm... okay, I guess... *looks out window*", "A little tired today... I was up late drawing..."],
          art: ["*eyes light up* Oh! You want to see my art? I... I drew the sky outside today...", "Drawing is... it's like my voice, you know? When I can't speak, I draw."],
          default: ["...okay.", "*nods quietly*", "I see...", "...maybe..."]
        }
      },
      'jihoon': {
        style: 'funny and casual',
        traits: ['humorous', 'friendly', 'energetic'],
        responses: {
          greeting: ["Yo, 선생님! What's good?", "Hey hey hey! Finally, someone fun to talk to!"],
          question: ["Ooh, tough question! Let me put on my thinking cap... 🤔 Actually, I lost my thinking cap. Haha!", "Hmm, let me consult my brain... it says 'error 404: answer not found'! Just kidding, I think..."],
          name: ["The name's Ji-hoon! 지훈! The one and only class entertainer!", "I'm Ji-hoon! If you ever need a laugh, I'm your guy!"],
          hobby: ["I'm basically a professional meme collector. Also, I play games and make everyone laugh!", "Hobbies? Making people smile! Also sneaking snacks into class... don't tell anyone!"],
          feeling: ["Living the dream, teach! Or at least dreaming about living, haha!", "Feeling awesome! Every day is a chance for new jokes!"],
          joke: ["Why did the student eat his homework? Because his teacher said it was a piece of cake! 🎂", "What do you call a sleeping dinosaur? A dino-snore! Get it?"],
          default: ["Ha! Nice one!", "That's hilarious... wait, was that serious?", "You got it, boss!", "This class just got interesting!"]
        }
      },
      'yuna': {
        style: 'studious and precise',
        traits: ['academic', 'competitive', 'focused'],
        responses: {
          greeting: ["Good day, teacher. I've prepared for today's lesson.", "Hello. I hope we're covering something challenging today."],
          question: ["According to my research, the answer is... *checks notes* ...yes, I have it documented here.", "I've actually written a summary on this topic. The key factors are..."],
          name: ["I'm Yuna, 유나. Currently ranked second in our grade. I'm working on being first.", "My name is Yuna. I take my studies very seriously."],
          hobby: ["Studying, mostly. But I also enjoy solving complex math problems for fun.", "I participate in academic olympiads. Last month I won silver in mathematics."],
          feeling: ["Focused, as always. The 수능 exam is approaching and every moment counts.", "A bit stressed about upcoming exams, but that's normal."],
          study: ["I study at least 4 hours every day after school. Consistency is key.", "My study method involves active recall and spaced repetition. Very efficient."],
          default: ["I should note this down.", "Interesting. Back to studying.", "That's useful information.", "Noted. Now, about the assignment..."]
        }
      }
    };

    const npc = personalities[npcId] || personalities['minjun'];

    // Determine response category based on message content
    let category = 'default';

    if (lowerMsg.match(/\b(hi|hello|hey|greetings|안녕)\b/)) {
      category = 'greeting';
    } else if (lowerMsg.match(/\b(what|how|why|when|where|who|can you|do you|is it)\b.*\?/)) {
      category = 'question';
    } else if (lowerMsg.match(/\b(name|who are you|introduce|call you)\b/)) {
      category = 'name';
    } else if (lowerMsg.match(/\b(hobby|hobbies|fun|free time|like to do)\b/)) {
      category = 'hobby';
    } else if (lowerMsg.match(/\b(how are you|feeling|mood|doing)\b/)) {
      category = 'feeling';
    } else if (lowerMsg.match(/\b(school|class|study|learn|exam|test)\b/)) {
      category = npcId === 'yuna' ? 'study' : 'school';
    } else if (lowerMsg.match(/\b(draw|art|paint|sketch)\b/) && npcId === 'sooyeon') {
      category = 'art';
    } else if (lowerMsg.match(/\b(joke|funny|laugh|humor)\b/) && npcId === 'jihoon') {
      category = 'joke';
    }

    const responses = npc.responses[category] || npc.responses['default'];
    return responses[Math.floor(Math.random() * responses.length)];
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
    if (!this.speechSynthesis) {
      console.log('Speech synthesis not available');
      return;
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Get voices
    let voices = this.speechSynthesis.getVoices();

    // If voices not loaded yet, wait a bit
    if (voices.length === 0) {
      setTimeout(() => this.speak(text), 100);
      return;
    }

    // Select voice based on NPC gender
    if (this.currentNPC) {
      const femaleNames = ['sooyeon', 'yuna'];
      const isFemale = femaleNames.includes(this.currentNPC.id);

      // Try to find a good voice
      let selectedVoice = null;

      // Prefer Google voices as they sound better
      if (isFemale) {
        selectedVoice = voices.find(v => v.name.includes('Google') && v.name.toLowerCase().includes('female')) ||
                        voices.find(v => v.name.includes('Female')) ||
                        voices.find(v => v.name.includes('Samantha')) ||
                        voices.find(v => v.lang.startsWith('en') && v.name.includes('female'));
      } else {
        selectedVoice = voices.find(v => v.name.includes('Google') && v.name.toLowerCase().includes('male')) ||
                        voices.find(v => v.name.includes('Male')) ||
                        voices.find(v => v.name.includes('Daniel')) ||
                        voices.find(v => v.lang.startsWith('en') && v.name.includes('male'));
      }

      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Adjust voice characteristics per personality
      switch (this.currentNPC.id) {
        case 'minjun':
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          break;
        case 'sooyeon':
          utterance.rate = 0.85;
          utterance.pitch = 1.15;
          utterance.volume = 0.8;
          break;
        case 'jihoon':
          utterance.rate = 1.15;
          utterance.pitch = 1.1;
          break;
        case 'yuna':
          utterance.rate = 1.0;
          utterance.pitch = 1.05;
          break;
      }
    }

    utterance.onstart = () => console.log('Speaking:', text.substring(0, 30) + '...');
    utterance.onerror = (e) => console.error('Speech error:', e);

    this.speechSynthesis.speak(utterance);
  }
}

// Create global AI chat instance
window.aiChat = new AIChat();
