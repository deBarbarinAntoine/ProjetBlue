const cards = [
    "A", "A", "B", "B", "C", "C", "D", "D",
    "E", "E", "F", "F", "G", "G", "H", "H"
];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let startTime, timerInterval;

window.onload = () => {
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    shuffle(cards);
    createBoard();
    startTimer();
};

// Shuffle function to randomize the cards
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Create the game board
function createBoard() {
    const gameBoard = document.getElementById('game-board');
    cards.forEach(cardValue => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.value = cardValue;
        cardElement.addEventListener('click', flipCard);
        gameBoard.appendChild(cardElement);
    });
}

// Flip the card
function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return;

    this.classList.add('flipped');
    this.innerText = this.dataset.value;

    if (!firstCard) {
        firstCard = this;
    } else {
        secondCard = this;
        lockBoard = true;
        checkForMatch();
    }
}

// Check if the two flipped cards match
function checkForMatch() {
    if (firstCard.dataset.value === secondCard.dataset.value) {
        disableCards();
    } else {
        unflipCards();
    }
}

// Disable the cards that are matched
function disableCards() {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    if (document.querySelectorAll('.matched').length === cards.length) {
        endGame();
    } else {
        resetBoard();
    }
}

// Unflip cards if they don't match
function unflipCards() {
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        firstCard.innerText = "";
        secondCard.innerText = "";
        resetBoard();
    }, 1000);
}

// Reset the board after each turn
function resetBoard() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
}

// Start the timer
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

// Update the timer display
function updateTimer() {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').innerText = `Time: ${elapsedTime}s`;
}

// End the game
function endGame() {
    clearInterval(timerInterval);
    alert('Congratulations, you won!');
}

// Restart the game
function restartGame() {
    document.getElementById('game-board').innerHTML = '';
    cards.sort(() => Math.random() - 0.5); // Shuffle cards again
    createBoard();
    startTimer();
}
