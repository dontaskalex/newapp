// Matter.js module aliases
const { Engine, Render, Runner, Bodies, Body, Composite, Events, Mouse, MouseConstraint } = Matter;

// Game constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 500;
const WALL_THICKNESS = 20;
const BALL_MIN_RADIUS = 18;
const BALL_RADIUS_SCALE = 4; // radius increase per absolute value
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
let currentBall = null;
let nextBalls = [];
let canDrop = true;
let gameOver = false;
let mouseX = CANVAS_WIDTH / 2;
let balls = []; // Track all balls in the game

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
        restitution: 0.3,
        friction: 0.1,
        frictionAir: 0.01,
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
    if (!canDrop || gameOver || !currentBall) return;

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

    // New merge count = max of both + 1
    const newMergeCount = Math.max(ballA.gameData.mergeCount, ballB.gameData.mergeCount) + 1;

    // Calculate merge position
    const mergeX = (ballA.position.x + ballB.position.x) / 2;
    const mergeY = (ballA.position.y + ballB.position.y) / 2;

    // Create particle effect
    createMergeEffect(mergeX, mergeY, ballA.gameData.color);

    // Remove old balls
    Composite.remove(engine.world, ballA);
    Composite.remove(engine.world, ballB);
    balls = balls.filter(b => b !== ballA && b !== ballB);

    // Check if result is zero - VANISH!
    if (newValue === 0) {
        // Big points for hitting zero! Multiplied by merge count!
        const basePoints = (Math.abs(valueA) + Math.abs(valueB)) * 50;
        const multiplier = Math.max(1, newMergeCount);
        const points = basePoints * multiplier;
        score += points;
        document.getElementById('score').textContent = score;

        const comboText = newMergeCount > 1
            ? `ZERO! ×${multiplier} = +${points}`
            : `ZERO! +${points}`;
        showCombo(comboText, mergeX, mergeY, '#fbbf24');
        createZeroEffect(mergeX, mergeY);
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

        // Show the new value and merge count
        const tierText = newMergeCount > 0 ? ` (tier ${newMergeCount})` : '';
        showCombo(`= ${newValue > 0 ? '+' : ''}${newValue}${tierText}`, mergeX, mergeY - 40, '#ffffff');
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

// Render numbers on balls
function renderBallNumbers() {
    const ctx = render.context;
    const time = Date.now() / 1000; // For rainbow animation

    for (const ball of balls) {
        if (ball.gameData && !ball.gameData.merging) {
            const pos = ball.position;
            const radius = ball.gameData.radius;

            ctx.save();
            ctx.translate(pos.x, pos.y);

            // Check if operator ball
            if (ball.gameData.isOperator) {
                // Draw rainbow gradient background
                const gradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
                const hueOffset = (time * 100) % 360;
                gradient.addColorStop(0, `hsl(${hueOffset}, 100%, 60%)`);
                gradient.addColorStop(0.25, `hsl(${(hueOffset + 90) % 360}, 100%, 60%)`);
                gradient.addColorStop(0.5, `hsl(${(hueOffset + 180) % 360}, 100%, 60%)`);
                gradient.addColorStop(0.75, `hsl(${(hueOffset + 270) % 360}, 100%, 60%)`);
                gradient.addColorStop(1, `hsl(${hueOffset}, 100%, 60%)`);

                ctx.beginPath();
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw operator symbol
                ctx.fillStyle = 'white';
                ctx.font = `bold ${radius * 0.9}px 'Segoe UI', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 4;

                const opSymbol = ball.gameData.operator === OPERATORS.MULTIPLY ? '×2' : '÷2';
                ctx.fillText(opSymbol, 0, 0);
            } else {
                // Regular number ball - just draw the number
                const value = ball.gameData.value;

                ctx.fillStyle = 'white';
                const fontSize = Math.max(12, radius * 0.7);
                ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 3;

                const text = value > 0 ? `+${value}` : `${value}`;
                ctx.fillText(text, 0, 0);
            }

            ctx.restore();
        }
    }
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
    gameOver = false;
    canDrop = true;
    document.getElementById('score').textContent = '0';
    document.getElementById('game-over').style.display = 'none';

    // Generate new balls
    nextBalls = [];
    for (let i = 0; i < 3; i++) {
        nextBalls.push(generateBallData());
    }
    currentBall = nextBalls.shift();
    nextBalls.push(generateBallData());

    updatePreviewBall();
    updateNextBallsDisplay();
}

// Start the game when page loads
window.addEventListener('load', init);
