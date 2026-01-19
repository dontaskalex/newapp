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
const HEX_SPACING = 70; // Distance between blob centers in hex grid

// Generate hexagonal grid positions sorted by distance from center
function generateHexPositions() {
    const positions = [];
    const maxRings = 10; // How many rings of hexagons to generate

    // Center position (ring 0)
    positions.push({ x: SPAWN_CENTER_X, y: SPAWN_CENTER_Y, ring: 0 });

    // Generate rings of hexagons
    for (let ring = 1; ring <= maxRings; ring++) {
        // Each ring has 6 * ring positions
        for (let i = 0; i < 6; i++) {
            // Start angle for this side of hexagon
            const sideAngle = (Math.PI / 3) * i - Math.PI / 2;

            // Walk along this side of the ring
            for (let j = 0; j < ring; j++) {
                // Calculate position using axial coordinates converted to cartesian
                const angle1 = sideAngle;
                const angle2 = sideAngle + Math.PI / 3;

                // Position along the ring edge
                const x = SPAWN_CENTER_X +
                    HEX_SPACING * (ring - j) * Math.cos(angle1) +
                    HEX_SPACING * j * Math.cos(angle2);
                const y = SPAWN_CENTER_Y +
                    HEX_SPACING * (ring - j) * Math.sin(angle1) +
                    HEX_SPACING * j * Math.sin(angle2);

                positions.push({ x, y, ring });
            }
        }
    }

    return positions;
}

const hexPositions = generateHexPositions();

// Find the nearest free hex position
function getSpawnPosition() {
    // Get all occupied positions from other players
    const occupiedPositions = new Set();
    others.forEach((player) => {
        // Find which hex position this player is closest to
        const nearestHex = findNearestHexIndex(player.x, player.y);
        if (nearestHex !== -1) {
            occupiedPositions.add(nearestHex);
        }
    });

    // Find first unoccupied position (they're already sorted by distance)
    for (let i = 0; i < hexPositions.length; i++) {
        if (!occupiedPositions.has(i)) {
            return { x: hexPositions[i].x, y: hexPositions[i].y };
        }
    }

    // Fallback if all positions taken (shouldn't happen with 10 rings)
    return { x: SPAWN_CENTER_X, y: SPAWN_CENTER_Y };
}

// Find which hex position index a coordinate is closest to
function findNearestHexIndex(x, y) {
    let nearestIndex = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < hexPositions.length; i++) {
        const dx = hexPositions[i].x - x;
        const dy = hexPositions[i].y - y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestIndex = i;
        }
    }

    // Only return if within reasonable distance of a hex position
    if (nearestDist < (HEX_SPACING * 0.5) ** 2) {
        return nearestIndex;
    }
    return -1;
}

// We'll get spawn position after connecting (need to know other players first)
let spawnPos = { x: SPAWN_CENTER_X, y: SPAWN_CENTER_Y };

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
    hat: 'none', // Current hat (session only, not saved)
    bubble: 'default', // Current bubble skin
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

// Hat definitions - each hat has unlock time in seconds
const HATS = {
    none: { name: 'None', icon: '🚫', unlockTime: 0 },
    tophat: { name: 'Top Hat', icon: '🎩', unlockTime: 0 },
    cowboy: { name: 'Cowboy', icon: '🤠', unlockTime: 300 }, // 5 minutes
    halo: { name: 'Halo', icon: '😇', unlockTime: 900 }, // 15 minutes
};

// Bubble skin definitions
const BUBBLES = {
    default: { name: 'Default', icon: '💬', unlockTime: 0 },
    chalk: { name: 'Chalk', icon: '✏️', unlockTime: 180 }, // 3 minutes
    night: { name: 'Night', icon: '🌙', unlockTime: 600 }, // 10 minutes
    golden: { name: 'Golden', icon: '✨', unlockTime: 1200 }, // 20 minutes
};


// Time tracking
let totalTimeSpent = parseInt(localStorage.getItem('lobbyTimeSpent') || '0');
let sessionStartTime = Date.now();

// Save time every 10 seconds
setInterval(() => {
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    const newTotal = totalTimeSpent + sessionTime;
    localStorage.setItem('lobbyTimeSpent', newTotal.toString());
    updateHatPickerUI();
    updateBubblePickerUI();
}, 10000);

// Save time on page unload
window.addEventListener('beforeunload', () => {
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    const newTotal = totalTimeSpent + sessionTime;
    localStorage.setItem('lobbyTimeSpent', newTotal.toString());
});

// Check if running on localhost (unlock everything for testing)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Check if a hat is unlocked
function isHatUnlocked(hatKey) {
    if (isLocalhost) return true; // Unlock all on localhost
    const hat = HATS[hatKey];
    if (!hat) return false;
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    const currentTotal = totalTimeSpent + sessionTime;
    return currentTotal >= hat.unlockTime;
}

// Check if a bubble is unlocked
function isBubbleUnlocked(bubbleKey) {
    if (isLocalhost) return true; // Unlock all on localhost
    const bubble = BUBBLES[bubbleKey];
    if (!bubble) return false;
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    const currentTotal = totalTimeSpent + sessionTime;
    return currentTotal >= bubble.unlockTime;
}


// Get current total time
function getCurrentTotalTime() {
    const sessionTime = Math.floor((Date.now() - sessionStartTime) / 1000);
    return totalTimeSpent + sessionTime;
}

// Format time as minutes
function formatTime(seconds) {
    const mins = Math.ceil(seconds / 60);
    return `${mins} min`;
}

// Update hat picker UI to show locked/unlocked state
function updateHatPickerUI() {
    document.querySelectorAll('.hat-option').forEach(btn => {
        const hatKey = btn.dataset.hat;
        const hat = HATS[hatKey];
        if (!hat) return;

        const unlocked = isHatUnlocked(hatKey);
        btn.classList.toggle('locked', !unlocked);

        if (!unlocked) {
            const timeNeeded = hat.unlockTime - getCurrentTotalTime();
            btn.title = `Unlocks in ${formatTime(timeNeeded)}`;
        } else {
            btn.title = hat.name;
        }
    });
}

// Update bubble picker UI to show locked/unlocked state
function updateBubblePickerUI() {
    document.querySelectorAll('.bubble-option').forEach(btn => {
        const bubbleKey = btn.dataset.bubble;
        const bubble = BUBBLES[bubbleKey];
        if (!bubble) return;

        const unlocked = isBubbleUnlocked(bubbleKey);
        btn.classList.toggle('locked', !unlocked);

        if (!unlocked) {
            const timeNeeded = bubble.unlockTime - getCurrentTotalTime();
            btn.title = `Unlocks in ${formatTime(timeNeeded)}`;
        } else {
            btn.title = bubble.name;
        }
    });
}


// Draw hat on character (called from drawCharacter, ctx already translated)
function drawHat(ctx, time, hat) {
    if (!hat || hat === 'none') return;

    ctx.save();

    if (hat === 'tophat') {
        // Classic black top hat
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        // Brim
        ctx.beginPath();
        ctx.ellipse(0, -28, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Cylinder
        ctx.fillRect(-12, -58, 24, 30);
        ctx.strokeRect(-12, -58, 24, 30);
        // Top
        ctx.beginPath();
        ctx.ellipse(0, -58, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Red ribbon
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-12, -35, 24, 5);

    } else if (hat === 'cowboy') {
        // Western cowboy hat
        ctx.fillStyle = '#92400e';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        // Wide brim
        ctx.beginPath();
        ctx.ellipse(0, -26, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Curved brim edges
        ctx.beginPath();
        ctx.moveTo(-28, -26);
        ctx.quadraticCurveTo(-30, -32, -24, -28);
        ctx.moveTo(28, -26);
        ctx.quadraticCurveTo(30, -32, 24, -28);
        ctx.stroke();
        // Crown
        ctx.beginPath();
        ctx.moveTo(-14, -26);
        ctx.quadraticCurveTo(-16, -42, -8, -45);
        ctx.lineTo(8, -45);
        ctx.quadraticCurveTo(16, -42, 14, -26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Indent on top
        ctx.beginPath();
        ctx.moveTo(-6, -45);
        ctx.quadraticCurveTo(0, -40, 6, -45);
        ctx.stroke();
        // Band
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-14, -32, 28, 4);

    } else if (hat === 'halo') {
        // Floating golden halo
        const float = Math.sin(time * 2) * 3;
        const glow = 0.5 + Math.sin(time * 3) * 0.2;
        // Glow effect
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = `rgba(251, 191, 36, ${glow})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(0, -45 + float, 18, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Solid halo
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -45 + float, 18, 5, 0, 0, Math.PI * 2);
        ctx.stroke();

    }

    ctx.restore();
}

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
function drawCharacter(x, y, isMe = false, bobOffset = 0, emote = null, hat = null) {
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

    // Draw hat on top
    drawHat(ctx, time, hat);

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
function drawSpeechBubble(x, y, message, opacity = 1, bubbleSkin = 'default') {
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

    // Skin-specific colors
    let bgColor = '#fff';
    let strokeColor = '#2d2d2d';
    let textColor = '#2d2d2d';
    let lineW = 2;

    if (bubbleSkin === 'chalk') {
        bgColor = '#faf8f5';
        strokeColor = '#6b7280';
        textColor = '#374151';
        lineW = 3;
    } else if (bubbleSkin === 'night') {
        bgColor = '#1f2937';
        strokeColor = '#4b5563';
        textColor = '#f3f4f6';
    } else if (bubbleSkin === 'golden') {
        bgColor = '#fffbeb';
        strokeColor = '#d97706';
        textColor = '#92400e';
        lineW = 3;
    }

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineW;

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
    ctx.fillStyle = bgColor;
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
    ctx.fillStyle = bgColor;
    ctx.fillRect(x - 7, bubbleY + bubbleHeight - 2, 14, 3);

    // Text - draw each line
    ctx.fillStyle = textColor;
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

    // Collect bubble data for drawing on top later
    const bubblesToDraw = [];

    // Draw all characters first
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

            // Calculate emote state
            if (player.emote && player.emoteTime) {
                const elapsed = now - player.emoteTime;
                if (elapsed > EMOTE_DURATION) {
                    player.emote = null;
                }
            }

            // Get active emote (if not expired)
            const activeEmote = player.emote && player.emoteTime && (now - player.emoteTime < EMOTE_DURATION) ? player.emote : null;

            drawCharacter(screenPos.x, screenPos.y, false, player.bobOffset || 0, activeEmote, player.hat);

            // Queue bubble for later if needed (independent of emote)
            if (player.message) {
                bubblesToDraw.push({ x: screenPos.x, y: screenPos.y, message: player.message, opacity: bubbleOpacity, bubble: player.bubble || 'default' });
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

    // Calculate my emote state
    if (me.emote && me.emoteTime) {
        const elapsed = now - me.emoteTime;
        if (elapsed > EMOTE_DURATION) {
            me.emote = null;
        }
    }

    // Get my active emote
    const myActiveEmote = me.emote && me.emoteTime && (now - me.emoteTime < EMOTE_DURATION) ? me.emote : null;

    drawCharacter(screenCenterX, screenCenterY, true, me.bobOffset, myActiveEmote, me.hat);

    // Queue my bubble for later if needed (independent of emote)
    if (me.message) {
        bubblesToDraw.push({ x: screenCenterX, y: screenCenterY, message: me.message, opacity: myBubbleOpacity, bubble: me.bubble });
    }

    // Now draw all speech bubbles on top
    for (const bubble of bubblesToDraw) {
        drawSpeechBubble(bubble.x, bubble.y, bubble.message, bubble.opacity, bubble.bubble);
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
                    hat: p.hat || 'none',
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
                hat: p.hat || 'none',
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

    // Handle broadcast hat changes
    channel.on('broadcast', { event: 'hat' }, ({ payload }) => {
        if (payload.id !== me.id) {
            const player = others.get(payload.id);
            if (player) {
                player.hat = payload.hat;
            }
        }
    });

    // Handle broadcast bubble changes
    channel.on('broadcast', { event: 'bubble' }, ({ payload }) => {
        if (payload.id !== me.id) {
            const player = others.get(payload.id);
            if (player) {
                player.bubble = payload.bubble;
            }
        }
    });

    // Subscribe and track presence
    await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            // Wait a moment for presence sync to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Now get spawn position based on who else is here
            const spawnPos = getSpawnPosition();
            me.x = spawnPos.x;
            me.y = spawnPos.y;

            // Track my presence at the hex position
            await channel.track({
                x: me.x,
                y: me.y,
                bobOffset: me.bobOffset,
                hat: me.hat,
                bubble: me.bubble,
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
    hatPicker.classList.remove('show');
});

// Hat picker handling
const hatBtn = document.getElementById('hat-btn');
const hatPicker = document.getElementById('hat-picker');

hatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateHatPickerUI(); // Update lock states when opening
    hatPicker.classList.toggle('show');
    emotePicker.classList.remove('show');
});

// Close emote picker when opening hat picker
emoteBtn.addEventListener('click', () => {
    hatPicker.classList.remove('show');
});

// Handle hat selection
function setHat(hat) {
    if (!HATS[hat]) return;
    if (!isHatUnlocked(hat)) return; // Can't use locked hats

    me.hat = hat;

    // Broadcast to others
    channel.send({
        type: 'broadcast',
        event: 'hat',
        payload: {
            id: me.id,
            hat: hat,
        }
    });

    // Update presence
    channel.track({
        x: me.x,
        y: me.y,
        bobOffset: me.bobOffset,
        hat: me.hat,
        bubble: me.bubble,
            });
}

document.querySelectorAll('.hat-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hat = btn.dataset.hat;
        setHat(hat);
        hatPicker.classList.remove('show');
    });
});

// Bubble picker handling
const bubbleBtn = document.getElementById('bubble-btn');
const bubblePicker = document.getElementById('bubble-picker');

if (bubbleBtn && bubblePicker) {
    bubbleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateBubblePickerUI(); // Update lock states when opening
        bubblePicker.classList.toggle('show');
        hatPicker.classList.remove('show');
        emotePicker.classList.remove('show');
    });

    // Handle bubble selection
    document.querySelectorAll('.bubble-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bubble = btn.dataset.bubble;
            setBubble(bubble);
            bubblePicker.classList.remove('show');
        });
    });
}

// Close bubble picker when clicking elsewhere
document.addEventListener('click', () => {
    if (bubblePicker) bubblePicker.classList.remove('show');
});

// Handle bubble selection
function setBubble(bubble) {
    if (!BUBBLES[bubble]) return;
    if (!isBubbleUnlocked(bubble)) return; // Can't use locked bubbles

    me.bubble = bubble;

    // Broadcast to others
    channel.send({
        type: 'broadcast',
        event: 'bubble',
        payload: {
            id: me.id,
            bubble: bubble,
        }
    });

    // Update presence
    channel.track({
        x: me.x,
        y: me.y,
        bobOffset: me.bobOffset,
        hat: me.hat,
        bubble: me.bubble,
            });
}

// Start everything
render();
connectToLobby();
updateHatPickerUI(); // Initialize hat lock states
updateBubblePickerUI(); // Initialize bubble lock states

// Cleanup on page close
window.addEventListener('beforeunload', () => {
    if (channel) {
        channel.untrack();
    }
});
