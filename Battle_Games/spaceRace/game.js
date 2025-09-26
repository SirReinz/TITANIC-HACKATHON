document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const gameArea = document.getElementById('game-area');
    const startButton = document.getElementById('start-button');
    const scoreDisplay = document.getElementById('score-display');
    const gameMessage = document.getElementById('game-message');
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const playAgainButton = document.getElementById('play-again-button');
    const canvas = document.getElementById('starfield-canvas');
    const ctx = canvas.getContext('2d');

    // --- Game State Variables ---
    let score = 0;
    let gameActive = false;
    let isDragging = false;
    let playerTargetX = null; // New variable to track player's intended position

    let player = { element: null, x: 0, y: 0, width: 40, height: 40, prevX: 0 };
    let ai = { element: null, x: 0, y: 0, width: 40, height: 40, prevX: 0 };
    
    let asteroids = []; // Will store { element, x, y, speed }
    let animationId = null;
    let asteroidCreationInterval = null;
    let scoreInterval = null;
    let stars = [];

    // --- Game Setup and Teardown ---

    const createShip = (shipObject, className, initialX) => {
        if (shipObject.element) shipObject.element.remove();
        shipObject.element = document.createElement('div'); // Revert to div from img
        shipObject.element.className = `ship ${className}`;
        shipObject.y = gameArea.clientHeight - shipObject.height - 10;
        shipObject.x = initialX;
        updateShipPosition(shipObject);
        gameArea.appendChild(shipObject.element);
    };


    const updateShipPosition = (shipObject) => {
        if (!shipObject.element) return;
        shipObject.element.style.left = `${shipObject.x}px`;
        shipObject.element.style.top = `${shipObject.y}px`;
    };

    const startGame = () => {
        gameActive = true;
        score = 0;
        asteroids.forEach(a => a.element.remove());
        asteroids = [];
        setupStarfield();

        startButton.disabled = true;
        startButton.textContent = "Racing...";
        gameMessage.textContent = "Drag the blue ship to move!";
        scoreDisplay.textContent = `Score: ${score}`;
        modal.style.display = 'none';

        playerTargetX = gameArea.clientWidth * 0.25 - player.width / 2;
        createShip(player, 'player-ship', gameArea.clientWidth * 0.25 - player.width / 2);
        createShip(ai, 'ai-ship', gameArea.clientWidth * 0.75 - ai.width / 2);

        asteroidCreationInterval = setInterval(createAsteroid, 350); // Extreme spawn rate
        scoreInterval = setInterval(() => {
            if (gameActive) {
                score++;
                scoreDisplay.textContent = `Score: ${score}`;
            }
        }, 100);
        
        gameLoop();
    };

    const createExplosion = (x, y) => {
        // Screen flash effect
        const flash = document.createElement('div');
        flash.className = 'flash';
        flash.style.left = `${x - 100}px`;
        flash.style.top = `${y - 100}px`;
        gameArea.appendChild(flash);
        setTimeout(() => flash.remove(), 400);

        // Particle effect
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 6 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.background = ['#ffbe0b', '#fb5607', '#ff006e', '#ffffff'][Math.floor(Math.random() * 4)];
            gameArea.appendChild(particle);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 7 + 3;
            let posX = x;
            let posY = y;
            
            const moveParticle = (timestamp, start) => {
                const elapsed = timestamp - start;
                posX += Math.cos(angle) * speed * (1 - elapsed / 800); // Particles slow down
                posY += Math.sin(angle) * speed * (1 - elapsed / 800);
                particle.style.left = `${posX}px`;
                particle.style.top = `${posY}px`;
                particle.style.opacity = 1 - (elapsed / 800);
                if (elapsed < 800) requestAnimationFrame(ts => moveParticle(ts, start));
                else particle.remove();
            };
            requestAnimationFrame(ts => moveParticle(ts, ts));
        }
    };

    const endGame = (loser, ship) => {
        if (!gameActive) return; // Prevent multiple calls
        gameActive = false;
        
        cancelAnimationFrame(animationId);
        clearInterval(asteroidCreationInterval);
        clearInterval(scoreInterval);

        createExplosion(ship.x + ship.width / 2, ship.y + ship.height / 2);
        ship.element.remove();

        const winner = loser === 'Player' ? 'AI' : 'Player';
        modalMessage.textContent = `${winner} wins! Final Score: ${score}`;
        modal.style.display = 'flex';
    };

    const resetGame = () => {
        modal.style.display = 'none';
        startButton.disabled = false;
        startButton.textContent = "START GAME";
        gameMessage.textContent = "Click Start to begin the race!";
        if (player.element) player.element.remove();
        if (ai.element) ai.element.remove();
    };

    // --- Player Controls ---

    const movePlayer = (clientX) => {
        if (!gameActive) return;
        const rect = gameArea.getBoundingClientRect();
        // Just update the target, don't move the ship directly
        playerTargetX = clientX - rect.left - player.width / 2;
    };

    // --- AI Logic ---

    const moveAI = () => {
        // Store previous position for momentum calculation
        ai.prevX = ai.x;

        if (!gameActive) return;

        // Find the closest asteroid that is a threat
        let closestAsteroid = null;
        let minDistance = Infinity;

        for (const asteroid of asteroids) {
            if (asteroid.y < ai.y && asteroid.y > gameArea.clientHeight / 3) {
                const distance = Math.sqrt(Math.pow(ai.x - asteroid.x, 2) + Math.pow(ai.y - asteroid.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestAsteroid = asteroid;
                }
            }
        }

        if (closestAsteroid) {
            const dangerZone = ai.width * 1.8; // AI is more cautious
            // If asteroid is horizontally close, move away
            if (Math.abs(closestAsteroid.x - ai.x) < dangerZone) {
                if (closestAsteroid.x < ai.x) {
                    // Asteroid is to the left, move right
                    ai.x += 4; // AI moves faster
                } else {
                    // Asteroid is to the right, move left
                    ai.x -= 4;
                }
            }
        }

        // Keep AI within bounds
        ai.x = Math.max(0, Math.min(gameArea.clientWidth - ai.width, ai.x));
        updateShipPosition(ai);
    };

    // --- Asteroid and Collision Logic ---

    const createAsteroid = () => {
        if (!gameActive) return;

        const isHunter = Math.random() < 0.15; // 15% chance for a hunter asteroid
        const asteroidElem = document.createElement('div');
        const size = 20 + Math.random() * 30;
        asteroidElem.className = `absolute asteroid ${isHunter ? 'hunter-asteroid' : ''}`;
        asteroidElem.style.width = `${size}px`;
        asteroidElem.style.height = `${size}px`;
        asteroidElem.style.borderRadius = `${Math.random()*40 + 40}% ${Math.random()*40 + 40}% ${Math.random()*40 + 40}% ${Math.random()*40 + 40}%`;

        const speedBonus = score / 80; // Speed ramps up much faster

        const asteroid = {
            element: asteroidElem,
            x: Math.random() * (gameArea.clientWidth - size),
            y: -size,
            speed: (isHunter ? 3.5 : 2.5) + speedBonus + Math.random() * 3.0,
            width: size,
            height: size,
            isHunter: isHunter,
            dx: 0, // Horizontal velocity for hunters
            dy: 1
        };

        asteroid.element.style.left = `${asteroid.x}px`;
        asteroid.element.style.top = `${asteroid.y}px`;
        
        asteroids.push(asteroid);
        gameArea.appendChild(asteroidElem);
    };

    // --- Starfield Background ---
    const setupStarfield = () => {
        canvas.width = gameArea.clientWidth;
        canvas.height = gameArea.clientHeight;
        stars = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.5 + 0.2
            });
        }
    };

    const drawStarfield = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();

            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        });
    };


    // --- Collision Logic ---

    const checkCollision = (asteroid, ship) => {
        const padding = 5; // Make collision a bit more forgiving
        return (
            asteroid.x < ship.x + ship.width - padding &&
            asteroid.x + asteroid.width > ship.x + padding &&
            asteroid.y < ship.y + ship.height - padding &&
            asteroid.y + asteroid.height > ship.y + padding
        );
    };

    const checkShipCollision = () => {
        if (!player.element || !ai.element) return;

        const collision = (
            player.x < ai.x + ai.width &&
            player.x + player.width > ai.x &&
            player.y < ai.y + ai.height &&
            player.y + player.height > ai.y
        );

        if (collision) {
            const playerMomentum = player.x - player.prevX;
            const aiMomentum = ai.x - ai.prevX;
            const pushForce = 5;

            if (Math.abs(playerMomentum) > Math.abs(aiMomentum)) {
                ai.x += playerMomentum > 0 ? pushForce : -pushForce;
            } else {
                player.x += aiMomentum > 0 ? pushForce : -pushForce;
            }
        }
    };

    // --- Main Game Loop ---

    const gameLoop = () => {
        if (!gameActive) return;

        drawStarfield();

        const remainingAsteroids = [];

        for (const asteroid of asteroids) {
            if (asteroid.isHunter) {
                // Hunter logic: slowly move towards the player
                const angle = Math.atan2(player.y - asteroid.y, player.x - asteroid.x);
                asteroid.dx = Math.cos(angle);
                asteroid.x += asteroid.dx * 1.5; // Horizontal tracking speed
            }

            asteroid.y += asteroid.speed * asteroid.dy;

            if (asteroid.y > gameArea.clientHeight) {
                asteroid.element.remove();
            } else {
                asteroid.element.style.top = `${asteroid.y}px`;
                asteroid.element.style.left = `${asteroid.x}px`;
                remainingAsteroids.push(asteroid);

                if (checkCollision(asteroid, player)) {
                    endGame('Player', player);
                    return;
                }
                if (checkCollision(asteroid, ai)) {
                    endGame('AI', ai);
                    return;
                }
            }
        }
        asteroids = remainingAsteroids;

        // Store previous positions for momentum calculation before any moves
        player.prevX = player.x;

        // --- UPDATE POSITIONS ---
        // Move player towards the target X from mouse/touch input
        if (playerTargetX !== null) {
            player.x = Math.max(0, Math.min(gameArea.clientWidth - player.width, playerTargetX));
            updateShipPosition(player);
        }
        // Move AI
        moveAI();

        // --- HANDLE COLLISIONS ---
        // Now that both ships have their final positions for this frame, check for collision
        checkShipCollision();

        animationId = requestAnimationFrame(gameLoop);
    };

    // --- Event Listeners ---
    const onDragStart = (e) => {
        if (!gameActive) return;
        const targetElement = e.target.closest('.player-ship');
        if (!targetElement) return;

        if (e.type === 'touchstart') e.preventDefault();
        isDragging = true;
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        movePlayer(touch.clientX);
    };

    const onDragMove = (e) => {
        if (!isDragging || !gameActive) return;
        if (e.type === 'touchmove') e.preventDefault();
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        movePlayer(touch.clientX);
    };

    const onDragEnd = () => {
        isDragging = false;
    };

    startButton.addEventListener('click', startGame);
    playAgainButton.addEventListener('click', resetGame);

    gameArea.addEventListener('mousedown', onDragStart);
    gameArea.addEventListener('touchstart', onDragStart, { passive: false });

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });

    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
});