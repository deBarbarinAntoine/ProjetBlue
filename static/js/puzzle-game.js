const puzzleContainer = document.getElementById('puzzle-container');
const shuffleButton = document.getElementById('shuffle-button');
let tiles = [1, 2, 3, 4, 5, 6, 7, 8, '']; // Tiles array including the empty space
let emptyTileIndex = 8; // Initially, the empty tile is in the last position

window.onload = () => {
    createTiles();
    shuffleButton.addEventListener('click', shuffleTiles); // Add event listener for the shuffle button
};

// Create the initial puzzle grid
function createTiles() {
    puzzleContainer.innerHTML = ''; // Clear any existing tiles
    tiles.forEach((tile, index) => {
        const tileElement = document.createElement('div');
        tileElement.classList.add('tile');
        if (tile === '') {
            tileElement.classList.add('empty');
        } else {
            tileElement.innerText = tile;
            tileElement.addEventListener('click', () => moveTile(index));
        }
        puzzleContainer.appendChild(tileElement);
    });
}

// Check if the tile clicked is next to the empty space, and if so, move it
function moveTile(tileIndex) {
    if (isAdjacent(tileIndex, emptyTileIndex)) {
        // Swap the tile and the empty space
        [tiles[tileIndex], tiles[emptyTileIndex]] = [tiles[emptyTileIndex], tiles[tileIndex]];
        emptyTileIndex = tileIndex; // Update empty tile index
        createTiles(); // Re-render the tiles
        checkWin(); // Check if the puzzle is solved
    }
}

// Check if two tiles are adjacent (horizontally or vertically)
function isAdjacent(index1, index2) {
    const adjacentPositions = [
        index1 - 1, // Left
        index1 + 1, // Right
        index1 - 3, // Above
        index1 + 3  // Below
    ];
    return adjacentPositions.includes(index2);
}

// Shuffle the tiles
function shuffleTiles() {
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    emptyTileIndex = tiles.indexOf(''); // Update the empty tile position
    createTiles();
}

// Check if the tiles are in the correct order (solved state)
function checkWin() {
    const winningOrder = [1, 2, 3, 4, 5, 6, 7, 8, ''];
    if (JSON.stringify(tiles) === JSON.stringify(winningOrder)) {
        alert("Congratulations! You've solved the puzzle!");
    }
}
