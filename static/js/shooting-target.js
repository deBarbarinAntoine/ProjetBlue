let score = 0;
let gameRunning = false;
let isPaused = false; // Track whether the game is paused
let difficulty = 1;
let targetInterval = null; // Initialize with null
let difficultyInterval = null; // Initialize with null
let memory_difficulty = 0;
let soundEnabled = true;
const maxTime = 1000
let remainingTime;
let endGameTimeout;
let gameStartTime;
let gameOver = false;
let baseDifficulty;
let volume = 0;
let maxDifficulty = 10;
let randomLeft, randomTop;
let timeBarAnimationFrame;
let pauseTime = 0;
let resumeTime = 0;
let existingTargets = []; // Array to store the positions and sizes of existing targets

// Sound effects
const hitSounds = new Audio('/static/sound_mp3/enemy_hurt3.mp3');
const missSound = new Audio('/static/sound_mp3/enemy_missed.mp3');
const allyHitSound = new Audio('/static/sound_mp3/ally_shot.mp3');
const gameStartSound = new Audio('/static/sound_mp3/game_start.mp3');
const playerShotSound = new Audio('/static/sound_mp3/player_gun_shot.mp3');
const ambientSound = new Audio('/static/sound_mp3/ambient_sound.mp3');
ambientSound.loop = true; // Loop the ambient sound
const bossHitSound = new Audio('/static/sound_mp3/bossHit.mp3');
const bossSpawnSound = new Audio('/static/sound_mp3/bossSpawnSound.mp3');
const startClicSound = new Audio('/static/sound_mp3/buttonStartClic.mp3');
const gameOverSound = new Audio('/static/sound_mp3/gameOverSound.mp3');


function setVolumeSlider() {
    return volume * 100;
}

showPausedOverlay();

// Initialize UI elements

const pauseButton = document.getElementById('pause-button');
const gameArea = document.getElementById('game-area');
const gameAreaCTN = document.querySelector('.game-area-ctn');
const scoreDisplay = document.getElementById('score');
const imageElement = document.getElementById('image');
const timeBarElement = document.querySelector('.timeBar');


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
    remainingTime = maxTime
    isPaused = false;
    pauseButton.innerText = 'Pause';

    // Play the game start sound
    playSound(ambientSound);
    playSound(gameStartSound);

    // Initialize gameStartTime and game clock
    gameStartTime = Date.now(); // Set start time
    remainingTime = maxTime - (Date.now() - gameStartTime)

    // Spawn targets based on difficulty
    clearInterval(targetInterval); // Clear any previous intervals
    targetInterval = setInterval(() => {
        if (gameRunning && !isPaused) {
            spawnTargets();
        }
    }, 3000); // Spawn targets faster as difficulty increases

    // Increase difficulty every 9 seconds
    clearInterval(difficultyInterval); // Clear any previous difficulty intervals
    difficultyInterval = setInterval(() => {
        if (gameRunning && !isPaused) {
            difficulty += 1; // Increase difficulty over time
            if (difficulty === 4) {
                const backgroundImage = document.querySelector('.game-area-ctn img');
                backgroundImage.src = "/static/shooting_image/map2.gif";
            } else if (difficulty === 7) {
                const backgroundImage = document.querySelector('.game-area-ctn img');
                backgroundImage.src = "/static/shooting_image/map3.gif";
            }
        }
    }, 9000);

    // Start the end game timer
    startEndGameTimer();
}

function startEndGameTimer() {
    if (endGameTimeout) clearTimeout(endGameTimeout);
    let timePercentage;
    const updateTimeBar = () => {
        remainingTime = maxTime - (Date.now() - gameStartTime)
        // Calculate percentage of time left and update time bar width*$
        let timeDifference = (remainingTime / maxTime);
        timePercentage = (timeDifference * 100);

        timeBarElement.style.width = `${timePercentage}%`;
        if (timePercentage < 25) {
            timeBarElement.style.backgroundColor = 'red'; // Change to red when below 25%
        } else if (timePercentage < 50) {
            timeBarElement.style.backgroundColor = 'orange'; // Change to orange below 50%
        } else {
            timeBarElement.style.backgroundColor = '#4caf50'; // Green for more than 50% time left
        }
        if (remainingTime >= 0) {
            timeBarAnimationFrame = requestAnimationFrame(updateTimeBar); // Continue updating
        }
    };
    endGameTimeout = setTimeout(() => {
        playSound(bossSpawnSound)
        bossTime(); // Call end game after remaining time
        const backgroundImage = document.querySelector('.game-area-ctn img');
        backgroundImage.src = "/static/shooting_image/playground.jpg";
    }, remainingTime);

    // Start updating the time bar
    updateTimeBar(); // Initial call to start updating the time bar
}

function spawnTargets() {
    const currentTargets = document.querySelectorAll('.target'); // Get all current targets

    currentTargets.forEach((target) => {
        if (target.classList.contains('enemy') && !target.classList.contains('blinking')) {
            score -= 5
        }
        target.remove();
    })
    existingTargets = [];
    updateScore()
    const numTargets = Math.floor(Math.random() * Math.max(1, difficulty) + 1); // 1 to max targets based on difficulty


    for (let i = 0; i < numTargets; i++) {

        const target = document.createElement('div');
        const enemyProbability = Math.min(0.4 + (difficulty * 0.05), 0.9); // Cap probability at 90%
        const isEnemy = Math.random() < enemyProbability;
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
        let attempts = 0;
        const maxAttempts = 100; // Limit attempts to avoid infinite loop

        while (!validPositionFound && attempts < maxAttempts) {
            randomLeft = Math.random() * 82;
            randomTop = Math.random() * 70;
            validPositionFound = true;

            for (const existing of existingTargets) {
                const {left: existingLeft, top: existingTop, size: existingSize} = existing;
                const distance = Math.sqrt(Math.pow(randomLeft - existingLeft, 2) + Math.pow(randomTop - existingTop, 2));
                const combinedSize = (scaleFactor + existingSize) * 10;

                if (distance < combinedSize) {
                    validPositionFound = false;
                    break;
                }
            }

            attempts++;
        }

        if (attempts === maxAttempts) {
            randomLeft = Math.random() * 82; // Fallback logic
            randomTop = Math.random() * 70;
        }

        // Set the final position for the target
        target.style.left = randomLeft + 'vw';
        target.style.top = randomTop + 'vh';

        // Store the position and size of the new target
        existingTargets.push({left: randomLeft, top: randomTop, size: scaleFactor});

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
            scoreDisplay.style.transform = 'translateX(-50%) scale(2)';
            scoreDisplay.style.color = isEnemy ? 'green' : 'red'; // Green for hit, red for miss
            scoreDisplay.style.fontWeight = 'bold';
            scoreDisplay.style.fontSize = '20px'; // Adjust size as needed
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

            // Adjust points for enemy or friendly
            points = isEnemy ? points : -points; // Negate points for allies
            score += points; // Always add points
            updateScore();

            if (isEnemy) {
                playSound(hitSounds);
                // Add blinking animation immediately
                target.classList.add('blink');
            } else {
                playSound(allyHitSound);
            }

            // Remove target after 600ms (500ms for blink duration + some buffer)
            setTimeout(() => {
                isBlinking = false; // Reset blinking state
                if (gameArea.contains(target)) {
                    gameArea.removeChild(target);
                }
                target.classList.remove('blink'); // Ensure blink class is removed after the animation
            }, 600);
        });
        // Append target to the game area
        gameArea.appendChild(target);
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
    playSound(gameOverSound)
    showPausedOverlay()
}

function pauseGame() {
    if (!gameRunning || isPaused) return; // Prevent pausing if game isn't running or already paused
    if (endGameTimeout) clearTimeout(endGameTimeout);
    isPaused = true; // Set the pause state
    pauseTime = Date.now()
    memory_difficulty = difficulty; // Save current difficulty
    gameArea.innerHTML = ''; // Clear game area (consider retaining state instead)

    // Show a paused overlay or message
    showPausedOverlay();
    // Cancel time bar update
    cancelAnimationFrame(timeBarAnimationFrame);

    pauseButton.innerText = 'Resume'; // Change button text to "Resume"
}

function resumeGame() {
    if (!gameRunning || !isPaused) return; // Prevent resuming if game isn't running or not paused
    isPaused = false; // Clear the pause state
    resumeTime = Date.now()
    difficulty = memory_difficulty; // Restore difficulty
    gameArea.innerHTML = ''; // Clear game area (consider retaining state instead)

    pauseButton.innerText = 'Pause'; // Change button text back to "Pause"
    gameStartTime = gameStartTime + (resumeTime - pauseTime);

    // Hide the paused overlay or message
    startEndGameTimer(); // Start the timer for the remaining time and update time bar
    hidePausedOverlay();
}

function hidePausedOverlay() {
    const overlay = document.getElementById('paused-overlay');
    if (overlay) {
        overlay.style.display = 'none'; // Hide overlay instead of removing
    }
}

function returnToMenu() {
    gameRunning = false;
    gameOver = false;
    hidePausedOverlay();
    showPausedOverlay();
}

// functions for showing/hiding a paused overlay
function showPausedOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'paused-overlay';
    let timeToShow = Math.floor(remainingTime / 1000)
    if (isPaused) {
        overlay.innerText = 'Game Paused';
        overlay.innerHTML = `<div id="retro-menu" class="menu">
                                <h1 class="menu-title">Pause Menu</h1> 
                                <div class="menu-options"> 
                                    <div class="button-30" id="restart-button">Restart Game</div> 
                                    <div class="button-30" id="fullscreen-button">Fullscreen</div> 
                                    <div class="button-30" id="resume-button">Continue</div> 
                                    <div class="affichage-30" id="affichage-screen">${timeToShow} second left</div>
                                    <div class="volume-control">
                                        <i id="volume-icon" class="fas fa-volume-mute"></i>
                                        <input type="range" id="sound-slider" min="0" max="100" value="${setVolumeSlider()}">
                                    </div>
                                </div>
                             </div>`;
    } else if (!gameRunning && !gameOver) {

        overlay.innerHTML = `<div id="retro-menu" class="menu"> 
                                <h1 class="menu-title">Shooting Game</h1> 
                                <div class="menu-options"> 
                                    <div class="button-30" id="start-button">Start Game</div> 
                                    <div class="button-30" id="difficulty-button">Difficulty : ${difficulty}</div> 
                                    <div class="button-30" id="fullscreen-button">Fullscreen</div> 
                                    <div class="volume-control">
                                        <i id="volume-icon" class="fas fa-volume-mute"></i>
                                        <input type="range" id="sound-slider" min="0" max="100" value="${setVolumeSlider()}">
                                    </div>
                                </div> 
                                <div class="score-display">
                                <div class="score-label">BEST SCORE</div>
                                <div class="score-value" id="score">012345</div>
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
                                <div class="volume-control">
                                     <i id="volume-icon" class="fas fa-volume-mute"></i>
                                     <input type="range" id="sound-slider" min="0" max="100" value="${setVolumeSlider()}">
                                </div>
                             </div>`;
    }
    document.getElementById('game-area').appendChild(overlay); // Append overlay to game-area
    overlay.style.display = 'flex'; // Show the overlay

    // do what it says
    updateVolumeIcon(volume)

    let startButton = document.getElementById('start-button');
    if (startButton) {
        playSound(startClicSound)
        startButton.addEventListener('click', startGame);
    }

    const restartButton = document.getElementById('restart-button');
    if (restartButton) {
        playSound(startClicSound)
        restartButton.addEventListener('click', startGame);
    }

    const back_to_start = document.getElementById('back_to_start-button');
    if (back_to_start) {
        playSound(startClicSound)
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

    const resumeBtn = document.getElementById('resume-button');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            resumeGame()
        })
    }

    // Function to update sound volume based on slider
    document.getElementById('sound-slider').addEventListener('input', function (event) {
        volume = event.target.value / 100;  // Convert slider value to a fraction
        ambientSound.volume = volume;
        updateVolumeIcon(volume * 100);
    });
}

// Function to update the icon based on the slider value
function updateVolumeIcon(volume) {
    const volumeIcon = document.getElementById('volume-icon');
    if (volume <= 0) {
        volumeIcon.className = 'fas fa-volume-mute'; // Mute icon
    } else if (volume > 0 && volume <= 40) {
        volumeIcon.className = 'fas fa-volume-down'; // Low volume icon
    } else if (volume > 40 && volume <= 66) {
        volumeIcon.className = 'fas fa-volume-up'; // Medium volume icon
    } else {
        volumeIcon.className = 'fas fa-volume-high'; // High volume icon
    }
}

// Initial icon update based on the default value
updateVolumeIcon(volume * 100);

function bossTime() {
    gameRunning = false;
    const boss = document.createElement('div');
    const bossPoints = difficulty * 50; // Points scale based on difficulty level
    const bossSize = 1; // Boss is larger than regular enemies (scale factor)

    boss.classList.add('target', 'boss'); // Add 'boss' class for special styling

    // Set initial size and position for the boss
    boss.style.transform = `scale(${bossSize})`;
    boss.style.left = `${Math.random() * 80}vw`; // Random starting position (left)
    boss.style.top = `${Math.random() * 60}vh`; // Random starting position (top)

    let isHit = false; // Track if the boss is hit

    // Append the boss to the game area
    gameArea.appendChild(boss);

    // Boss movement logic: move every 500ms
    const moveBossInterval = setInterval(() => {
        if (isPaused || isHit) return; // Pause or stop movement if hit

        // Move the boss to a random position
        const newLeft = Math.random() * 80; // Random position (left)
        const newTop = Math.random() * 60; // Random position (top)

        boss.style.left = `${newLeft}vw`;
        boss.style.top = `${newTop}vh`;
    }, 700); // Move every 500ms

    // Add click event listener for the boss
    boss.addEventListener('click', () => {
        if (isHit) return; // Ignore clicks if already hit
        playSound(playerShotSound); // Play gunshot sound

        isHit = true; // Mark boss as hit
        playSound(bossHitSound);

        // Show points on the boss
        const scoreDisplay = document.createElement('span');
        scoreDisplay.classList.add('score-display');
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.left = '50%';
        scoreDisplay.style.top = '-40px'; // Position above the boss
        scoreDisplay.style.transform = 'translateX(-50%) scale(3)';
        scoreDisplay.style.color = 'green'; // Show green color for hit
        scoreDisplay.style.fontWeight = 'bold';
        scoreDisplay.style.fontSize = '30px'; // Larger for boss
        scoreDisplay.innerText = `+${bossPoints}`;

        boss.appendChild(scoreDisplay);

        // Update the player's score
        score += bossPoints;
        updateScore();

        // Fade out and remove score display
        setTimeout(() => {
            scoreDisplay.style.transition = 'opacity 1s, transform 1s';
            scoreDisplay.style.opacity = '0';
            scoreDisplay.style.transform = 'translateY(-30px)';
        }, 100);

        // Remove boss after it has been hit
        setTimeout(() => {
            if (boss.parentNode) {
                boss.parentNode.removeChild(boss);
            }
        }, 1000); // After 600ms (same timing as other targets)
    });

    // End the game after 5 seconds
    setTimeout(() => {
        clearInterval(moveBossInterval); // Stop boss movement

        if (!isHit && boss.parentNode) {
            gameArea.removeChild(boss); // Remove the boss if still present
        }

       saveScore(score); // Call the end of the game
    }, 5000); // Boss stays for 5 seconds
}


function saveScore(score) { // Assuming score is passed to the function
    const overlay = document.createElement('div');
    overlay.id = 'paused-overlay';
    overlay.innerHTML = `<div id="retro-menu" class="menu">
                            <h1>Save Your Score</h1>
                            <input type="text" id="name" placeholder="Your Name" required>
                            <input type="number" id="score" placeholder="Your Score" value="${score}" required readonly>
                            <button class="saveScore" data-action="submit">Submit</button>
                            <button class="saveScore" data-action="pass">Pass</button>
                            <div id="scores"></div>
                         </div>`;

    document.getElementById('game-area').appendChild(overlay); // Append overlay to game-area
    overlay.style.display = 'flex'; // Show the overlay

    // Add event listeners to both buttons
    document.querySelectorAll('.saveScore').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');

            if (action === 'submit') {
                const name = document.getElementById("name").value;
                if (name.trim() === "") {
                    alert("Please enter your name.");
                    return;
                }

                const xhr = new XMLHttpRequest();
                xhr.open("POST", "/save-score", true);
                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhr.send(JSON.stringify({ name: name, score: score }));

                hidePausedOverlay()
                endGame(); // End the game after submitting
            } else if (action === 'pass') {
                hidePausedOverlay();
                endGame(); // End the game without submitting
            }
        });
    });
}
