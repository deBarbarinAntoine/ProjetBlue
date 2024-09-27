package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"my-minigame-site/mineSweeperMultiplayer"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// ScoreEntry Define a structure for the score entry
type ScoreEntry struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
}

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

// Middleware for adding basic security headers
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		//w.Header().Set("Content-Security-Policy", "default-src 'self'")
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
	go mineSweeperMultiplayer.CleanupExpiredRooms()

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
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
	mux.HandleFunc("/waitingRoom", mineSweeperMultiplayer.JoinWaitingRoom)

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
