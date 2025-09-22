document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const winnerModal = document.getElementById('winner-modal');
    
    const startGameBtn = document.getElementById('start-game-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const forceEndBtn = document.getElementById('force-end-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const muteBtn = document.getElementById('mute-btn');
    const bgMusic = document.getElementById('background-music');

    const player1NameInput = document.getElementById('player1-name-input');
    const player2NameInput = document.getElementById('player2-name-input');
    
    const historyContainer = document.getElementById('history-container');
    const historyTableBody = document.getElementById('history-table-body');

    const p1 = { nameEl: document.getElementById('player1-name'), panelEl: document.getElementById('player1-panel'), turnTimerEl: document.getElementById('player1-turn-timer'), inputEl: document.getElementById('player1-input'), applyBtn: document.getElementById('player1-apply-btn'), scoreEl: document.getElementById('player1-score'), totalTimeEl: document.getElementById('player1-total-time'), wordListEl: document.getElementById('player1-word-list') };
    const p2 = { nameEl: document.getElementById('player2-name'), panelEl: document.getElementById('player2-panel'), turnTimerEl: document.getElementById('player2-turn-timer'), inputEl: document.getElementById('player2-input'), applyBtn: document.getElementById('player2-apply-btn'), scoreEl: document.getElementById('player2-score'), totalTimeEl: document.getElementById('player2-total-time'), wordListEl: document.getElementById('player2-word-list') };
    
    const gameTimerEl = document.getElementById('game-timer');
    const letterComboEl = document.getElementById('letter-combo');
    const messageArea = document.getElementById('message-area');

    // --- Game State Variables ---
    let gameState = {};
    let gameHistory = [];
    let isMusicInitialized = false;

    // --- Royalty-Free Music Tracks from Pixabay ---
    const musicTracks = [
        'https://cdn.pixabay.com/audio/2022/10/18/audio_84323425f3.mp3', // Corporate
        'https://cdn.pixabay.com/audio/2022/08/04/audio_2dde66b93b.mp3', // Puzzle
        'https://cdn.pixabay.com/audio/2022/11/17/audio_811986985b.mp3', // Tech
        'https://cdn.pixabay.com/audio/2023/05/27/audio_2922a61a6b.mp3', // Funky
        'https://cdn.pixabay.com/audio/2022/01/21/audio_c3a9f02880.mp3'  // Lofi
    ];

    // --- Admin Panel Word Starters ---
    const threeLetterCombos = ["sun", "act", "for", "pre", "pla", "str", "con", "rea", "pro", "art", "ter", "sha", "win", "com", "ran", "pos", "lig", "bar", "car", "sta"];

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', initializeGame);
    newGameBtn.addEventListener('click', resetForNewGame);
    forceEndBtn.addEventListener('click', () => endGame(true));
    exportExcelBtn.addEventListener('click', exportToExcel);
    muteBtn.addEventListener('click', toggleMusic);
    p1.applyBtn.addEventListener('click', () => handleApply(1));
    p2.applyBtn.addEventListener('click', () => handleApply(2));
    p1.inputEl.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleApply(1); });
    p2.inputEl.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleApply(2); });

    // --- Music Functions (Manual Start) ---
    function toggleMusic() {
        if (bgMusic.paused) {
            bgMusic.play();
            muteBtn.textContent = '🔊';
        } else {
            bgMusic.pause();
            muteBtn.textContent = '🔇';
        }
    }

    // --- Game Logic Functions ---
    function initializeGame() {
        const p1Name = player1NameInput.value.trim() || 'Player 1';
        const p2Name = player2NameInput.value.trim() || 'Player 2';
        gameState = {
            players: { 1: { name: p1Name, score: 0, totalTime: 0, words: [] }, 2: { name: p2Name, score: 0, totalTime: 0, words: [] } },
            currentPlayer: Math.random() < 0.5 ? 1 : 2, gameTime: 300, turnTime: 30, letterCombo: '',
            gameInterval: null, turnInterval: null, allUsedWords: new Set(), isGameActive: true
        };
        p1.nameEl.textContent = p1Name; p2.nameEl.textContent = p2Name;
        document.querySelector('#player1-panel .avatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${p1Name}`;
        document.querySelector('#player2-panel .avatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${p2Name}`;
        startScreen.classList.remove('active'); gameScreen.classList.add('active');
        
        resetUI();
        startMainGameTimer();
        startTurn();

        // Auto-start music on game initialization (triggered by user click)
        if (!isMusicInitialized) {
            const randomTrack = musicTracks[Math.floor(Math.random() * musicTracks.length)];
            bgMusic.src = randomTrack;
            bgMusic.loop = true;
            bgMusic.volume = 0.3;
            bgMusic.play().catch(error => console.log("Autoplay prevented:", error));
            isMusicInitialized = true;
            muteBtn.textContent = '🔊';
        }
    }

    function resetForNewGame() {
        winnerModal.classList.remove('active');
        gameScreen.classList.remove('active');
        startScreen.classList.add('active');
        player1NameInput.value = '';
        player2NameInput.value = '';
    }
    
    function endGame(forced = false) {
        if (!gameState.isGameActive) return; 
        gameState.isGameActive = false; 
        clearInterval(gameState.gameInterval); 
        clearInterval(gameState.turnInterval);
        
        if (forced) { showMessage("Game ended manually!", "error"); }
        p1.inputEl.disabled = true; p1.applyBtn.disabled = true; p2.inputEl.disabled = true; p2.applyBtn.disabled = true;
        const player1 = gameState.players[1]; const player2 = gameState.players[2]; let winner, loser;
        if (player1.score > player2.score) { [winner, loser] = [player1, player2]; } else if (player2.score > player1.score) { [winner, loser] = [player2, player1]; } else { if (player1.totalTime <= player2.totalTime) { [winner, loser] = [player1, player2]; } else { [winner, loser] = [player2, player1]; } }
        saveGameResult(winner, loser); updateHistoryTable();
        if (player1.score === player2.score && player1.totalTime === player2.totalTime) { document.getElementById('winner-title').textContent = "It's a Draw!"; document.getElementById('winner-avatar').src = `https://api.dicebear.com/7.x/micah/svg?seed=draw`; document.getElementById('winner-name').textContent = "Both players are winners!"; document.getElementById('winner-stats').textContent = `Final Score: ${player1.score}`; } else { document.getElementById('winner-title').textContent = "Congratulations!"; document.getElementById('winner-avatar').src = `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.name}`; document.getElementById('winner-name').textContent = `${winner.name} Wins!`; document.getElementById('winner-stats').textContent = `Score: ${winner.score}, Total Time: ${winner.totalTime}s`; }
        winnerModal.classList.add('active');
    }

    function startMainGameTimer() {
        gameState.letterCombo = threeLetterCombos[Math.floor(Math.random() * threeLetterCombos.length)];
        letterComboEl.textContent = gameState.letterCombo.toUpperCase();
        gameState.gameInterval = setInterval(() => { if (!gameState.isGameActive) return; gameState.gameTime--; updateGameTimerDisplay(); if (gameState.gameTime <= 0) { endGame(); } }, 1000);
    }

    function startTurn() {
        if (!gameState.isGameActive) return; clearMessage(); gameState.turnTime = 30; updateTurnTimerDisplay();
        const currentPlayerPanel = gameState.currentPlayer === 1 ? p1 : p2; const opponentPlayerPanel = gameState.currentPlayer === 1 ? p2 : p1;
        currentPlayerPanel.panelEl.classList.add('active'); currentPlayerPanel.panelEl.classList.remove('inactive'); currentPlayerPanel.inputEl.disabled = false; currentPlayerPanel.applyBtn.disabled = false; currentPlayerPanel.inputEl.focus();
        opponentPlayerPanel.panelEl.classList.add('inactive'); opponentPlayerPanel.panelEl.classList.remove('active'); opponentPlayerPanel.inputEl.disabled = true; opponentPlayerPanel.applyBtn.disabled = true;
        clearInterval(gameState.turnInterval);
        gameState.turnInterval = setInterval(() => { if (!gameState.isGameActive) return; gameState.turnTime--; updateTurnTimerDisplay(); if (gameState.turnTime <= 0) { switchTurn(true); } }, 1000);
    }

    async function handleApply(playerNum) {
        if (playerNum !== gameState.currentPlayer || !gameState.isGameActive) return;
        const player = gameState.players[playerNum]; const playerUI = playerNum === 1 ? p1 : p2; const word = playerUI.inputEl.value.trim().toLowerCase();
        playerUI.applyBtn.disabled = true;
        if (!word) { showMessage("Please enter a word.", "error"); playerUI.applyBtn.disabled = false; return; }
        if (!word.startsWith(gameState.letterCombo)) { showMessage(`Word must start with "${gameState.letterCombo.toUpperCase()}"`, "error"); playerUI.applyBtn.disabled = false; return; }
        if (gameState.allUsedWords.has(word)) { showMessage(`"${word}" has already been used.`, "error"); playerUI.applyBtn.disabled = false; return; }
        const isValid = await checkWordInDictionary(word);
        if (isValid) {
            const timeSpent = 30 - gameState.turnTime; player.score++; player.totalTime += timeSpent; player.words.push(word); gameState.allUsedWords.add(word);
            updatePlayerUI(playerNum); showMessage(`Success! +1 for ${player.name}`, "success"); switchTurn(false);
        } else { showMessage(`"${word}" not found in the dictionary.`, "error"); playerUI.applyBtn.disabled = false; }
        playerUI.inputEl.value = '';
    }

    async function checkWordInDictionary(word) { try { const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`); return response.ok; } catch (error) { console.error("Dictionary API error:", error); showMessage("Could not connect to the dictionary service.", "error"); return false; } }
    
    function switchTurn(timedOut = false) {
        clearInterval(gameState.turnInterval);
        if (timedOut) { const player = gameState.players[gameState.currentPlayer]; player.totalTime += 30; updatePlayerUI(gameState.currentPlayer); showMessage(`${player.name} ran out of time! +30s penalty.`, 'error'); }
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        const delay = timedOut ? 2000 : 500; setTimeout(startTurn, delay);
    }
    
    function saveGameResult(winner, loser) { const result = { winnerName: winner.name, winnerScore: winner.score, winnerTime: winner.totalTime, loserName: loser.name, loserScore: loser.score, loserTime: loser.totalTime, letterCombo: gameState.letterCombo.toUpperCase() }; gameHistory.push(result); }
    
    function updateHistoryTable() {
        if (gameHistory.length === 0) return; historyContainer.classList.add('visible'); historyTableBody.innerHTML = '';
        gameHistory.forEach(result => { const row = document.createElement('tr'); row.innerHTML = `<td>${result.winnerName}</td><td>${result.winnerScore} (${result.winnerTime}s)</td><td>${result.loserName}</td><td>${result.loserScore} (${result.loserTime}s)</td><td>${result.letterCombo}</td>`; historyTableBody.appendChild(row); });
    }
    
    function exportToExcel() {
        if (gameHistory.length === 0) { alert("No game history to export!"); return; }
        let csvContent = "data:text/csv;charset=utf-8,"; const headers = ["Winner", "Winner Score", "Winner Time (s)", "Loser", "Loser Score", "Loser Time (s)", "Letter Combo"]; csvContent += headers.join(",") + "\r\n";
        gameHistory.forEach(result => { const row = [result.winnerName, result.winnerScore, result.winnerTime, result.loserName, result.loserScore, result.loserTime, result.letterCombo]; csvContent += row.join(",") + "\r\n"; });
        const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", "game_history.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
    
    function updateGameTimerDisplay() { const minutes = Math.floor(gameState.gameTime / 60); const seconds = gameState.gameTime % 60; gameTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
    
    function updateTurnTimerDisplay() { const seconds = gameState.turnTime; p1.turnTimerEl.textContent = `00:${String(seconds).padStart(2, '0')}`; p2.turnTimerEl.textContent = `00:${String(seconds).padStart(2, '0')}`; }
    
    function updatePlayerUI(playerNum) {
        const player = gameState.players[playerNum]; const playerUI = playerNum === 1 ? p1 : p2; playerUI.scoreEl.textContent = player.score; playerUI.totalTimeEl.textContent = `${player.totalTime}s`;
        if (player.words.length > 0) { playerUI.wordListEl.innerHTML = ''; player.words.forEach(word => { const li = document.createElement('li'); li.textContent = word; playerUI.wordListEl.appendChild(li); }); playerUI.wordListEl.scrollTop = playerUI.wordListEl.scrollHeight; }
    }
    
    function showMessage(msg, type) { messageArea.textContent = msg; messageArea.style.color = type === 'success' ? 'var(--success-color)' : 'var(--error-color)'; }
    
    function clearMessage() { messageArea.textContent = ''; }
    
    function resetUI() { [p1, p2].forEach(p => { p.scoreEl.textContent = '0'; p.totalTimeEl.textContent = '0s'; p.wordListEl.innerHTML = ''; p.inputEl.value = ''; }); updateGameTimerDisplay(); updateTurnTimerDisplay(); clearMessage(); }
});
