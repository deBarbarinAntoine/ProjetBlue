package mineSweeperMultiplayer

import (
	"fmt"
	"github.com/gorilla/websocket"
	"math/rand"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type Room struct {
	ID        string
	Player1   *Player
	Player2   *Player
	StartTime time.Time
	Timer     *time.Timer // Timer to handle room expiration
	IsActive  bool        // Track if the game is still active
	Mutex     sync.Mutex  // For handling concurrent access to the room
}

type Player struct {
	Name   string
	Conn   *websocket.Conn
	Active bool
}

var waitingRoom = make(chan *Player, 10) // Queue of players waiting for a match
var activeRooms = make(map[string]*Room) // Active rooms

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins (you can restrict this in production)
		return true
	},
}

// JoinWaitingRoom WebSocket handler for joining the waiting room
func JoinWaitingRoom(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection"+err.Error(), http.StatusBadRequest)
		return
	}

	// Player details (you can add more validation if necessary)
	playerName := r.URL.Query().Get("name")
	if playerName == "" {
		http.Error(w, "Player name is required", http.StatusBadRequest)
		return
	}

	// Player details
	player := &Player{
		Name:   playerName,
		Conn:   conn,
		Active: true,
	}

	// Add player to the waiting room
	waitingRoom <- player
	fmt.Println(player.Name, "entered the waiting room")

	// Match players
	go matchPlayers()
}

func matchPlayers() {
	if len(waitingRoom) >= 2 {
		fmt.Println("test")
		// Get the first two players from the queue
		player1 := <-waitingRoom
		player2 := <-waitingRoom

		// Create a new room with a unique ID
		roomID := strconv.Itoa(rand.Intn(10000))
		room := &Room{
			ID:        roomID,
			Player1:   player1,
			Player2:   player2,
			StartTime: time.Now(),
			IsActive:  true,
		}

		// Add the room to activeRooms
		activeRooms[roomID] = room

		// Start monitoring both players for disconnections in separate goroutines
		go monitorPlayerConnection(player1, room)
		go monitorPlayerConnection(player2, room)

		// Start the room expiration timer (5 minutes)
		room.Timer = time.AfterFunc(5*time.Minute, func() {
			room.Mutex.Lock()
			defer room.Mutex.Unlock()

			// If the room is still inactive, clean it up
			if room.IsActive {
				fmt.Printf("Room %s expired due to inactivity.\n", room.ID)
				delete(activeRooms, room.ID)
				closeRoom(room)
			}
		})

		// Notify players that they have been matched (start the game or send a message)
		notifyPlayers(room)
	}
}

func closeRoom(room *Room) {
	// Notify both players that the room is closed
	if room.Player1 != nil && room.Player1.Conn != nil {
		err := room.Player1.Conn.WriteMessage(websocket.TextMessage, []byte("Room has expired."))
		if err != nil {
			fmt.Println(err)
			return
		}
		err = room.Player1.Conn.Close()
		if err != nil {
			fmt.Println(err)
			return
		}
	}

	if room.Player2 != nil && room.Player2.Conn != nil {
		err := room.Player2.Conn.WriteMessage(websocket.TextMessage, []byte("Room has expired."))
		if err != nil {
			fmt.Println(err)
			return
		}
		err = room.Player2.Conn.Close()
		if err != nil {
			fmt.Println(err)
			return
		}
	}

	room.IsActive = false
}

func notifyPlayers(room *Room) {
	// Notify Player1
	msg := fmt.Sprintf("Matched! You are in Room %s against %s", room.ID, room.Player2.Name)
	err := room.Player1.Conn.WriteMessage(websocket.TextMessage, []byte(msg))
	if err != nil {
		fmt.Println("Error notifying player 1:", err)
	}

	// Notify Player2
	msg = fmt.Sprintf("Matched! You are in Room %s against %s", room.ID, room.Player1.Name)
	err = room.Player2.Conn.WriteMessage(websocket.TextMessage, []byte(msg))
	if err != nil {
		fmt.Println("Error notifying player 2:", err)
	}

	// Start the game for both players
	startGame(room)
}

func startGame(room *Room) {
	// Cancel the expiration timer because the game is starting
	if room.Timer != nil {
		room.Timer.Stop()
	}

	// Now manage the game state, turns, etc.
	room.IsActive = true

	// Notify players that the game is starting
	startGameMessage := map[string]interface{}{
		"type": "start-game",
	}

	// Send the message to Player 1
	err := room.Player1.Conn.WriteJSON(startGameMessage)
	if err != nil {
		fmt.Println("Error notifying player 1 about the start of the game:", err)
	}

	// Send the message to Player 2
	err = room.Player2.Conn.WriteJSON(startGameMessage)
	if err != nil {
		fmt.Println("Error notifying player 2 about the start of the game:", err)
	}
}

func monitorPlayerConnection(player *Player, room *Room) {
	for {
		_, _, err := player.Conn.ReadMessage()
		if err != nil {
			// Player disconnected
			fmt.Printf("Player %s disconnected from room %s\n", player.Name, room.ID)

			// Lock the room to prevent race conditions
			room.Mutex.Lock()
			defer room.Mutex.Unlock()

			// Notify the other player and close the room
			if player == room.Player1 && room.Player2 != nil {
				err := room.Player2.Conn.WriteMessage(websocket.TextMessage, []byte("Your opponent disconnected. The room will close."))
				if err != nil {
					fmt.Println("Error notifying player 2:", err)
					return
				}
			} else if player == room.Player2 && room.Player1 != nil {
				err := room.Player1.Conn.WriteMessage(websocket.TextMessage, []byte("Your opponent disconnected. The room will close."))
				if err != nil {
					fmt.Println("Error notifying player 1:", err)
					return
				}
			}

			// Close the room and remove it from activeRooms
			delete(activeRooms, room.ID)
			closeRoom(room)
			return
		}
	}
}

func CleanupExpiredRooms() {
	ticker := time.NewTicker(1 * time.Minute) // Check every minute
	for range ticker.C {
		for roomID, room := range activeRooms {
			room.Mutex.Lock()
			if time.Since(room.StartTime) > 5*time.Minute && !room.IsActive {
				fmt.Printf("Cleaning up expired room: %s\n", roomID)
				delete(activeRooms, roomID)
				closeRoom(room)
			}
			room.Mutex.Unlock()
		}
	}
}

//func updatePlayerScore(room *Room, player *Player, score int) {
//	// Determine the other player
//	otherPlayer := room.Player1
//	if player == room.Player1 {
//		otherPlayer = room.Player2
//	}
//
//	// Send score updates to both players
//	scoreUpdate := map[string]interface{}{
//		"type":   "score-update",
//		"player": player.Name,
//		"score":  score,
//	}
//
//	// Notify both players
//	_ = player.Conn.WriteJSON(scoreUpdate)
//	_ = otherPlayer.Conn.WriteJSON(scoreUpdate)
//}
