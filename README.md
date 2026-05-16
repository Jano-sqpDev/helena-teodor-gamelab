# Helena & Teodor's Game Lab 🧪

A collection of browser games made by kids, hosted on a self-managed homelab server with CI/CD.

## Tech Stack

- **Nginx** — static file server (Alpine Docker image)
- **Docker Compose** — container orchestration
- **GitHub Actions** — CI/CD with self-hosted runner
- **Bitfrost** — Ubuntu homelab server

## Adding a New Game

1. Create a folder: `site/games/game-XX-name/`
2. Add your game files (`index.html`, `game.js`, `style.css`)
3. Add an entry to `site/games.json`:
   ```json
   {
     "folder": "game-XX-name",
     "title": "Game Name",
     "description": "Short description",
     "emoji": "🎮"
   }
   ```
4. Push to `main` — CI/CD deploys automatically

## Run Locally

```bash
docker compose up -d
# Visit http://localhost:8080
```

## Project Structure

```
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .github/workflows/deploy.yml
└── site/
    ├── index.html          ← landing page
    ├── css/style.css
    ├── games.json           ← game registry
    └── games/
        └── game-01-hangman/
```
