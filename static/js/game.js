document.addEventListener('DOMContentLoaded', function () {
    // Function to start the game
    function startGame(gameId) {
        console.log(`Starting game ${gameId}`);

        // Use if-else statements to handle different game IDs
        if (gameId === 1) {
            window.location.href = '/puzzle-game';
        } else if (gameId === 2) {
            window.location.href = '/memory-match';
        } else if (gameId === 3) {
            window.location.href = '/reaction-speed';
        }
    }

    // Get button elements
    const puzzleGameButton = document.getElementById('play-puzzle-game');
    const memoryMatchButton = document.getElementById('play-memory-match');
    const reactionSpeedButton = document.getElementById('play-reaction-speed');

    // Attach event listeners
    puzzleGameButton.addEventListener('click', function () {
        startGame(1);
    });

    memoryMatchButton.addEventListener('click', function () {
        startGame(2);
    });

    reactionSpeedButton.addEventListener('click', function () {
        startGame(3);
    });
});
