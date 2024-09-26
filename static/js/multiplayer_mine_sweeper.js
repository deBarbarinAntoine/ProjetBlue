const nameInput = document.getElementById('name-input');
const joinMultiplayer = document.getElementById('multiplayer-btn');

if(!!joinMultiplayer && !!nameInput) {
    joinMultiplayer.addEventListener("click", function() {
        if (nameInput.value !== "") {
            startMatchingMultiplayer(nameInput.value);
        } else {
            console.log('Please enter a name before joining multiplayer.');
        }
    });
}

function startMatchingMultiplayer(playerName) {
    // Create a WebSocket connection
    const socket = new WebSocket(`ws://localhost:8080/join-waiting-room?name=${playerName}`);

    // Event listener for when the WebSocket connection opens
    socket.onopen = function (event) {
        console.log('Connected to the WebSocket server');

        // Optionally, send a message to the server after connecting
        socket.send(JSON.stringify({message: 'Hello from ' + playerName}));
    };

    // Event listener for incoming messages from the server
    socket.onmessage = function (event) {
        const message = event.data;
        console.log('Message from server:', message);
    };

    // Event listener for handling WebSocket connection errors
    socket.onerror = function (error) {
        console.error('WebSocket Error:', error);
    };

    // Event listener for when the WebSocket connection closes
    socket.onclose = function (event) {
        console.log('Disconnected from WebSocket server');
    };
}
