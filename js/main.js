/**
 * Main initialization script for Korean Classroom VR
 */

// Wait for DOM and A-Frame to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Korean Classroom VR - Initializing...');

  // Wait for A-Frame scene to load
  const scene = document.querySelector('a-scene');

  if (scene.hasLoaded) {
    initializeApp();
  } else {
    scene.addEventListener('loaded', initializeApp);
  }
});

async function initializeApp() {
  console.log('A-Frame scene loaded, initializing app...');

  // Initialize AI chat system
  if (window.aiChat) {
    await window.aiChat.init();
  }

  // Add instructions overlay
  addInstructions();

  // Set up teleportation
  setupTeleportation();

  // Add VR enter/exit handlers
  setupVRHandlers();

  // Add ambient audio (optional)
  // setupAmbientAudio();

  console.log('Korean Classroom VR - Ready!');
}

function addInstructions() {
  const instructions = document.createElement('div');
  instructions.id = 'instructions';
  instructions.innerHTML = `
    <strong>Korean Classroom VR</strong><br>
    Click on a student to start a conversation<br>
    <small>Use WASD to move, mouse to look around</small>
  `;
  document.body.appendChild(instructions);

  // Fade out instructions after 10 seconds
  setTimeout(() => {
    instructions.classList.add('fade-out');
    setTimeout(() => instructions.remove(), 500);
  }, 10000);
}

function setupTeleportation() {
  const rig = document.querySelector('#rig');
  const teleportPoints = document.querySelectorAll('.teleport-point');

  teleportPoints.forEach(point => {
    point.addEventListener('click', () => {
      const position = point.getAttribute('position');
      rig.setAttribute('position', {
        x: position.x,
        y: 0,
        z: position.z
      });
    });

    // Hover effects
    point.addEventListener('mouseenter', () => {
      point.setAttribute('material', 'opacity', 0.8);
      point.setAttribute('scale', '1.2 1.2 1.2');
    });

    point.addEventListener('mouseleave', () => {
      point.setAttribute('material', 'opacity', 0.5);
      point.setAttribute('scale', '1 1 1');
    });
  });
}

function setupVRHandlers() {
  const scene = document.querySelector('a-scene');

  scene.addEventListener('enter-vr', () => {
    console.log('Entered VR mode');

    // Hide 2D UI elements or adapt them for VR
    const chatUI = document.getElementById('chat-ui');
    if (chatUI) {
      // In VR, we might want to position the chat as a 3D panel
      // For now, just hide it and use voice only
      chatUI.style.display = 'none';
    }

    // Show VR-specific instructions
    showVRInstructions();
  });

  scene.addEventListener('exit-vr', () => {
    console.log('Exited VR mode');

    // Restore 2D UI
    const chatUI = document.getElementById('chat-ui');
    if (chatUI && window.aiChat?.currentNPC) {
      chatUI.style.display = 'block';
    }
  });
}

function showVRInstructions() {
  // Create a 3D text panel with VR instructions
  const scene = document.querySelector('a-scene');
  const camera = document.querySelector('#camera');

  const vrInstructions = document.createElement('a-entity');
  vrInstructions.setAttribute('position', '0 1.6 -1');
  vrInstructions.setAttribute('text', {
    value: 'Welcome to Korean Classroom VR!\n\nPoint at a student and click to talk\nUse controller trigger to interact\nPress menu to exit',
    align: 'center',
    width: 1.5,
    color: '#FFFFFF'
  });
  vrInstructions.setAttribute('geometry', {
    primitive: 'plane',
    width: 1.8,
    height: 0.6
  });
  vrInstructions.setAttribute('material', {
    color: '#1a1a2e',
    opacity: 0.9
  });

  // Attach to camera so it follows the user initially
  vrInstructions.setAttribute('look-at', '[camera]');

  scene.appendChild(vrInstructions);

  // Remove after 8 seconds
  setTimeout(() => {
    vrInstructions.setAttribute('animation', {
      property: 'material.opacity',
      to: 0,
      dur: 1000
    });
    setTimeout(() => vrInstructions.remove(), 1000);
  }, 8000);
}

function setupAmbientAudio() {
  // Optional: Add ambient classroom sounds
  const scene = document.querySelector('a-scene');

  const ambientSound = document.createElement('a-entity');
  ambientSound.setAttribute('sound', {
    src: 'url(assets/audio/classroom-ambient.mp3)',
    autoplay: true,
    loop: true,
    volume: 0.3
  });

  scene.appendChild(ambientSound);
}

// Utility: Check WebXR support
function checkVRSupport() {
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      console.log('WebXR immersive-vr supported:', supported);
    });
  } else {
    console.log('WebXR not available');
  }
}

// Call VR support check
checkVRSupport();

// Handle window resize
window.addEventListener('resize', () => {
  // A-Frame handles most resize, but we can add custom handling here
});

// Prevent default touch behaviors that might interfere
document.addEventListener('touchmove', (e) => {
  if (e.target.closest('a-scene')) {
    // Allow A-Frame to handle touch
  }
}, { passive: true });

// Export for debugging
window.classroomVR = {
  teleportTo: (x, z) => {
    const rig = document.querySelector('#rig');
    rig.setAttribute('position', { x, y: 0, z });
  },
  talkTo: (npcId) => {
    const npc = window.npcManager?.getNPC(npcId);
    if (npc) {
      npc.onInteract();
    }
  }
};
