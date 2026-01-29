/**
 * NPC System for Korean Classroom VR
 * Handles NPC behaviors, animations, and interactions
 */

// Student personality configurations
const STUDENT_PERSONALITIES = {
  'minjun': {
    name: 'Min-jun',
    nameKorean: '민준',
    personality: 'class-president',
    systemPrompt: `You are Min-jun (민준), the class president of a Korean high school classroom. You are:
- Eager, responsible, and helpful
- Always formal and polite (use formal Korean speech patterns translated to English)
- Quick to raise your hand and answer questions
- Supportive of the teacher and classmates
- Organized and punctual

You speak with enthusiasm but remain respectful. You sometimes use Korean words like "네" (yes), "선생님" (teacher), and "감사합니다" (thank you).
Keep responses natural, 1-3 sentences. You're sitting at your desk in the front-left of the classroom.`,
    idleAnimation: 'attentive',
    color: '#1E3A5F'
  },
  'sooyeon': {
    name: 'Soo-yeon',
    nameKorean: '수연',
    personality: 'shy-artistic',
    systemPrompt: `You are Soo-yeon (수연), a shy and artistic student in a Korean high school classroom. You are:
- Quiet and soft-spoken, often hesitant at first
- Creative and imaginative, love drawing and art
- A daydreamer who often looks out the window
- Kind-hearted but takes time to open up
- Thoughtful with your words

You speak softly and sometimes pause mid-sentence. You occasionally mention your drawings or things you see outside.
Keep responses gentle and brief, 1-2 sentences. You're sitting near the window and sometimes seem distracted by something outside.`,
    idleAnimation: 'daydream',
    color: '#FFB6C1'
  },
  'jihoon': {
    name: 'Ji-hoon',
    nameKorean: '지훈',
    personality: 'class-clown',
    systemPrompt: `You are Ji-hoon (지훈), the class clown of a Korean high school classroom. You are:
- Funny and friendly, always trying to make people laugh
- Informal and casual in your speech
- Creative with jokes and wordplay
- Actually smart but hides it behind humor
- Loyal friend who lightens the mood

You often make jokes, use casual speech, and try to be entertaining. You might make Korean puns or reference K-pop.
Keep responses fun and playful, 1-3 sentences. You're sitting in the back and sometimes get in trouble for talking.`,
    idleAnimation: 'restless',
    color: '#32CD32'
  },
  'yuna': {
    name: 'Yuna',
    nameKorean: '유나',
    personality: 'studious',
    systemPrompt: `You are Yuna (유나), a studious and competitive student in a Korean high school classroom. You are:
- Serious about academics, always studying
- Competitive but fair
- Wearing glasses, always has a notebook ready
- Precise and factual in your answers
- A bit stressed about grades

You speak matter-of-factly and often reference studying or tests. You might mention preparing for the 수능 (suneung - college entrance exam).
Keep responses focused and informative, 1-2 sentences. You're constantly taking notes and might seem a bit stressed.`,
    idleAnimation: 'writing',
    color: '#9370DB'
  }
};

// A-Frame component for NPC controller
AFRAME.registerComponent('npc-controller', {
  schema: {
    name: { type: 'string', default: '' },
    personality: { type: 'string', default: '' }
  },

  init: function () {
    this.npcId = this.data.name.toLowerCase().replace(/[^a-z]/g, '');
    this.config = STUDENT_PERSONALITIES[this.npcId];
    this.isActive = false;
    this.lookingAtCamera = false;
    this.idleTime = 0;
    this.blinkTime = 0;

    // Get body parts for animation
    this.body = this.el.querySelector('.npc-body');

    // Set up click/interaction listener
    this.el.addEventListener('click', this.onInteract.bind(this));
    this.el.addEventListener('raycaster-intersected', this.onHover.bind(this));
    this.el.addEventListener('raycaster-intersected-cleared', this.onHoverEnd.bind(this));

    // Register with NPC manager
    if (window.npcManager) {
      window.npcManager.registerNPC(this.npcId, this);
    }

    console.log(`NPC initialized: ${this.data.name} (${this.npcId})`);
  },

  tick: function (time, delta) {
    if (!this.config) return;

    // Idle animations
    this.idleTime += delta;
    this.blinkTime += delta;

    // Subtle idle movement
    if (this.body) {
      const idleOffset = Math.sin(this.idleTime * 0.001) * 0.01;
      // Subtle breathing/movement
      this.body.object3D.position.y = 0 + idleOffset;

      // Personality-specific animations
      switch (this.config.idleAnimation) {
        case 'attentive':
          // Min-jun: Slight forward lean
          this.body.object3D.rotation.x = Math.sin(this.idleTime * 0.0005) * 0.02;
          break;
        case 'daydream':
          // Soo-yeon: Looking toward window occasionally
          if (!this.isActive) {
            this.body.object3D.rotation.y = Math.sin(this.idleTime * 0.0003) * 0.3 - 0.2;
          }
          break;
        case 'restless':
          // Ji-hoon: More movement
          this.body.object3D.rotation.y = Math.sin(this.idleTime * 0.002) * 0.1;
          this.body.object3D.rotation.z = Math.sin(this.idleTime * 0.001) * 0.02;
          break;
        case 'writing':
          // Yuna: Head down, occasional look up
          const writePhase = (this.idleTime * 0.001) % 10;
          if (writePhase < 8) {
            this.body.object3D.rotation.x = 0.1; // Looking down at notes
          } else {
            this.body.object3D.rotation.x = -0.05; // Looking up briefly
          }
          break;
      }
    }

    // Look at camera when active
    if (this.isActive && this.body) {
      const camera = document.querySelector('#camera');
      if (camera) {
        const cameraPos = new THREE.Vector3();
        camera.object3D.getWorldPosition(cameraPos);

        const npcPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(npcPos);

        // Calculate angle to look at camera
        const angle = Math.atan2(cameraPos.x - npcPos.x, cameraPos.z - npcPos.z);
        this.body.object3D.rotation.y = angle + Math.PI;
      }
    }
  },

  onInteract: function (event) {
    console.log(`Interacting with ${this.data.name}`);

    // Notify AI chat system
    if (window.aiChat) {
      window.aiChat.startConversation(this.npcId, this.config);
    }

    this.setActive(true);
  },

  onHover: function (event) {
    // Visual feedback on hover
    this.el.setAttribute('scale', '1.05 1.05 1.05');
    document.body.style.cursor = 'pointer';
  },

  onHoverEnd: function (event) {
    if (!this.isActive) {
      this.el.setAttribute('scale', '1 1 1');
    }
    document.body.style.cursor = 'default';
  },

  setActive: function (active) {
    this.isActive = active;

    if (active) {
      this.el.setAttribute('scale', '1.05 1.05 1.05');
      // Add highlight effect
      this.el.classList.add('npc-highlight');
    } else {
      this.el.setAttribute('scale', '1 1 1');
      this.el.classList.remove('npc-highlight');
    }
  },

  getConfig: function () {
    return this.config;
  },

  // Play reaction animation
  react: function (type) {
    if (!this.body) return;

    switch (type) {
      case 'nod':
        // Nodding animation
        this.animateProperty(this.body.object3D.rotation, 'x', 0, -0.2, 200);
        setTimeout(() => {
          this.animateProperty(this.body.object3D.rotation, 'x', -0.2, 0.1, 150);
        }, 200);
        setTimeout(() => {
          this.animateProperty(this.body.object3D.rotation, 'x', 0.1, 0, 150);
        }, 350);
        break;
      case 'shake':
        // Head shake
        this.animateProperty(this.body.object3D.rotation, 'y', 0, 0.2, 100);
        setTimeout(() => this.animateProperty(this.body.object3D.rotation, 'y', 0.2, -0.2, 200), 100);
        setTimeout(() => this.animateProperty(this.body.object3D.rotation, 'y', -0.2, 0, 100), 300);
        break;
      case 'excited':
        // Bounce up
        const origY = this.body.object3D.position.y;
        this.animateProperty(this.body.object3D.position, 'y', origY, origY + 0.1, 200);
        setTimeout(() => this.animateProperty(this.body.object3D.position, 'y', origY + 0.1, origY, 200), 200);
        break;
    }
  },

  // Simple property animation helper
  animateProperty: function (obj, prop, from, to, duration) {
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      obj[prop] = from + (to - from) * this.easeOutQuad(progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  },

  easeOutQuad: function (t) {
    return t * (2 - t);
  }
});

// NPC interaction target component
AFRAME.registerComponent('interaction-target', {
  schema: {
    npc: { type: 'string', default: '' }
  },

  init: function () {
    this.el.addEventListener('click', () => {
      const npcEl = document.querySelector(`#npc-${this.data.npc}`);
      if (npcEl) {
        npcEl.emit('click');
      }
    });
  }
});

// NPC Manager - Global manager for all NPCs
class NPCManager {
  constructor() {
    this.npcs = {};
    this.activeNPC = null;
  }

  registerNPC(id, controller) {
    this.npcs[id] = controller;
  }

  getNPC(id) {
    return this.npcs[id];
  }

  setActiveNPC(id) {
    // Deactivate previous NPC
    if (this.activeNPC && this.npcs[this.activeNPC]) {
      this.npcs[this.activeNPC].setActive(false);
    }

    this.activeNPC = id;

    // Activate new NPC
    if (id && this.npcs[id]) {
      this.npcs[id].setActive(true);
    }
  }

  getActiveNPC() {
    return this.activeNPC ? this.npcs[this.activeNPC] : null;
  }

  getAllNPCs() {
    return this.npcs;
  }

  // Make NPC react
  triggerReaction(id, type) {
    if (this.npcs[id]) {
      this.npcs[id].react(type);
    }
  }
}

// Create global NPC manager
window.npcManager = new NPCManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STUDENT_PERSONALITIES, NPCManager };
}
