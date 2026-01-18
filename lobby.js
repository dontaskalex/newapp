// Supabase configuration
const SUPABASE_URL = 'https://gsolvasxknipjjervfyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzb2x2YXN4a25pcGpqZXJ2ZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDAyNzAsImV4cCI6MjA3ODk3NjI3MH0.x6z6VDUcnP4_Jz2N1zAELKgpA-V6eGsSwdgSTOViMXM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Resize canvas to fill window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Generate unique ID for this session
const myId = crypto.randomUUID();

// World size (larger than viewport for scrolling)
const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 900;

// World center - where everyone spawns near
const SPAWN_CENTER_X = WORLD_WIDTH / 2;
const SPAWN_CENTER_Y = WORLD_HEIGHT / 2;
const SPAWN_RADIUS = 150; // How far from center players can spawn

// Random spawn near center
function getSpawnPosition() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * SPAWN_RADIUS;
    return {
        x: SPAWN_CENTER_X + Math.cos(angle) * distance,
        y: SPAWN_CENTER_Y + Math.sin(angle) * distance
    };
}

const spawnPos = getSpawnPosition();

// My character state - spawn near world center
const me = {
    id: myId,
    x: spawnPos.x,
    y: spawnPos.y,
    message: null,
    messageTime: 0,
    bobOffset: Math.random() * Math.PI * 2, // Random start for idle animation
    emote: null,
    emoteTime: 0,
};

// Emote settings
const EMOTE_DURATION = 4000; // 4 seconds
const EMOTE_ICONS = {
    sad: '😢',
    love: '😍',
    laugh: '😂',
    sleepy: '😴',
    surprised: '😮',
};

// Other players in the lobby
const others = new Map();

// Speech bubble settings
const BUBBLE_DURATION = 6000; // 6 seconds
const BUBBLE_FADE_TIME = 1000; // 1 second fade

// Zoom level (1 = normal, 0.5 = zoomed out 2x)
let zoomLevel = 1;

// Draw face based on current emote
function drawFace(ctx, time, bobOffset, emote) {
    ctx.fillStyle = '#f5f0e8';
    ctx.strokeStyle = '#f5f0e8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (emote === 'sad') {
        // Sad face - droopy eyes with tears streaming down
        // Sad droopy eyes (upside down arcs)
        ctx.strokeStyle = '#f5f0e8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-7, -6, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, -6, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
        // Animated tears streaming down
        const tearOffset = (time * 40) % 25;
        ctx.fillStyle = '#67e8f9';
        // Left side tears
        ctx.beginPath();
        ctx.ellipse(-7, -2 + tearOffset, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-9, 8 + (tearOffset + 12) % 25, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right side tears
        ctx.beginPath();
        ctx.ellipse(7, -2 + (tearOffset + 8) % 25, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(9, 8 + tearOffset, 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wobbly frown
        const wobble = Math.sin(time * 3) * 0.5;
        ctx.strokeStyle = '#f5f0e8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 14 + wobble, 5, Math.PI + 0.4, -0.4);
        ctx.stroke();

    } else if (emote === 'love') {
        // Love face - heart eyes
        ctx.fillStyle = '#f472b6';
        // Left heart
        ctx.beginPath();
        ctx.moveTo(-7, -3);
        ctx.bezierCurveTo(-12, -8, -12, -2, -7, 2);
        ctx.bezierCurveTo(-2, -2, -2, -8, -7, -3);
        ctx.fill();
        // Right heart
        ctx.beginPath();
        ctx.moveTo(7, -3);
        ctx.bezierCurveTo(2, -8, 2, -2, 7, 2);
        ctx.bezierCurveTo(12, -2, 12, -8, 7, -3);
        ctx.fill();
        // Blushing cheeks
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-14, 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(14, 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Happy smile
        ctx.strokeStyle = '#f5f0e8';
        ctx.beginPath();
        ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();

    } else if (emote === 'laugh') {
        // Laughing face - closed happy eyes, big smile
        // Closed happy eyes (arcs)
        ctx.strokeStyle = '#f5f0e8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-7, -4, 4, Math.PI + 0.5, -0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, -4, 4, Math.PI + 0.5, -0.5);
        ctx.stroke();
        // Rosy cheeks
        ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-14, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(14, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Big open mouth smile
        ctx.fillStyle = '#f5f0e8';
        ctx.beginPath();
        ctx.arc(0, 5, 8, 0, Math.PI);
        ctx.fill();

    } else if (emote === 'sleepy') {
        // Sleepy face - closed eyes, zzz
        // Closed sleepy eyes
        ctx.strokeStyle = '#f5f0e8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(-4, -5);
        ctx.moveTo(4, -5);
        ctx.lineTo(10, -5);
        ctx.stroke();
        // Small o mouth
        ctx.fillStyle = '#f5f0e8';
        ctx.beginPath();
        ctx.ellipse(0, 5, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Zzz floating with contours - all same size
        ctx.textAlign = 'left';
        ctx.font = 'bold 11px sans-serif';
        ctx.strokeStyle = '#2d2d2d';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        const zzOffset = Math.sin(time * 2) * 2;

        // Draw each Z with stroke outline then fill - same size, staggered position
        // First Z
        ctx.strokeText('z', 15, -6 + zzOffset);
        ctx.fillStyle = '#f5f0e8';
        ctx.fillText('z', 15, -6 + zzOffset);

        // Second Z
        ctx.strokeText('z', 22, -13 + zzOffset);
        ctx.fillText('z', 22, -13 + zzOffset);

        // Third Z
        ctx.strokeText('z', 29, -20 + zzOffset);
        ctx.fillText('z', 29, -20 + zzOffset);

    } else if (emote === 'surprised') {
        // Surprised face - wide eyes, o mouth
        // Big wide eyes
        ctx.fillStyle = '#f5f0e8';
        ctx.beginPath();
        ctx.arc(-7, -5, 6, 0, Math.PI * 2);
        ctx.arc(7, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        // Small pupils
        ctx.fillStyle = '#2d2d2d';
        ctx.beginPath();
        ctx.arc(-7, -5, 2.5, 0, Math.PI * 2);
        ctx.arc(7, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // O mouth
        ctx.fillStyle = '#f5f0e8';
        ctx.beginPath();
        ctx.ellipse(0, 6, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

    } else {
        // Default neutral face
        const blinkCycle = (time + bobOffset) % 4;
        const isBlinking = blinkCycle > 3.8;

        if (isBlinking) {
            ctx.strokeStyle = '#f5f0e8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(-4, -5);
            ctx.moveTo(4, -5);
            ctx.lineTo(10, -5);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#f5f0e8';
            ctx.beginPath();
            ctx.arc(-7, -5, 4, 0, Math.PI * 2);
            ctx.arc(7, -5, 4, 0, Math.PI * 2);
            ctx.fill();
            // Pupils
            ctx.fillStyle = '#2d2d2d';
            const lookX = Math.sin(time * 0.3 + bobOffset) * 1.5;
            const lookY = Math.cos(time * 0.2 + bobOffset) * 1;
            ctx.beginPath();
            ctx.arc(-7 + lookX, -5 + lookY, 2, 0, Math.PI * 2);
            ctx.arc(7 + lookX, -5 + lookY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        // Rosy cheeks
        ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-14, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(14, 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        // Small smile
        ctx.strokeStyle = '#f5f0e8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 2, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }
}

// Character drawing - simple hand-drawn style blob person
function drawCharacter(x, y, isMe = false, bobOffset = 0, emote = null) {
    const time = Date.now() / 1000;
    const bob = Math.sin(time * 2 + bobOffset) * 3; // Gentle bobbing

    ctx.save();
    ctx.translate(x, y + bob);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.ellipse(0, 35, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body - hand-drawn wobbly circle
    ctx.fillStyle = '#2d2d2d';
    ctx.beginPath();

    // Create a wobbly circle effect
    const points = 32;
    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wobble = Math.sin(angle * 6 + time * 0.5) * 2;
        const r = 25 + wobble;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r * 1.1; // Slightly taller

        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();

    // Draw face based on emote
    drawFace(ctx, time, bobOffset, emote);

    // "You" indicator for own character
    if (isMe) {
        ctx.fillStyle = '#666';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('you', 0, 50);
    }

    ctx.restore();
}

// Wrap text into lines that fit within maxWidth
// Handles Korean and other languages without spaces
function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let currentLine = '';

    // Process character by character to handle languages without spaces
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
}

// Draw speech bubble
function drawSpeechBubble(x, y, message, opacity = 1) {
    if (!message) return;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Measure and wrap text
    ctx.font = '14px Inter, sans-serif';
    const maxTextWidth = 220;
    const maxLines = 4;
    let lines = wrapText(ctx, message, maxTextWidth);

    // Limit to max lines
    if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = lines[maxLines - 1].slice(0, -3) + '...';
    }

    const lineHeight = 18;
    const padding = 12;

    // Calculate bubble size based on lines
    let maxLineWidth = 0;
    for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
    }

    const bubbleWidth = Math.max(maxLineWidth + padding * 2, 50);
    const bubbleHeight = lines.length * lineHeight + padding * 2 - 4;

    // Position bubble above character
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - 50 - bubbleHeight;

    // Bubble background with hand-drawn feel
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 2;

    // Rounded rectangle
    const radius = 18;
    ctx.beginPath();
    ctx.moveTo(bubbleX + radius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    ctx.lineTo(bubbleX, bubbleY + radius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Little tail pointing down
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 8, bubbleY + bubbleHeight - 1);
    ctx.lineTo(x, bubbleY + bubbleHeight + 10);
    ctx.lineTo(x + 8, bubbleY + bubbleHeight - 1);
    ctx.closePath();
    ctx.fill();

    // Tail outline
    ctx.beginPath();
    ctx.moveTo(x - 8, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 10);
    ctx.lineTo(x + 8, bubbleY + bubbleHeight);
    ctx.stroke();

    // Cover the line inside the bubble
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 7, bubbleY + bubbleHeight - 2, 14, 3);

    // Text - draw each line
    ctx.fillStyle = '#2d2d2d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textStartY = bubbleY + padding + lineHeight / 2 - 2;
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, textStartY + i * lineHeight);
    }

    ctx.restore();
}

// Convert world coordinates to screen coordinates (centered on me)
function worldToScreen(worldX, worldY) {
    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;
    return {
        x: screenCenterX + (worldX - me.x),
        y: screenCenterY + (worldY - me.y)
    };
}

// Zoom constraints
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;

// Set zoom level with constraints
function setZoom(newZoom) {
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
}

// Pinch zoom tracking
let initialPinchDistance = null;
let initialPinchZoom = 1;

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Touch handlers for pinch zoom
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance = getPinchDistance(e.touches);
        initialPinchZoom = zoomLevel;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        const scale = currentDistance / initialPinchDistance;
        setZoom(initialPinchZoom * scale);
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
});

// Mouse wheel zoom (desktop)
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    setZoom(zoomLevel + delta);
}, { passive: false });

// Main render loop
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;

    // Apply zoom transformation
    ctx.save();
    ctx.translate(screenCenterX, screenCenterY);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-screenCenterX, -screenCenterY);

    // Draw other players first (behind)
    others.forEach((player) => {
        const screenPos = worldToScreen(player.x, player.y);

        // Expanded visibility check for zoomed out view
        const margin = 200 / zoomLevel;
        if (screenPos.x > -margin && screenPos.x < canvas.width + margin &&
            screenPos.y > -margin && screenPos.y < canvas.height + margin) {

            // Calculate bubble opacity
            let bubbleOpacity = 1;
            if (player.message && player.messageTime) {
                const elapsed = now - player.messageTime;
                if (elapsed > BUBBLE_DURATION - BUBBLE_FADE_TIME) {
                    bubbleOpacity = Math.max(0, 1 - (elapsed - (BUBBLE_DURATION - BUBBLE_FADE_TIME)) / BUBBLE_FADE_TIME);
                }
                if (elapsed > BUBBLE_DURATION) {
                    player.message = null;
                }
            }

            // Calculate emote opacity
            let emoteOpacity = 1;
            if (player.emote && player.emoteTime) {
                const elapsed = now - player.emoteTime;
                if (elapsed > EMOTE_DURATION - 500) {
                    emoteOpacity = Math.max(0, 1 - (elapsed - (EMOTE_DURATION - 500)) / 500);
                }
                if (elapsed > EMOTE_DURATION) {
                    player.emote = null;
                }
            }

            // Get active emote (if not expired)
            const activeEmote = player.emote && player.emoteTime && (now - player.emoteTime < EMOTE_DURATION) ? player.emote : null;

            drawCharacter(screenPos.x, screenPos.y, false, player.bobOffset || 0, activeEmote);
            if (player.message && !activeEmote) {
                drawSpeechBubble(screenPos.x, screenPos.y, player.message, bubbleOpacity);
            }
        }
    });

    // Draw me (always in center)
    let myBubbleOpacity = 1;
    if (me.message && me.messageTime) {
        const elapsed = now - me.messageTime;
        if (elapsed > BUBBLE_DURATION - BUBBLE_FADE_TIME) {
            myBubbleOpacity = Math.max(0, 1 - (elapsed - (BUBBLE_DURATION - BUBBLE_FADE_TIME)) / BUBBLE_FADE_TIME);
        }
        if (elapsed > BUBBLE_DURATION) {
            me.message = null;
        }
    }

    // Calculate my emote opacity
    let myEmoteOpacity = 1;
    if (me.emote && me.emoteTime) {
        const elapsed = now - me.emoteTime;
        if (elapsed > EMOTE_DURATION - 500) {
            myEmoteOpacity = Math.max(0, 1 - (elapsed - (EMOTE_DURATION - 500)) / 500);
        }
        if (elapsed > EMOTE_DURATION) {
            me.emote = null;
        }
    }

    // Get my active emote
    const myActiveEmote = me.emote && me.emoteTime && (now - me.emoteTime < EMOTE_DURATION) ? me.emote : null;

    drawCharacter(screenCenterX, screenCenterY, true, me.bobOffset, myActiveEmote);
    if (me.message && !myActiveEmote) {
        drawSpeechBubble(screenCenterX, screenCenterY, me.message, myBubbleOpacity);
    }

    ctx.restore();

    requestAnimationFrame(render);
}

// Send a message
function sendMessage(text) {
    if (!text.trim()) return;

    me.message = text.trim();
    me.messageTime = Date.now();

    // Broadcast to others
    channel.send({
        type: 'broadcast',
        event: 'message',
        payload: {
            id: me.id,
            message: me.message,
        }
    });
}

// Send an emote
function sendEmote(emote) {
    if (!EMOTE_ICONS[emote]) return;

    me.emote = emote;
    me.emoteTime = Date.now();

    // Broadcast to others
    channel.send({
        type: 'broadcast',
        event: 'emote',
        payload: {
            id: me.id,
            emote: emote,
        }
    });
}

// Update online count display
function updateOnlineCount(count) {
    const el = document.getElementById('online-count');
    if (count === 1) {
        el.textContent = '1 here';
    } else {
        el.textContent = `${count} here`;
    }
}

// Supabase Realtime channel
let channel;

async function connectToLobby() {
    // Create a presence channel
    channel = supabaseClient.channel('the-lobby-hangout', {
        config: {
            presence: {
                key: me.id,
            },
        },
    });

    // Handle presence sync (initial state)
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        others.clear();

        Object.entries(state).forEach(([key, presences]) => {
            if (key !== me.id && presences.length > 0) {
                const p = presences[0];
                others.set(key, {
                    id: key,
                    x: p.x,
                    y: p.y,
                    message: p.message || null,
                    messageTime: p.messageTime || 0,
                    bobOffset: p.bobOffset || 0,
                });
            }
        });

        updateOnlineCount(others.size + 1);
    });

    // Handle someone joining
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== me.id && newPresences.length > 0) {
            const p = newPresences[0];
            others.set(key, {
                id: key,
                x: p.x,
                y: p.y,
                message: null,
                messageTime: 0,
                bobOffset: p.bobOffset || 0,
            });
            updateOnlineCount(others.size + 1);
        }
    });

    // Handle someone leaving
    channel.on('presence', { event: 'leave' }, ({ key }) => {
        others.delete(key);
        updateOnlineCount(others.size + 1);
    });

    // Handle broadcast messages
    channel.on('broadcast', { event: 'message' }, ({ payload }) => {
        if (payload.id !== me.id) {
            const player = others.get(payload.id);
            if (player) {
                player.message = payload.message;
                player.messageTime = Date.now();
            }
        }
    });

    // Handle broadcast emotes
    channel.on('broadcast', { event: 'emote' }, ({ payload }) => {
        if (payload.id !== me.id) {
            const player = others.get(payload.id);
            if (player) {
                player.emote = payload.emote;
                player.emoteTime = Date.now();
            }
        }
    });

    // Subscribe and track presence
    await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            // Track my presence
            await channel.track({
                x: me.x,
                y: me.y,
                bobOffset: me.bobOffset,
            });

            // Hide connecting overlay
            setTimeout(() => {
                document.getElementById('connecting').classList.add('hidden');
            }, 500);
        }
    });
}

// Input handling
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
        chatInput.value = '';
    }
});

sendBtn.addEventListener('click', () => {
    sendMessage(chatInput.value);
    chatInput.value = '';
    chatInput.focus();
});

// Emote picker handling
const emoteBtn = document.getElementById('emote-btn');
const emotePicker = document.getElementById('emote-picker');

emoteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emotePicker.classList.toggle('show');
});

// Handle emote selection
document.querySelectorAll('.emote-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emote = btn.dataset.emote;
        sendEmote(emote);
        emotePicker.classList.remove('show');
    });
});

// Close picker when clicking elsewhere
document.addEventListener('click', () => {
    emotePicker.classList.remove('show');
});

// Start everything
render();
connectToLobby();

// Cleanup on page close
window.addEventListener('beforeunload', () => {
    if (channel) {
        channel.untrack();
    }
});
