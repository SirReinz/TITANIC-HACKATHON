document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const gameArea = document.getElementById('game-area');
    const startButton = document.getElementById('start-button');
    const scoreDisplay = document.getElementById('score-display');
    const roundDisplay = document.getElementById('round-display');
    const gameMessage = document.getElementById('game-message');
    const barrelCountInput = document.getElementById('barrel-count-input');
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modal-message');
    const nextRoundButton = document.getElementById('next-round-button');

    // --- Game State Variables ---
    let score = 0;
    let round = 1;
    let gameActive = false;
    let isDragging = false;
    let playerElement = null;
    let playerPosition = { x: 275, y: 125 };
    let barrels = []; // Will store { element, x, y, speed }
    let animationId = null;
    let barrelCreationTimeout = null;
    let barrelsCreated = 0;

    // --- Game Logic Functions ---

    const createPlayer = () => {
        if (playerElement) playerElement.remove();
        playerElement = document.createElement('div');
        playerElement.className = "absolute w-12 h-12 bg-red-500 rounded-full border-2 border-yellow-300 z-10";
        playerElement.innerHTML = `<div class="w-6 h-6 bg-yellow-300 rounded-full mx-auto mt-1"></div>`;
        updatePlayerPosition();
        gameArea.appendChild(playerElement);
    };

    const updatePlayerPosition = () => {
        if (!playerElement) return;
        playerElement.style.left = `${playerPosition.x}px`;
        playerElement.style.top = `${playerPosition.y}px`;
        playerElement.style.transition = isDragging ? 'none' : 'all 0.1s ease';
    };

    const movePlayer = (clientX, clientY) => {
        if (!gameActive) return;
        const rect = gameArea.getBoundingClientRect();
        let newX = clientX - rect.left - 25; // Center player
        let newY = clientY - rect.top - 25;

        newX = Math.max(0, Math.min(rect.width - 50, newX));
        newY = Math.max(0, Math.min(rect.height - 50, newY));

        playerPosition = { x: newX, y: newY };
        updatePlayerPosition();
    };

    const startGame = () => {
        gameActive = true;
        score = 0;
        barrelsCreated = 0;
        barrels.forEach(b => b.element.remove());
        barrels = [];

        startButton.disabled = true;
        startButton.textContent = "Playing...";
        gameMessage.textContent = "Drag your mouse or finger to move the player!";
        scoreDisplay.textContent = `Score: ${score}`;
        
        playerPosition = { x: 275, y: 125 };
        createPlayer();

        createBarrel();
        gameLoop();
    };

    const endGame = (won) => {
        gameActive = false;
        cancelAnimationFrame(animationId);
        clearTimeout(barrelCreationTimeout);

        const barrelCount = parseInt(barrelCountInput.value, 10);
        modalMessage.textContent = won
            ? `You Won! Dodged all ${barrelCount} barrels. Score: ${score}`
            : `Game Over! Hit by barrel. Score: ${score}`;
        
        modal.style.display = 'flex';
    };

    const nextRound = () => {
        round++;
        roundDisplay.textContent = `Round: ${round}`;
        modal.style.display = 'none';
        startButton.disabled = false;
        startButton.textContent = "START GAME";
        gameMessage.textContent = "Click Start to begin!";
        if (playerElement) playerElement.remove();
        playerElement = null;
    };

    const createBarrel = () => {
        const barrelCount = parseInt(barrelCountInput.value, 10);
        if (!gameActive || barrelsCreated >= barrelCount) return;

        const difficultyMultiplier = 1 + (round - 1) * 0.25; // 25% harder each round
        const isFuryBarrel = Math.random() < 0.33; // 33% chance of a "Fury" barrel
        const isWobbleBarrel = Math.random() < 0.40; // 40% chance of a "Wobble" barrel

        const barrelElem = document.createElement('div');
        barrelElem.className = `absolute w-10 h-10 rounded border-2 ${isFuryBarrel ? 'bg-red-800 border-red-900' : 'bg-amber-700 border-amber-900'}`;
        barrelElem.innerHTML = `<div class="w-2 h-2 bg-amber-500 rounded-full mx-auto mt-1"></div><div class="w-6 h-1 bg-amber-900 mx-auto mt-1"></div>`;
        
        let baseSpeed = (3.0 + Math.random() * 4.0) * difficultyMultiplier;
        if (isFuryBarrel) {
            baseSpeed *= 1.5; // Fury barrels are 50% faster
        }

        const startY = Math.random() * (gameArea.clientHeight - 80) + 40; // Keep wobble in bounds

        const barrel = {
            element: barrelElem,
            x: gameArea.clientWidth,
            y: startY,
            speed: baseSpeed,
            isWobble: isWobbleBarrel,
            originalY: startY,
            wobbleAngle: Math.random() * Math.PI * 2,
            wobbleMagnitude: 20 + Math.random() * 20
        };

        barrel.element.style.left = `${barrel.x}px`;
        barrel.element.style.top = `${barrel.y}px`;

        barrels.push(barrel);
        gameArea.appendChild(barrelElem);
        barrelsCreated++;

        if (barrelsCreated < barrelCount) {
            const spawnDelay = (600 + Math.random() * 1000) / difficultyMultiplier;
            barrelCreationTimeout = setTimeout(createBarrel, Math.max(150, spawnDelay)); // Ensure delay doesn't get too low
        }
    };

    const checkCollision = (barrel, player) => {
        const overlap = 10; // Collision padding
        return (
            barrel.x < player.x + 50 - overlap &&
            barrel.x + 40 > player.x + overlap &&
            barrel.y < player.y + 50 - overlap &&
            barrel.y + 40 > player.y + overlap
        );
    };

    const gameLoop = () => {
        if (!gameActive) return;

        let scoreIncrease = 0;
        const remainingBarrels = [];

        for (const barrel of barrels) {
            barrel.x -= barrel.speed;

            if (barrel.isWobble) {
                barrel.wobbleAngle += 0.1;
                barrel.y = barrel.originalY + Math.sin(barrel.wobbleAngle) * barrel.wobbleMagnitude;
            }

            if (barrel.x + 40 < 0) {
                // Barrel is off-screen
                barrel.element.remove();
                scoreIncrease++;
            } else {
                // Barrel is on-screen
                barrel.element.style.left = `${barrel.x}px`;
                barrel.element.style.top = `${barrel.y}px`;
                remainingBarrels.push(barrel);

                if (checkCollision(barrel, playerPosition)) {
                    endGame(false);
                    return; // Stop the loop
                }
            }
        }

        barrels = remainingBarrels;
        if (scoreIncrease > 0) {
            score += scoreIncrease;
            scoreDisplay.textContent = `Score: ${score}`;
        }

        const barrelCount = parseInt(barrelCountInput.value, 10);
        if (barrelsCreated >= barrelCount && barrels.length === 0) {
            endGame(true);
            return;
        }

        animationId = requestAnimationFrame(gameLoop);
    };

    // --- Event Listeners ---
    const onDragStart = (e) => {
        if (!gameActive) return;
        if (e.type === 'touchstart') e.preventDefault();
        isDragging = true;
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        movePlayer(touch.clientX, touch.clientY);
        if (playerElement) playerElement.style.transition = 'none';
    };

    const onDragMove = (e) => {
        if (!isDragging || !gameActive) return;
        if (e.type === 'touchmove') e.preventDefault();
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        movePlayer(touch.clientX, touch.clientY);
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        if (playerElement) playerElement.style.transition = 'all 0.1s ease';
    };

    startButton.addEventListener('click', startGame);
    nextRoundButton.addEventListener('click', nextRound);

    gameArea.addEventListener('mousedown', onDragStart);
    gameArea.addEventListener('touchstart', onDragStart, { passive: false });

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });

    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);
});
