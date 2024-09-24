let score = 0;
let gameRunning = false;
let isPaused = false; // Track whether the game is paused
let difficulty = 1;
let targetInterval = null; // Initialize with null
let difficultyInterval = null; // Initialize with null
let memory_difficulty = 0;
let soundEnabled = true;
let remainingTime = 60000; // Total game time in milliseconds
let timeLeft = 0;
let endGameTimeout;
let gameStartTime;
let gameOver = false;
let baseDifficulty;
let volume= 0.2;
let setVolumeSlider = volume * 100;
let maxDifficulty = 5;
let randomLeft, randomTop;

// Sound effects
const hitSounds = new Audio('/static/sound_mp3/enemy_hurt3.mp3');
const missSound = new Audio('/static/sound_mp3/enemy_missed.mp3');
const allyHitSound = new Audio('/static/sound_mp3/ally_shot.mp3');
const gameStartSound = new Audio('/static/sound_mp3/game_start.mp3');
const playerShotSound = new Audio('/static/sound_mp3/player_gun_shot.mp3');
const ambientSound = new Audio('/static/sound_mp3/ambient_sound.mp3');
ambientSound.loop = true; // Loop the ambient sound



showPausedOverlay();

// Initialize UI elements

const pauseButton = document.getElementById('pause-button');
const gameArea = document.getElementById('game-area');
const gameAreaCTN = document.querySelector('.game-area-ctn');
const scoreDisplay = document.getElementById('score');
const imageElement = document.getElementById('image');

document.addEventListener('keydown', (event) => {
    // Check if the 'P' key is pressed and the pauseButton is not disabled
    if ((event.key === 'p' || event.key === 'P') && !pauseButton.disabled) {
        if (gameRunning) {
            if (isPaused) {
                resumeGame(); // Call resume function if the game is paused
            } else {
                pauseGame(); // Call pause function if the game is running
            }
        }
    }
});


function startGame() {
    score = 0; // Reset score
    gameRunning = true;
    gameArea.innerHTML = ''; // Clear the area for new targets
    updateScore();
    pauseButton.disabled = false;
    gameOver = false;
    imageElement.classList.add('background_image_animation');
    baseDifficulty = difficulty;
    // Play the game start sound
    playSound(ambientSound);
    playSound(gameStartSound);

    // Initialize gameStartTime
    gameStartTime = Date.now(); // Set start time

    // Spawn targets based on difficulty
    clearInterval(targetInterval); // Clear any previous intervals
    targetInterval = setInterval(() => {
        if (gameRunning && !isPaused) {
            spawnTargets();
        }
    }, 3000 / difficulty); // Spawn targets faster as difficulty increases

    // Increase difficulty every 9 seconds
    clearInterval(difficultyInterval); // Clear any previous difficulty intervals
    difficultyInterval = setInterval(() => {
        if (gameRunning && !isPaused) {
            difficulty += 1; // Increase difficulty over time
        }
    }, 9000);

    // Start the end game timer
    startEndGameTimer();
}

function startEndGameTimer() {
    if (endGameTimeout) clearTimeout(endGameTimeout); // Clear previous timeout if it exists
    endGameTimeout = setTimeout(() => {
        endGame(); // Call end game after remaining time
    }, remainingTime);
}

function spawnTargets() {
    const numTargets = Math.floor(Math.random() * Math.max(1, Math.floor(difficulty))) + 1; // 1 to max targets based on difficulty
    const existingTargets = []; // Array to store the positions and sizes of existing targets

    for (let i = 0; i < numTargets; i++) {
        const target = document.createElement('div');
        const isEnemy = Math.random() > 0.4; // 60% chance it's an enemy
        target.classList.add('target', isEnemy ? 'enemy' : 'friendly');
        target.classList.add('message');

        let scaleFactor;
        let points;

        if (isEnemy) {
            // Random size for enemies (scale factor between 0.5 and 2)
            scaleFactor = Math.random() * (2 - 0.5) + 0.5;
            points = Math.round(10 / scaleFactor); // Example: smaller enemies give more points (inverse of size)
        } else {
            // Fixed size for friendly targets
            scaleFactor = 1.2; // Fixed size for friendlies
            points = -5; // Fixed penalty for friendlies
        }

        // Set the scale transform based on the scale factor
        target.style.transform = `scale(${scaleFactor})`;

        let validPositionFound = false;


        // Try finding a non-overlapping position
        while (!validPositionFound) {
            // Generate random position for the target
            randomLeft = Math.random() * 85; // left between 0 and 85vw
            randomTop = Math.random() * 75; // top between 0 and 75vh

            // Check if the new position overlaps with any existing targets
            validPositionFound = true; // Assume valid until we find a conflict

            for (const existing of existingTargets) {
                const { left: existingLeft, top: existingTop, size: existingSize } = existing;

                // Calculate distance between the new target and the existing target
                const distance = Math.sqrt(
                    Math.pow(randomLeft - existingLeft, 2) + Math.pow(randomTop - existingTop, 2)
                );

                // Check if they overlap (distance less than combined radius/size)
                const combinedSize = (scaleFactor + existingSize) * 10; // Use a multiplier to calculate effective size
                if (distance < combinedSize) {
                    validPositionFound = false; // If overlap found, regenerate position
                    break;
                }
            }
        }

        // Set the final position for the target
        target.style.left = randomLeft + 'vw';
        target.style.top = randomTop + 'vh';

        // Store the position and size of the new target
        existingTargets.push({ left: randomLeft, top: randomTop, size: scaleFactor });

        let isBlinking = false; // Flag to track blinking state

        // Add click event listener
        target.addEventListener('click', () => {
            if (isBlinking) return; // Ignore clicks if the target is blinking
            playSound(playerShotSound); // Play gunshot sound

            // Set blinking state
            isBlinking = true;

            // Create a span element to display the score change on top of the target
            const scoreDisplay = document.createElement('span');
            scoreDisplay.classList.add('score-display'); // Add a class for styling
            scoreDisplay.style.position = 'absolute';
            scoreDisplay.style.left = '50%';
            scoreDisplay.style.top = '-30px'; // Position it slightly above the target
            scoreDisplay.style.transform = 'translateX(-50%)';
            scoreDisplay.style.color = isEnemy ? 'green' : 'red'; // Green for hit, red for miss
            scoreDisplay.style.fontWeight = 'bold';
            scoreDisplay.style.fontSize = '18px'; // Adjust size as needed
            scoreDisplay.innerText = isEnemy ? `+${points}` : `${points}`; // Show + points for enemies, - points for friendlies

            target.appendChild(scoreDisplay); // Append the score display to the target

            // Animate the score display to fade out and move up
            setTimeout(() => {
                scoreDisplay.style.transition = 'opacity 1s, transform 1s'; // Smooth transition for fading and moving up
                scoreDisplay.style.opacity = '0'; // Fade out
                scoreDisplay.style.transform = 'translateX(-50%) translateY(-20px)'; // Move up slightly
            }, 100); // Small delay before animation starts

            // Remove the score display after the animation completes
            setTimeout(() => {
                if (scoreDisplay.parentNode) {
                    scoreDisplay.parentNode.removeChild(scoreDisplay); // Remove the score display element
                }
            }, 1100); // Wait until the fade-out animation finishes

            if (isEnemy) {
                playSound(hitSounds);
                score += points; // Gain points based on the size of the enemy
            } else {
                playSound(allyHitSound);
                score += points; // Friendlies always deduct fixed points
            }
            updateScore();

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
                    // Play sound without pausing
                    if (missSound.paused) {
                        missSound.currentTime = 0; // Reset to the start
                        missSound.play();
                        missSound.volume = volume;
                    }
                    score -= points; // Lose points based on the size of the missed enemy
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

function playSound(audioElement) {
    if (!soundEnabled) return; // Prevent playing sound if muted
    if (!audioElement.paused) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    audioElement.volume = volume;
    audioElement.play();
}

function endGame() {
    ambientSound.pause();
    imageElement.classList.remove('background_image_animation');
    gameRunning = false;
    pauseButton.disabled = true;
    clearInterval(targetInterval);
    clearInterval(difficultyInterval);
    gameArea.innerHTML = ''; // Clear all targets
    gameOver = true;
    difficulty = baseDifficulty;
    showPausedOverlay()
}

function pauseGame() {
    if (!gameRunning || isPaused) return; // Prevent pausing if game isn't running or already paused
    isPaused = true; // Set the pause state
    memory_difficulty = difficulty; // Save current difficulty
    timeLeft = 60000 - (Date.now() - gameStartTime); // Calculate remaining time
    gameArea.innerHTML = ''; // Clear game area (consider retaining state instead)
    if (endGameTimeout) clearTimeout(endGameTimeout);
    // Optional: Show a paused overlay or message
    showPausedOverlay();

    pauseButton.innerText = 'Resume'; // Change button text to "Resume"
}

function resumeGame() {
    if (!gameRunning || !isPaused) return; // Prevent resuming if game isn't running or not paused
    isPaused = false; // Clear the pause state
    difficulty = memory_difficulty; // Restore difficulty
    remainingTime = timeLeft; // Restore remaining time
    startEndGameTimer(); // Start the timer for the remaining time
    pauseButton.innerText = 'Pause'; // Change button text back to "Pause"

    // Hide the paused overlay or message
    hidePausedOverlay();
}

function hidePausedOverlay() {
    const overlay = document.getElementById('paused-overlay');
    if (overlay) {
        overlay.style.display = 'none'; // Hide overlay instead of removing
    }
}

function returnToMenu(){
    gameRunning = false;
    gameOver = false;
    hidePausedOverlay();
    showPausedOverlay();
}

// functions for showing/hiding a paused overlay
function showPausedOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'paused-overlay';
    if (isPaused) {
        overlay.innerText = 'Game Paused';
        overlay.innerHTML = `<input type="range" id="sound-slider" min="0" max="100" value="50">`;
    } else if (!gameRunning && !gameOver) {
        overlay.innerHTML = `<div id="retro-menu" class="menu"> 
                                <h1 class="menu-title">Shooting Game</h1> 
                                <div class="menu-options"> 
                                    <div class="button-30" id="start-button">Start Game</div> 
                                    <div class="button-30" id="difficulty-button">Difficulty : ${difficulty}</div> 
                                    <div class="button-30" id="fullscreen-button">Fullscreen</div> 
                                    <input type="range" id="sound-slider" min="0" max="100" value="${setVolumeSlider}"> 
                                </div> 
                             </div>`;
    } else if (!gameRunning && gameOver) {
        overlay.innerHTML = `<div id="retro-menu" class="menu"> 
                                <h1 class="menu-title">Game Over</h1> 
                                <h1 class="menu-title">You did ${score} points !</h1> 
                                <ul class="menu-options"> 
                                    <li class="button-30" id="restart-button">Restart Game</li> 
                                    <li class="button-30" id="back_to_start-button">Back to Menu</li> 
                                </ul> 
                                <input type="range" id="sound-slider" min="0" max="100" value="${setVolumeSlider}"> 
                             </div>`;
    }
    document.getElementById('game-area').appendChild(overlay); // Append overlay to game-area
    overlay.style.display = 'flex'; // Show the overlay

    let startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        restartButton.addEventListener('click', startGame);
    }

    const back_to_start = document.getElementById('back_to_start-button');
    if (back_to_start) {
        back_to_start.addEventListener('click', returnToMenu);
    }

    const fullscreen = document.getElementById('fullscreen-button');
    if (fullscreen) {
        fullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                // Enter full screen
                gameAreaCTN.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                // Exit full screen
                document.exitFullscreen();
            }
        });
    }

    const difficultyBtn = document.getElementById('difficulty-button');
    if (difficultyBtn) {
        difficultyBtn.addEventListener('click', () => {
            // Change difficulty dynamically
            difficulty = difficulty < maxDifficulty ? difficulty + 1 : 1;
            difficultyBtn.innerText = `Difficulty : ${difficulty}`; // Update the button text immediately
        });
    }

    // Function to update sound volume based on slider
    document.getElementById('sound-slider').addEventListener('input', function (event) {
        volume = event.target.value / 100;  // Convert slider value to a fraction
        ambientSound.volume = volume;
    });
}

