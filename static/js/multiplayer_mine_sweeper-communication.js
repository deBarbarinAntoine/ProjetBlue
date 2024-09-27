const nameInput = document.getElementById('name-input');
const joinMultiplayer = document.getElementById('multiplayer-btn');
// Establishing WebSocket connection
let socket;
let playerName;


if(!!joinMultiplayer && !!nameInput) {
    joinMultiplayer.addEventListener("click", function() {
        if (nameInput.value !== "") {
            playerName = nameInput.value
            startMatchingMultiplayer(nameInput.value);

        } else {
            console.log('Please enter a name before joining multiplayer.');
        }
    });
}

function startMatchingMultiplayer(playerName) {
    socket = new WebSocket(`ws://localhost:8080/waitingRoom?name=${playerName}`);
// On connection open
    socket.onopen = function () {
        console.log('Connected to WebSocket server.');
        // You can send a message to the server if needed
        // socket.send(JSON.stringify({ type: 'join', name: 'nicoco' }));
        const LoadingImage = document.createElement('div');
        LoadingImage.id = 'LoadingImage-overlay';
        LoadingImage.innerHTML = `<div id="LoadingImage-menu" class="menu">
                                        <div class="LoadingImage-display">
                                        <img src="/static/minesweeper/loadingImg.gif" alt="waiting to find another player">
                                        </div> 
                                        <ul class="menu-options">
                                            <li class="button-30" id="back_to_start-button">Back to Menu</li> 
                                        </ul>
                                </div>`;
        document.getElementById('game-board').innerHTML = '';
        document.getElementById('game-board').appendChild(LoadingImage); // Append overlay to game-area
        LoadingImage.style.display = 'flex'; // Show the overlay
    };

// On receiving a message from the server
    socket.onmessage = function (event) {
       // console.log('Message from server:', event.data);
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (error) {
            // Do nothing if the data is not valid JSON
            return; // Exit the function
        }

        // Handle updates from opponent's score or progress
        if (data.type === 'score-update') {
            const { name, percentage, status } = data.data;
            // Update the UI to show the opponent's score
            if (name !== playerName) {// Assuming playerName is the current player's name
                multiplayerUpdateCompletion(percentage);

                isPlayer2Alive = status;
                if (!isAlive && (opponentStrength > playerStrength || !isPlayer2Alive )) {
                    isFinished = true;
                    endGame();
                }
            }
        }

        if (data.type === 'start-game') {
            isMultiplayer = true;
            play();
        }
    };

// On error
    socket.onerror = function (error) {
        console.error('WebSocket Error: ', error);
    };

// On connection close
    socket.onclose = function (event) {
        console.log('WebSocket connection closed: ', event);
        // Handle cleanup or reconnection logic if necessary
    };
}


// Function to send WebSocket updates
function sendUpdate(type, payload) {
    const message = JSON.stringify({ type, ...payload });
    socket.send(message);
}