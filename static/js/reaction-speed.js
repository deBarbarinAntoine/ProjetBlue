let startTime;
let timer;

window.onload = () => {
    startGame();
    // Add event listener for button click
    document.getElementById('reaction-button').addEventListener('click', stopTimer);
};

// Start the game by waiting for a random delay
function startGame() {
    const randomDelay = Math.floor(Math.random() * 5000) + 1000; // 1 to 5 seconds delay
    document.getElementById('message').innerText = "Get ready...";
    timer = setTimeout(showButton, randomDelay);
}

// Show the button and start the timer
function showButton() {
    const reactionButton = document.getElementById('reaction-button');
    reactionButton.style.display = "inline-block";
    startTime = new Date().getTime();
    document.getElementById('message').innerText = "Click the button!";
}

// Stop the timer and calculate reaction time
function stopTimer() {
    const endTime = new Date().getTime();
    const reactionTime = (endTime - startTime) / 1000; // Convert to seconds
    document.getElementById('message').innerText = `Your reaction time is ${reactionTime} seconds!`;

    // Hide the button after clicking
    document.getElementById('reaction-button').style.display = "none";

    // Restart the game after a short delay
    setTimeout(startGame, 2000);
}
