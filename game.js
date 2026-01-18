// Matter.js module aliases
const { Engine, Render, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = Matter;

// Game constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const WALL_THICKNESS = 20;
const BALL_MIN_RADIUS = 20;
const BALL_RADIUS_SCALE = 6; // radius increase per absolute value
const DANGER_ZONE_HEIGHT = 60;
const DROP_COOLDOWN = 500; // ms between drops
const MAX_NUMBER = 10; // Numbers cap at ±10
const OPERATOR_CHANCE = 0.2; // 1 in 5 chance for operator ball

// Operator types
const OPERATORS = {
    MULTIPLY: 'multiply',
    DIVIDE: 'divide',
};

// Colors based on merge count (rainbow progression)
const MERGE_COLORS = [
    '#a1a1aa', // 0 - gray (fresh, never merged)
    '#4ade80', // 1 - green
    '#22d3ee', // 2 - cyan
    '#60a5fa', // 3 - blue
    '#a78bfa', // 4 - purple
    '#e879f9', // 5 - fuchsia
    '#f472b6', // 6 - pink
    '#fb7185', // 7 - rose
    '#f97316', // 8 - orange
    '#fbbf24', // 9 - gold
    '#fef08a', // 10+ - bright gold (legendary!)
];

// Game state
let engine, render, runner;
let score = 0;
let bestScore = parseInt(localStorage.getItem('mergeToZeroBest')) || 0;
let bestLevel = parseInt(localStorage.getItem('mergeToZeroBestLevel')) || 0;
let currentBall = null;
let nextBalls = [];
let canDrop = true;
let gameOver = false;
let mouseX = CANVAS_WIDTH / 2;
let balls = []; // Track all balls in the game

// Level system
let currentLevel = 0; // Level 0 = need to make Asteroid (tier 0) zero
const MAX_LEVEL = 10; // Singularity is the final level
let levelTransitioning = false; // Prevents actions during level transition

// Initialize the game
function init() {
    // Create engine
    engine = Engine.create();
    engine.gravity.y = 1;

    // Create renderer
    render = Render.create({
        canvas: document.getElementById('game-canvas'),
        engine: engine,
        options: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            wireframes: false,
            background: 'transparent',
        }
    });

    // Create walls
    const walls = [
        // Bottom
        Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + WALL_THICKNESS / 2, CANVAS_WIDTH, WALL_THICKNESS, {
            isStatic: true,
            render: { fillStyle: '#1a1a3e' },
            label: 'wall'
        }),
        // Left
        Bodies.rectangle(-WALL_THICKNESS / 2, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, {
            isStatic: true,
            render: { fillStyle: '#1a1a3e' },
            label: 'wall'
        }),
        // Right
        Bodies.rectangle(CANVAS_WIDTH + WALL_THICKNESS / 2, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, {
            isStatic: true,
            render: { fillStyle: '#1a1a3e' },
            label: 'wall'
        }),
    ];

    Composite.add(engine.world, walls);

    // Set up collision detection
    Events.on(engine, 'collisionStart', handleCollision);

    // Start the renderer and runner
    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // Generate initial balls
    for (let i = 0; i < 3; i++) {
        nextBalls.push(generateBallData());
    }
    currentBall = nextBalls.shift();
    nextBalls.push(generateBallData());

    // Update UI
    updatePreviewBall();
    updateNextBallsDisplay();
    document.getElementById('best-score').textContent = bestScore;
    updateLevelDisplay();
    updateTierLegend();

    // Set up mouse tracking
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('mousemove', (e) => {
        const rect = dropZone.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseX = Math.max(currentBall.radius, Math.min(CANVAS_WIDTH - currentBall.radius, mouseX));
        updatePreviewBall();
    });

    dropZone.addEventListener('click', dropBall);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            dropBall();
        }
    });

    // Custom rendering for numbers on balls
    Events.on(render, 'afterRender', renderBallNumbers);

    // Check for game over
    setInterval(checkGameOver, 500);
}

// Generate random ball data
function generateBallData() {
    // 1 in 5 chance for operator ball
    if (Math.random() < OPERATOR_CHANCE) {
        return createOperatorBallData();
    }

    const maxNum = 5; // Starting balls only go up to ±5
    let value = Math.floor(Math.random() * maxNum) + 1;
    if (Math.random() < 0.5) {
        value = -value;
    }

    return createBallData(value);
}

// Create operator ball data (×2 or ÷2)
function createOperatorBallData() {
    const isMultiply = Math.random() < 0.5;
    return {
        value: 2,
        operator: isMultiply ? OPERATORS.MULTIPLY : OPERATORS.DIVIDE,
        radius: 25, // Fixed medium size
        color: 'rainbow', // Special marker for rainbow rendering
        mergeCount: -1, // Special marker: can merge with any tier
        isOperator: true,
    };
}

// Create ball data from a value and merge count
function createBallData(value, mergeCount = 0) {
    const absValue = Math.abs(value);
    const radius = mapValueToRadius(absValue);
    const color = getColorForMergeCount(mergeCount);

    return { value, radius, color, mergeCount, isOperator: false };
}

// Get color based on merge count (rainbow progression)
function getColorForMergeCount(mergeCount) {
    const index = Math.min(mergeCount, MERGE_COLORS.length - 1);
    return MERGE_COLORS[index];
}

// Map number value to ball radius
function mapValueToRadius(absValue) {
    return BALL_MIN_RADIUS + (Math.min(absValue, MAX_NUMBER) - 1) * BALL_RADIUS_SCALE;
}

// Create a physics ball from ball data
function createBall(ballData, x, y) {
    const ball = Bodies.circle(x, y, ballData.radius, {
        restitution: 0.85, // Super bouncy like flubber!
        friction: 0.05,
        frictionAir: 0.005,
        render: {
            fillStyle: ballData.isOperator ? '#ffffff' : ballData.color,
        },
        label: 'ball',
    });

    ball.gameData = {
        value: ballData.value,
        radius: ballData.radius,
        color: ballData.color,
        mergeCount: ballData.mergeCount !== undefined ? ballData.mergeCount : 0,
        merging: false,
        isNew: true, // Mark as newly dropped
        isOperator: ballData.isOperator || false,
        operator: ballData.operator || null,
    };

    balls.push(ball);

    // After a short time, mark as not new (so it can merge with subsequent drops)
    setTimeout(() => {
        if (ball.gameData) {
            ball.gameData.isNew = false;
        }
    }, 100);

    return ball;
}

// Drop the current ball
function dropBall() {
    if (!canDrop || gameOver || levelTransitioning || !currentBall) return;

    canDrop = false;

    const ball = createBall(currentBall, mouseX, -currentBall.radius);
    Composite.add(engine.world, ball);

    // Get next ball
    currentBall = nextBalls.shift();
    nextBalls.push(generateBallData());

    updatePreviewBall();
    updateNextBallsDisplay();

    // Cooldown before next drop
    setTimeout(() => {
        canDrop = true;
    }, DROP_COOLDOWN);
}

// Handle collisions between balls
function handleCollision(event) {
    const pairs = event.pairs;

    for (const pair of pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Skip if either is a wall or particle
        if (bodyA.label === 'wall' || bodyB.label === 'wall') continue;
        if (bodyA.label === 'particle' || bodyB.label === 'particle') continue;

        // Skip if either is already merging
        if (bodyA.gameData?.merging || bodyB.gameData?.merging) continue;

        // Check if both are balls with game data
        if (bodyA.gameData && bodyB.gameData) {
            const isOperatorA = bodyA.gameData.isOperator;
            const isOperatorB = bodyB.gameData.isOperator;

            // Two operators can't merge with each other
            if (isOperatorA && isOperatorB) continue;

            // Operator ball can merge with ANY number ball
            if (isOperatorA || isOperatorB) {
                mergeWithOperator(bodyA, bodyB);
            }
            // Regular balls: only merge if same tier
            else if (bodyA.gameData.mergeCount === bodyB.gameData.mergeCount) {
                mergeBalls(bodyA, bodyB);
            }
        }
    }
}

// Merge operator ball with number ball
function mergeWithOperator(ballA, ballB) {
    // Determine which is operator and which is number
    const operatorBall = ballA.gameData.isOperator ? ballA : ballB;
    const numberBall = ballA.gameData.isOperator ? ballB : ballA;

    // Mark as merging
    operatorBall.gameData.merging = true;
    numberBall.gameData.merging = true;

    const operator = operatorBall.gameData.operator;
    const operatorValue = operatorBall.gameData.value;
    const oldValue = numberBall.gameData.value;
    let newValue;

    // Apply operation
    if (operator === OPERATORS.MULTIPLY) {
        newValue = oldValue * operatorValue;
    } else {
        // Division - round toward zero
        newValue = Math.trunc(oldValue / operatorValue);
    }

    // Cap the value
    if (newValue > MAX_NUMBER) newValue = MAX_NUMBER;
    if (newValue < -MAX_NUMBER) newValue = -MAX_NUMBER;

    // Calculate merge position
    const mergeX = (ballA.position.x + ballB.position.x) / 2;
    const mergeY = (ballA.position.y + ballB.position.y) / 2;

    // Create particle effect (rainbow burst for operator)
    createOperatorMergeEffect(mergeX, mergeY);

    // Remove old balls
    Composite.remove(engine.world, operatorBall);
    Composite.remove(engine.world, numberBall);
    balls = balls.filter(b => b !== operatorBall && b !== numberBall);

    // Check if result is zero
    if (newValue === 0) {
        const basePoints = Math.abs(oldValue) * 100;
        const multiplier = Math.max(1, numberBall.gameData.mergeCount + 1);
        const points = basePoints * multiplier;
        score += points;
        document.getElementById('score').textContent = score;

        const opSymbol = operator === OPERATORS.MULTIPLY ? '×' : '÷';
        showCombo(`${opSymbol}${operatorValue} = ZERO! +${points}`, mergeX, mergeY, '#fbbf24');
        createZeroEffect(mergeX, mergeY);
    } else {
        // Create new ball - keeps the same merge count (operator doesn't increase tier)
        const newBallData = createBallData(newValue, numberBall.gameData.mergeCount);
        const newBall = createBall(newBallData, mergeX, mergeY);
        newBall.gameData.isNew = false;
        Composite.add(engine.world, newBall);

        // Points for operator use
        const points = 25;
        score += points;
        document.getElementById('score').textContent = score;

        const opSymbol = operator === OPERATORS.MULTIPLY ? '×' : '÷';
        showCombo(`${oldValue} ${opSymbol} ${operatorValue} = ${newValue > 0 ? '+' : ''}${newValue}`, mergeX, mergeY - 40, '#ffffff');
    }
}

// Merge two balls - ALWAYS combines them
function mergeBalls(ballA, ballB) {
    // Mark as merging to prevent double merges
    ballA.gameData.merging = true;
    ballB.gameData.merging = true;

    const valueA = ballA.gameData.value;
    const valueB = ballB.gameData.value;
    const newValue = valueA + valueB;

    // New merge count = max of both + 1, but capped at current level
    let newMergeCount = Math.max(ballA.gameData.mergeCount, ballB.gameData.mergeCount) + 1;

    // Cap tier at current level (can't go beyond unlocked tiers)
    if (newMergeCount > currentLevel) {
        newMergeCount = currentLevel;
    }

    // Calculate merge position
    const mergeX = (ballA.position.x + ballB.position.x) / 2;
    const mergeY = (ballA.position.y + ballB.position.y) / 2;

    // Create particle effect
    createMergeEffect(mergeX, mergeY, ballA.gameData.color);

    // Remove old balls
    Composite.remove(engine.world, ballA);
    Composite.remove(engine.world, ballB);
    balls = balls.filter(b => b !== ballA && b !== ballB);

    // The tier that would result from this merge (before capping)
    const resultingTier = Math.max(ballA.gameData.mergeCount, ballB.gameData.mergeCount) + 1;

    // Check if result is zero - VANISH!
    if (newValue === 0) {
        // Big points for hitting zero! Multiplied by merge count!
        const basePoints = (Math.abs(valueA) + Math.abs(valueB)) * 50;
        const multiplier = Math.max(1, resultingTier);
        const points = basePoints * multiplier;
        score += points;
        document.getElementById('score').textContent = score;

        const tierName = TIER_STYLES[Math.min(resultingTier, TIER_STYLES.length - 1)].name;
        const comboText = `${tierName} ZERO! +${points}`;
        showCombo(comboText, mergeX, mergeY, '#fbbf24');
        createZeroEffect(mergeX, mergeY);

        // Check if this zero matches the target tier for level completion
        // The tier of the zero = the tier that WOULD result (resultingTier)
        // But we check against the tier of the balls being merged
        const zeroTier = Math.max(ballA.gameData.mergeCount, ballB.gameData.mergeCount);
        if (zeroTier === currentLevel && !levelTransitioning) {
            // Level complete! Made a zero at the target tier
            triggerLevelComplete(mergeX, mergeY);
        }
    } else {
        // Create new merged ball with increased merge count
        const newBallData = createBallData(newValue, newMergeCount);
        const newBall = createBall(newBallData, mergeX, mergeY);
        newBall.gameData.isNew = false; // Can merge immediately
        Composite.add(engine.world, newBall);

        // Small points for any merge (also scaled by merge count)
        const points = 10 * Math.max(1, newMergeCount);
        score += points;
        document.getElementById('score').textContent = score;

        // Show the new value and tier name
        const tierName = TIER_STYLES[Math.min(newMergeCount, TIER_STYLES.length - 1)].name;
        showCombo(`= ${newValue > 0 ? '+' : ''}${newValue} (${tierName})`, mergeX, mergeY - 40, '#ffffff');
    }
}

// Show combo/info text
function showCombo(text, x, y, color = '#fbbf24') {
    const comboDisplay = document.getElementById('combo-display');
    comboDisplay.textContent = text;
    comboDisplay.style.color = color;
    comboDisplay.classList.add('show');

    setTimeout(() => {
        comboDisplay.classList.remove('show');
    }, 600);
}

// Create visual effect when balls merge
function createMergeEffect(x, y, color) {
    // Create temporary particles
    for (let i = 0; i < 6; i++) {
        const particle = Bodies.circle(x, y, 4, {
            render: { fillStyle: color },
            frictionAir: 0.08,
            label: 'particle',
            collisionFilter: { mask: 0 }, // Don't collide with anything
        });

        // Give random velocity
        Body.setVelocity(particle, {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10 - 3,
        });

        Composite.add(engine.world, particle);

        // Remove after short time
        setTimeout(() => {
            Composite.remove(engine.world, particle);
        }, 250);
    }
}

// Special effect when hitting exactly zero
function createZeroEffect(x, y) {
    // Create a ring of particles
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const particle = Bodies.circle(x, y, 6, {
            render: { fillStyle: '#fbbf24' },
            frictionAir: 0.03,
            label: 'particle',
            collisionFilter: { mask: 0 },
        });

        Body.setVelocity(particle, {
            x: Math.cos(angle) * 12,
            y: Math.sin(angle) * 12,
        });

        Composite.add(engine.world, particle);

        setTimeout(() => {
            Composite.remove(engine.world, particle);
        }, 400);
    }
}

// Rainbow effect for operator ball merges
function createOperatorMergeEffect(x, y) {
    const rainbowColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'];
    for (let i = 0; i < 10; i++) {
        const particle = Bodies.circle(x, y, 5, {
            render: { fillStyle: rainbowColors[i % rainbowColors.length] },
            frictionAir: 0.05,
            label: 'particle',
            collisionFilter: { mask: 0 },
        });

        const angle = (i / 10) * Math.PI * 2;
        Body.setVelocity(particle, {
            x: Math.cos(angle) * 8,
            y: Math.sin(angle) * 8 - 2,
        });

        Composite.add(engine.world, particle);

        setTimeout(() => {
            Composite.remove(engine.world, particle);
        }, 350);
    }
}

// Trigger level complete sequence
function triggerLevelComplete(x, y) {
    levelTransitioning = true;
    canDrop = false;

    const tierName = TIER_STYLES[currentLevel].name;
    const tierColor = TIER_STYLES[currentLevel].baseColor;

    // Show level complete message
    showLevelComplete(tierName);

    // Animate all balls being sucked to center
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Apply force toward center for all balls
    const suckInterval = setInterval(() => {
        for (const ball of balls) {
            if (ball.gameData && !ball.gameData.merging) {
                const dx = centerX - ball.position.x;
                const dy = centerY - ball.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 10) {
                    Body.applyForce(ball, ball.position, {
                        x: dx * 0.001,
                        y: dy * 0.001,
                    });
                }
            }
        }
    }, 16);

    // After animation, clear board and advance level
    setTimeout(() => {
        clearInterval(suckInterval);

        // Create explosion effect at center
        createLevelCompleteEffect(centerX, centerY, tierColor);

        // Remove all balls
        for (const ball of balls) {
            Composite.remove(engine.world, ball);
        }
        balls = [];

        // Advance to next level
        currentLevel++;

        // Update best level
        if (currentLevel > bestLevel) {
            bestLevel = currentLevel;
            localStorage.setItem('mergeToZeroBestLevel', bestLevel);
        }

        // Check for game victory
        if (currentLevel > MAX_LEVEL) {
            showVictory();
            return;
        }

        // Update UI
        updateLevelDisplay();
        updateTierLegend();

        // Generate fresh balls for next level
        nextBalls = [];
        for (let i = 0; i < 3; i++) {
            nextBalls.push(generateBallData());
        }
        currentBall = nextBalls.shift();
        nextBalls.push(generateBallData());

        updatePreviewBall();
        updateNextBallsDisplay();

        // Resume game
        levelTransitioning = false;
        canDrop = true;
    }, 1500);
}

// Show level complete overlay
function showLevelComplete(tierName) {
    const overlay = document.getElementById('level-complete');
    const tierNameEl = document.getElementById('level-tier-name');
    const nextTierEl = document.getElementById('next-tier-name');

    tierNameEl.textContent = tierName;

    if (currentLevel + 1 <= MAX_LEVEL) {
        const nextTierName = TIER_STYLES[currentLevel + 1].name;
        nextTierEl.textContent = nextTierName;
        document.getElementById('next-tier-label').style.display = 'block';
    } else {
        document.getElementById('next-tier-label').style.display = 'none';
    }

    overlay.style.display = 'flex';

    setTimeout(() => {
        overlay.style.display = 'none';
    }, 1400);
}

// Create level complete explosion effect
function createLevelCompleteEffect(x, y, color) {
    // Big burst of particles
    for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const particle = Bodies.circle(x, y, 8, {
            render: { fillStyle: color },
            frictionAir: 0.02,
            label: 'particle',
            collisionFilter: { mask: 0 },
        });

        Body.setVelocity(particle, {
            x: Math.cos(angle) * 20,
            y: Math.sin(angle) * 20,
        });

        Composite.add(engine.world, particle);

        setTimeout(() => {
            Composite.remove(engine.world, particle);
        }, 600);
    }

    // Inner white burst
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const particle = Bodies.circle(x, y, 5, {
            render: { fillStyle: '#ffffff' },
            frictionAir: 0.03,
            label: 'particle',
            collisionFilter: { mask: 0 },
        });

        Body.setVelocity(particle, {
            x: Math.cos(angle) * 15,
            y: Math.sin(angle) * 15,
        });

        Composite.add(engine.world, particle);

        setTimeout(() => {
            Composite.remove(engine.world, particle);
        }, 500);
    }
}

// Show victory screen
function showVictory() {
    gameOver = true;
    document.getElementById('victory-screen').style.display = 'block';
    document.getElementById('victory-score').textContent = score;
}

// Update the level display UI
function updateLevelDisplay() {
    const levelEl = document.getElementById('current-level');
    const goalEl = document.getElementById('level-goal');

    if (levelEl) {
        levelEl.textContent = currentLevel;
    }

    if (goalEl && currentLevel <= MAX_LEVEL) {
        const targetTierName = TIER_STYLES[currentLevel].name;
        goalEl.textContent = `Make ${targetTierName} Zero!`;
        goalEl.style.color = TIER_STYLES[currentLevel].baseColor;
    }
}

// Update tier legend to show locked/unlocked
function updateTierLegend() {
    const tierItems = document.querySelectorAll('.tier-item:not(.special)');
    tierItems.forEach((item, index) => {
        if (index > currentLevel) {
            item.classList.add('locked');
        } else if (index === currentLevel) {
            item.classList.add('target');
            item.classList.remove('locked');
        } else {
            item.classList.remove('locked', 'target');
        }
    });
}

// Tier visual styles - each tier has a unique celestial appearance
const TIER_STYLES = [
    // Tier 0: Asteroid - rough, rocky, ancient space debris
    {
        name: 'Asteroid',
        baseColor: '#78716c',
        gradient: ['#a8a29e', '#78716c', '#57534e'],
        glow: null,
        pattern: 'asteroid',
        innerGlow: '#44403c',
        accentColor: '#292524',
        symbol: '◆',
        borderStyle: 'rough',
    },
    // Tier 1: Terra - lush living world with atmosphere
    {
        name: 'Terra',
        baseColor: '#10b981',
        gradient: ['#6ee7b7', '#34d399', '#10b981'],
        glow: 'rgba(16, 185, 129, 0.5)',
        pattern: 'terra',
        innerGlow: '#059669',
        accentColor: '#3b82f6',
        symbol: '🌍',
        borderStyle: 'atmosphere',
    },
    // Tier 2: Cryo - frozen crystalline world
    {
        name: 'Cryo',
        baseColor: '#22d3ee',
        gradient: ['#a5f3fc', '#67e8f9', '#22d3ee'],
        glow: 'rgba(34, 211, 238, 0.6)',
        pattern: 'cryo',
        innerGlow: '#06b6d4',
        accentColor: '#ffffff',
        symbol: '❄',
        borderStyle: 'crystal',
    },
    // Tier 3: Oceanus - deep mysterious water world
    {
        name: 'Oceanus',
        baseColor: '#3b82f6',
        gradient: ['#93c5fd', '#60a5fa', '#2563eb'],
        glow: 'rgba(59, 130, 246, 0.5)',
        pattern: 'oceanus',
        innerGlow: '#1d4ed8',
        accentColor: '#bfdbfe',
        symbol: '🌊',
        borderStyle: 'wave',
    },
    // Tier 4: Nebula - cosmic gas cloud with star nurseries
    {
        name: 'Nebula',
        baseColor: '#a855f7',
        gradient: ['#e9d5ff', '#c084fc', '#9333ea'],
        glow: 'rgba(168, 85, 247, 0.6)',
        pattern: 'nebula',
        innerGlow: '#7c3aed',
        accentColor: '#f472b6',
        symbol: '☁',
        borderStyle: 'cloud',
    },
    // Tier 5: Plasma - pure energy manifestation
    {
        name: 'Plasma',
        baseColor: '#ec4899',
        gradient: ['#fbcfe8', '#f472b6', '#db2777'],
        glow: 'rgba(236, 72, 153, 0.7)',
        pattern: 'plasma',
        innerGlow: '#be185d',
        accentColor: '#fdf4ff',
        symbol: '⚡',
        borderStyle: 'electric',
    },
    // Tier 6: Binary - twin star system dancing together
    {
        name: 'Binary',
        baseColor: '#f43f5e',
        gradient: ['#fecdd3', '#fb7185', '#e11d48'],
        glow: 'rgba(244, 63, 94, 0.6)',
        pattern: 'binary',
        innerGlow: '#be123c',
        accentColor: '#fbbf24',
        symbol: '✧✧',
        borderStyle: 'dual',
    },
    // Tier 7: Giant - massive red giant star
    {
        name: 'Giant',
        baseColor: '#ef4444',
        gradient: ['#fca5a5', '#f87171', '#dc2626'],
        glow: 'rgba(239, 68, 68, 0.7)',
        pattern: 'giant',
        innerGlow: '#b91c1c',
        accentColor: '#fde047',
        symbol: '★',
        borderStyle: 'flame',
    },
    // Tier 8: Nova - explosive supernova remnant
    {
        name: 'Nova',
        baseColor: '#f97316',
        gradient: ['#fed7aa', '#fb923c', '#ea580c'],
        glow: 'rgba(249, 115, 22, 0.8)',
        pattern: 'nova',
        innerGlow: '#c2410c',
        accentColor: '#fef08a',
        symbol: '✸',
        borderStyle: 'explosion',
    },
    // Tier 9: Pulsar - rapidly spinning neutron star
    {
        name: 'Pulsar',
        baseColor: '#eab308',
        gradient: ['#fef9c3', '#fde047', '#ca8a04'],
        glow: 'rgba(234, 179, 8, 0.8)',
        pattern: 'pulsar',
        innerGlow: '#a16207',
        accentColor: '#ffffff',
        symbol: '✦',
        borderStyle: 'beam',
    },
    // Tier 10+: Singularity - cosmic black hole with event horizon
    {
        name: 'Singularity',
        baseColor: '#fef08a',
        gradient: ['#ffffff', '#fef08a', '#facc15'],
        glow: 'rgba(254, 240, 138, 1)',
        pattern: 'singularity',
        innerGlow: '#000000',
        accentColor: '#a855f7',
        symbol: '◉',
        borderStyle: 'warp',
    },
];

// Render numbers on balls with unique tier visuals
function renderBallNumbers() {
    const ctx = render.context;
    const time = Date.now() / 1000;

    for (const ball of balls) {
        if (ball.gameData && !ball.gameData.merging) {
            const pos = ball.position;
            const radius = ball.gameData.radius;

            ctx.save();
            ctx.translate(pos.x, pos.y);

            if (ball.gameData.isOperator) {
                renderOperatorBall(ctx, radius, time, ball.gameData.operator);
            } else {
                const mergeCount = ball.gameData.mergeCount;
                const tierIndex = Math.min(mergeCount, TIER_STYLES.length - 1);
                const style = TIER_STYLES[tierIndex];

                renderTierBall(ctx, radius, style, time, mergeCount);

                // Draw the number on top
                const value = ball.gameData.value;
                ctx.fillStyle = 'white';
                const fontSize = Math.max(14, radius * 0.65);
                ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 4;
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 3;
                const text = value > 0 ? `+${value}` : `${value}`;
                ctx.strokeText(text, 0, 0);
                ctx.fillText(text, 0, 0);
            }

            ctx.restore();
        }
    }
}

// Render operator ball with rainbow effect
function renderOperatorBall(ctx, radius, time, operator) {
    const hueOffset = (time * 100) % 360;

    // Outer glow
    ctx.shadowColor = `hsl(${hueOffset}, 100%, 60%)`;
    ctx.shadowBlur = 15;

    // Rainbow gradient
    const gradient = ctx.createConicGradient(time * 2, 0, 0);
    for (let i = 0; i <= 6; i++) {
        gradient.addColorStop(i / 6, `hsl(${(hueOffset + i * 60) % 360}, 100%, 60%)`);
    }

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Sparkle overlay
    ctx.globalCompositeOperation = 'overlay';
    const sparkleGradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    sparkleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    sparkleGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    sparkleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sparkleGradient;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Draw operator symbol
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = 'white';
    ctx.font = `bold ${radius * 0.85}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const opSymbol = operator === OPERATORS.MULTIPLY ? '×2' : '÷2';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(opSymbol, 0, 0);
    ctx.fillText(opSymbol, 0, 0);
}

// Render a tier-specific ball
function renderTierBall(ctx, radius, style, time, tier) {
    // Outer glow effect
    if (style.glow) {
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = 12 + Math.sin(time * 3) * 4;
    }

    // Base circle with gradient
    const baseGradient = ctx.createRadialGradient(
        -radius * 0.3, -radius * 0.3, 0,
        0, 0, radius
    );
    baseGradient.addColorStop(0, style.gradient[0]);
    baseGradient.addColorStop(0.5, style.gradient[1]);
    baseGradient.addColorStop(1, style.gradient[2]);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = baseGradient;
    ctx.fill();

    // Draw tier-specific pattern
    ctx.shadowBlur = 0;
    drawTierPattern(ctx, radius, style.pattern, time, style, tier);

    // Highlight/shine
    ctx.globalCompositeOperation = 'overlay';
    const shineGradient = ctx.createRadialGradient(
        -radius * 0.4, -radius * 0.4, 0,
        -radius * 0.2, -radius * 0.2, radius * 0.8
    );
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    shineGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = shineGradient;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

// Draw unique pattern for each tier
function drawTierPattern(ctx, radius, pattern, time, style, tier) {
    ctx.save();

    switch (pattern) {
        case 'craters':
            // Asteroid craters
            ctx.fillStyle = style.innerGlow;
            const craterPositions = [
                { x: 0.3, y: -0.2, r: 0.15 },
                { x: -0.4, y: 0.3, r: 0.2 },
                { x: 0.1, y: 0.4, r: 0.12 },
                { x: -0.2, y: -0.35, r: 0.1 },
            ];
            craterPositions.forEach(c => {
                ctx.beginPath();
                ctx.arc(c.x * radius, c.y * radius, c.r * radius, 0, Math.PI * 2);
                ctx.fill();
            });
            break;

        case 'continents':
            // Organic landmass shapes
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.ellipse(radius * 0.2, -radius * 0.1, radius * 0.35, radius * 0.25, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-radius * 0.3, radius * 0.25, radius * 0.25, radius * 0.2, -0.3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'crystals':
            // Ice crystal lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + time * 0.5;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * radius * 0.7, Math.sin(angle) * radius * 0.7);
                ctx.stroke();
                // Crystal tips
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * radius * 0.5, Math.sin(angle) * radius * 0.5);
                ctx.lineTo(Math.cos(angle + 0.3) * radius * 0.7, Math.sin(angle + 0.3) * radius * 0.7);
                ctx.lineTo(Math.cos(angle - 0.3) * radius * 0.7, Math.sin(angle - 0.3) * radius * 0.7);
                ctx.closePath();
                ctx.stroke();
            }
            break;

        case 'waves':
            // Ocean wave lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                for (let x = -radius; x <= radius; x += 2) {
                    const y = i * radius * 0.25 + Math.sin(x * 0.15 + time * 3) * 4;
                    if (x === -radius) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            break;

        case 'swirl':
            // Nebula spiral
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let t = 0; t < Math.PI * 4; t += 0.1) {
                const r = (t / (Math.PI * 4)) * radius * 0.8;
                const x = Math.cos(t + time) * r;
                const y = Math.sin(t + time) * r;
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            // Secondary spiral
            ctx.strokeStyle = 'rgba(196, 181, 253, 0.4)';
            ctx.beginPath();
            for (let t = 0; t < Math.PI * 4; t += 0.1) {
                const r = (t / (Math.PI * 4)) * radius * 0.8;
                const x = Math.cos(t + time + Math.PI) * r;
                const y = Math.sin(t + time + Math.PI) * r;
                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            break;

        case 'electric':
            // Electric plasma arcs
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const startAngle = (i / 5) * Math.PI * 2 + time * 2;
                ctx.beginPath();
                let x = Math.cos(startAngle) * radius * 0.3;
                let y = Math.sin(startAngle) * radius * 0.3;
                ctx.moveTo(x, y);
                for (let j = 0; j < 4; j++) {
                    x += (Math.random() - 0.5) * radius * 0.3;
                    y += (Math.random() - 0.5) * radius * 0.3;
                    const dist = Math.sqrt(x * x + y * y);
                    if (dist > radius * 0.85) {
                        x *= (radius * 0.85) / dist;
                        y *= (radius * 0.85) / dist;
                    }
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            break;

        case 'binary':
            // Twin star cores
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            const orbitRadius = radius * 0.3;
            const angle1 = time * 2;
            const angle2 = time * 2 + Math.PI;
            ctx.beginPath();
            ctx.arc(Math.cos(angle1) * orbitRadius, Math.sin(angle1) * orbitRadius, radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(Math.cos(angle2) * orbitRadius, Math.sin(angle2) * orbitRadius, radius * 0.15, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'pulse':
            // Pulsing rings
            const pulsePhase = (time * 2) % 1;
            for (let i = 0; i < 3; i++) {
                const phase = (pulsePhase + i * 0.33) % 1;
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * (1 - phase)})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, radius * 0.3 + radius * 0.6 * phase, 0, Math.PI * 2);
                ctx.stroke();
            }
            break;

        case 'rings':
            // Supernova explosion rings
            ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
            ctx.lineWidth = 3;
            for (let i = 1; i <= 3; i++) {
                const ringRadius = radius * (0.4 + i * 0.2) + Math.sin(time * 4 + i) * 3;
                ctx.beginPath();
                ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            // Core
            const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.4);
            coreGradient.addColorStop(0, '#fff');
            coreGradient.addColorStop(0.5, '#fde047');
            coreGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'beams':
            // Pulsar light beams
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let i = 0; i < 2; i++) {
                const beamAngle = time * 3 + i * Math.PI;
                ctx.save();
                ctx.rotate(beamAngle);
                ctx.beginPath();
                ctx.moveTo(0, -radius * 0.2);
                ctx.lineTo(radius * 0.15, -radius * 1.2);
                ctx.lineTo(-radius * 0.15, -radius * 1.2);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(0, radius * 0.2);
                ctx.lineTo(radius * 0.15, radius * 1.2);
                ctx.lineTo(-radius * 0.15, radius * 1.2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            // Bright core
            const pulsarCore = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.3);
            pulsarCore.addColorStop(0, '#fff');
            pulsarCore.addColorStop(1, 'transparent');
            ctx.fillStyle = pulsarCore;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'singularity':
            // Black hole with accretion disk
            // Accretion disk
            ctx.save();
            ctx.rotate(time * 0.5);
            const diskGradient = ctx.createConicGradient(0, 0, 0);
            diskGradient.addColorStop(0, '#fef08a');
            diskGradient.addColorStop(0.25, '#f97316');
            diskGradient.addColorStop(0.5, '#fef08a');
            diskGradient.addColorStop(0.75, '#f97316');
            diskGradient.addColorStop(1, '#fef08a');
            ctx.fillStyle = diskGradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.95, radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Event horizon (black center)
            const eventHorizon = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.5);
            eventHorizon.addColorStop(0, '#000');
            eventHorizon.addColorStop(0.7, '#000');
            eventHorizon.addColorStop(1, 'transparent');
            ctx.fillStyle = eventHorizon;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Gravitational lensing ring
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
            ctx.stroke();
            break;
    }

    ctx.restore();
}

// Update the preview ball in the drop zone
function updatePreviewBall() {
    if (!currentBall) return;

    const preview = document.getElementById('preview-ball');
    preview.style.width = `${currentBall.radius * 2}px`;
    preview.style.height = `${currentBall.radius * 2}px`;
    preview.style.left = `${mouseX - currentBall.radius}px`;

    if (currentBall.isOperator) {
        // Rainbow gradient for operator preview
        preview.style.background = 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)';
        preview.textContent = currentBall.operator === OPERATORS.MULTIPLY ? '×2' : '÷2';
    } else {
        preview.style.background = currentBall.color;
        preview.textContent = currentBall.value > 0 ? `+${currentBall.value}` : currentBall.value;
    }
}

// Update the next balls display
function updateNextBallsDisplay() {
    const container = document.getElementById('next-balls');
    container.innerHTML = '';

    for (const ballData of nextBalls) {
        const div = document.createElement('div');
        div.className = 'next-ball';

        if (ballData.isOperator) {
            div.style.background = 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)';
            div.textContent = ballData.operator === OPERATORS.MULTIPLY ? '×2' : '÷2';
            div.style.fontSize = '12px';
        } else {
            div.style.backgroundColor = ballData.color;
            div.textContent = ballData.value > 0 ? `+${ballData.value}` : ballData.value;
        }

        container.appendChild(div);
    }
}

// Check if game is over (balls in danger zone)
function checkGameOver() {
    if (gameOver) return;

    for (const ball of balls) {
        if (ball.gameData && !ball.gameData.merging) {
            // Check if ball is in danger zone and has settled (low velocity)
            if (ball.position.y < DANGER_ZONE_HEIGHT &&
                Math.abs(ball.velocity.y) < 0.5 &&
                ball.position.y > 0) {
                endGame();
                return;
            }
        }
    }
}

// End the game
function endGame() {
    gameOver = true;
    canDrop = false;

    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('mergeToZeroBest', bestScore);
        document.getElementById('best-score').textContent = bestScore;
    }

    // Show game over screen
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').style.display = 'block';
}

// Restart the game
function restartGame() {
    // Clear all balls
    for (const ball of balls) {
        Composite.remove(engine.world, ball);
    }
    balls = [];

    // Reset state
    score = 0;
    currentLevel = 0;
    levelTransitioning = false;
    gameOver = false;
    canDrop = true;
    document.getElementById('score').textContent = '0';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';

    // Generate new balls
    nextBalls = [];
    for (let i = 0; i < 3; i++) {
        nextBalls.push(generateBallData());
    }
    currentBall = nextBalls.shift();
    nextBalls.push(generateBallData());

    updatePreviewBall();
    updateNextBallsDisplay();
    updateLevelDisplay();
    updateTierLegend();
}

// Toggle tier legend visibility
function toggleTierLegend() {
    const legend = document.getElementById('tier-legend');
    const toggle = legend.querySelector('.tier-legend-toggle');
    legend.classList.toggle('collapsed');
    toggle.textContent = legend.classList.contains('collapsed') ? '▶' : '◀';
}

// Start the game when page loads
window.addEventListener('load', init);
