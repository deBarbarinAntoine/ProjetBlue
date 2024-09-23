let score = 0;
let gameRunning = false;
let difficulty = 1;
let targetInterval;

// Sound effects
const hitSounds = [
    new Audio('/static/sound_mp3/enemy_hurt1.mp3'),
    new Audio('/static/sound_mp3/enemy_hurt2.mp3'),
    new Audio('/static/sound_mp3/enemy_hurt3.mp3')
];
const missSound = new Audio('/static/sound_mp3/enemy_missed.mp3');
const allyHitSound = new Audio('/static/sound_mp3/ally_shot.mp3');
const gameStartSound = new Audio('/static/sound_mp3/game_start.mp3');
const playerShotSound = new Audio('/static/sound_mp3/player_gun_shot.mp3');

// Initialize UI elements
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score');
const messageElement = document.getElementById('message');

// Event listeners
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);

function startGame() {
    score = 0; // Reset score
    difficulty = 1; // Reset difficulty
    gameRunning = true;
    gameArea.innerHTML = ''; // Clear the area for new targets
    updateScore();

    // Play the game start sound
    gameStartSound.currentTime = 0; // Reset sound to play from the start
    gameStartSound.play();

    targetInterval = setInterval(() => {
        if (!gameRunning) return;
        spawnTargets();
    }, 3000 / difficulty); // Spawn targets faster as difficulty increases

    // Set a timer to increase difficulty every 9 seconds
    setInterval(() => {
        if (gameRunning) {
            difficulty += 1; // Increase difficulty over time
        }
    }, 9000);

    // End the game after 60 seconds
    setTimeout(() => {
        endGame();
    }, 60000); // End game after 1 minute

    startButton.disabled = true; // Disable start button
}

function spawnTargets() {
    const numTargets = Math.floor(Math.random() * Math.max(1, Math.floor(difficulty))) + 1; // 1 to max targets based on difficulty

    for (let i = 0; i < numTargets; i++) {
        const target = document.createElement('div');
        const isEnemy = Math.random() > 0.4; // 60% chance it's an enemy
        target.classList.add('target', isEnemy ? 'enemy' : 'friendly');

        // Random position for the target
        target.style.left = Math.random() * 85 + 'vw';
        target.style.top = Math.random() * 75 + 'vh';

        // Add click event listener
        target.addEventListener('click', () => {
            playClickSound(); // Play gunshot sound after 0.5 seconds
            setTimeout(() => {
                if (isEnemy) {
                    const randomHitSound = hitSounds[Math.floor(Math.random() * hitSounds.length)];
                    randomHitSound.currentTime = 0; // Reset sound to play from the start
                    randomHitSound.play(); // Play a random hit sound
                    score += 10; // Gain points for hitting enemy
                    showMessage("Hit Enemy! +10 points", 'green', true);
                } else {
                    allyHitSound.currentTime = 0; // Reset sound to play from the start
                    allyHitSound.play(); // Play a random hit sound
                    score -= 5; // Lose points for hitting friendly
                    showMessage("Hit Friendly! -5 points", 'red', false);
                }
                updateScore();
            }, 300);
            gameArea.removeChild(target); // Remove target after hit
            // Play the game start sound
            gameStartSound.currentTime = 0; // Reset sound to play from the start
            gameStartSound.play();
        });

        // Append target to the game area
        gameArea.appendChild(target);

        // If the target is not clicked after 3 seconds, treat it as a miss
        setTimeout(() => {
            if (gameArea.contains(target)) {
                if (isEnemy) {
                    missSound.currentTime = 0; // Reset sound to play from the start
                    missSound.play(); // Play a random hit sound
                    score -= 5; // Lose points for missing an enemy
                    showMessage("Missed Enemy! -5 points", 'red', false);
                }
                gameArea.removeChild(target);
                updateScore();
            }
        }, 3000); // Target disappears after 3 seconds
    }
}

function updateScore() {
    scoreDisplay.innerText = score;
}

function showMessage(message, color, isHit) {
    messageElement.innerText = message;
    messageElement.style.color = color;

    setTimeout(() => {
        messageElement.innerText = '';
    }, 1000);
}

function playClickSound() {
    playerShotSound.currentTime = 0; // Reset sound to play from the start
    playerShotSound.play(); // Play gun shot sound on click
}

function pauseGame() {
    gameRunning = !gameRunning;
    if (gameRunning) {
        startGame();
        pauseButton.innerText = 'Pause';
    } else {
        clearInterval(targetInterval);
        pauseButton.innerText = 'Resume';
    }
}

function endGame() {
    gameRunning = false;
    clearInterval(targetInterval);
    alert("Game Over! Final Score: " + score);
    const restartButton = document.createElement('button');
    restartButton.innerText = 'Restart';
    restartButton.addEventListener('click', () => {
        document.body.removeChild(restartButton);
        startButton.disabled = false; // Enable the start button
    });
    document.body.appendChild(restartButton);
}

// Start button UI setup
startButton.disabled = false; // Ensure start button is enabled initially
