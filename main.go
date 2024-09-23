package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"time"
)

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

// Serve the reaction speed page
func reactionSpeedPage(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./html-page/shoot-the-target.html")
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
	mux.HandleFunc("/reaction-speed", reactionSpeedPage)

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
