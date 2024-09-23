let score = 0;
let gameRunning = true;
let difficulty = 1;
let targetInterval;

// Sound effects
const hitSound = new Audio('path/to/hit.mp3'); // Update with your sound file path
const missSound = new Audio('path/to/miss.mp3'); // Update with your sound file path

document.getElementById('pause-button').addEventListener('click', pauseGame);

function startGame() {
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = ''; // Clear the area for new targets

    targetInterval = setInterval(() => {
        if (!gameRunning) return;
        spawnTargets();
    }, 3000 / difficulty); // Spawn targets faster as difficulty increases
}

function spawnTargets() {
    const gameArea = document.getElementById('game-area');
    const numTargets = Math.floor(Math.random() * 3) + 1; // 1 to 3 targets

    for (let i = 0; i < numTargets; i++) {
        const target = document.createElement('div');
        const isEnemy = Math.random() > 0.5; // 50% chance it's an enemy
        target.classList.add('target', isEnemy ? 'enemy' : 'friendly');

        // Random position for the target
        target.style.left = Math.random() * 80 + 'vw';
        target.style.top = Math.random() * 80 + 'vh';

        // Add click event listener
        target.addEventListener('click', () => {
            if (isEnemy) {
                score += 10; // Gain points for hitting enemy
                showMessage("Hit Enemy! +10 points", 'green', true);
            } else {
                score -= 5; // Lose points for hitting friendly
                showMessage("Hit Friendly! -5 points", 'red', false);
            }
            updateScore();
            gameArea.removeChild(target); // Remove target after hit
        });

        // Append target to the game area
        gameArea.appendChild(target);

        // If the target is not clicked after 3 seconds, treat it as a miss
        setTimeout(() => {
            if (gameArea.contains(target)) {
                if (isEnemy) {
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
    document.getElementById('score').innerText = score;
}

function showMessage(message, color, isHit) {
    const messageElement = document.getElementById('message');
    messageElement.innerText = message;
    messageElement.style.color = color;

    if (isHit) hitSound.play(); // Play sound on hit
    else missSound.play(); // Play sound on miss

    setTimeout(() => {
        messageElement.innerText = '';
    }, 1000);
}

function pauseGame() {
    gameRunning = !gameRunning;
    const pauseButton = document.getElementById('pause-button');
    if (gameRunning) {
        startGame();
        pauseButton.innerText = 'Pause';
    } else {
        clearInterval(targetInterval);
        pauseButton.innerText = 'Resume';
    }
}

// Set a timer to increase difficulty every 10 seconds
setInterval(() => {
    if (gameRunning) {
        difficulty += 0.1; // Increase difficulty over time
    }
}, 10000);

// End the game after 60 seconds
setTimeout(() => {
    gameRunning = false;
    clearInterval(targetInterval);
    alert("Game Over! Final Score: " + score);
}, 60000); // End game after 1 minute

// Start the game
startGame();
