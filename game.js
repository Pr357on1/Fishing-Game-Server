// Game Constants
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const TILE_SIZE = 64;
let PLAYER_SPEED = 2.6;
const CAMERA_SMOOTH = 0.06;
const DEFAULT_CAMERA_ZOOM = 3.4;
const PLAYER_RENDER_SMOOTH = 0.25;
const GRAVITY = 0.34;
const JUMP_POWER = -9;
const GROUND_SURFACE_OFFSET = -4;
const FLY_SPEED = 3;
const GROUND_LEVEL = CANVAS_HEIGHT - 150;
const FRICTION = 0.85;
const MULTIPLAYER_URL = 'wss://fishing-game-server.onrender.com';
const WEATHER_TOGGLE_MS = 180000;
const AVATARS = [
    { id: 'reef', skin: '#58B4A6', shirt: '#3FA08E', pants: '#2C7E71' },
    { id: 'sunset', skin: '#F2C1A0', shirt: '#E87D72', pants: '#B85C4E' },
    { id: 'island', skin: '#CFE63A', shirt: '#6AC93F', pants: '#2E6E2B' },
    { id: 'deep', skin: '#B3D6F5', shirt: '#5C8BD6', pants: '#2F5E9E' },
    { id: 'ember', skin: '#F1B458', shirt: '#D9742A', pants: '#7A3E1B' }
];

// Game State
const game = {
    canvas: null,
    ctx: null,
    player: {
        x: CANVAS_WIDTH / 2,
        y: GROUND_LEVEL - 50, // Will be set properly on init
        width: 40,
        height: 50,
        vx: 0,
        vy: 0,
        renderX: 0,
        renderY: 0,
        onGround: true,
        facingRight: true,
        flying: false,
        swimming: false,
        jumpCooldown: 0
    },
    camera: {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        zoom: DEFAULT_CAMERA_ZOOM
    },
    treeStyle: {
        leafSpread: 1.25,
        leafFlatness: 1.15
    },
    keys: {},
    inventory: [],
    hotbar: [null, null, null, null, null],
    selectedSlot: 0,
    money: 100,
    nextItemId: 0,
    sellSettings: null,
    devMode: false,
    palmTrees: [],
    shopKeeper: {
        x: 220,
        y: GROUND_LEVEL - 60,
        width: 50,
        height: 60,
        interactionRange: 100,
        dialogueIndex: 0
    },
    ground: {
        y: GROUND_LEVEL,
        platforms: []
    },
    island: {
        x: 80,
        width: 1560,
        dock: {
            x: 360,
            width: 240,
            y: GROUND_LEVEL - 20,
            fishingSpots: []
        }
    },
    dialogue: {
        active: false,
        currentDialogue: [],
        index: 0
    },
    locations: {
        shop: { x: 200, y: GROUND_LEVEL - 50 },
        dock: { x: 360, y: GROUND_LEVEL - 50 }
    },
    fishing: {
        active: false,
        indicatorPos: 0,
        indicatorSpeed: 5,
        targetPos: 0,
        targetWidth: 30,
        timer: 15,
        difficulty: 0.3,
        progress: 0,
        fishPos: 50,
        fishVel: 0,
        progressGain: 0.01,
        progressLoss: 0.005,
        fishSpeedMultiplier: 1,
        rodStats: null,
        castActive: false,
        castX: 0,
        castY: 0,
        castInWater: false,
        catchDisplay: null,
        stage: 1,
        stagesTotal: 1,
        stageType: 'track',
        stageBaseTime: 15,
        stageTimeRemaining: 15,
        pendingRarity: null,
        pendingRarityChance: 0,
        difficultyScale: 1,
        targetHitsRemaining: 0,
        timingHits: 0,
        timingHitsNeeded: 0,
        timingMarkerPos: 50,
        timingMarkerDir: 1,
        timingTargetCenter: 50,
        timingTargetWidth: 18,
        timingSpeed: 1
    },
    weather: {
        type: 'sunny',
        nextToggleAt: 0,
        drops: [],
        splashes: []
    },
    multiplayer: {
        ws: null,
        id: null,
        players: [],
        lastSent: 0,
        reconnectTimer: null,
        name: '',
        avatar: AVATARS[0].id,
        passcode: '',
        ready: false,
        mode: 'gift',
        selectedPlayerId: null,
        selectedItem: null,
        tradeOffer: null,
        tradePending: null,
        tradeRespond: null,
        interactCooldown: 0,
        remotePlayers: {},
        authed: false,
        saveDirty: false,
        lastSave: 0,
        hasLoadedState: false,
        pingMs: 0,
        pingInterval: null
    },
    lastFrameTime: 0,
    frameDelta: 0.016,
    fps: 0,
    fpsSmoothed: 60,
    fpsLastUpdate: 0
};

// Fish Types with Rarities (using pixel art sprites)
const FISH_TYPES = {
    common: [
        { name: 'Tuna', sprite: 'tuna', price: 10, rarity: 'common' },
        { name: 'Salmon', sprite: 'salmon', price: 15, rarity: 'common' },
        { name: 'Bass', sprite: 'bass', price: 12, rarity: 'common' }
    ],
    uncommon: [
        { name: 'Pufferfish', sprite: 'pufferfish', price: 30, rarity: 'uncommon' },
        { name: 'Swordfish', sprite: 'swordfish', price: 40, rarity: 'uncommon' }
    ],
    rare: [
        { name: 'Shark', sprite: 'shark', price: 100, rarity: 'rare' },
        { name: 'Stingray', sprite: 'stingray', price: 80, rarity: 'rare' }
    ],
    epic: [
        { name: 'Golden Fish', sprite: 'goldenFish', price: 250, rarity: 'epic' },
        { name: 'Rainbow Trout', sprite: 'rainbowTrout', price: 200, rarity: 'epic' }
    ],
    legendary: [
        { name: 'Legendary Leviathan', sprite: 'leviathan', price: 1000, rarity: 'legendary' }
    ]
};

const FISH_WEIGHT_RANGES = {
    common: [0.5, 30],
    uncommon: [1, 80],
    rare: [5, 400],
    epic: [2, 120],
    legendary: [50, 2000]
};

const FISH_WEIGHT_OVERRIDES = {
    tuna: [5, 300],
    salmon: [1, 35],
    bass: [0.5, 10],
    pufferfish: [0.5, 8],
    swordfish: [20, 650],
    shark: [50, 1200],
    stingray: [5, 200],
    goldenFish: [1, 12],
    rainbowTrout: [1, 20],
    leviathan: [200, 2000]
};

const FISH_SPRITE_FILES = {
    tuna: 'assets/fish/tuna.png',
    salmon: 'assets/fish/salmon.png',
    bass: 'assets/fish/bass.png',
    pufferfish: 'assets/fish/pufferfish.png',
    swordfish: 'assets/fish/swordfish.png',
    shark: 'assets/fish/shark.png',
    stingray: 'assets/fish/stingray.png',
    goldenFish: 'assets/fish/goldenFish.png',
    rainbowTrout: 'assets/fish/rainbowTrout.png',
    leviathan: 'assets/fish/leviathan.png'
};

const DEFAULT_ROD_STATS = {
    targetWidthBonus: 0,
    indicatorSpeedMultiplier: 1,
    progressGainMultiplier: 1,
    progressLossMultiplier: 1,
    fishSpeedMultiplier: 1,
    timeMultiplier: 1,
    luck: 0
};

// Shop Items (using pixel art sprites)
const SHOP_ITEMS = [
    {
        name: 'Basic Rod',
        sprite: 'rodBasic',
        price: 50,
        type: 'rod',
        upgrade: 1,
        buffs: ['Standard catch window', 'Normal fish movement'],
        stats: { ...DEFAULT_ROD_STATS }
    },
    {
        name: 'Advanced Rod',
        sprite: 'rodAdvanced',
        price: 200,
        type: 'rod',
        upgrade: 2,
        aura: 'advanced',
        buffs: ['Catch window +20%', 'Fish movement -15%', 'Rare chance +3%', 'Time +15%'],
        stats: {
            targetWidthBonus: 6,
            indicatorSpeedMultiplier: 0.92,
            progressGainMultiplier: 1.15,
            progressLossMultiplier: 0.85,
            fishSpeedMultiplier: 0.85,
            timeMultiplier: 1.15,
            luck: 0.05
        }
    },
    {
        name: 'Master Rod',
        sprite: 'rodMaster',
        price: 500,
        type: 'rod',
        upgrade: 3,
        aura: 'master',
        buffs: ['Catch window +35%', 'Fish movement -30%', 'Rare chance +7%', 'Catch progress +25%', 'Time +30%'],
        stats: {
            targetWidthBonus: 10,
            indicatorSpeedMultiplier: 0.85,
            progressGainMultiplier: 1.25,
            progressLossMultiplier: 0.7,
            fishSpeedMultiplier: 0.7,
            timeMultiplier: 1.3,
            luck: 0.12
        }
    },
    { name: 'Bait', sprite: 'bait', price: 5, type: 'consumable' }
];

// Initialize Game
function init() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    
    // Enable smoother rendering for zoomed-in view
    game.canvas.style.imageRendering = 'auto';
    
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Position shopkeeper toward island center
    game.shopKeeper.x = game.island.x + game.island.width * 0.55;

    // Generate palm trees
    generatePalmTrees();
    
    // Generate platforms
    generatePlatforms();
    
    // Generate dock fishing spots
    generateDockFishingSpots();
    updateDockPosition();
    
    // Update location anchors
    game.locations.shop.x = game.shopKeeper.x - 40;
    game.locations.shop.y = groundSurfaceAt(game.shopKeeper.x) - game.player.height;
    game.locations.dock.x = game.island.dock.x + game.island.dock.width * 0.4;
    game.locations.dock.y = game.island.dock.y - game.player.height;

    // Set player on ground properly (start at dock)
    game.player.x = game.locations.dock.x;
    game.player.y = game.locations.dock.y;
    game.player.renderX = game.player.x;
    game.player.renderY = game.player.y;
    game.player.onGround = true;
    
    // Initialize camera to show player immediately
    game.camera.x = (game.player.x + game.player.width / 2) - game.canvas.width / 2;
    game.camera.y = (game.player.y + game.player.height / 2) - game.canvas.height / 2;
    game.camera.targetX = game.camera.x;
    game.camera.targetY = game.camera.y;
    
    // Setup event listeners
    setupEventListeners();

    // Load fish sprites
    loadFishSprites();

    // Multiplayer connect
    initMultiplayer();

    // Player setup
    initPlayerSetup();

    // Sell settings
    initSellSettings();

    // Multiplayer UI
    initMultiplayerUI();

    // Weather setup
    initWeather();
    
    // Initialize hotbar selection
    selectHotbarSlot(0);
    
    // Start game loop
    gameLoop();
}

const DEFAULT_SELL_SETTINGS = {
    keepRarities: {
        common: false,
        uncommon: false,
        rare: false,
        epic: false,
        legendary: false
    },
    keepBigEnabled: true,
    keepBigKg: 100,
    keepSmallEnabled: false,
    keepSmallKg: 1
};

function loadSellSettings() {
    try {
        const raw = localStorage.getItem('sellSettings');
        if (!raw) return { ...DEFAULT_SELL_SETTINGS, keepRarities: { ...DEFAULT_SELL_SETTINGS.keepRarities } };
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_SELL_SETTINGS,
            ...parsed,
            keepRarities: { ...DEFAULT_SELL_SETTINGS.keepRarities, ...(parsed.keepRarities || {}) }
        };
    } catch {
        return { ...DEFAULT_SELL_SETTINGS, keepRarities: { ...DEFAULT_SELL_SETTINGS.keepRarities } };
    }
}

function saveSellSettings() {
    localStorage.setItem('sellSettings', JSON.stringify(game.sellSettings));
    markSaveDirty();
}

function initSellSettings() {
    game.sellSettings = loadSellSettings();
    const rarityContainer = document.getElementById('sell-rarity-options');
    if (rarityContainer) {
        rarityContainer.innerHTML = '';
        Object.keys(DEFAULT_SELL_SETTINGS.keepRarities).forEach((rarity) => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'sell-rarity-pill';
            pill.textContent = rarity;
            pill.style.background = getRarityColor(rarity);
            pill.dataset.rarity = rarity;
            pill.classList.toggle('selected', game.sellSettings.keepRarities[rarity]);
            pill.addEventListener('click', () => {
                game.sellSettings.keepRarities[rarity] = !game.sellSettings.keepRarities[rarity];
                pill.classList.toggle('selected', game.sellSettings.keepRarities[rarity]);
                saveSellSettings();
                updateShopDisplay();
            });
            rarityContainer.appendChild(pill);
        });
    }

    const keepBigEnabled = document.getElementById('keep-big-enabled');
    const keepBigKg = document.getElementById('keep-big-kg');
    const keepSmallEnabled = document.getElementById('keep-small-enabled');
    const keepSmallKg = document.getElementById('keep-small-kg');
    if (keepBigEnabled && keepBigKg && keepSmallEnabled && keepSmallKg) {
        keepBigEnabled.checked = game.sellSettings.keepBigEnabled;
        keepBigKg.value = game.sellSettings.keepBigKg;
        keepSmallEnabled.checked = game.sellSettings.keepSmallEnabled;
        keepSmallKg.value = game.sellSettings.keepSmallKg;

        keepBigEnabled.addEventListener('change', () => {
            game.sellSettings.keepBigEnabled = keepBigEnabled.checked;
            saveSellSettings();
            updateShopDisplay();
        });
        keepSmallEnabled.addEventListener('change', () => {
            game.sellSettings.keepSmallEnabled = keepSmallEnabled.checked;
            saveSellSettings();
            updateShopDisplay();
        });
        keepBigKg.addEventListener('input', () => {
            game.sellSettings.keepBigKg = parseFloat(keepBigKg.value) || 0;
            saveSellSettings();
            updateShopDisplay();
        });
        keepSmallKg.addEventListener('input', () => {
            game.sellSettings.keepSmallKg = parseFloat(keepSmallKg.value) || 0;
            saveSellSettings();
            updateShopDisplay();
        });
    }

    const sellAllBtn = document.getElementById('sell-all');
    if (sellAllBtn) {
        sellAllBtn.addEventListener('click', () => sellAllEligible());
    }
}

function refreshSellSettingsUI() {
    const rarityContainer = document.getElementById('sell-rarity-options');
    if (rarityContainer) {
        rarityContainer.querySelectorAll('.sell-rarity-pill').forEach((pill) => {
            const rarity = pill.dataset.rarity;
            if (!rarity) return;
            pill.classList.toggle('selected', Boolean(game.sellSettings?.keepRarities?.[rarity]));
        });
    }
    const keepBigEnabled = document.getElementById('keep-big-enabled');
    const keepBigKg = document.getElementById('keep-big-kg');
    const keepSmallEnabled = document.getElementById('keep-small-enabled');
    const keepSmallKg = document.getElementById('keep-small-kg');
    if (keepBigEnabled) keepBigEnabled.checked = Boolean(game.sellSettings?.keepBigEnabled);
    if (keepBigKg) keepBigKg.value = game.sellSettings?.keepBigKg ?? DEFAULT_SELL_SETTINGS.keepBigKg;
    if (keepSmallEnabled) keepSmallEnabled.checked = Boolean(game.sellSettings?.keepSmallEnabled);
    if (keepSmallKg) keepSmallKg.value = game.sellSettings?.keepSmallKg ?? DEFAULT_SELL_SETTINGS.keepSmallKg;
}

function isSellProtected(item) {
    if (!item || !item.weight) return false;
    const settings = game.sellSettings || DEFAULT_SELL_SETTINGS;
    if (settings.keepRarities[item.rarity]) return true;
    if (settings.keepBigEnabled && item.weight >= settings.keepBigKg) return true;
    if (settings.keepSmallEnabled && item.weight <= settings.keepSmallKg) return true;
    return false;
}

function sellAllEligible() {
    let total = 0;
    const toRemove = [];
    game.inventory.forEach((item) => {
        if (!item.price || !item.sprite || item.type === 'rod') return;
        if (isSellProtected(item)) return;
        total += item.price * (item.count || 1);
        toRemove.push(item);
    });

    toRemove.forEach((item) => {
        const index = game.inventory.indexOf(item);
        if (index > -1) {
            game.inventory.splice(index, 1);
        }
        const hotbarIndex = game.hotbar.indexOf(item);
        if (hotbarIndex > -1) {
            game.hotbar[hotbarIndex] = null;
        }
    });

    if (total > 0) {
        game.money += total;
        showToast(`Sold all eligible fish: +$${total}`, 'success');
    } else {
        showToast('No eligible fish to sell.', 'info');
    }
    markSaveDirty();
    updateHotbar();
    updateShopDisplay();
}

function initPlayerSetup() {
    const panel = document.getElementById('player-setup');
    const nameInput = document.getElementById('player-name');
    const passInput = document.getElementById('player-passcode');
    const avatarContainer = document.getElementById('avatar-options');
    const startBtn = document.getElementById('player-start');
    if (!panel || !nameInput || !passInput || !avatarContainer || !startBtn) return;

    const storedName = localStorage.getItem('playerName');
    const storedAvatar = localStorage.getItem('playerAvatar');
    const storedPasscode = localStorage.getItem('playerPasscode');
    if (storedName) nameInput.value = storedName;
    if (storedAvatar) game.multiplayer.avatar = storedAvatar;
    if (storedPasscode) passInput.value = storedPasscode;

    avatarContainer.innerHTML = '';
    AVATARS.forEach((avatar) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-option';
        btn.style.background = avatar.shirt;
        btn.dataset.avatar = avatar.id;
        if (avatar.id === game.multiplayer.avatar) {
            btn.classList.add('selected');
        }
        btn.addEventListener('click', () => {
            game.multiplayer.avatar = avatar.id;
            avatarContainer.querySelectorAll('.avatar-option').forEach((el) => {
                el.classList.toggle('selected', el.dataset.avatar === avatar.id);
            });
        });
        avatarContainer.appendChild(btn);
    });

    startBtn.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Guest';
        const passcode = passInput.value.trim();
        if (!passcode) {
            showToast('Passcode required.', 'error');
            return;
        }
        game.multiplayer.name = name.slice(0, 16);
        game.multiplayer.passcode = passcode;
        localStorage.setItem('playerName', game.multiplayer.name);
        localStorage.setItem('playerAvatar', game.multiplayer.avatar);
        localStorage.setItem('playerPasscode', game.multiplayer.passcode);
        game.multiplayer.ready = true;
        sendAuth();
    });
}

function initMultiplayer() {
    if (!MULTIPLAYER_URL) return;
    connectMultiplayer();
}

function connectMultiplayer() {
    if (game.multiplayer.ws) {
        game.multiplayer.ws.close();
    }
    showToast('Connecting to server...', 'info');
    const ws = new WebSocket(MULTIPLAYER_URL);
    game.multiplayer.ws = ws;

    ws.onopen = () => {
        showToast('Connected to server', 'success');
        if (game.multiplayer.ready) {
            sendAuth();
        }
        if (game.multiplayer.pingInterval) {
            clearInterval(game.multiplayer.pingInterval);
        }
        game.multiplayer.pingInterval = setInterval(sendPing, 1000);
    };

    ws.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }
        if (msg.type === 'welcome') {
            game.multiplayer.id = msg.id;
            if (msg.weather) {
                setWeather(msg.weather, msg.drops || null);
            }
        } else if (msg.type === 'auth-ok') {
            game.multiplayer.authed = true;
            applySavedState(msg.state);
            const panel = document.getElementById('player-setup');
            if (panel) panel.classList.add('hidden');
            showToast('Loaded your saved player.', 'success');
        } else if (msg.type === 'auth-new') {
            game.multiplayer.authed = true;
            applyDefaultState();
            const panel = document.getElementById('player-setup');
            if (panel) panel.classList.add('hidden');
            showToast('New player created.', 'success');
        } else if (msg.type === 'auth-error') {
            game.multiplayer.authed = false;
            showToast(msg.message || 'Auth failed.', 'error');
        } else if (msg.type === 'weather') {
            setWeather(msg.weather, msg.drops || null);
        } else if (msg.type === 'players') {
            game.multiplayer.players = msg.players || [];
            refreshMultiplayerUI();
            syncRemotePlayers();
            updatePlayersOverlay();
        } else if (msg.type === 'gift') {
            if (msg.item) {
                addToInventory(msg.item);
                showToast(`Received gift from ${msg.fromName || 'player'}`, 'success');
                updateInventoryDisplay();
            }
        } else if (msg.type === 'trade-request') {
            game.multiplayer.tradeOffer = msg;
            showTradeRequest(msg);
        } else if (msg.type === 'trade-accept') {
            if (msg.offerItem && msg.returnItem) {
                removeMatchingItem(msg.offerItem);
                addToInventory(msg.returnItem);
                showToast(`Trade completed with ${msg.fromName || 'player'}`, 'success');
                updateInventoryDisplay();
            }
            game.multiplayer.tradePending = null;
        } else if (msg.type === 'trade-decline') {
            showToast(`${msg.fromName || 'Player'} declined the trade.`, 'info');
            game.multiplayer.tradePending = null;
        } else if (msg.type === 'dev-broadcast') {
            showToast(msg.text || 'Broadcast message', 'info');
        } else if (msg.type === 'pong') {
            game.multiplayer.pingMs = typeof msg.pingMs === 'number' ? msg.pingMs : game.multiplayer.pingMs;
        }
    };

    ws.onclose = () => {
        showToast('Disconnected. Reconnecting...', 'error');
        game.multiplayer.players = [];
        if (game.multiplayer.pingInterval) {
            clearInterval(game.multiplayer.pingInterval);
            game.multiplayer.pingInterval = null;
        }
        if (game.multiplayer.reconnectTimer) {
            clearTimeout(game.multiplayer.reconnectTimer);
        }
        game.multiplayer.reconnectTimer = setTimeout(connectMultiplayer, 3000);
    };

    ws.onerror = () => {
        ws.close();
    };
}

function sendAuth() {
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!game.multiplayer.name || !game.multiplayer.passcode) return;
    ws.send(JSON.stringify({
        type: 'auth',
        name: game.multiplayer.name,
        passcode: game.multiplayer.passcode,
        avatar: game.multiplayer.avatar
    }));
}

function syncRemotePlayers() {
    const next = {};
    (game.multiplayer.players || []).forEach((player) => {
        if (player.id === game.multiplayer.id) return;
        const existing = game.multiplayer.remotePlayers[player.id];
        if (existing) {
            existing.x = player.x;
            existing.y = player.y;
            existing.name = player.name;
            existing.avatar = player.avatar;
            existing.facingRight = player.facingRight;
            existing.hasRod = player.hasRod;
            existing.rodSprite = player.rodSprite;
            existing.heldSprite = player.heldSprite;
            existing.heldWeight = player.heldWeight;
            existing.heldRarity = player.heldRarity;
            next[player.id] = existing;
        } else {
            next[player.id] = {
                id: player.id,
                x: player.x,
                y: player.y,
                renderX: player.x,
                renderY: player.y,
                name: player.name,
                avatar: player.avatar,
                facingRight: player.facingRight,
                hasRod: player.hasRod,
                rodSprite: player.rodSprite,
                heldSprite: player.heldSprite,
                heldWeight: player.heldWeight,
                heldRarity: player.heldRarity
            };
        }
    });
    game.multiplayer.remotePlayers = next;
}

function sendDevBroadcast(text) {
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showToast('Not connected to server.', 'error');
        return;
    }
    ws.send(JSON.stringify({
        type: 'dev-broadcast',
        text
    }));
    showToast('Broadcast sent.', 'success');
}

function initWeather() {
    const now = performance.now();
    game.weather.nextToggleAt = now + WEATHER_TOGGLE_MS;
    game.weather.drops = generateLocalRainDrops();
    game.weather.splashes = [];
}

function setWeather(type, drops = null) {
    if (!type || !['sunny', 'rain'].includes(type)) return;
    game.weather.type = type;
    game.weather.nextToggleAt = performance.now() + WEATHER_TOGGLE_MS;
    if (Array.isArray(drops) && drops.length) {
        game.weather.drops = drops.map((drop) => ({ ...drop }));
    } else if (type === 'rain') {
        game.weather.drops = generateLocalRainDrops();
    }
}

function sendWeatherSet(type) {
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        setWeather(type);
        return;
    }
    ws.send(JSON.stringify({
        type: 'weather-set',
        weather: type
    }));
}

function sendPing() {
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
        type: 'ping',
        t: Date.now()
    }));
}

function updateWeather() {
    const now = performance.now();
    const ws = game.multiplayer.ws;
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (now >= game.weather.nextToggleAt) {
        const next = game.weather.type === 'rain' ? 'sunny' : 'rain';
        setWeather(next);
    }
}

function getRainBounds() {
    const shoreX = game.island.x + game.island.width;
    return {
        minX: game.island.x - 200,
        maxX: shoreX + 900,
        minY: -200,
        maxY: getWaterLevel() + 600
    };
}

function generateLocalRainDrops() {
    const bounds = getRainBounds();
    const drops = [];
    for (let i = 0; i < 140; i++) {
        drops.push({
            x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
            y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
            speed: 3 + Math.random() * 4,
            length: 10 + Math.random() * 10,
            alpha: 0.35 + Math.random() * 0.3
        });
    }
    return drops;
}

function pushSplash(type, x, y, size = 1) {
    game.weather.splashes.push({
        x,
        y,
        life: 0.4,
        ttl: 0.4,
        type,
        size
    });
}

function createItemId() {
    game.nextItemId += 1;
    return `itm_${game.nextItemId}`;
}

function ensureItemId(item) {
    if (!item.uid) {
        item.uid = createItemId();
    }
    return item;
}

function applyDefaultState() {
    if (game.multiplayer.hasLoadedState) return;
    const starterRodItem = SHOP_ITEMS.find(item => item.type === 'rod' && item.sprite === 'rodBasic');
    if (starterRodItem) {
        const starterRod = ensureItemId({ ...starterRodItem, count: 1 });
        game.inventory = [starterRod];
        game.hotbar = [starterRod, null, null, null, null];
        game.selectedSlot = 0;
    }
    game.money = 100;
    game.multiplayer.hasLoadedState = true;
    updateHotbar();
    updateInventoryDisplay();
    markSaveDirty(true);
}

function applySavedState(state) {
    if (!state) {
        applyDefaultState();
        return;
    }
    game.money = typeof state.money === 'number' ? state.money : game.money;
    game.player.x = typeof state.x === 'number' ? state.x : game.player.x;
    game.player.y = typeof state.y === 'number' ? state.y : game.player.y;
    game.player.renderX = game.player.x;
    game.player.renderY = game.player.y;
    game.devMode = Boolean(state.devMode);
    game.nextItemId = typeof state.nextItemId === 'number' ? state.nextItemId : 0;
    if (state.sellSettings) {
        game.sellSettings = {
            ...DEFAULT_SELL_SETTINGS,
            ...state.sellSettings,
            keepRarities: {
                ...DEFAULT_SELL_SETTINGS.keepRarities,
                ...(state.sellSettings.keepRarities || {})
            }
        };
        localStorage.setItem('sellSettings', JSON.stringify(game.sellSettings));
        refreshSellSettingsUI();
    }

    const inventory = Array.isArray(state.inventory) ? state.inventory : [];
    game.inventory = inventory.map((item) => {
        const restored = { ...item };
        ensureItemId(restored);
        return restored;
    });

    const hotbarIds = Array.isArray(state.hotbarIds) ? state.hotbarIds : [];
    game.hotbar = [null, null, null, null, null];
    hotbarIds.forEach((uid, index) => {
        const match = game.inventory.find(item => item.uid === uid);
        if (match) {
            game.hotbar[index] = match;
        }
    });
    game.selectedSlot = typeof state.selectedSlot === 'number' ? state.selectedSlot : 0;
    selectHotbarSlot(game.selectedSlot);
    game.multiplayer.hasLoadedState = true;
    updateHotbar();
    updateInventoryDisplay();
}

function markSaveDirty(force = false) {
    if (!game.multiplayer.authed) return;
    game.multiplayer.saveDirty = true;
    if (force) {
        game.multiplayer.lastSave = 0;
    }
}

function sendSaveState(force = false) {
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!game.multiplayer.authed) return;
    if (!game.multiplayer.saveDirty && !force) return;
    const now = performance.now();
    if (!force && now - game.multiplayer.lastSave < 3000) return;
    const state = {
        name: game.multiplayer.name,
        passcode: game.multiplayer.passcode,
        avatar: game.multiplayer.avatar,
        money: game.money,
        x: game.player.x,
        y: game.player.y,
        devMode: game.devMode,
        nextItemId: game.nextItemId,
        sellSettings: game.sellSettings,
        inventory: game.inventory.map(serializeItem),
        hotbarIds: game.hotbar.map(item => item ? item.uid : null),
        selectedSlot: game.selectedSlot
    };
    ws.send(JSON.stringify({
        type: 'save-state',
        state
    }));
    game.multiplayer.saveDirty = false;
    game.multiplayer.lastSave = now;
}

function initMultiplayerUI() {
    const openBtn = document.getElementById('multiplayer-open');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            togglePanel('multiplayer-panel');
            refreshMultiplayerUI();
        });
    }

    const giftBtn = document.getElementById('mp-mode-gift');
    const tradeBtn = document.getElementById('mp-mode-trade');
    if (giftBtn && tradeBtn) {
        giftBtn.addEventListener('click', () => {
            game.multiplayer.mode = 'gift';
            refreshMultiplayerUI();
        });
        tradeBtn.addEventListener('click', () => {
            game.multiplayer.mode = 'trade';
            refreshMultiplayerUI();
        });
    }

    const sendBtn = document.getElementById('mp-send');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => sendGift());
    }
    const requestBtn = document.getElementById('mp-request');
    if (requestBtn) {
        requestBtn.addEventListener('click', () => requestTrade());
    }

    const acceptBtn = document.getElementById('trade-accept');
    const declineBtn = document.getElementById('trade-decline');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => acceptTrade());
    }
    if (declineBtn) {
        declineBtn.addEventListener('click', () => declineTrade());
    }
}

function refreshMultiplayerUI() {
    const panel = document.getElementById('multiplayer-panel');
    if (!panel || panel.classList.contains('hidden')) return;
    const playersContainer = document.getElementById('mp-players');
    const inventoryContainer = document.getElementById('mp-inventory');
    const status = document.getElementById('mp-status');
    const sendBtn = document.getElementById('mp-send');
    const requestBtn = document.getElementById('mp-request');
    if (!playersContainer || !inventoryContainer || !status || !sendBtn || !requestBtn) return;

    const mode = game.multiplayer.mode || 'gift';
    sendBtn.style.display = mode === 'gift' ? 'inline-flex' : 'none';
    requestBtn.style.display = mode === 'trade' ? 'inline-flex' : 'none';

    playersContainer.innerHTML = '';
    const others = (game.multiplayer.players || []).filter(p => p.id !== game.multiplayer.id);
    others.forEach((player) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mp-player';
        btn.textContent = player.name || player.id.slice(0, 6);
        btn.classList.toggle('selected', game.multiplayer.selectedPlayerId === player.id);
        btn.addEventListener('click', () => {
            game.multiplayer.selectedPlayerId = player.id;
            refreshMultiplayerUI();
        });
        playersContainer.appendChild(btn);
    });

    inventoryContainer.innerHTML = '';
    game.inventory.forEach((item) => {
        if (!canSendItem(item)) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mp-item';
        btn.textContent = item.weight ? `${item.name} ${item.weight.toFixed(1)}kg` : item.name;
        btn.classList.toggle('selected', game.multiplayer.selectedItem === item);
        btn.addEventListener('click', () => {
            game.multiplayer.selectedItem = item;
            refreshMultiplayerUI();
        });
        inventoryContainer.appendChild(btn);
    });

    if (game.multiplayer.tradeRespond) {
        status.textContent = 'Select an item to return, then click Request Trade.';
    } else {
        status.textContent = mode === 'gift'
            ? 'Select a player and an item to gift.'
            : 'Select a player and an item to offer in trade.';
    }
}

function updatePlayersOverlay() {
    const overlay = document.getElementById('players-overlay');
    const list = document.getElementById('players-list');
    if (!overlay || !list || overlay.classList.contains('hidden')) return;
    list.innerHTML = '';
    const players = game.multiplayer.players || [];
    players.forEach((player) => {
        const row = document.createElement('div');
        row.className = 'player-row';

        const meta = document.createElement('div');
        meta.className = 'player-meta';
        const name = document.createElement('div');
        name.className = 'player-name';
        name.textContent = player.name || player.id?.slice(0, 6) || 'Player';
        const money = document.createElement('div');
        money.className = 'player-money';
        money.textContent = `Money: $${Math.floor(player.money || 0)}`;
        const ping = document.createElement('div');
        const pingMs = Math.max(0, Math.round(player.pingMs || 0));
        ping.textContent = `Ping: ${pingMs}ms`;
        meta.appendChild(name);
        meta.appendChild(money);
        meta.appendChild(ping);

        const pingBar = document.createElement('div');
        pingBar.className = 'ping-bar';
        const pingFill = document.createElement('div');
        pingFill.className = 'ping-fill';
        const pingClamp = Math.min(500, pingMs);
        const width = Math.max(8, 100 - (pingClamp / 500) * 100);
        pingFill.style.width = `${width}%`;
        pingBar.appendChild(pingFill);

        row.appendChild(meta);
        row.appendChild(pingBar);
        list.appendChild(row);
    });
}

function canSendItem(item) {
    if (!item || !item.sprite) return false;
    if (item.type === 'rod') return false;
    return true;
}

function serializeItem(item) {
    return {
        name: item.name,
        sprite: item.sprite,
        rarity: item.rarity,
        weight: item.weight || 0,
        price: item.price || 0,
        type: item.type || null,
        count: item.count || 1,
        uid: item.uid || null
    };
}

function removeMatchingItem(itemData) {
    const match = game.inventory.find((item) => {
        if (item.weight && itemData.weight) {
            return item.sprite === itemData.sprite && item.weight === itemData.weight;
        }
        return item.name === itemData.name && item.type === itemData.type;
    });
    if (!match) return;
    if (!match.weight && match.count > 1) {
        match.count -= 1;
    } else {
        const index = game.inventory.indexOf(match);
        if (index > -1) {
            game.inventory.splice(index, 1);
        }
    }
    markSaveDirty();
    updateHotbar();
}

function sendGift() {
    const targetId = game.multiplayer.selectedPlayerId;
    const item = game.multiplayer.selectedItem;
    if (!targetId || !item) {
        showToast('Select a player and an item.', 'info');
        return;
    }
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showToast('Not connected to server.', 'error');
        return;
    }
    const itemData = serializeItem(item);
    removeMatchingItem(itemData);
    ws.send(JSON.stringify({
        type: 'gift',
        toId: targetId,
        item: itemData
    }));
    showToast('Gift sent!', 'success');
    updateInventoryDisplay();
}

function requestTrade() {
    const targetId = game.multiplayer.selectedPlayerId;
    const item = game.multiplayer.selectedItem;
    if (!targetId || !item) {
        showToast('Select a player and an item.', 'info');
        return;
    }
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showToast('Not connected to server.', 'error');
        return;
    }
    if (game.multiplayer.tradeRespond) {
        const offer = game.multiplayer.tradeRespond.offerItem;
        const returnItem = serializeItem(item);
        removeMatchingItem(returnItem);
        addToInventory(offer);
        ws.send(JSON.stringify({
            type: 'trade-accept',
            toId: game.multiplayer.tradeRespond.fromId,
            tradeId: game.multiplayer.tradeRespond.tradeId,
            offerItem: offer,
            returnItem
        }));
        showToast('Trade accepted.', 'success');
        game.multiplayer.tradeRespond = null;
        updateInventoryDisplay();
        return;
    }

    const tradeId = Math.random().toString(36).slice(2);
    game.multiplayer.tradePending = { tradeId, offerItem: serializeItem(item), toId: targetId };
    ws.send(JSON.stringify({
        type: 'trade-request',
        toId: targetId,
        tradeId,
        offerItem: game.multiplayer.tradePending.offerItem
    }));
    showToast('Trade request sent.', 'success');
}

function showTradeRequest(msg) {
    const panel = document.getElementById('trade-request-panel');
    const content = document.getElementById('trade-request-content');
    if (!panel || !content) return;
    const offer = msg.offerItem;
    content.innerHTML = '';
    const title = document.createElement('div');
    title.textContent = `${msg.fromName || 'Player'} offers ${offer.name}`;
    const detail = document.createElement('div');
    detail.textContent = offer.weight ? `${offer.weight.toFixed(1)}kg (${offer.rarity})` : offer.rarity || '';
    content.appendChild(title);
    content.appendChild(detail);
    panel.classList.remove('hidden');
}

function acceptTrade() {
    const msg = game.multiplayer.tradeOffer;
    if (!msg) return;
    const panel = document.getElementById('trade-request-panel');
    if (panel) panel.classList.add('hidden');
    togglePanel('multiplayer-panel');
    game.multiplayer.mode = 'trade';
    game.multiplayer.selectedPlayerId = msg.fromId;
    game.multiplayer.selectedItem = null;
    game.multiplayer.tradeRespond = msg;
    refreshMultiplayerUI();
    showToast('Select an item to return and click Request Trade.', 'info');
}

function declineTrade() {
    const msg = game.multiplayer.tradeOffer;
    if (!msg) return;
    const ws = game.multiplayer.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'trade-decline',
            toId: msg.fromId,
            tradeId: msg.tradeId
        }));
    }
    game.multiplayer.tradeOffer = null;
    const panel = document.getElementById('trade-request-panel');
    if (panel) panel.classList.add('hidden');
}

function loadFishSprites() {
    game.fishSprites = {};
    Object.entries(FISH_SPRITE_FILES).forEach(([sprite, src]) => {
        const img = new Image();
        img.onload = () => {
            updateInventoryDisplay();
            updateHotbar();
        };
        img.src = src;
        game.fishSprites[sprite] = img;
    });
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
}

function generatePalmTrees() {
    game.palmTrees = [];
    const shoreX = game.island.x + game.island.width - 60;
    const shopZoneStart = game.shopKeeper.x - 200;
    const shopZoneEnd = game.shopKeeper.x + 260;
    const minDistance = 260;
    let tries = 0;
    while (game.palmTrees.length < 6 && tries < 300) {
        const x = game.island.x + 80 + Math.random() * (shoreX - (game.island.x + 80));
        if (x > shopZoneStart && x < shopZoneEnd) {
            tries++;
            continue;
        }
        const tooClose = game.palmTrees.some(tree => Math.abs(tree.x - x) < minDistance);
        if (tooClose) {
            tries++;
            continue;
        }
        const palette = Math.random() < 0.2 ? 'red' : 'green';
        game.palmTrees.push({
            x,
            y: GROUND_LEVEL - 120,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.02 + Math.random() * 0.02,
            size: 1.6 + Math.random() * 0.6,
            palette
        });
        tries++;
    }
}

function generatePlatforms() {
    // No extra platforms; terrain handles ground collision
    game.ground.platforms = [];
}

function generateDockFishingSpots() {
    // Create fishing spots along the dock
    const dock = game.island.dock;
    dock.fishingSpots = [];
    for (let i = 0; i < 5; i++) {
        dock.fishingSpots.push({
            xOffset: i * 30,
            active: true
        });
    }
}

function groundHeightAt(x) {
    const roll = Math.sin(x * 0.002) * 42;
    const bumps = Math.sin(x * 0.006 + 1.3) * 18;
    const center = game.island.x + game.island.width * 0.5;
    const mountainWidth = game.island.width * 0.6;
    const dist = Math.min(1, Math.abs(x - center) / mountainWidth);
    const ridge = (1 - dist) * 170;
    const shoreStart = game.island.x + game.island.width * 0.82;
    let shoreDrop = 0;
    if (x > shoreStart) {
        shoreDrop = (x - shoreStart) / (game.island.width * 0.18) * 40;
    }

    // Flat zone for shop area
    const flatCenter = game.shopKeeper.x + 70;
    const flatHalf = 170;
    if (x > flatCenter - flatHalf && x < flatCenter + flatHalf) {
        return GROUND_LEVEL - 60;
    }

    return GROUND_LEVEL + roll + bumps - ridge + shoreDrop;
}

function groundSurfaceAt(x) {
    return groundHeightAt(x) + GROUND_SURFACE_OFFSET;
}

function updateDockPosition() {
    const dock = game.island.dock;
    const shoreX = game.island.x + game.island.width;
    dock.x = shoreX;
    dock.y = groundSurfaceAt(shoreX);
    game.locations.dock.x = dock.x + dock.width * 0.4;
    game.locations.dock.y = dock.y - game.player.height;
}

function getWaterLevel() {
    const shoreX = game.island.x + game.island.width;
    return groundSurfaceAt(shoreX) + 56;
}

function getObstacleTopAt(x) {
    let top = groundSurfaceAt(x);
    const dock = game.island.dock;
    if (x >= dock.x && x <= dock.x + dock.width) {
        top = Math.min(top, dock.y);
    }
    return top;
}

function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (isTypingInInput()) return;
        if (e.code === 'Space') {
            game.keys.space = true;
        }
        game.keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'q') {
            const overlay = document.getElementById('players-overlay');
            if (overlay) {
                overlay.classList.remove('hidden');
                updatePlayersOverlay();
            }
        }
        handleKeyPress(e);
    });
    
    document.addEventListener('keyup', (e) => {
        if (isTypingInInput()) return;
        if (e.code === 'Space') {
            game.keys.space = false;
        }
        game.keys[e.key.toLowerCase()] = false;
        if (e.key.toLowerCase() === 'q') {
            const overlay = document.getElementById('players-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
            }
        }
    });

    window.addEventListener('blur', () => {
        game.keys = {};
        game.player.vx = 0;
        game.player.vy = 0;
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            game.keys = {};
            game.player.vx = 0;
            game.player.vy = 0;
        }
    });
    
    // Hotbar selection
    document.querySelectorAll('.hotbar-slot').forEach((slot, index) => {
        slot.addEventListener('click', () => selectHotbarSlot(index));
    });
    
    // Number keys for hotbar
    for (let i = 1; i <= 5; i++) {
        document.addEventListener('keydown', (e) => {
            if (e.key === i.toString()) {
                selectHotbarSlot(i - 1);
            }
        });
    }
    
    // Panel close buttons
    document.querySelectorAll('.panel-close').forEach((button) => {
        button.addEventListener('click', () => {
            const panelId = button.dataset.panel;
            const panel = panelId ? document.getElementById(panelId) : button.closest('.panel');
            if (panel) {
                panel.classList.add('hidden');
            }
        });
    });
    
    // Dev code input
    document.getElementById('dev-code-submit').addEventListener('click', checkDevCode);
    document.getElementById('dev-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkDevCode();
    });

    // Settings panel
    document.getElementById('settings-btn').addEventListener('click', () => {
        togglePanel('settings-panel');
    });
    const zoomRange = document.getElementById('zoom-range');
    const zoomValue = document.getElementById('zoom-value');
    if (zoomRange && zoomValue) {
        zoomRange.value = game.camera.zoom.toFixed(1);
        zoomValue.textContent = `${game.camera.zoom.toFixed(1)}x`;
        zoomRange.addEventListener('input', () => {
            game.camera.zoom = parseFloat(zoomRange.value);
            zoomValue.textContent = `${game.camera.zoom.toFixed(1)}x`;
        });
    }
    
    document.getElementById('dev-open').addEventListener('click', () => {
        document.getElementById('dev-code-input').classList.remove('hidden');
    });
    document.getElementById('dev-panel-open').addEventListener('click', () => {
        if (game.devMode) {
            togglePanel('dev-panel');
        }
    });

    const devToggleFly = document.getElementById('dev-toggle-fly');
    if (devToggleFly) {
        devToggleFly.addEventListener('click', () => {
            game.player.flying = !game.player.flying;
        });
    }
    const devSpeedRange = document.getElementById('dev-speed-range');
    const devSpeedValue = document.getElementById('dev-speed-value');
    if (devSpeedRange && devSpeedValue) {
        devSpeedRange.value = PLAYER_SPEED.toFixed(1);
        devSpeedValue.textContent = PLAYER_SPEED.toFixed(1);
        devSpeedRange.addEventListener('input', () => {
            PLAYER_SPEED = parseFloat(devSpeedRange.value);
            devSpeedValue.textContent = PLAYER_SPEED.toFixed(1);
        });
    }

    const devBroadcast = document.getElementById('dev-broadcast');
    const devBroadcastSend = document.getElementById('dev-broadcast-send');
    if (devBroadcast && devBroadcastSend) {
        devBroadcastSend.addEventListener('click', () => {
            if (!game.devMode) {
                showToast('Enable dev mode first.', 'error');
                return;
            }
            const text = devBroadcast.value.trim();
            if (!text) return;
            sendDevBroadcast(text);
            devBroadcast.value = '';
        });
    }
    const devWeatherSunny = document.getElementById('dev-weather-sunny');
    const devWeatherRain = document.getElementById('dev-weather-rain');
    if (devWeatherSunny && devWeatherRain) {
        devWeatherSunny.addEventListener('click', () => {
            if (!game.devMode) {
                showToast('Enable dev mode first.', 'error');
                return;
            }
            sendWeatherSet('sunny');
        });
        devWeatherRain.addEventListener('click', () => {
            if (!game.devMode) {
                showToast('Enable dev mode first.', 'error');
                return;
            }
            sendWeatherSet('rain');
        });
    }
    const devMoneyInput = document.getElementById('dev-money-input');
    const devMoneySet = document.getElementById('dev-money-set');
    if (devMoneyInput && devMoneySet) {
        devMoneySet.addEventListener('click', () => {
            const amount = parseInt(devMoneyInput.value, 10);
            if (!Number.isNaN(amount)) {
                game.money = amount;
            }
        });
    }
    const devFishSelect = document.getElementById('dev-fish-select');
    const devFishWeight = document.getElementById('dev-fish-weight');
    const devFishGive = document.getElementById('dev-fish-give');
    if (devFishSelect && devFishWeight && devFishGive) {
        Object.keys(FISH_TYPES).forEach(rarity => {
            FISH_TYPES[rarity].forEach(fish => {
                const option = document.createElement('option');
                option.value = `${rarity}:${fish.sprite}`;
                option.textContent = `${fish.name} (${rarity})`;
                devFishSelect.appendChild(option);
            });
        });
        devFishGive.addEventListener('click', () => {
            const [rarity, sprite] = devFishSelect.value.split(':');
            const fishList = FISH_TYPES[rarity] || [];
            const fish = fishList.find(item => item.sprite === sprite);
            if (fish) {
                const weight = parseFloat(devFishWeight.value) || 1;
                const item = createWeightedFish(fish, rarity, weight);
                addToInventory(item);
            }
        });
    }
    
    // Teleport buttons
    document.getElementById('teleport-shop').addEventListener('click', () => {
        teleportToLocation('shop');
    });
    document.getElementById('teleport-dock').addEventListener('click', () => {
        teleportToLocation('dock');
    });
    
    // Dialogue system
    document.getElementById('dialogue-next').addEventListener('click', nextDialogue);
    document.getElementById('dialogue-close').addEventListener('click', closeDialogue);
    const catchClose = document.getElementById('catch-close');
    if (catchClose) {
        catchClose.addEventListener('click', hideCatchPopup);
    }
}

function isTypingInInput() {
    const active = document.activeElement;
    if (!active) return false;
    if (active.isContentEditable) return true;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA';
}

function handleKeyPress(e) {
    if (isTypingInInput()) return;
    if (game.fishing.active && e.code === 'Space' && game.fishing.stageType === 'timing') {
        attemptTimingHit();
        return;
    }
    // Inventory (I key)
    if (e.key.toLowerCase() === 'i') {
        togglePanel('inventory-panel');
        updateInventoryDisplay();
    }
    
    // Fishing (F key) - works anywhere
    if (e.key.toLowerCase() === 'f') {
        if (!game.fishing.active) {
            const heldItem = game.hotbar[game.selectedSlot];
            if (!heldItem || heldItem.type !== 'rod') {
                showToast('Equip a fishing rod to fish!', 'error');
                return;
            }
            startFishing();
        }
    }
    
    // Space to jump (disabled while fishing)
    if (e.key === ' ' && !game.fishing.active) {
        if (game.player.onGround && game.player.jumpCooldown <= 0) {
            game.player.vy = JUMP_POWER;
            game.player.onGround = false;
            game.player.jumpCooldown = 10;
        }
    }
    
    // Jump with W key
    if ((e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 'arrowup') && game.player.onGround && game.player.jumpCooldown <= 0) {
        game.player.vy = JUMP_POWER;
        game.player.onGround = false;
        game.player.jumpCooldown = 10;
    }
}

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.toggle('hidden');
}

function selectHotbarSlot(index) {
    game.selectedSlot = index;
    document.querySelectorAll('.hotbar-slot').forEach((slot, i) => {
        slot.classList.toggle('selected', i === index);
    });
    markSaveDirty();
}

// Player Movement
function updatePlayer() {
    updateDockPosition();
    game.shopKeeper.y = groundSurfaceAt(game.shopKeeper.x) - game.shopKeeper.height;
    if (!game.fishing.active) {
        // Horizontal movement (1D - only left/right)
        if (!game.fishing.active && (game.keys['a'] || game.keys['arrowleft'])) {
            game.player.vx = -PLAYER_SPEED;
            game.player.facingRight = false;
        } else if (!game.fishing.active && (game.keys['d'] || game.keys['arrowright'])) {
            game.player.vx = PLAYER_SPEED;
            game.player.facingRight = true;
        } else {
            // Apply friction
            game.player.vx *= FRICTION;
            if (Math.abs(game.player.vx) < 0.1) game.player.vx = 0;
        }
        
        // Apply gravity or flying/swimming control
        if (game.player.flying) {
            if (game.keys['w'] || game.keys['arrowup']) {
                game.player.vy = -FLY_SPEED;
            } else if (game.keys['s'] || game.keys['arrowdown']) {
                game.player.vy = FLY_SPEED;
            } else {
                game.player.vy = 0;
            }
            game.player.swimming = false;
        } else {
            game.player.vy += GRAVITY;
        }
        
        // Update position
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;

        // Keep player on island bounds (allow swimming past dock)
        const minX = game.island.x + 10;
        const maxX = game.island.x + game.island.width + 600;
        if (game.player.x < minX) {
            game.player.x = minX;
            game.player.vx = 0;
        } else if (game.player.x > maxX) {
            game.player.x = maxX;
            game.player.vx = 0;
        }
        
        // Water check
        const shoreX = game.island.x + game.island.width;
        const waterLevel = getWaterLevel();
        const playerBottom = game.player.y + game.player.height;
        const inWater = game.player.x + game.player.width / 2 > shoreX + 10 && playerBottom > waterLevel - 6;
        const onLand = game.player.x + game.player.width / 2 <= shoreX + 6;
        game.player.swimming = inWater;

        // Swimming movement
        if (game.player.swimming) {
            const swimSpeed = 1.8;
            if (game.keys['w'] || game.keys['arrowup']) {
                game.player.vy = -swimSpeed;
            } else if (game.keys['s'] || game.keys['arrowdown']) {
                game.player.vy = swimSpeed;
            } else {
                game.player.vy *= 0.85;
            }
            game.player.vy += GRAVITY * 0.15;
        }

        // Collision with ground and platforms
        game.player.onGround = false;
        const playerLeft = game.player.x;
        const playerRight = game.player.x + game.player.width;
        const groundY = groundSurfaceAt(game.player.x + game.player.width / 2);
        
        if (!game.player.swimming && onLand) {
            // Check main ground - ensure player is always on or above ground
            if (playerBottom > groundY || (!game.player.onGround && playerBottom >= groundY - 1)) {
                game.player.y = groundY - game.player.height;
                game.player.vy = 0;
                game.player.onGround = true;
            }
            
            // Check platforms
            game.ground.platforms.forEach(platform => {
                if (playerBottom >= platform.y && 
                    game.player.y < platform.y &&
                    playerRight > platform.x && 
                    playerLeft < platform.x + platform.width &&
                    game.player.vy >= 0) {
                    game.player.y = platform.y - game.player.height;
                    game.player.vy = 0;
                    game.player.onGround = true;
                }
            });

        }

        // Check dock platform (allow on dock even past shore)
        if (!game.player.swimming) {
            const dock = game.island.dock;
            if (playerBottom >= dock.y - 6 &&
                game.player.y < dock.y - 6 &&
                playerRight > dock.x &&
                playerLeft < dock.x + dock.width &&
                game.player.vy >= 0) {
                game.player.y = dock.y - game.player.height;
                game.player.vy = 0;
                game.player.onGround = true;
            }
        }
        
        // Update jump cooldown
        if (game.player.jumpCooldown > 0) {
            game.player.jumpCooldown--;
        }

        if (game.player.swimming && game.player.y > waterLevel + 220) {
            game.player.x = game.locations.dock.x;
            game.player.y = game.locations.dock.y;
            game.player.vx = 0;
            game.player.vy = 0;
            game.player.swimming = false;
        }
        
        // Check shop keeper interaction
        const dist = Math.abs(game.player.x - game.shopKeeper.x);
        if (dist < game.shopKeeper.interactionRange && game.keys['e']) {
            if (!game.dialogue.active) {
                startDialogue();
            }
        }
    }
    
    // Update camera to follow player
    game.camera.targetX = (game.player.x + game.player.width / 2) - game.canvas.width / 2;
    
    // Follow player vertically - center camera on player's Y position
    // This ensures the player is always visible
    game.camera.targetY = (game.player.y + game.player.height / 2) - game.canvas.height / 2;
    if (game.player.onGround && Math.abs(game.player.vx) > 0.2) {
        game.camera.targetY += Math.sin(performance.now() / 160) * 4;
    }
    
    game.camera.x += (game.camera.targetX - game.camera.x) * CAMERA_SMOOTH;
    game.camera.y += (game.camera.targetY - game.camera.y) * CAMERA_SMOOTH;

    game.player.renderX += (game.player.x - game.player.renderX) * PLAYER_RENDER_SMOOTH;
    game.player.renderY += (game.player.y - game.player.renderY) * PLAYER_RENDER_SMOOTH;

    syncMultiplayer();
    updateRemotePlayers();
    handlePlayerInteractions();
    sendSaveState();
}

function updateRemotePlayers() {
    Object.values(game.multiplayer.remotePlayers).forEach((player) => {
        player.renderX += (player.x - player.renderX) * 0.12;
        player.renderY += (player.y - player.renderY) * 0.12;
    });
}

function handlePlayerInteractions() {
    if (game.multiplayer.interactCooldown > 0) {
        game.multiplayer.interactCooldown--;
    }
    if (!game.keys['e'] || game.multiplayer.interactCooldown > 0) return;
    const nearest = getNearestRemotePlayer(80);
    if (!nearest) return;
    game.multiplayer.interactCooldown = 20;
    game.multiplayer.selectedPlayerId = nearest.id;
    togglePanel('multiplayer-panel');
    refreshMultiplayerUI();
}

function getNearestRemotePlayer(maxDist) {
    let closest = null;
    let closestDist = maxDist;
    Object.values(game.multiplayer.remotePlayers).forEach((player) => {
        const dist = Math.abs(game.player.x - player.x);
        if (dist < closestDist) {
            closest = player;
            closestDist = dist;
        }
    });
    return closest;
}

function syncMultiplayer() {
    const ws = game.multiplayer.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!game.multiplayer.ready) return;
    const now = performance.now();
    if (now - game.multiplayer.lastSent < 100) return;
    game.multiplayer.lastSent = now;
    const rod = getEquippedRod();
    const heldItem = game.hotbar[game.selectedSlot];
    const heldFish = heldItem && heldItem.sprite && (!heldItem.type || heldItem.type !== 'rod') ? heldItem : null;
    ws.send(JSON.stringify({
        type: 'move',
        x: game.player.x,
        y: game.player.y,
        facingRight: game.player.facingRight,
        name: game.multiplayer.name,
        avatar: game.multiplayer.avatar,
        hasRod: Boolean(rod),
        rodSprite: rod ? rod.sprite : null,
        heldSprite: heldFish ? heldFish.sprite : null,
        heldWeight: heldFish ? heldFish.weight || 0 : 0,
        heldRarity: heldFish ? heldFish.rarity || 'common' : null,
        money: game.money
    }));
}

const FISHING_STAGE_ORDER = ['track', 'targets', 'timing'];

// Fishing Minigame
function startFishing() {
    // Only start minigame if bobber is in water
    const shoreX = game.island.x + game.island.width;
    const castOffset = game.player.facingRight ? 140 : -140;
    const castX = game.player.x + castOffset;
    if (castX <= shoreX + 10) {
        showToast('Cast into the water!', 'error');
        return;
    }

    game.fishing.active = true;
    const rodStats = getRodStats(getEquippedRod());
    const pendingRarity = getRandomRarity(rodStats);
    game.fishing.pendingRarity = pendingRarity;
    game.fishing.pendingRarityChance = getRarityWeights(rodStats)[pendingRarity] * 100;
    game.fishing.difficultyScale = getRarityDifficulty(pendingRarity);
    game.fishing.rodStats = rodStats;
    game.fishing.stage = 1;
    game.fishing.stagesTotal = FISHING_STAGE_ORDER.length;
    game.fishing.stageType = FISHING_STAGE_ORDER[0];
    game.fishing.castActive = true;
    game.fishing.castX = castX;
    game.fishing.castY = game.player.y + 60;
    game.fishing.castInWater = true;
    setupFishingStage();
    
    document.getElementById('fishing-minigame').classList.remove('hidden');
    updateFishingDisplay();
}

function getRarityDifficulty(rarity) {
    switch (rarity) {
        case 'legendary':
            return 1.2;
        case 'epic':
            return 1.1;
        case 'rare':
            return 1.0;
        case 'uncommon':
            return 0.95;
        default:
            return 0.9;
    }
}

function setupFishingStage() {
    const rodStats = game.fishing.rodStats || getRodStats(getEquippedRod());
    const timeMultiplier = rodStats.timeMultiplier || 1;
    game.fishing.stageBaseTime = game.fishing.stageType === 'targets' ? 10 : 15;
    game.fishing.stageTimeRemaining = game.fishing.stageBaseTime * timeMultiplier;
    const accuracyArea = document.getElementById('fishing-accuracy-area');
    if (accuracyArea && game.fishing.stageType !== 'targets') {
        accuracyArea.innerHTML = '';
    }

    if (game.fishing.stageType === 'track') {
        game.fishing.indicatorPos = 50;
        game.fishing.targetPos = 50 + (Math.random() - 0.5) * 120;
        game.fishing.targetPos = Math.max(20, Math.min(80, game.fishing.targetPos));
        game.fishing.indicatorSpeed = (2.2 + Math.random() * 1.2) * rodStats.indicatorSpeedMultiplier;
        game.fishing.targetWidth = 32 + rodStats.targetWidthBonus;
        game.fishing.progressGain = 0.01 * rodStats.progressGainMultiplier;
        game.fishing.progressLoss = 0.005 * rodStats.progressLossMultiplier;
        game.fishing.fishSpeedMultiplier = rodStats.fishSpeedMultiplier * game.fishing.difficultyScale;
        game.fishing.progress = 0;
        game.fishing.fishPos = 50;
        game.fishing.fishVel = 0;
    } else if (game.fishing.stageType === 'targets') {
        game.fishing.targetHitsRemaining = 6;
    } else if (game.fishing.stageType === 'timing') {
        game.fishing.timingHits = 0;
        game.fishing.timingHitsNeeded = 2;
        game.fishing.timingMarkerPos = 50;
        game.fishing.timingMarkerDir = Math.random() < 0.5 ? -1 : 1;
        game.fishing.timingTargetWidth = Math.max(12, 24 - (game.fishing.difficultyScale - 0.9) * 10);
        game.fishing.timingTargetCenter = 20 + Math.random() * 60;
        game.fishing.timingSpeed = 1.2 * game.fishing.difficultyScale;
    }
    updateFishingDisplay();
    if (game.fishing.stageType === 'targets') {
        spawnAccuracyTarget();
    }
}

function advanceFishingStage() {
    if (game.fishing.stage < game.fishing.stagesTotal) {
        game.fishing.stage += 1;
        game.fishing.stageType = FISHING_STAGE_ORDER[game.fishing.stage - 1];
        setupFishingStage();
    } else {
        endFishing(true);
    }
}

function spawnAccuracyTarget() {
    const area = document.getElementById('fishing-accuracy-area');
    if (!area) return;
    area.innerHTML = '';
    const dot = document.createElement('div');
    dot.className = 'fishing-target-dot';
    const size = Math.max(16, 28 - (game.fishing.difficultyScale - 0.9) * 10);
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    const padding = 10;
    const maxX = Math.max(0, area.clientWidth - size - padding * 2);
    const maxY = Math.max(0, area.clientHeight - size - padding * 2);
    dot.style.left = `${padding + Math.random() * maxX}px`;
    dot.style.top = `${padding + Math.random() * maxY}px`;
    dot.addEventListener('click', () => {
        game.fishing.targetHitsRemaining -= 1;
        if (game.fishing.targetHitsRemaining > 0) {
            spawnAccuracyTarget();
        } else {
            advanceFishingStage();
        }
    });
    area.appendChild(dot);
}

function attemptTimingHit() {
    if (!game.fishing.active || game.fishing.stageType !== 'timing') return;
    const marker = game.fishing.timingMarkerPos;
    const center = game.fishing.timingTargetCenter;
    const half = game.fishing.timingTargetWidth / 2;
    if (marker >= center - half && marker <= center + half) {
        game.fishing.timingHits += 1;
        if (game.fishing.timingHits >= game.fishing.timingHitsNeeded) {
            advanceFishingStage();
        } else {
            game.fishing.timingTargetCenter = 20 + Math.random() * 60;
        }
    } else {
        game.fishing.stageTimeRemaining = Math.max(0, game.fishing.stageTimeRemaining - 1);
    }
    updateFishingDisplay();
}

function updateFishing(dt = 0.016) {
    if (!game.fishing.active) return;
    const timeScale = dt / 0.016;

    if (game.fishing.stageType === 'track') {
        // Control green zone
        const zoneSpeed = 1.6;
        if (game.keys['arrowleft'] || game.keys['a']) {
            game.fishing.targetPos -= zoneSpeed;
        }
        if (game.keys['arrowright'] || game.keys['d']) {
            game.fishing.targetPos += zoneSpeed;
        }
        game.fishing.targetPos = Math.max(10, Math.min(90, game.fishing.targetPos));

        // Fish movement (slower baseline, harder with rarer fish)
        const fishSpeed = game.fishing.fishSpeedMultiplier || 1;
        game.fishing.fishVel += (Math.random() - 0.5) * 0.4 * fishSpeed * timeScale;
        const maxFishSpeed = 1.6 * fishSpeed;
        game.fishing.fishVel = Math.max(-maxFishSpeed, Math.min(maxFishSpeed, game.fishing.fishVel));
        game.fishing.fishPos += game.fishing.fishVel * timeScale;
        if (game.fishing.fishPos > 100 || game.fishing.fishPos < 0) {
            game.fishing.fishVel *= -1;
            game.fishing.fishPos = Math.max(0, Math.min(100, game.fishing.fishPos));
        }
        game.fishing.indicatorPos = game.fishing.fishPos;

        const indicatorCenter = game.fishing.indicatorPos;
        const targetCenter = game.fishing.targetPos;
        const targetLeft = targetCenter - (game.fishing.targetWidth / 2);
        const targetRight = targetCenter + (game.fishing.targetWidth / 2);
        const inTarget = indicatorCenter >= targetLeft && indicatorCenter <= targetRight;

        // Update bobber position and water check
        const shoreX = game.island.x + game.island.width;
        const waterLevel = getWaterLevel();
        const bobX = game.fishing.castX;
        const obstacleTop = getObstacleTopAt(bobX);
        if (bobX >= shoreX + 10) {
            game.fishing.castInWater = true;
            game.fishing.castY = waterLevel + Math.sin(performance.now() / 200) * 2;
        } else {
            game.fishing.castInWater = false;
            game.fishing.castY = obstacleTop - 2;
        }

        const gain = game.fishing.progressGain ?? 0.01;
        const loss = game.fishing.progressLoss ?? 0.005;
        if (inTarget && game.fishing.castInWater) {
            game.fishing.progress = Math.min(1, game.fishing.progress + gain);
        } else {
            game.fishing.progress = Math.max(0, game.fishing.progress - loss);
        }

        if (game.fishing.progress >= 1) {
            advanceFishingStage();
            return;
        }
    } else if (game.fishing.stageType === 'timing') {
        game.fishing.timingMarkerPos += game.fishing.timingSpeed * game.fishing.timingMarkerDir * timeScale;
        if (game.fishing.timingMarkerPos > 100 || game.fishing.timingMarkerPos < 0) {
            game.fishing.timingMarkerDir *= -1;
            game.fishing.timingMarkerPos = Math.max(0, Math.min(100, game.fishing.timingMarkerPos));
        }
    }

    // Update stage timer
    game.fishing.stageTimeRemaining -= dt;
    if (game.fishing.stageTimeRemaining <= 0) {
        endFishing(false);
        return;
    }

    updateFishingDisplay();
}

function updateFishingDisplay() {
    const indicator = document.getElementById('fishing-indicator');
    const target = document.getElementById('fishing-target');
    const timer = document.getElementById('timer-value');
    const stageLabel = document.getElementById('fishing-stage-label');
    const barContainer = document.getElementById('fishing-bar-container');
    const accuracyArea = document.getElementById('fishing-accuracy-area');
    const timingArea = document.getElementById('fishing-timing-area');
    const timingTarget = document.getElementById('timing-target');
    const timingMarker = document.getElementById('timing-marker');
    const timingHits = document.getElementById('timing-hits');

    if (stageLabel) {
        const stageName = game.fishing.stageType === 'track'
            ? 'Reel'
            : game.fishing.stageType === 'targets'
                ? 'Aim'
                : 'Timing';
        stageLabel.textContent = `Stage ${game.fishing.stage}/${game.fishing.stagesTotal} - ${stageName}`;
    }

    if (barContainer) {
        barContainer.classList.toggle('hidden', game.fishing.stageType !== 'track');
    }
    if (accuracyArea) {
        accuracyArea.classList.toggle('hidden', game.fishing.stageType !== 'targets');
    }
    if (timingArea) {
        timingArea.classList.toggle('hidden', game.fishing.stageType !== 'timing');
    }

    if (indicator && game.fishing.stageType === 'track') {
        const pos = Math.max(0, Math.min(100, game.fishing.indicatorPos));
        indicator.style.left = `${pos - 1}%`;
    }
    if (target && game.fishing.stageType === 'track') {
        const targetPos = Math.max(0, Math.min(100, game.fishing.targetPos - game.fishing.targetWidth / 2));
        target.style.left = `${targetPos}%`;
        target.style.width = `${game.fishing.targetWidth}%`;
    }
    if (timingTarget && game.fishing.stageType === 'timing') {
        const timingLeft = Math.max(0, Math.min(100, game.fishing.timingTargetCenter - game.fishing.timingTargetWidth / 2));
        timingTarget.style.left = `${timingLeft}%`;
        timingTarget.style.width = `${game.fishing.timingTargetWidth}%`;
    }
    if (timingMarker && game.fishing.stageType === 'timing') {
        timingMarker.style.left = `${Math.max(0, Math.min(100, game.fishing.timingMarkerPos))}%`;
    }
    if (timingHits && game.fishing.stageType === 'timing') {
        timingHits.textContent = `Hits: ${game.fishing.timingHits}/${game.fishing.timingHitsNeeded}`;
    }
    if (timer) {
        const timeLeft = Math.max(0, Math.ceil(game.fishing.stageTimeRemaining));
        const progress = Math.round(game.fishing.progress * 100);
        const waterText = game.fishing.castInWater ? 'In Water' : 'No Water';
        const progressText = game.fishing.stageType === 'track' ? `Reel ${progress}%` : 'Complete the stage';
        timer.textContent = `${timeLeft}s | ${progressText} | ${waterText}`;
    }
}


function catchFish() {
    const indicatorCenter = game.fishing.indicatorPos;
    const targetCenter = game.fishing.targetPos;
    const targetLeft = targetCenter - 3;
    const targetRight = targetCenter + 3;
    
    if (indicatorCenter >= targetLeft && indicatorCenter <= targetRight) {
        endFishing(true);
    } else {
        endFishing(false);
    }
}

function getRandomRarity(rodStatsOverride) {
    const rodStats = rodStatsOverride || getRodStats(getEquippedRod());
    const weights = getRarityWeights(rodStats);

    const rand = Math.random();
    if (rand < weights.common) return 'common';
    if (rand < weights.common + weights.uncommon) return 'uncommon';
    if (rand < weights.common + weights.uncommon + weights.rare) return 'rare';
    if (rand < weights.common + weights.uncommon + weights.rare + weights.epic) return 'epic';
    return 'legendary';
}

function endFishing(success) {
    game.fishing.active = false;
    game.fishing.castActive = false;
    document.getElementById('fishing-minigame').classList.add('hidden');
    if (success) {
        const rodStats = game.fishing.rodStats;
        const rarity = game.fishing.pendingRarity || getRandomRarity(rodStats);
        const rarityChance = game.fishing.pendingRarityChance || (getRarityWeights(rodStats)[rarity] * 100);
        const fishList = FISH_TYPES[rarity];
        const fish = fishList[Math.floor(Math.random() * fishList.length)];
        const weight = generateFishWeight(fish, rarity);
        const item = createWeightedFish(fish, rarity, weight);
        addToInventory(item);
        game.fishing.catchDisplay = { item, timer: 1.2 };
        showCatchPopup(item, rarityChance);
    } else {
        showToast('Missed! Try again.', 'error');
    }
    game.fishing.rodStats = null;
    game.fishing.pendingRarity = null;
    game.fishing.pendingRarityChance = 0;
}

function getFishWeightRange(fish, rarity) {
    if (fish && FISH_WEIGHT_OVERRIDES[fish.sprite]) {
        return FISH_WEIGHT_OVERRIDES[fish.sprite];
    }
    return FISH_WEIGHT_RANGES[rarity] || [1, 4];
}

function generateFishWeight(fish, rarity) {
    const [min, max] = getFishWeightRange(fish, rarity);
    const baseMin = Math.max(1, min);
    const baseMax = Math.min(10, max);
    const hugeChance = 0.02;
    let weight;
    if (max >= 100 && Math.random() < hugeChance) {
        const hugeMin = Math.max(100, min);
        const roll = Math.random();
        weight = hugeMin + (max - hugeMin) * Math.pow(roll, 0.35);
    } else {
        const roll = Math.random();
        weight = baseMin + (baseMax - baseMin) * Math.pow(roll, 0.8);
    }
    return Math.round(weight * 10) / 10;
}

function createWeightedFish(fish, rarity, weight) {
    const maxWeight = getFishWeightRange(fish, rarity)[1];
    const weightMultiplier = 0.6 + (weight / maxWeight);
    const price = Math.max(1, Math.round(fish.price * weightMultiplier));
    return { ...fish, weight, price, rarity };
}

function getFishDisplaySize(item, baseSize) {
    if (!item || !item.weight) return baseSize;
    const maxWeight = getFishWeightRange(item, item.rarity)[1];
    const safeWeight = Math.max(0, item.weight);
    const normalized = Math.log10(1 + safeWeight) / Math.log10(1 + maxWeight);
    const scale = 0.3 + Math.min(10, normalized * 10);
    return Math.round(baseSize * scale);
}

function getFishImage(spriteType) {
    if (!spriteType || !game.fishSprites) return null;
    return game.fishSprites[spriteType] || null;
}

function drawFishSprite(ctx, spriteType, x, y, size) {
    const img = getFishImage(spriteType);
    if (img && img.complete) {
        const prevSmoothing = ctx.imageSmoothingEnabled;
        const prevFilter = ctx.filter;
        if (spriteType === 'rainbowTrout') {
            const hue = (performance.now() / 25) % 360;
            ctx.filter = `hue-rotate(${hue}deg)`;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, size, size);
        ctx.imageSmoothingEnabled = prevSmoothing;
        ctx.filter = prevFilter;
        return;
    }
    drawPixelSprite(ctx, spriteType, x, y, size);
}

// Inventory System
function addToInventory(item) {
    if (item.weight) {
        const entry = ensureItemId({ ...item, count: 1 });
        game.inventory.push(entry);
    } else {
        const existing = game.inventory.find(i => i.name === item.name);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
        } else {
            const entry = ensureItemId({ ...item, count: 1 });
            game.inventory.push(entry);
        }
    }
    markSaveDirty();
    updateHotbar();
}

function updateInventoryDisplay() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    
    game.inventory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        if (item.rarity) {
            div.style.background = getRarityColor(item.rarity);
        }
        
        // Create sprite canvas
        const spriteCanvas = createSpriteCanvas(item.sprite, 48);
        const iconDiv = document.createElement('div');
        iconDiv.className = 'item-icon';
        const rodAuraClass = getRodAuraClass(item);
        if (rodAuraClass) {
            iconDiv.classList.add(rodAuraClass);
        }
        iconDiv.appendChild(spriteCanvas);
        
        div.appendChild(iconDiv);

        if (item.rarity) {
            const rarityDiv = document.createElement('div');
            rarityDiv.className = 'item-rarity';
            rarityDiv.textContent = item.rarity;
            div.appendChild(rarityDiv);
        }
        
        const countDiv = document.createElement('div');
        countDiv.className = 'item-count';
        countDiv.textContent = item.weight ? `${item.weight.toFixed(1)}kg` : (item.count || 1);
        div.appendChild(countDiv);
        
        div.addEventListener('click', () => {
            // Move to hotbar if clicked
            const slot = game.selectedSlot;
            game.hotbar[slot] = item;
            updateHotbar();
            markSaveDirty();
        });
        grid.appendChild(div);
    });
    refreshMultiplayerUI();
}

function updateHotbar() {
    document.querySelectorAll('.hotbar-slot').forEach((slot, index) => {
        const content = slot.querySelector('.slot-content');
        const item = game.hotbar[index];
        
        // Clear content
        content.innerHTML = '';
        content.style.background = '#ecf0f1';
        content.classList.remove('rod-aura-advanced', 'rod-aura-master');
        
        if (item && item.sprite) {
            // Create sprite canvas
            const spriteCanvas = createSpriteCanvas(item.sprite, 40);
            spriteCanvas.style.imageRendering = 'pixelated';
            content.appendChild(spriteCanvas);
            content.style.background = getRarityColor(item.rarity);
            const rodAuraClass = getRodAuraClass(item);
            if (rodAuraClass) {
                content.classList.add(rodAuraClass);
            }
        }
    });
}

function getRarityColor(rarity) {
    const colors = {
        common: '#ecf0f1',
        uncommon: '#d5f4e6',
        rare: '#d6eaf8',
        epic: '#ebdef0',
        legendary: '#fef5e7'
    };
    return colors[rarity] || '#ecf0f1';
}

function getRarityWeights(rodStats) {
    const luck = rodStats.luck || 0;
    let common = 0.5 - luck * 0.6;
    let uncommon = 0.25 - luck * 0.3;
    let rare = 0.15 + luck * 0.4;
    let epic = 0.08 + luck * 0.2;
    let legendary = 0.02 + luck * 0.1;

    common = Math.max(0.1, common);
    uncommon = Math.max(0.05, uncommon);
    const total = common + uncommon + rare + epic + legendary;
    return {
        common: common / total,
        uncommon: uncommon / total,
        rare: rare / total,
        epic: epic / total,
        legendary: legendary / total
    };
}

function getEquippedRod() {
    const item = game.hotbar[game.selectedSlot];
    return item && item.type === 'rod' ? item : null;
}

function getRodStats(rod) {
    if (rod && rod.stats) {
        return { ...DEFAULT_ROD_STATS, ...rod.stats };
    }
    return { ...DEFAULT_ROD_STATS };
}

function getRodAuraClass(rod) {
    if (!rod || !rod.aura) return '';
    return rod.aura === 'master' ? 'rod-aura-master' : 'rod-aura-advanced';
}

function getRodAuraColor(rod) {
    if (!rod || !rod.aura) return '';
    return rod.aura === 'master' ? 'rgba(255, 215, 90, 0.9)' : 'rgba(74, 206, 255, 0.9)';
}

function getRodVisual(rod) {
    if (!rod) {
        return { shaft: '#8B5A2B', line: '#cbd6df', reel: '#c2a66b' };
    }
    switch (rod.sprite) {
        case 'rodAdvanced':
            return { shaft: '#7A4B2A', line: '#8ECDF2', reel: '#4FC3F7' };
        case 'rodMaster':
            return { shaft: '#9C6B3B', line: '#E9D9A6', reel: '#F2C14E' };
        default:
            return { shaft: '#8B5A2B', line: '#cbd6df', reel: '#c2a66b' };
    }
}

function getRodName(sprite) {
    const item = SHOP_ITEMS.find(i => i.sprite === sprite);
    return item ? item.name : 'Rod';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2800);
}

let catchPopupTimeout = null;
function hideCatchPopup() {
    const panel = document.getElementById('catch-popup');
    if (panel) {
        panel.classList.add('hidden');
    }
}

function showCatchPopup(item, rarityChance) {
    const panel = document.getElementById('catch-popup');
    if (!panel) return;
    const icon = document.getElementById('catch-icon');
    const name = document.getElementById('catch-name');
    const weight = document.getElementById('catch-weight');
    const chance = document.getElementById('catch-chance');
    const price = document.getElementById('catch-price');
    const rarity = document.getElementById('catch-rarity');

    if (icon) {
        icon.innerHTML = '';
        const canvas = createSpriteCanvas(item.sprite, 56);
        canvas.style.imageRendering = 'pixelated';
        icon.appendChild(canvas);
    }
    if (name) name.textContent = item.name;
    if (weight) weight.textContent = `${item.weight.toFixed(1)}kg`;
    if (chance) chance.textContent = `Rarity chance: ${rarityChance.toFixed(1)}%`;
    if (price) price.textContent = `Value: $${item.price}`;
    if (rarity) {
        rarity.className = `catch-rarity rarity-${item.rarity}`;
        rarity.textContent = item.rarity;
    }

    panel.classList.remove('hidden');
    if (catchPopupTimeout) {
        clearTimeout(catchPopupTimeout);
    }
    catchPopupTimeout = setTimeout(() => {
        hideCatchPopup();
    }, 4500);
}

// Shop System
function openShop() {
    togglePanel('shop-panel');
    updateShopDisplay();
}

function updateShopDisplay() {
    // Buy section
    const buySection = document.getElementById('shop-buy');
    buySection.innerHTML = '';
    
    SHOP_ITEMS.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'shop-item-icon';
        const rodAuraClass = getRodAuraClass(item);
        if (rodAuraClass) {
            iconDiv.classList.add(rodAuraClass);
        }
        const spriteCanvas = createSpriteCanvas(item.sprite, 40);
        spriteCanvas.style.imageRendering = 'pixelated';
        iconDiv.appendChild(spriteCanvas);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'shop-item-details';
        const h4 = document.createElement('h4');
        h4.textContent = item.name;
        const p = document.createElement('p');
        p.textContent = item.type === 'rod' ? 'Upgrade your fishing rod' : 'Consumable item';
        detailsDiv.appendChild(h4);
        detailsDiv.appendChild(p);
        if (item.type === 'rod' && item.buffs && item.buffs.length) {
            const buffs = document.createElement('ul');
            buffs.className = 'shop-item-buffs';
            item.buffs.forEach((buff) => {
                const li = document.createElement('li');
                li.textContent = buff;
                buffs.appendChild(li);
            });
            detailsDiv.appendChild(buffs);
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'shop-item-info';
        infoDiv.appendChild(iconDiv);
        infoDiv.appendChild(detailsDiv);
        
        const priceDiv = document.createElement('div');
        priceDiv.className = 'shop-item-price';
        priceDiv.textContent = `$${item.price}`;
        
        div.appendChild(infoDiv);
        div.appendChild(priceDiv);
        div.addEventListener('click', () => buyItem(item));
        buySection.appendChild(div);
    });
    
    // Sell section
    const sellSection = document.getElementById('shop-sell');
    sellSection.innerHTML = '';
    
    game.inventory.forEach(item => {
        if (item.price && item.sprite && item.type !== 'rod') {
            const div = document.createElement('div');
            div.className = 'shop-item';
            if (isSellProtected(item)) {
                div.classList.add('disabled');
            }
            
            const iconDiv = document.createElement('div');
            iconDiv.className = 'shop-item-icon';
            const rodAuraClass = getRodAuraClass(item);
            if (rodAuraClass) {
                iconDiv.classList.add(rodAuraClass);
            }
            const spriteCanvas = createSpriteCanvas(item.sprite, 40);
            spriteCanvas.style.imageRendering = 'pixelated';
            iconDiv.appendChild(spriteCanvas);
            
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'shop-item-details';
            const h4 = document.createElement('h4');
            h4.textContent = item.name;
            const p = document.createElement('p');
            p.className = `rarity-${item.rarity}`;
            p.textContent = item.weight ? `${item.rarity} • ${item.weight.toFixed(1)}kg` : item.rarity;
            detailsDiv.appendChild(h4);
            detailsDiv.appendChild(p);
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'shop-item-info';
            infoDiv.appendChild(iconDiv);
            infoDiv.appendChild(detailsDiv);
            
            const priceDiv = document.createElement('div');
            priceDiv.className = 'shop-item-price';
            priceDiv.textContent = `$${item.price * (item.count || 1)}`;
            
            div.appendChild(infoDiv);
            div.appendChild(priceDiv);
            if (!isSellProtected(item)) {
                div.addEventListener('click', () => sellItem(item));
            }
            sellSection.appendChild(div);
        }
    });
}

function buyItem(item) {
    if (game.money >= item.price) {
        game.money -= item.price;
        if (item.type === 'rod') {
            // Replace existing rod and equip the new one in hotbar slot 1
            const existingRodIndex = game.inventory.findIndex(i => i.type === 'rod');
            if (existingRodIndex > -1) {
                const removed = game.inventory.splice(existingRodIndex, 1)[0];
                const hotbarIndex = game.hotbar.indexOf(removed);
                if (hotbarIndex > -1) {
                    game.hotbar[hotbarIndex] = null;
                }
            }
            const newRod = ensureItemId({ ...item, count: 1 });
            game.inventory.push(newRod);
            game.hotbar[0] = newRod;
            game.selectedSlot = 0;
            markSaveDirty();
            updateHotbar();
        } else {
            addToInventory(item);
        }
        updateShopDisplay();
    } else {
        showToast('Not enough money!', 'error');
    }
}

function sellItem(item) {
    if (isSellProtected(item)) {
        showToast('This fish is protected by your sell filters.', 'info');
        return;
    }
    const price = item.price * (item.count || 1);
    game.money += price;
    markSaveDirty();
    
    const index = game.inventory.indexOf(item);
    if (index > -1) {
        game.inventory.splice(index, 1);
    }
    
    // Remove from hotbar if equipped
    const hotbarIndex = game.hotbar.indexOf(item);
    if (hotbarIndex > -1) {
        game.hotbar[hotbarIndex] = null;
    }
    
    updateHotbar();
    updateShopDisplay();
}

// Teleportation
function teleportToLocation(locationName) {
    const location = game.locations[locationName];
    if (location) {
        if (locationName === 'dock') {
            updateDockPosition();
            game.player.x = game.island.dock.x + game.island.dock.width * 0.4;
            game.player.y = game.island.dock.y - game.player.height;
        } else if (locationName === 'shop') {
            game.player.x = game.shopKeeper.x - 40;
            game.player.y = groundSurfaceAt(game.shopKeeper.x) - game.player.height;
        } else {
            game.player.x = location.x;
            game.player.y = location.y;
        }
        game.player.vx = 0;
        game.player.vy = 0;
        // Update camera immediately
        game.camera.x = game.player.x - game.canvas.width / 2;
        game.camera.y = game.player.y - game.canvas.height / 2;
        game.camera.targetX = game.camera.x;
        game.camera.targetY = game.camera.y;
    }
}

// Dialogue System
const SHOPKEEPER_DIALOGUES = [
    "Welcome to my shop, traveler!",
    "I buy and sell fish here.",
    "You can also buy fishing rods and bait.",
    "Press the shop button in dialogue to browse!",
    "Good luck with your fishing!"
];

function startDialogue() {
    game.dialogue.active = true;
    game.dialogue.currentDialogue = SHOPKEEPER_DIALOGUES;
    game.dialogue.index = 0;
    showDialogue();
}

function showDialogue() {
    const panel = document.getElementById('dialogue-panel');
    const content = document.getElementById('dialogue-content');
    
    if (game.dialogue.index < game.dialogue.currentDialogue.length) {
        content.innerHTML = `<p>${game.dialogue.currentDialogue[game.dialogue.index]}</p>`;
        if (game.dialogue.index === 2) {
            // Add shop button in dialogue
            const shopBtn = document.createElement('button');
            shopBtn.className = 'close-btn';
            shopBtn.textContent = 'Open Shop';
            shopBtn.style.marginTop = '10px';
            shopBtn.onclick = () => {
                closeDialogue();
                openShop();
            };
            content.appendChild(shopBtn);
        }
        panel.classList.remove('hidden');
    } else {
        closeDialogue();
    }
}

function nextDialogue() {
    game.dialogue.index++;
    showDialogue();
}

function closeDialogue() {
    game.dialogue.active = false;
    document.getElementById('dialogue-panel').classList.add('hidden');
}

// Dev Commands
function checkDevCode() {
    const code = document.getElementById('dev-code').value;
    if (code === 'prestoniscool') {
        game.devMode = true;
        document.getElementById('dev-code-input').classList.add('hidden');
        document.getElementById('dev-panel-open').classList.remove('ui-hidden');
        showToast('Dev mode enabled! Use the Dev Panel button in Settings.', 'success');
    } else {
        showToast('Invalid code!', 'error');
    }
}

// Pixel Art Sprite Functions
function drawPixelSprite(ctx, spriteType, x, y, size = 32) {
    const pixelSize = size / 8; // 8x8 pixel grid
    
    ctx.save();
    ctx.translate(x, y);
    ctx.imageSmoothingEnabled = false;
    
    switch(spriteType) {
        case 'tuna':
            // Tuna - blue-gray fish
            ctx.fillStyle = '#4A90E2';
            ctx.fillRect(1 * pixelSize, 3 * pixelSize, 6 * pixelSize, 3 * pixelSize);
            ctx.fillStyle = '#2E5C8A';
            ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(2 * pixelSize, 6 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(3 * pixelSize, 4 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            break;
            
        case 'salmon':
            // Salmon - orange-pink fish
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(1 * pixelSize, 3 * pixelSize, 6 * pixelSize, 3 * pixelSize);
            ctx.fillStyle = '#FF8E53';
            ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(2 * pixelSize, 6 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#FFD93D';
            ctx.fillRect(3 * pixelSize, 4 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            break;
            
        case 'bass':
            // Bass - green fish
            ctx.fillStyle = '#6BCF7F';
            ctx.fillRect(1 * pixelSize, 3 * pixelSize, 6 * pixelSize, 3 * pixelSize);
            ctx.fillStyle = '#4ECDC4';
            ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(2 * pixelSize, 6 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#95E1D3';
            ctx.fillRect(3 * pixelSize, 4 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            break;
            
        case 'pufferfish':
            // Pufferfish - round yellow with spikes
            ctx.fillStyle = '#FFD93D';
            ctx.beginPath();
            ctx.arc(4 * pixelSize, 4 * pixelSize, 3 * pixelSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(1 * pixelSize, 1 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(6 * pixelSize, 1 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(1 * pixelSize, 6 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(6 * pixelSize, 6 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#000';
            ctx.fillRect(3 * pixelSize, 3 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(5 * pixelSize, 3 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            break;
            
        case 'swordfish':
            // Swordfish - long with sword
            ctx.fillStyle = '#4A90E2';
            ctx.fillRect(2 * pixelSize, 3 * pixelSize, 5 * pixelSize, 2 * pixelSize);
            ctx.fillStyle = '#2E5C8A';
            ctx.fillRect(1 * pixelSize, 4 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Sword
            ctx.fillRect(0 * pixelSize, 4 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(3 * pixelSize, 3 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            break;
            
        case 'shark':
            // Shark - gray with fin
            ctx.fillStyle = '#7F8C8D';
            ctx.fillRect(1 * pixelSize, 2 * pixelSize, 6 * pixelSize, 4 * pixelSize);
            ctx.fillStyle = '#34495E';
            ctx.fillRect(2 * pixelSize, 1 * pixelSize, 2 * pixelSize, 2 * pixelSize); // Fin
            ctx.fillRect(5 * pixelSize, 5 * pixelSize, 2 * pixelSize, 1 * pixelSize); // Tail
            ctx.fillStyle = '#ECF0F1';
            ctx.fillRect(3 * pixelSize, 3 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Eye
            break;
            
        case 'stingray':
            // Stingray - flat diamond shape
            ctx.fillStyle = '#5D6D7E';
            ctx.beginPath();
            ctx.moveTo(4 * pixelSize, 1 * pixelSize);
            ctx.lineTo(7 * pixelSize, 4 * pixelSize);
            ctx.lineTo(4 * pixelSize, 7 * pixelSize);
            ctx.lineTo(1 * pixelSize, 4 * pixelSize);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#34495E';
            ctx.fillRect(3 * pixelSize, 3 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            break;
            
        case 'goldenFish':
            // Golden Fish - shiny gold
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(1 * pixelSize, 3 * pixelSize, 6 * pixelSize, 3 * pixelSize);
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(2 * pixelSize, 6 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#FFF8DC';
            ctx.fillRect(3 * pixelSize, 4 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            // Sparkle effect
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(5 * pixelSize, 2 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(2 * pixelSize, 5 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            break;
            
        case 'rainbowTrout':
            // Rainbow Trout - colorful
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = colors[i];
                ctx.fillRect((1 + i) * pixelSize, 3 * pixelSize, 1.5 * pixelSize, 3 * pixelSize);
            }
            ctx.fillStyle = '#2E5C8A';
            ctx.fillRect(2 * pixelSize, 2 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            ctx.fillRect(2 * pixelSize, 6 * pixelSize, 4 * pixelSize, 1 * pixelSize);
            break;
            
        case 'leviathan':
            // Leviathan - huge blue whale
            ctx.fillStyle = '#5DADE2';
            ctx.beginPath();
            ctx.ellipse(4 * pixelSize, 4 * pixelSize, 3.5 * pixelSize, 2.5 * pixelSize, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3498DB';
            ctx.fillRect(1 * pixelSize, 3 * pixelSize, 1 * pixelSize, 2 * pixelSize); // Fin
            ctx.fillRect(6 * pixelSize, 3 * pixelSize, 1 * pixelSize, 2 * pixelSize); // Fin
            ctx.fillStyle = '#2E5C8A';
            ctx.fillRect(3 * pixelSize, 2 * pixelSize, 2 * pixelSize, 1 * pixelSize); // Eye
            break;
            
        case 'rodBasic':
            // Basic Fishing Rod - wood + simple reel
            ctx.fillStyle = '#6E4B2A';
            ctx.fillRect(2 * pixelSize, 0, 1 * pixelSize, 8 * pixelSize); // Shaft
            ctx.fillStyle = '#4F351E';
            ctx.fillRect(1 * pixelSize, 5 * pixelSize, 1 * pixelSize, 3 * pixelSize); // Handle
            ctx.fillStyle = '#C2A66B';
            ctx.fillRect(3 * pixelSize, 4 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Reel
            ctx.fillStyle = '#B9C7D6';
            ctx.fillRect(3 * pixelSize, 0, 4 * pixelSize, 1 * pixelSize); // Line
            ctx.fillStyle = '#D9C27A';
            ctx.fillRect(6 * pixelSize, 1 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Hook
            break;
            
        case 'rodAdvanced':
            // Advanced Fishing Rod - reinforced + blue reel
            ctx.fillStyle = '#7A4B2A';
            ctx.fillRect(2 * pixelSize, 0, 1 * pixelSize, 8 * pixelSize);
            ctx.fillStyle = '#56371F';
            ctx.fillRect(1 * pixelSize, 4 * pixelSize, 1 * pixelSize, 4 * pixelSize);
            ctx.fillStyle = '#4FC3F7';
            ctx.fillRect(3 * pixelSize, 3 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#7FBCE6';
            ctx.fillRect(3 * pixelSize, 0, 5 * pixelSize, 1 * pixelSize); // Strong line
            ctx.fillStyle = '#F3D27A';
            ctx.fillRect(7 * pixelSize, 1 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(6 * pixelSize, 2 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Double hook
            break;
            
        case 'rodMaster':
            // Master Fishing Rod - gold trim + premium reel
            ctx.fillStyle = '#9C6B3B';
            ctx.fillRect(2 * pixelSize, 0, 1 * pixelSize, 8 * pixelSize);
            ctx.fillStyle = '#6D4A28';
            ctx.fillRect(1 * pixelSize, 3 * pixelSize, 1 * pixelSize, 5 * pixelSize);
            ctx.fillStyle = '#F2C14E';
            ctx.fillRect(3 * pixelSize, 2 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Gold reel
            ctx.fillStyle = '#E9D9A6';
            ctx.fillRect(3 * pixelSize, 0, 6 * pixelSize, 1 * pixelSize); // Premium line
            ctx.fillStyle = '#FFD96B';
            ctx.fillRect(8 * pixelSize, 1 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(7 * pixelSize, 2 * pixelSize, 1 * pixelSize, 1 * pixelSize);
            ctx.fillRect(8 * pixelSize, 3 * pixelSize, 1 * pixelSize, 1 * pixelSize); // Triple hook
            break;
            
        case 'bait':
            // Bait - worm
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(2 * pixelSize, 3 * pixelSize, 4 * pixelSize, 2 * pixelSize);
            ctx.fillStyle = '#654321';
            ctx.fillRect(3 * pixelSize, 2 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            ctx.fillRect(3 * pixelSize, 5 * pixelSize, 2 * pixelSize, 1 * pixelSize);
            ctx.fillStyle = '#FF6347';
            ctx.fillRect(3 * pixelSize, 3 * pixelSize, 2 * pixelSize, 2 * pixelSize);
            break;
    }
    
    ctx.restore();
}

// Create sprite canvas for UI
function createSpriteCanvas(spriteType, size = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = getFishImage(spriteType);
    if (img && img.complete) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, size, size);
    } else {
        drawPixelSprite(ctx, spriteType, 0, 0, size);
    }
    if (spriteType === 'rainbowTrout') {
        canvas.classList.add('rainbow-hue');
    }
    return canvas;
}

// Rendering
function drawPalmTree(x, y, sway, size = 1, palette = 'green') {
    const ctx = game.ctx;
    const treeX = x - game.camera.x;
    const trunkHeight = 95 * size;
    const treeY = y - trunkHeight - game.camera.y;
    const trunkWidth = 14 * size;
    const shadowOffset = 12 * size;

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(treeX + shadowOffset, treeY + trunkHeight + 6 * size, 28 * size, 8 * size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(treeX + shadowOffset * 1.8, treeY + trunkHeight + 10 * size, 48 * size, 14 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk (low-poly with shaded faces)
    ctx.fillStyle = '#7C5A42';
    ctx.beginPath();
    ctx.moveTo(treeX - trunkWidth * 0.4, treeY);
    ctx.lineTo(treeX + trunkWidth * 0.4, treeY);
    ctx.lineTo(treeX + trunkWidth * 0.7, treeY + trunkHeight);
    ctx.lineTo(treeX - trunkWidth * 0.2, treeY + trunkHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#5E4435';
    ctx.beginPath();
    ctx.moveTo(treeX + trunkWidth * 0.4, treeY);
    ctx.lineTo(treeX + trunkWidth * 0.7, treeY + trunkHeight);
    ctx.lineTo(treeX + trunkWidth * 0.2, treeY + trunkHeight);
    ctx.lineTo(treeX + trunkWidth * 0.1, treeY);
    ctx.closePath();
    ctx.fill();

    // Leaves (sharp, low-poly canopy)
    ctx.save();
    ctx.translate(treeX, treeY);
    ctx.rotate(Math.PI / 2);

    const canopyMains = palette === 'red'
        ? ['#B85A5A', '#C06363', '#A85151', '#B45C5C']
        : ['#4C7C5D', '#53886A', '#457255', '#5A8F6F'];
    const canopyShades = palette === 'red'
        ? ['#944646', '#8A3F3F', '#9B4C4C', '#7D3737']
        : ['#3F6A52', '#396049', '#325642', '#476E58'];
    const canopyLight = palette === 'red' ? '#CC6A6A' : '#5B8A63';
    const baseAngles = [-1.25, -0.9, -0.6, -0.2, 0.2, 0.6, 0.9, 1.25];
    const leafAngles = baseAngles.map(angle => angle * game.treeStyle.leafSpread);
    const swayOffset = Math.sin(sway) * 4 * size;

    // Back shadow canopy
    ctx.fillStyle = canopyShades[0];
    ctx.beginPath();
    ctx.moveTo(-12 * size, -10 * size);
    ctx.lineTo(12 * size, -10 * size);
    ctx.lineTo(0, 12 * size);
    ctx.closePath();
    ctx.fill();

    leafAngles.forEach((angle, i) => {
        const angleJitter = (i % 2 === 0 ? 0.08 : -0.06) + Math.sin(sway + i * 1.3) * 0.05;
        const leafAngle = angle + angleJitter;
        const leafLength = 52 * size;
        const leafWidth = 18 * size;
        const tipX = Math.cos(leafAngle) * leafLength + swayOffset * 0.2;
        const tipY = Math.sin(leafAngle) * leafLength * game.treeStyle.leafFlatness + 2 * size;
        const leftX = Math.cos(leafAngle - 0.35) * (leafWidth * 0.9);
        const leftY = Math.sin(leafAngle - 0.35) * (leafWidth * 0.9);
        const rightX = Math.cos(leafAngle + 0.35) * (leafWidth * 0.9);
        const rightY = Math.sin(leafAngle + 0.35) * (leafWidth * 0.9);

        ctx.fillStyle = canopyMains[i % canopyMains.length];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(leftX, leftY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = canopyShades[i % canopyShades.length];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(rightX, rightY);
        ctx.lineTo(tipX, tipY);
        ctx.closePath();
        ctx.fill();

        if (i === 3) {
            ctx.fillStyle = canopyLight;
            ctx.beginPath();
            ctx.moveTo(0, -4 * size);
            ctx.lineTo(tipX * 0.6, tipY * 0.6);
            ctx.lineTo(leftX * 0.6, leftY * 0.6);
            ctx.closePath();
            ctx.fill();
        }
    });

    ctx.restore();
}

function getAvatarColors(avatarId) {
    const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
    return avatar;
}

function drawRemotePlayers(timeSeconds) {
    const ctx = game.ctx;
    const players = Object.values(game.multiplayer.remotePlayers);
    if (!players.length) return;
    players.forEach((player) => {
        const colors = getAvatarColors(player.avatar);
        const playerX = player.renderX - game.camera.x;
        const playerY = player.renderY - game.camera.y;
        const bob = Math.max(0, Math.sin(timeSeconds * 5)) * 1.2;

        const headSize = 20;
        const bodyWidth = 22;
        const bodyHeight = 28;
        const bodyX = playerX + (game.player.width - bodyWidth) / 2;
        const bodyY = playerY + 16 + bob;
        const headX = playerX + (game.player.width - headSize) / 2;
        const headY = playerY + bob;

        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX, headY, headSize, headSize);
        ctx.fillStyle = colors.shirt;
        ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
        ctx.fillStyle = colors.pants;
        ctx.fillRect(bodyX, bodyY + bodyHeight - 6, bodyWidth, 6);

        if (player.hasRod) {
            const rodVisual = getRodVisual({ sprite: player.rodSprite });
            const handX = bodyX + bodyWidth + 2;
            const handY = bodyY + 10;
            const rodAngle = player.facingRight ? -0.6 : -2.5;
            const rodLength = 34;
            const rodEndX = handX + Math.cos(rodAngle) * rodLength;
            const rodEndY = handY + Math.sin(rodAngle) * rodLength;
            ctx.strokeStyle = rodVisual.shaft;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(rodEndX, rodEndY);
            ctx.stroke();
        }

        if (player.heldSprite) {
            const fishItem = {
                sprite: player.heldSprite,
                weight: player.heldWeight || 0,
                rarity: player.heldRarity || 'common'
            };
            const fishSize = getFishDisplaySize(fishItem, 18);
            const fishCenterX = bodyX + bodyWidth + 8;
            const fishCenterY = bodyY + 6;
            drawFishSprite(ctx, fishItem.sprite, fishCenterX - fishSize / 2, fishCenterY - fishSize / 2, fishSize);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.font = 'bold 9px Arial';
            ctx.fillText(`${fishItem.weight.toFixed(1)}kg`, fishCenterX - 12, fishCenterY - fishSize / 2 - 4);
        }

        if (player.name) {
            ctx.fillStyle = 'rgba(10, 20, 30, 0.7)';
            const label = player.name;
            const width = Math.max(50, label.length * 6 + 12);
            ctx.fillRect(playerX - 6, headY - 16, width, 14);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.fillText(label, playerX, headY - 5);
            if (player.rodSprite) {
                const rodName = getRodName(player.rodSprite);
                ctx.fillStyle = 'rgba(10, 20, 30, 0.7)';
                ctx.fillRect(playerX - 6, headY - 2, width, 12);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 9px Arial';
                ctx.fillText(rodName, playerX, headY + 7);
            }
        }
    });
}

function drawPlatform(x, y, width) {
    const ctx = game.ctx;
    const platX = x - game.camera.x;
    const platY = y - game.camera.y;
    
    // Platform shadow (pixelated)
    ctx.fillStyle = '#000000';
    for (let i = 0; i < width; i += 2) {
        if ((i / 2) % 2 === 0) {
            ctx.fillRect(platX + i + 2, platY + 2, 2, 6);
        }
    }
    
    // Platform top with pixel art style
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(platX, platY, width, 8);
    
    // Platform texture lines (pixelated)
    ctx.fillStyle = '#8B6F47';
    for (let i = 0; i < width; i += 8) {
        ctx.fillRect(platX + i, platY, 1, 8);
    }
    
    // Platform highlight
    ctx.fillStyle = '#F0D68C';
    ctx.fillRect(platX, platY, width, 1);
    
    // Platform bottom edge
    ctx.fillStyle = '#6B4E37';
    ctx.fillRect(platX, platY + 7, width, 1);
}

function drawIsland() {
    const ctx = game.ctx;
    const island = game.island;
    const islandX = island.x - game.camera.x;
    const islandY = GROUND_LEVEL - game.camera.y;

    drawRockyChunk(islandX, islandY, island.width, 100, island.x, true);
}

function drawRockyChunk(x, y, width, height, seed, addGrassTop = true) {
    const ctx = game.ctx;
    const topY = y - height;
    const px = 6;

    const rockGradient = ctx.createLinearGradient(0, topY, 0, y);
    rockGradient.addColorStop(0, '#5F6369');
    rockGradient.addColorStop(1, '#4A4E54');
    ctx.fillStyle = rockGradient;
    ctx.fillRect(x, topY, width, height);

    const rockColors = ['#4B4F55', '#3F4349'];
    for (let rx = 0; rx < width; rx += px) {
        for (let ry = 0; ry < height; ry += px) {
            const nx = Math.floor((rx + seed) / px);
            const ny = Math.floor(ry / px);
            const noise = (nx * 73 + ny * 37) % 100;
            if (noise < 12) {
                ctx.fillStyle = rockColors[noise % rockColors.length];
                ctx.fillRect(x + rx, topY + ry, px, px);
            }
        }
    }

    // Rock cracks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const crackX = x + (i * 120 + (seed % 60)) % width;
        ctx.beginPath();
        ctx.moveTo(crackX, topY + 10);
        ctx.lineTo(crackX + 20, topY + height - 20);
        ctx.stroke();
    }

    if (addGrassTop) {
        ctx.fillStyle = '#6B8E4E';
        ctx.fillRect(x, topY - 6, width, 6);
        ctx.fillStyle = '#54753E';
        ctx.fillRect(x, topY - 2, width, 2);
        for (let i = 0; i < width; i += 14) {
            ctx.fillStyle = '#7FA35A';
            ctx.fillRect(x + i, topY - 10, 4, 4);
        }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y - 6, width, 6);
}

function drawRockyGround() {
    const ctx = game.ctx;
    const step = 4;
    if (!drawRockyGround.cache) {
        drawRockyGround.cache = new Map();
    }
    const islandStart = game.island.x;
    const islandEnd = game.island.x + game.island.width;
    const cameraX = Math.round(game.camera.x);
    const cameraY = Math.round(game.camera.y);
    const screenStart = Math.max(-50, islandStart - cameraX);
    const screenEnd = Math.min(game.canvas.width + 50, islandEnd - cameraX);

    if (screenEnd <= screenStart) {
        return;
    }

    const fillGradient = ctx.createLinearGradient(0, 0, 0, game.canvas.height);
    fillGradient.addColorStop(0, '#5F6369');
    fillGradient.addColorStop(1, '#4A4E54');
    ctx.fillStyle = fillGradient;

    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.moveTo(screenStart, game.canvas.height);
    for (let x = screenStart; x <= screenEnd; x += step) {
        const worldX = x + cameraX;
        let groundY = drawRockyGround.cache.get(worldX);
        if (groundY === undefined) {
            groundY = Math.round(groundSurfaceAt(worldX));
            drawRockyGround.cache.set(worldX, groundY);
        }
        const screenY = groundY - cameraY;
        ctx.lineTo(x, screenY);
    }
    ctx.lineTo(screenEnd, game.canvas.height);
    ctx.closePath();
    ctx.fill();

    // Sparse darker stones with varied size/rotation (world-locked)
    const gridSize = 26;
    const worldBottom = game.camera.y + game.canvas.height;
    for (let x = screenStart; x <= screenEnd; x += gridSize) {
        const worldX = x + game.camera.x;
        const startY = groundSurfaceAt(worldX) + 18;
        for (let worldY = startY; worldY <= worldBottom; worldY += gridSize) {
            const gx = Math.floor(worldX / gridSize);
            const gy = Math.floor(worldY / gridSize);
            const seed = (gx * 928371 + gy * 523543) % 1000;
            const noise = Math.abs(Math.sin(seed * 0.1));
            if (noise < 0.18) {
                const size = 6 + Math.abs(Math.sin(seed * 1.7)) * 10;
                const angle = (seed % 360) * (Math.PI / 180);
                const y = worldY - game.camera.y;
                ctx.save();
                ctx.translate(x + size / 2, y + size / 2);
                ctx.rotate(angle);
                ctx.fillStyle = '#3F4349';
                ctx.beginPath();
                ctx.moveTo(-size * 0.6, -size * 0.2);
                ctx.lineTo(size * 0.4, -size * 0.6);
                ctx.lineTo(size * 0.6, size * 0.3);
                ctx.lineTo(-size * 0.3, size * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }
    }

    // Grass edge
    ctx.strokeStyle = '#5A7A3E';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = screenStart; x <= screenEnd; x += step) {
        const worldX = x + cameraX;
        let groundY = drawRockyGround.cache.get(worldX);
        if (groundY === undefined) {
            groundY = Math.round(groundSurfaceAt(worldX));
            drawRockyGround.cache.set(worldX, groundY);
        }
        const screenY = groundY - cameraY;
        if (x === screenStart) {
            ctx.moveTo(x, screenY);
        } else {
            ctx.lineTo(x, screenY);
        }
    }
    ctx.stroke();
}

function drawDock() {
    const ctx = game.ctx;
    const dock = game.island.dock;
    const dockX = dock.x - game.camera.x;
    const dockY = dock.y - game.camera.y;

    // Dock deck
    ctx.fillStyle = '#9B6A4A';
    ctx.fillRect(dockX, dockY, dock.width, 10);
    ctx.fillStyle = '#8C5E43';
    ctx.fillRect(dockX, dockY, dock.width, 2);

    // Railings
    ctx.strokeStyle = '#7C523B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dockX, dockY - 16);
    ctx.lineTo(dockX + dock.width, dockY - 16);
    ctx.stroke();

    const postCount = 6;
    for (let i = 0; i <= postCount; i++) {
        const postX = dockX + (i * dock.width) / postCount;
        ctx.fillStyle = '#7C523B';
        ctx.fillRect(postX - 2, dockY - 16, 4, 18);
    }

    // Dock supports
    for (let i = 0; i < 4; i++) {
        const supportX = dockX + 10 + i * (dock.width / 3.2);
        ctx.fillStyle = '#80563F';
        ctx.fillRect(supportX, dockY + 10, 10, 80);
        ctx.fillStyle = '#6E4B39';
        ctx.fillRect(supportX, dockY + 70, 10, 15);
    }

    // Simple lamp post
    const lampX = dockX + dock.width * 0.4;
    ctx.fillStyle = '#A57755';
    ctx.fillRect(lampX, dockY - 50, 6, 50);
    ctx.fillStyle = 'rgba(255, 236, 173, 0.35)';
    ctx.beginPath();
    ctx.arc(lampX + 3, dockY - 54, 26, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw fishing spots (visual markers)
    dock.fishingSpots.forEach(spot => {
        const spotX = dock.x + spot.xOffset - game.camera.x;
        const spotY = dockY + 2;
        ctx.fillStyle = 'rgba(39, 174, 96, 0.3)';
        ctx.fillRect(spotX - 5, spotY - 2, 10, 2);
    });
}

function drawShed() {
    const ctx = game.ctx;
    const shedX = game.shopKeeper.x - 30 - game.camera.x;
    const shedGroundY = groundSurfaceAt(game.shopKeeper.x) - game.camera.y;
    const shedY = shedGroundY - 80;
    const px = 2;

    // Shed base
    ctx.fillStyle = '#C06B6B';
    ctx.fillRect(shedX, shedY, 150, 90);
    ctx.fillStyle = '#B35E5E';
    ctx.fillRect(shedX, shedY + 60, 150, 30);

    // Roof
    ctx.fillStyle = '#8D6A6A';
    ctx.beginPath();
    ctx.moveTo(shedX - 10, shedY);
    ctx.lineTo(shedX + 75, shedY - 30);
    ctx.lineTo(shedX + 160, shedY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7B5C5C';
    ctx.fillRect(shedX + 10, shedY - 4, 130, 6);

    // Awning
    ctx.fillStyle = '#85B8B5';
    ctx.beginPath();
    ctx.moveTo(shedX + 25, shedY + 10);
    ctx.quadraticCurveTo(shedX + 75, shedY - 15, shedX + 125, shedY + 10);
    ctx.lineTo(shedX + 125, shedY + 22);
    ctx.lineTo(shedX + 25, shedY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#739B99';
    for (let i = 0; i < 6; i++) {
        ctx.fillRect(shedX + 30 + i * 16, shedY + 22, 10, 6);
    }

    // Front counter opening
    ctx.fillStyle = '#8A4E4E';
    ctx.fillRect(shedX + 30, shedY + 30, 80, 40);
    ctx.fillStyle = '#6F3E3E';
    ctx.fillRect(shedX + 30, shedY + 55, 80, 15);

    // Side extension
    ctx.fillStyle = '#B16565';
    ctx.fillRect(shedX + 120, shedY + 20, 90, 70);
    ctx.fillStyle = '#A45A5A';
    ctx.fillRect(shedX + 120, shedY + 60, 90, 30);

    // Window panels
    ctx.fillStyle = '#6BA1C7';
    ctx.fillRect(shedX + 135, shedY + 30, 60, 50);
    ctx.fillStyle = '#5A8CAD';
    ctx.fillRect(shedX + 135, shedY + 30, 60, 4);
    ctx.fillRect(shedX + 135, shedY + 30, 4, 50);
    ctx.fillRect(shedX + 191, shedY + 30, 4, 50);
    ctx.fillRect(shedX + 135, shedY + 76, 60, 4);

    // Crates
    ctx.fillStyle = '#A27A5B';
    ctx.fillRect(shedX + 135, shedY + 55, 22, 20);
    ctx.fillRect(shedX + 160, shedY + 55, 22, 20);
    ctx.fillRect(shedX + 148, shedY + 35, 22, 18);
    ctx.strokeStyle = '#6E5341';
    ctx.lineWidth = 2;
    ctx.strokeRect(shedX + 135, shedY + 55, 22, 20);
    ctx.strokeRect(shedX + 160, shedY + 55, 22, 20);
    ctx.strokeRect(shedX + 148, shedY + 35, 22, 18);

    // Barrels
    ctx.fillStyle = '#7B5A43';
    ctx.fillRect(shedX - 25, shedY + 50, 22, 40);
    ctx.fillRect(shedX - 45, shedY + 55, 18, 35);
    ctx.fillStyle = '#5E4435';
    ctx.fillRect(shedX - 25, shedY + 60, 22, 6);
    ctx.fillRect(shedX - 45, shedY + 65, 18, 6);
}

function drawShopKeeper() {
    const ctx = game.ctx;
    const shopX = game.shopKeeper.x - game.camera.x;
    const shopY = game.shopKeeper.y - game.camera.y;
    const px = 3;
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(shopX + px * 3, shopY + game.shopKeeper.height + 2, px * 10, px * 2);
    
    // Coat
    ctx.fillStyle = '#2B2D3A';
    ctx.fillRect(shopX + px * 3, shopY + px * 7, px * 10, px * 12);
    ctx.fillStyle = '#1E2029';
    ctx.fillRect(shopX + px * 4, shopY + px * 8, px * 8, px * 10);
    
    // Head
    ctx.fillStyle = '#F2C1A0';
    ctx.fillRect(shopX + px * 4, shopY + px * 2, px * 8, px * 6);
    
    // Hat
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(shopX + px * 2, shopY + px * 1, px * 12, px * 2);
    ctx.fillRect(shopX + px * 4, shopY, px * 8, px * 2);
    ctx.fillStyle = '#C96B2B';
    ctx.fillRect(shopX + px * 6, shopY + px * 1, px * 4, px * 1);
    
    // Eyes
    ctx.fillStyle = '#1E1E1E';
    ctx.fillRect(shopX + px * 6, shopY + px * 5, px * 1, px * 1);
    ctx.fillRect(shopX + px * 9, shopY + px * 5, px * 1, px * 1);
    
    // Arms
    ctx.fillStyle = '#2B2D3A';
    ctx.fillRect(shopX + px * 1, shopY + px * 9, px * 3, px * 5);
    ctx.fillRect(shopX + px * 12, shopY + px * 9, px * 3, px * 5);
    
    // Legs
    ctx.fillStyle = '#3B3E4A';
    ctx.fillRect(shopX + px * 5, shopY + px * 18, px * 3, px * 4);
    ctx.fillRect(shopX + px * 9, shopY + px * 18, px * 3, px * 4);
    
    // Interaction indicator
    const dist = Math.abs(game.player.x - game.shopKeeper.x);
    if (dist < game.shopKeeper.interactionRange) {
        const pulse = (Math.sin(performance.now() / 300) + 1) / 2;
        const bubbleRadius = 10 + pulse * 2;
        const bubbleX = shopX + px * 8;
        const bubbleY = shopY - px * 6;

        ctx.save();
        ctx.fillStyle = 'rgba(17, 35, 46, 0.85)';
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY + 1, bubbleRadius + 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(67, 183, 207, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1f3a4a';
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', bubbleX, bubbleY + 1);
        ctx.restore();
    }
}

function drawRain(ctx, now) {
    if (game.weather.type !== 'rain') return;
    const dt = game.frameDelta || 0.016;
    const bounds = getRainBounds();
    const viewLeft = game.camera.x - 120;
    const viewRight = game.camera.x + game.canvas.width + 120;
    const shoreX = game.island.x + game.island.width;
    const waterY = getWaterLevel();

    game.weather.splashes = (game.weather.splashes || []).filter((splash) => splash.life > 0);
    game.weather.splashes.forEach((splash) => {
        splash.life -= dt;
        const alpha = Math.max(0, splash.life / splash.ttl);
        ctx.save();
        if (splash.type === 'water') {
            ctx.strokeStyle = `rgba(210, 235, 255, ${0.6 * alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const ripple = (6 + (1 - alpha) * 8) * splash.size;
            ctx.ellipse(splash.x, splash.y, ripple, 2 + (1 - alpha) * 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (splash.type === 'leaf') {
            ctx.strokeStyle = `rgba(200, 235, 210, ${0.6 * alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(splash.x - 2, splash.y - 2);
            ctx.lineTo(splash.x + 2, splash.y + 2);
            ctx.stroke();
        } else if (splash.type === 'spray') {
            ctx.strokeStyle = `rgba(210, 235, 255, ${0.5 * alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(splash.x, splash.y - 4 * splash.size);
            ctx.lineTo(splash.x, splash.y + 2 * splash.size);
            ctx.stroke();
        } else if (splash.type === 'ground') {
            ctx.strokeStyle = `rgba(210, 235, 255, ${0.45 * alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(splash.x, splash.y, 2 + (1 - alpha) * 2 * splash.size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = `rgba(210, 235, 255, ${0.45 * alpha})`;
            ctx.beginPath();
            ctx.arc(splash.x, splash.y, 2 + (1 - alpha) * 2 * splash.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    ctx.save();
    ctx.lineWidth = 1.5;
    const dropStep = game.player.swimming ? 2 : 1;
    for (let i = 0; i < game.weather.drops.length; i += dropStep) {
        const drop = game.weather.drops[i];
        const step = drop.speed * (dt / 0.016);
        const nextY = drop.y + step;
        const hitY = nextY + drop.length;

        let hitType = null;
        let hitPosY = null;
        for (const tree of game.palmTrees) {
            const baseY = groundSurfaceAt(tree.x);
            const canopyTop = baseY - 120 * tree.size;
            const canopyBottom = baseY - 30 * tree.size;
            if (Math.abs(drop.x - tree.x) < 36 * tree.size && hitY >= canopyTop && hitY <= canopyBottom) {
                hitType = 'leaf';
                hitPosY = hitY;
                break;
            }
        }

        if (!hitType) {
            if (drop.x >= shoreX + 6 && hitY >= waterY) {
                hitType = 'water';
                hitPosY = waterY;
            } else if (drop.x < shoreX + 6) {
                const groundY = groundSurfaceAt(drop.x);
                if (hitY >= groundY) {
                    hitType = 'ground';
                    hitPosY = groundY;
                }
            }
        }

        if (hitType) {
            if (hitType === 'water') {
                pushSplash('water', drop.x, hitPosY, 1);
                pushSplash('water', drop.x + 3, hitPosY + 1, 0.7);
                pushSplash('spray', drop.x, hitPosY - 2, 0.6);
            } else if (hitType === 'ground') {
                pushSplash('ground', drop.x, hitPosY, 1);
                pushSplash('ground', drop.x + 2, hitPosY + 1, 0.7);
            } else if (hitType === 'leaf') {
                pushSplash('leaf', drop.x, hitPosY, 1);
            }
            drop.y = bounds.minY - Math.random() * 120;
            drop.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            return;
        }

        drop.y = nextY;
        if (drop.y > bounds.maxY) {
            drop.y = bounds.minY - Math.random() * 120;
            drop.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        }
        if (drop.x < bounds.minX || drop.x > bounds.maxX) {
            drop.x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        }
        ctx.strokeStyle = `rgba(210, 225, 245, ${drop.alpha})`;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.length);
        ctx.stroke();
    }

    const waterLeft = Math.max(shoreX, viewLeft);
    const waterWidth = Math.max(0, viewRight - waterLeft);
    ctx.strokeStyle = 'rgba(220, 235, 255, 0.35)';
    const rippleCount = game.player.swimming ? 10 : 18;
    for (let i = 0; i < rippleCount; i++) {
        const rx = waterLeft + ((i * 97 + now * 0.05) % Math.max(1, waterWidth));
        const ry = waterY + Math.sin(now * 0.006 + i) * 2;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 6, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(220, 235, 255, 0.35)';
    for (let i = 0; i < 14; i++) {
        const rx = game.island.x + ((i * 83 + now * 0.04) % game.island.width);
        const ry = groundSurfaceAt(rx) + 2;
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function render() {
    const ctx = game.ctx;
    const zoom = game.camera.zoom;
    const now = performance.now();
    const timeSeconds = now / 1000;
    
    // Enable smooth rendering for zoomed-in scene
    ctx.imageSmoothingEnabled = true;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
    ctx.save();
    ctx.translate(game.canvas.width / 2, game.canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-game.canvas.width / 2, -game.canvas.height / 2);
    
    // Clear canvas with sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, game.canvas.height);
    if (game.weather.type === 'rain') {
        skyGradient.addColorStop(0, '#7f93a3');
        skyGradient.addColorStop(0.6, '#8da1ad');
        skyGradient.addColorStop(1, '#97a5aa');
    } else {
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.6, '#98D8C8');
        skyGradient.addColorStop(1, '#F7DC6F');
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
    
    // Draw clouds
    for (let i = 0; i < 5; i++) {
        const cloudX = (-game.camera.x * 0.3 + i * 400 + Math.sin(timeSeconds + i) * 50) % (game.canvas.width + 200) - 100;
        const cloudY = 50 + i * 80;
        drawCloud(cloudX, cloudY);
    }
    
    // Draw water (right side of island)
    const shoreX = game.island.x + game.island.width;
    const waterStart = Math.max(0, shoreX - game.camera.x);
    const waterLevel = groundSurfaceAt(shoreX) + 56;
    const waterY = waterLevel - game.camera.y;

    if (waterStart < game.canvas.width) {
        // Base water with wave-shaped top
        ctx.fillStyle = '#4A73D1';
        const waterPath = () => {
            ctx.beginPath();
            ctx.moveTo(waterStart, game.canvas.height);
            for (let x = waterStart; x <= game.canvas.width; x += 8) {
                const wave = Math.sin((x + now * 0.08) / 40) * 6;
                ctx.lineTo(x, waterY + wave);
            }
            ctx.lineTo(game.canvas.width, game.canvas.height);
            ctx.closePath();
        };
        waterPath();
        ctx.fill();

        // Water pattern
        const waterColors = ['#4E7FE0', '#3F6BD1', '#3860BA'];
        const waterPixelSize = 6;
        const timeOffset = Math.floor(now / 140);
        ctx.save();
        waterPath();
        ctx.clip();
        for (let x = waterStart; x < game.canvas.width; x += waterPixelSize) {
            for (let y = waterY - 20; y < game.canvas.height; y += waterPixelSize) {
                const patternX = Math.floor((x + timeOffset) / waterPixelSize);
                const patternY = Math.floor((y - waterY) / waterPixelSize);
                const noise = (patternX * 73 + patternY * 37) % waterColors.length;
                ctx.fillStyle = waterColors[noise];
                ctx.fillRect(x, y, waterPixelSize, waterPixelSize);
            }
        }
        ctx.restore();

        // Moving wave line at surface
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = waterStart; x <= game.canvas.width; x += 8) {
            const wave = Math.sin((x + now * 0.08) / 40) * 3;
            ctx.lineTo(x, waterY + wave);
        }
        ctx.stroke();

        // Subtle wave bands
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        for (let i = 0; i < 3; i++) {
            const bandY = waterY + 16 + i * 18 + Math.sin(timeSeconds * 2 + i) * 2;
            ctx.fillRect(waterStart, bandY, game.canvas.width - waterStart, 2);
        }
    }
    
    // Draw ground/platforms
    game.ground.platforms.forEach(platform => {
        drawPlatform(platform.x, platform.y, platform.width);
    });
    
    // Draw main ground (island only)
    drawRockyGround();
    
    // Draw dock
    drawDock();
    
    // Draw shed (shopkeeper's building)
    drawShed();
    
    // Draw palm trees
    game.palmTrees.forEach(tree => {
        tree.sway += tree.swaySpeed;
        const baseY = groundSurfaceAt(tree.x);
        drawPalmTree(tree.x, baseY, tree.sway, tree.size, tree.palette);
    });
    
    // Draw shop keeper as pixel art character (Pixel Gun 3D style)
    drawShopKeeper();

    // Draw other players
    drawRemotePlayers(timeSeconds);
    
    // Draw player (simple blocky style, centered)
    const playerX = game.player.renderX - game.camera.x;
    const playerY = game.player.renderY - game.camera.y;
    const isWalking = Math.abs(game.player.vx) > 0.2;
    const isSwimming = game.player.swimming;
    const bob = isSwimming ? Math.sin(timeSeconds * 5) * 1.5 : Math.max(0, Math.sin(timeSeconds * 6)) * 1.5;
    const walkCycle = isSwimming ? Math.sin(timeSeconds * 6) * 3 : (isWalking ? Math.sin(timeSeconds * 10) * 4 : 0);
    
    // Player shadow
    if (!isSwimming) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(playerX + game.player.width / 2, playerY + game.player.height + 6, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    const headSize = 22;
    const bodyWidth = 24;
    const bodyHeight = 30;
    const bodyX = playerX + (game.player.width - bodyWidth) / 2;
    const bodyY = playerY + 16 + bob;
    const headX = playerX + (game.player.width - headSize) / 2;
    const headY = playerY + bob;

    // Head
    ctx.fillStyle = '#CFE63A';
    ctx.fillRect(headX, headY, headSize, headSize);
    ctx.fillStyle = '#B7D133';
    ctx.fillRect(headX, headY + headSize - 4, headSize, 4);

    // Body
    ctx.fillStyle = '#6AC93F';
    ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
    ctx.fillStyle = '#58AE37';
    ctx.fillRect(bodyX, bodyY + bodyHeight - 6, bodyWidth, 6);

    // Arms
    ctx.fillStyle = '#6AC93F';
    ctx.fillRect(bodyX - 6, bodyY + 6, 6, 18);
    ctx.fillRect(bodyX + bodyWidth, bodyY + 6, 6, 18);
    ctx.fillStyle = '#58AE37';
    ctx.fillRect(bodyX - 6, bodyY + 18, 6, 6);
    ctx.fillRect(bodyX + bodyWidth, bodyY + 18, 6, 6);

    // Legs
    ctx.fillStyle = '#2E6E2B';
    const leftLegY = bodyY + bodyHeight + Math.max(0, walkCycle);
    const rightLegY = bodyY + bodyHeight + Math.max(0, -walkCycle);
    ctx.fillRect(bodyX, leftLegY, bodyWidth / 2 - 2, 16);
    ctx.fillRect(bodyX + bodyWidth / 2 + 2, rightLegY, bodyWidth / 2 - 2, 16);

    const handX = bodyX + bodyWidth + 2;
    const handY = bodyY + 10;
    const rodAngle = game.player.facingRight ? -0.6 : -2.5;
    const rodLength = 36;
    const rodEndX = handX + Math.cos(rodAngle) * rodLength;
    const rodEndY = handY + Math.sin(rodAngle) * rodLength;

    // Fishing rod (only when equipped)
    const heldItem = game.hotbar[game.selectedSlot];
    if (heldItem && heldItem.type === 'rod') {
        const rodVisual = getRodVisual(heldItem);
        const auraColor = getRodAuraColor(heldItem);
        const pulse = (Math.sin(timeSeconds * 4) + 1) / 2;

        if (auraColor) {
            ctx.save();
            ctx.strokeStyle = auraColor;
            ctx.lineWidth = 6;
            ctx.shadowColor = auraColor;
            ctx.shadowBlur = 8 + pulse * 8;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(rodEndX, rodEndY);
            ctx.stroke();
            ctx.restore();
        }

        ctx.strokeStyle = rodVisual.shaft;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(rodEndX, rodEndY);
        ctx.stroke();

        ctx.strokeStyle = rodVisual.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rodEndX, rodEndY);
        ctx.lineTo(rodEndX + (game.player.facingRight ? 10 : -10), rodEndY + 6);
        ctx.stroke();

        ctx.fillStyle = rodVisual.reel;
        ctx.beginPath();
        ctx.arc(handX + 2, handY + 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Held item (fish)
    if (heldItem && heldItem.sprite && (!heldItem.type || heldItem.type !== 'rod')) {
        const fishSize = getFishDisplaySize(heldItem, 20);
        const fishCenterX = handX + 16;
        const fishCenterY = handY + 4;
        drawFishSprite(ctx, heldItem.sprite, fishCenterX - fishSize / 2, fishCenterY - fishSize / 2, fishSize);
    }

    if (game.fishing.castActive) {
        const bobX = game.fishing.castX - game.camera.x;
        const bobY = game.fishing.castY - game.camera.y + Math.sin(timeSeconds * 3) * 2;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rodEndX, rodEndY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Catch display
    if (game.fishing.catchDisplay) {
        game.fishing.catchDisplay.timer -= 0.016;
        const bobX = game.fishing.castX - game.camera.x;
        const bobY = game.fishing.castY - game.camera.y;
        const lift = Math.max(0, 1 - game.fishing.catchDisplay.timer) * 50;
        const catchSize = getFishDisplaySize(game.fishing.catchDisplay.item, 28);
        const catchCenterX = bobX + 4;
        const catchCenterY = bobY - 16 - lift;
        drawFishSprite(ctx, game.fishing.catchDisplay.item.sprite, catchCenterX - catchSize / 2, catchCenterY - catchSize / 2, catchSize);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`${game.fishing.catchDisplay.item.weight.toFixed(1)}kg`, catchCenterX - 18, catchCenterY - catchSize / 2 - 6);
        if (game.fishing.catchDisplay.timer <= 0) {
            game.fishing.catchDisplay = null;
        }
    }

    drawRain(ctx, now);

    ctx.restore();

    if (game.weather.type === 'rain') {
        ctx.save();
        ctx.fillStyle = 'rgba(90, 100, 110, 0.2)';
        ctx.fillRect(0, 0, game.canvas.width, game.canvas.height);
        ctx.restore();
    }

    // Draw money with better styling
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(15, 15, 150, 35);
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, 150, 35);
    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`$${game.money}`, 25, 40);
}

function drawCloud(x, y) {
    const ctx = game.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 30, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    ctx.fill();
}

// Game Loop
function gameLoop() {
    const now = performance.now();
    const dt = game.lastFrameTime ? (now - game.lastFrameTime) / 1000 : 0.016;
    game.lastFrameTime = now;
    game.frameDelta = dt;
    const fps = dt > 0 ? 1 / dt : 0;
    game.fpsSmoothed = game.fpsSmoothed * 0.9 + fps * 0.1;
    if (now - game.fpsLastUpdate > 250) {
        const meter = document.getElementById('fps-meter');
        if (meter) {
            meter.textContent = `FPS: ${Math.round(game.fpsSmoothed)}`;
        }
        game.fpsLastUpdate = now;
    }
    updatePlayer();
    updateFishing(dt);
    updateWeather();
    
    // Update palm tree animations
    game.palmTrees.forEach(tree => {
        tree.sway += tree.swaySpeed;
    });
    
    render();
    requestAnimationFrame(gameLoop);
}

// Start game when page loads
window.addEventListener('load', init);
