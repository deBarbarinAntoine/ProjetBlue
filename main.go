package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gorilla/websocket"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strconv"
	"sync"
	"time"
)

// ScoreEntry Define a structure for the score entry
type ScoreEntry struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
}

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

var fileLock sync.Mutex // Protects file access to avoid race conditions

func saveScoreHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// Parse the incoming JSON request
	var newEntry ScoreEntry
	err := json.NewDecoder(r.Body).Decode(&newEntry)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate the incoming score entry
	if newEntry.Name == "" || newEntry.Score < 0 {
		http.Error(w, "Invalid score data", http.StatusBadRequest)
		return
	}

	// File path for storing the scores
	filePath := "./static/shooting-scores.json"

	// Lock to prevent concurrent access to the file
	fileLock.Lock()
	defer fileLock.Unlock()

	// Read existing scores from file
	file, err := os.ReadFile(filePath)
	if err != nil && !os.IsNotExist(err) { // If file doesn't exist, that's fine
		http.Error(w, "Error reading the scores file", http.StatusInternalServerError)
		return
	}

	var scores []ScoreEntry
	if len(file) > 0 { // Only unmarshal if the file has content
		err = json.Unmarshal(file, &scores)
		if err != nil {
			http.Error(w, "Error parsing the scores file", http.StatusInternalServerError)
			return
		}
	}

	// Append the new score to the list
	scores = append(scores, newEntry)

	// Sort scores by highest first
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Score > scores[j].Score
	})

	// Write the updated scores back to the JSON file
	updatedScores, err := json.MarshalIndent(scores, "", "  ")
	if err != nil {
		http.Error(w, "Error saving the updated scores", http.StatusInternalServerError)
		return
	}

	err = os.WriteFile(filePath, updatedScores, 0644)
	if err != nil {
		http.Error(w, "Error writing the scores to file", http.StatusInternalServerError)
		return
	}

	// Return the updated list of scores as a JSON response
	w.Header().Set("Content-Type", "application/json")
	_, err = w.Write(updatedScores)
	if err != nil {
		fmt.Println(err)
		return
	}
}

func retrieveScoreHandler(w http.ResponseWriter, r *http.Request) {
	// Check if the request method is GET
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	// File path for storing the scores
	filePath := "./static/shooting-scores.json"

	// Lock to prevent concurrent access to the file
	fileLock.Lock()
	defer fileLock.Unlock()

	// Read existing scores from file
	file, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// If the file does not exist, return an empty score list
			w.Header().Set("Content-Type", "application/json")
			_, err := w.Write([]byte("[]"))
			if err != nil {
				fmt.Println(err)
				return
			}
			return
		}
		http.Error(w, "Error reading the scores file", http.StatusInternalServerError)
		return
	}

	// Set the response header for JSON content type
	w.Header().Set("Content-Type", "application/json")

	// Write the scores back to the response
	_, err = w.Write(file)
	if err != nil {
		http.Error(w, "Error writing the scores to response", http.StatusInternalServerError)
		return
	}
}

// Serve the homepage
func homePage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/index.html")
}

// Serve the memory match page
func memoryMatchPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/memory-match.html")
}

// Serve the puzzle game page
func puzzleGamePage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/puzzle-game.html")
}

// Serve the shooting target page
func shootingGame(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/shoot-the-target.html")
}

// Serve the mine sweeper page
func mineSweeper(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/mine-sweeper.html")
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins (you can restrict this in production)
		return true
	},
}

// WebSocket handler for joining the waiting room
func joinWaitingRoom(w http.ResponseWriter, r *http.Request) {
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

func cleanupExpiredRooms() {
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

// Middleware for adding basic security headers
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Content-Security-Policy", "default-src 'self'")
		next.ServeHTTP(w, r)
	})
}

// Serve static files with caching headers
func staticFilesHandler() http.Handler {
	fileServer := http.FileServer(http.Dir("./static"))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set cache control for performance
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		fileServer.ServeHTTP(w, r)
	})
}

// 404 Error handler
func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/404.html")
}

// Start the server
func main() {
	go cleanupExpiredRooms()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	// Static file serving with caching
	mux.Handle("/static/", http.StripPrefix("/static/", staticFilesHandler()))

	// Routes
	mux.HandleFunc("/", homePage)
	mux.HandleFunc("/memory-match", memoryMatchPage)
	mux.HandleFunc("/puzzle-game", puzzleGamePage)
	mux.HandleFunc("/shooting-game", shootingGame)
	mux.HandleFunc("/mine-sweeper", mineSweeper)
	mux.HandleFunc("/waitingRoom", joinWaitingRoom)

	// AJAX endpoint to save and retrieve score
	mux.HandleFunc("/save-score", saveScoreHandler)
	mux.HandleFunc("/get-save-score", retrieveScoreHandler) // Fixed the endpoint path

	// Serve a custom 404 page for any unknown routes
	mux.HandleFunc("/404", notFoundHandler)
	mux.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join("static", "favicon.ico"))
	})

	// Wrap everything in the security headers middleware
	handler := securityHeaders(mux)

	// Create the server with a timeout configuration
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  15 * time.Second,
	}

	// Graceful shutdown
	go func() {
		fmt.Printf("Server is starting on port %s... at http://localhost:%s/\n", port, port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Could not listen on port %s: %v\n", port, err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	fmt.Println("Shutting down the server...")
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	fmt.Println("Server exiting")
}
