let score = 0;
let gameRunning = false;
let difficulty;
let targetInterval;
let difficultyInterval;
let soundEnabled = true;
let remainingTime = 60000; // Total game time in milliseconds
let endGameTimeout;
let gameStartTime;
let pauseStartTime; // Variable to store when the game was paused
let pauseDuration; // Variable to accumulate the total pause time

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
const ambientSound = new Audio('/static/sound_mp3/ambient_sound.mp3');
ambientSound.loop = true; // Loop the ambient sound


// Initialize UI elements
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score');
const messageElement = document.getElementById('message');

// Event listeners
startButton.addEventListener('click', startGame);
// Update the event listener for the pause button
pauseButton.addEventListener('click', () => {
    if (gameRunning) {
        pauseGame();
    } else {
        resumeGame();
    }
});

function startGame() {
    score = 0; // Reset score
    difficulty = 1; // set / Reset difficulty
    gameRunning = true;
    gameArea.innerHTML = ''; // Clear the area for new targets
    updateScore();
    pauseButton.disabled = false;

    // Play the game start sound
    playSound(ambientSound);
    playSound(gameStartSound);

    // Initialize gameStartTime
    gameStartTime = Date.now(); // Set start time

    // Spawn targets based on difficulty
    clearInterval(targetInterval); // Clear any previous intervals
    targetInterval = setInterval(() => {
        if (!gameRunning) return;
        spawnTargets();
    }, 3000 / difficulty); // Spawn targets faster as difficulty increases

    // Increase difficulty every 9 seconds
    clearInterval(difficultyInterval); // Clear any previous difficulty intervals
    difficultyInterval = setInterval(() => {
        if (gameRunning) {
            difficulty += 1; // Increase difficulty over time
        }
    }, 9000);

    // Start the end game timer
    startEndGameTimer();

    startButton.disabled = true; // Disable start button
}

function startEndGameTimer() {
    endGameTimeout = setTimeout(() => {
        endGame();
    }, remainingTime); // Use remaining time
}

function spawnTargets() {
    const numTargets = Math.floor(Math.random() * Math.max(1, Math.floor(difficulty))) + 1; // 1 to max targets based on difficulty

    for (let i = 0; i < numTargets; i++) {
        const target = document.createElement('div');
        const isEnemy = Math.random() > 0.4; // 60% chance it's an enemy
        target.classList.add('target', isEnemy ? 'enemy' : 'friendly');

        // Random position for the target
        const randomLeft = Math.random() * 85; // left between 0 and 85vw
        const randomTop = Math.random() * 75; // top between 0 and 75vh
        target.style.left = randomLeft + 'vw';
        target.style.top = randomTop + 'vh';

        // Scale based on position
        const scaleFactor = 0.5 + (randomTop / 75) * (2 - 0.5);
        target.style.transform = `scale(${scaleFactor})`;

        let isBlinking = false; // Flag to track blinking state

        // Add click event listener
        target.addEventListener('click', () => {
            if (isBlinking) return; // Ignore clicks if the target is blinking
            playSound(playerShotSound); // Play gunshot sound

            // Set blinking state
            isBlinking = true;

            setTimeout(() => {
                if (isEnemy) {
                    playSound(hitSounds[Math.floor(Math.random() * hitSounds.length)]);
                    score += 10; // Gain points for hitting enemy
                    showMessage("Hit Enemy! +10 points", 'green', false);
                } else {
                    playSound(allyHitSound);
                    score -= 5; // Lose points for hitting friendly
                    showMessage("Hit Friendly! -5 points", 'red', false);
                }
                updateScore();
            }, 300);

            // Add blinking animation immediately
            target.classList.add('blink');

            // Remove target after 600ms (500ms for blink duration + some buffer)
            setTimeout(() => {
                target.classList.remove('blink'); // Optional: remove blink class before removal
                isBlinking = false; // Reset blinking state
                gameArea.removeChild(target);
            }, 600);
        });

        // Append target to the game area
        gameArea.appendChild(target);

        // If the target is not clicked after 3 seconds, treat it as a miss
        setTimeout(() => {
            if (gameArea.contains(target)) {
                if (isEnemy && !target.classList.contains('blink')) {
                    playSound(missSound);
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

function showMessage(message, color, isPause) {
    messageElement.innerText = message;
    messageElement.style.color = color;
    if (!isPause) {
        setTimeout(() => {
            messageElement.innerText = '';
        }, 1000);
    }
}

function playSound(audioElement) {
    if (!soundEnabled) return; // Prevent playing sound if muted
    if (!audioElement.paused) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    audioElement.volume = 0.5;
    audioElement.play();
}

function pauseGame() {
    if (!gameRunning) return; // Do nothing if the game is already paused

    gameRunning = false; // Set the game state to paused
    clearInterval(targetInterval); // Stop spawning targets
    clearInterval(difficultyInterval); // Stop increasing difficulty
    clearTimeout(endGameTimeout); // Stop the end game timer

    // Calculate the remaining time
    pauseStartTime = Date.now(); // Record the time when the game was paused
    remainingTime = 60000 - (pauseStartTime - gameStartTime); // gameStartTime should be set when the game starts

    pauseButton.innerText = 'Resume'; // Change button text to indicate resume

    // Optionally, you can show a pause message
    showMessage("Game Paused", 'blue', true);

    // Disable the start button and mute button
    startButton.disabled = true;
    muteButton.disabled = true;
}

function resumeGame() {
    gameRunning = true; // Set the game state to running
    pauseButton.innerText = 'Pause'; // Change button text back to pause
    messageElement.innerText = '';

    // Restart target spawning and difficulty increase
    targetInterval = setInterval(() => {
        if (!gameRunning) return;
        spawnTargets();
    }, 3000 / difficulty);

    difficultyInterval = setInterval(() => {
        if (gameRunning) {
            difficulty += 1; // Increase difficulty over time
        }
    }, 9000);
    // Calculate pause duration
    pauseDuration = Date.now() - pauseStartTime;

    // add pause time back to timer
    remainingTime += pauseDuration;

    // Restart the end game timer
    startEndGameTimer();

    // Enable the start button and mute button
    startButton.disabled = false;
    muteButton.disabled = false;
}

function endGame() {
    ambientSound.pause();
    gameRunning = false;
    clearInterval(targetInterval);
    clearInterval(difficultyInterval);
    alert("Game Over! Final Score: " + score);
    gameArea.innerHTML = ''; // Clear all targets
    const restartButton = document.createElement('button');
    restartButton.innerText = 'Restart';
    restartButton.addEventListener('click', () => {
        restartGame();
        document.body.removeChild(restartButton);
    });
    document.body.appendChild(restartButton);
}

function restartGame() {
    score = 0;
    difficulty = 1;
    gameArea.innerHTML = ''; // Clear all targets
    updateScore();
    startButton.disabled = false; // Enable start button
    gameRunning = false;
}

// Start button UI setup
startButton.disabled = false; // Ensure start button is enabled initially

// Mute button
const muteButton = document.getElementById('mute-button');
muteButton.addEventListener('click', toggleSound);

function toggleSound() {
    soundEnabled = !soundEnabled;
    muteButton.innerText = soundEnabled ? 'Mute' : 'Unmute';
}