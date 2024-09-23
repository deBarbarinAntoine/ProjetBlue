let score = 0;
let gameRunning = true;

function startGame() {
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = ''; // Clear the area for new targets

    const randomDelay = Math.floor(Math.random() * 2000) + 1000; // 1 to 3 seconds delay

    setTimeout(() => {
        if (!gameRunning) return;

        // Create a target (either enemy or friendly)
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
                showMessage("Hit Enemy! +10 points", 'green');
            } else {
                score -= 5; // Lose points for hitting friendly
                showMessage("Hit Friendly! -5 points", 'red');
            }
            updateScore();
            gameArea.removeChild(target); // Remove target after hit
            startGame(); // Generate new target
        });

        // Append target to the game area
        gameArea.appendChild(target);

        // If the target is not clicked after 3 seconds, treat it as a miss
        setTimeout(() => {
            if (gameArea.contains(target)) {
                if (isEnemy) {
                    score -= 5; // Lose points for missing an enemy
                    showMessage("Missed Enemy! -5 points", 'red');
                }
                gameArea.removeChild(target);
                updateScore();
                startGame(); // Generate new target
            }
        }, 3000); // Target disappears after 3 seconds
    }, randomDelay);
}

function updateScore() {
    document.getElementById('score').innerText = score;
}

function showMessage(message, color) {
    const messageElement = document.getElementById('message');
    messageElement.innerText = message;
    messageElement.style.color = color;

    // Hide the message after 1 second
    setTimeout(() => {
        messageElement.innerText = '';
    }, 1000);
}

// Start the game
startGame();
