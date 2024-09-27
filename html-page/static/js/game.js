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
            window.location.href = '/shooting-game';
        } else if (gameId === 4) {
            window.location.href = '/mine-sweeper';
        }
    }

    // Get button elements
    const puzzleGameButton = document.getElementById('play-puzzle-game');
    const memoryMatchButton = document.getElementById('play-memory-match');
    const shootingGameButton = document.getElementById('play-shooting-game');
    const mineSweeperButton = document.getElementById('play-mine-sweeper');

    // Attach event listeners
    puzzleGameButton.addEventListener('click', function () {
        startGame(1);
    });

    memoryMatchButton.addEventListener('click', function () {
        startGame(2);
    });

    shootingGameButton.addEventListener('click', function () {
        startGame(3);
    });

    mineSweeperButton.addEventListener('click', function () {
        startGame(4);
    });
});
