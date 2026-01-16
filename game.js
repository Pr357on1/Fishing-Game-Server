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
        timer: 12,
        difficulty: 0.3,
        progress: 0,
        fishPos: 50,
        fishVel: 0,
        progressGain: 0.02,
        progressLoss: 0.01,
        fishSpeedMultiplier: 1,
        rodStats: null,
        castActive: false,
        castX: 0,
        castY: 0,
        castInWater: false,
        catchDisplay: null
    }
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
        buffs: ['Catch window +20%', 'Fish movement -15%', 'Rare chance +3%'],
        stats: {
            targetWidthBonus: 6,
            indicatorSpeedMultiplier: 0.92,
            progressGainMultiplier: 1.15,
            progressLossMultiplier: 0.85,
            fishSpeedMultiplier: 0.85,
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
        buffs: ['Catch window +35%', 'Fish movement -30%', 'Rare chance +7%', 'Catch progress +25%'],
        stats: {
            targetWidthBonus: 10,
            indicatorSpeedMultiplier: 0.85,
            progressGainMultiplier: 1.25,
            progressLossMultiplier: 0.7,
            fishSpeedMultiplier: 0.7,
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

    // Starter gear
    const starterRod = { ...SHOP_ITEMS.find(item => item.type === 'rod' && item.sprite === 'rodBasic'), count: 1 };
    if (starterRod && starterRod.sprite) {
        game.inventory.push(starterRod);
        game.hotbar[0] = starterRod;
    }
    
    // Initialize hotbar selection
    selectHotbarSlot(0);
    
    // Start game loop
    gameLoop();
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
        handleKeyPress(e);
    });
    
    document.addEventListener('keyup', (e) => {
        if (isTypingInInput()) return;
        if (e.code === 'Space') {
            game.keys.space = false;
        }
        game.keys[e.key.toLowerCase()] = false;
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
        
        // Apply gravity or flying control
        if (game.player.flying) {
            if (game.keys['w'] || game.keys['arrowup']) {
                game.player.vy = -FLY_SPEED;
            } else if (game.keys['s'] || game.keys['arrowdown']) {
                game.player.vy = FLY_SPEED;
            } else {
                game.player.vy = 0;
            }
        } else {
            game.player.vy += GRAVITY;
        }
        
        // Update position
        game.player.x += game.player.vx;
        game.player.y += game.player.vy;

        // Keep player on island/dock bounds
        const minX = game.island.x + 10;
        const maxX = game.island.dock.x + game.island.dock.width - game.player.width + 10;
        if (game.player.x < minX) {
            game.player.x = minX;
            game.player.vx = 0;
        } else if (game.player.x > maxX) {
            game.player.x = maxX;
            game.player.vx = 0;
        }
        
        // Collision with ground and platforms
        game.player.onGround = false;
        const playerBottom = game.player.y + game.player.height;
        const playerLeft = game.player.x;
        const playerRight = game.player.x + game.player.width;
        const groundY = groundSurfaceAt(game.player.x + game.player.width / 2);
        
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

        // Check dock platform
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
        
        // Update jump cooldown
        if (game.player.jumpCooldown > 0) {
            game.player.jumpCooldown--;
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
    
    game.camera.x += (game.camera.targetX - game.camera.x) * CAMERA_SMOOTH;
    game.camera.y += (game.camera.targetY - game.camera.y) * CAMERA_SMOOTH;

    game.player.renderX += (game.player.x - game.player.renderX) * PLAYER_RENDER_SMOOTH;
    game.player.renderY += (game.player.y - game.player.renderY) * PLAYER_RENDER_SMOOTH;
}

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
    game.fishing.indicatorPos = 50;
    game.fishing.targetPos = 50 + (Math.random() - 0.5) * 140;
    game.fishing.targetPos = Math.max(20, Math.min(80, game.fishing.targetPos));
    game.fishing.timer = 12;
    game.fishing.indicatorSpeed = (2.5 + Math.random() * 1.5) * rodStats.indicatorSpeedMultiplier;
    game.fishing.targetWidth = 30 + rodStats.targetWidthBonus;
    game.fishing.progressGain = 0.02 * rodStats.progressGainMultiplier;
    game.fishing.progressLoss = 0.01 * rodStats.progressLossMultiplier;
    game.fishing.fishSpeedMultiplier = rodStats.fishSpeedMultiplier;
    game.fishing.rodStats = rodStats;
    game.fishing.progress = 0;
    game.fishing.fishPos = 50;
    game.fishing.fishVel = 0;
    game.fishing.castActive = true;
    game.fishing.castX = castX;
    game.fishing.castY = game.player.y + 60;
    game.fishing.castInWater = true;
    
    document.getElementById('fishing-minigame').classList.remove('hidden');
    updateFishingDisplay();
}

function updateFishing() {
    if (!game.fishing.active) return;
    
    // Control green zone
    const zoneSpeed = 1.8;
    if (game.keys['arrowleft'] || game.keys['a']) {
        game.fishing.targetPos -= zoneSpeed;
    }
    if (game.keys['arrowright'] || game.keys['d']) {
        game.fishing.targetPos += zoneSpeed;
    }
    game.fishing.targetPos = Math.max(10, Math.min(90, game.fishing.targetPos));

    // Fish movement
    const fishSpeed = game.fishing.fishSpeedMultiplier || 1;
    game.fishing.fishVel += (Math.random() - 0.5) * 0.6 * fishSpeed;
    const maxFishSpeed = 2.2 * fishSpeed;
    game.fishing.fishVel = Math.max(-maxFishSpeed, Math.min(maxFishSpeed, game.fishing.fishVel));
    game.fishing.fishPos += game.fishing.fishVel;
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

    const gain = game.fishing.progressGain ?? 0.02;
    const loss = game.fishing.progressLoss ?? 0.01;
    if (inTarget && game.fishing.castInWater) {
        game.fishing.progress = Math.min(1, game.fishing.progress + gain);
    } else {
        game.fishing.progress = Math.max(0, game.fishing.progress - loss);
    }

    if (game.fishing.progress >= 1) {
        endFishing(true);
        return;
    }

    // Update timer
    game.fishing.timer -= 0.016; // ~60fps
    if (game.fishing.timer <= 0) {
        endFishing(false);
    }
    
    updateFishingDisplay();
}

function updateFishingDisplay() {
    const indicator = document.getElementById('fishing-indicator');
    const target = document.getElementById('fishing-target');
    const timer = document.getElementById('timer-value');
    
    if (indicator) {
        const pos = Math.max(0, Math.min(100, game.fishing.indicatorPos));
        indicator.style.left = `${pos - 1}%`;
    }
    if (target) {
        const targetPos = Math.max(0, Math.min(100, game.fishing.targetPos - game.fishing.targetWidth / 2));
        target.style.left = `${targetPos}%`;
        target.style.width = `${game.fishing.targetWidth}%`;
    }
    if (timer) {
        const timeLeft = Math.max(0, Math.ceil(game.fishing.timer));
        const progress = Math.round(game.fishing.progress * 100);
        const waterText = game.fishing.castInWater ? 'In Water' : 'No Water';
        timer.textContent = `${timeLeft}s • Reel ${progress}% • ${waterText}`;
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
        const rarity = getRandomRarity(rodStats);
        const rarityChance = getRarityWeights(rodStats)[rarity] * 100;
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
        game.inventory.push({ ...item, count: 1 });
    } else {
        const existing = game.inventory.find(i => i.name === item.name);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
        } else {
            game.inventory.push({ ...item, count: 1 });
        }
    }
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
        });
        grid.appendChild(div);
    });
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
        if (item.price && item.sprite) {
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
            div.addEventListener('click', () => sellItem(item));
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
            const newRod = { ...item, count: 1 };
            game.inventory.push(newRod);
            game.hotbar[0] = newRod;
            game.selectedSlot = 0;
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
    const price = item.price * (item.count || 1);
    game.money += price;
    
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
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.6, '#98D8C8');
    skyGradient.addColorStop(1, '#F7DC6F');
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
    
    // Draw player (simple blocky style, centered)
    const playerX = game.player.renderX - game.camera.x;
    const playerY = game.player.renderY - game.camera.y;
    const bob = Math.max(0, Math.sin(timeSeconds * 6)) * 1.5;
    const isWalking = Math.abs(game.player.vx) > 0.2;
    const walkCycle = isWalking ? Math.sin(timeSeconds * 10) * 4 : 0;
    
    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(playerX + game.player.width / 2, playerY + game.player.height + 6, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.restore();

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
    updatePlayer();
    updateFishing();
    
    // Update palm tree animations
    game.palmTrees.forEach(tree => {
        tree.sway += tree.swaySpeed;
    });
    
    render();
    requestAnimationFrame(gameLoop);
}

// Start game when page loads
window.addEventListener('load', init);
