// Battle System for TEVE

class BattleUnit {
    constructor(source, isEnemy = false, position = 0) {
        this.source = source; // Reference to Hero or Enemy object
        this.isEnemy = isEnemy;
        this.position = position;
        
        // Battle stats - ensure proper initialization
        this.currentHp = this.maxHp;
        this.actionBar = 0;
        this.buffs = [];
        this.debuffs = [];
        this.cooldowns = {};
        this.isDead = false; // Explicitly set to false at start
        this.deathAnimated = false; // Track if death animation has been played
        this.uiInitialized = false; // Track if UI has been created
        
        // Initialize cooldowns
        const abilities = this.abilities;
        if (abilities && abilities.length > 0) {
            abilities.forEach((ability, index) => {
                if (ability.cooldown > 0) {
                    this.cooldowns[index] = 0;
                }
            });
        }
    }
    
    get name() {
        return this.source.name;
    }
    
    get maxHp() {
        return this.isEnemy ? this.source.hp : this.source.hp;
    }
    
    get stats() {
        return this.isEnemy ? this.source.baseStats : this.source.totalStats;
    }

    get armor() {
        if (this.isEnemy) {
            return this.source.armor;
        } else {
            return this.source.armor;
        }
    }

    get resist() {
        if (this.isEnemy) {
            return this.source.resist;
        } else {
            return this.source.resist;
        }
    }

    get physicalDamageReduction() {
        const totalArmor = this.armor;
        return (0.9 * totalArmor) / (totalArmor + 500);
    }

    get magicDamageReduction() {
        const totalResist = this.resist;
        return (0.3 * totalResist) / (totalResist + 1000);
    }
    
    get actionBarSpeed() {
        const agi = this.stats.agi;
        // DOUBLED action bar speed
        let speed = this.isEnemy ? 200 + 200 * (agi / (agi + 1000)) : this.source.actionBarSpeed * 2;
        
        // Apply buffs/debuffs
        this.buffs.forEach(buff => {
            if (buff.actionBarMultiplier) {
                speed *= buff.actionBarMultiplier;
            }
        });
        
        this.debuffs.forEach(debuff => {
            if (debuff.actionBarSpeed) {
                speed *= debuff.actionBarSpeed;
            }
        });
        
        return speed;
    }
    
    get isAlive() {
        return this.currentHp > 0 && !this.isDead;
    }
    
    get abilities() {
        return this.source.abilities || [];
    }
    
get spellLevel() {
    return this.source.spellLevel || 1;
}

    get currentShield() {
        const shieldBuff = this.buffs.find(b => b.name === 'Shield');
        return shieldBuff ? shieldBuff.shieldAmount : 0;
    }
    
    canUseAbility(abilityIndex) {
        const ability = this.abilities[abilityIndex];
        if (!ability) return false;
        
        // Check cooldown
        if (this.cooldowns[abilityIndex] > 0) return false;
        
        // Check if stunned
        if (this.debuffs.some(d => d.stunned)) return false;
        
        return true;
    }
    
    useAbility(abilityIndex) {
        const ability = this.abilities[abilityIndex];
        if (!ability || !this.canUseAbility(abilityIndex)) return false;
        
        // Set cooldown
        if (ability.cooldown > 0) {
            this.cooldowns[abilityIndex] = ability.cooldown;
        }
        
        return true;
    }
    
    reduceCooldowns() {
        Object.keys(this.cooldowns).forEach(key => {
            if (this.cooldowns[key] > 0) {
                this.cooldowns[key]--;
            }
        });
    }
    
    updateBuffsDebuffs() {
        // Store if unit was stunned before update
        const wasStunned = this.debuffs.some(d => d.name === 'Stun' || d.stunned);
        
        // Simple duration reduction - decrement all durations by 1
        this.buffs = this.buffs.filter(buff => {
            if (buff.duration > 0) {
                buff.duration--;
                return buff.duration > 0;
            }
            return buff.duration === -1; // Permanent buffs
        });
        
        this.debuffs = this.debuffs.filter(debuff => {
            if (debuff.duration > 0) {
                debuff.duration--;
                return debuff.duration > 0;
            }
            return debuff.duration === -1; // Permanent debuffs
        });
        
        // Check if stun status changed
        const isStunned = this.debuffs.some(d => d.name === 'Stun' || d.stunned);
        if (wasStunned !== isStunned) {
            // Find the battle instance and update stun visuals
            if (this.battle) {
                this.battle.updateStunVisuals(this);
            }
        }
    }
}

class Battle {
    constructor(game, party, enemyWaves) {
        this.game = game;
        this.turn = 0;
        this.currentUnit = null;
        this.waitingForPlayer = false;
        this.autoMode = false;
        this.pendingAutoMode = null;
        this.battleLog = [];
        this.gameSpeed = 1;
        this.running = true;
        this.processingWaveTransition = false;
        this.targetingState = null;
        this.battlePaused = false; // Pause for animations

        // Clear any existing timer interval from previous battles
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Clean up any lingering UI state from previous battles
        for (let i = 1; i <= 5; i++) {
            const partyElement = document.getElementById(`party${i}`);
            if (partyElement) {
                partyElement.style.display = 'none';
                partyElement.innerHTML = '';
            }
            const enemyElement = document.getElementById(`enemy${i}`);
            if (enemyElement) {
                enemyElement.style.display = 'none';
                enemyElement.innerHTML = '';
            }
        }
        
        // Add timer tracking
        this.startTime = Date.now();
        this.endTime = null;
        
        // Wave management
        this.enemyWaves = enemyWaves;
        this.currentWave = 0;
        this.waveExpCalculated = false; // Track if exp was calculated for current wave
        
        console.log('Battle created with enemyWaves:', enemyWaves ? enemyWaves.length : 0);
        
        // Store the original wave data for exp calculation
        this.dungeonWaves = enemyWaves;
        
        // Track exp earned per wave for each hero
        this.waveExpEarned = [];
        
        // Create battle units for party and ensure they're properly initialized
        this.party = party.map((hero, index) => {
            if (!hero) return null;
            const unit = new BattleUnit(hero, false, index);
            // Ensure party members start alive
            unit.currentHp = unit.maxHp;
            unit.isDead = false;
            unit.deathAnimated = false;
            unit.uiInitialized = false; // Force UI creation
            unit.battle = this; // Add reference to battle for stun visual updates
            return unit;
        }).filter(u => u);
        
        // Initialize with first wave of enemies
        this.enemies = [];
        this.loadWave(0);
        
        this.allUnits = [...this.party, ...this.enemies];
        
        // Apply initial passives
        this.applyInitialPassives();

        // Initialize UI elements for all units
        this.initializeAllUI();
        
        // Force initial UI update to ensure party is visible
        this.party.forEach(unit => {
            const elementId = `party${unit.position + 1}`;
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '1';
                element.style.visibility = 'visible';
            }
        });

this.debugAI = true; // AI decision making shown in console

        
    }
    
    loadWave(waveIndex) {
        if (waveIndex >= this.enemyWaves.length) {
            return false;
        }
        
        this.currentWave = waveIndex;
        this.waveExpCalculated = false; // Reset exp calculation flag for new wave
        const wave = this.enemyWaves[waveIndex];

        // Clean up previous wave's enemy UI completely
        this.cleanupEnemyUI();
        
        // Clear enemies array
        this.enemies = [];
        
        // Create battle units for this wave
        wave.forEach((enemy, index) => {
            if (enemy) {
                const newUnit = new BattleUnit(enemy, true, index);
                // Ensure HP is set properly
                newUnit.currentHp = newUnit.maxHp;
                newUnit.isDead = false;
                newUnit.deathAnimated = false; // Reset death animation flag
                newUnit.uiInitialized = false;
                newUnit.battle = this; // Add reference to battle for stun visual updates
                this.enemies.push(newUnit);
            }
        });
        
        // Update all units list
        this.allUnits = [...this.party, ...this.enemies];
        
        // Reset action bars for enemies
        this.enemies.forEach(enemy => {
            enemy.actionBar = 0;
        });
        
        this.log(`Wave ${waveIndex + 1} begins!`);
        this.log(`Enemies: ${this.enemies.map(u => u.name).join(', ')}`);
        
        // Update wave counter
        this.updateWaveCounter();
        
        // Initialize UI for new enemies
        this.initializeEnemyUI();

        // Force complete UI update
        this.updateUI();

        return true;
    }

    cleanupEnemyUI() {
        // Completely clean up all enemy UI elements
        for (let i = 1; i <= 5; i++) {
            const element = document.getElementById(`enemy${i}`);
            if (element) {
                // Clear all content
                element.innerHTML = '';
                
                // Hide the slot
                element.style.display = 'none';
                element.style.border = '';
                element.style.boxShadow = '';
                element.style.cursor = '';
                element.style.filter = '';
                element.style.opacity = '';
                element.style.visibility = '';
            }
        }
    }

    initializeAllUI() {
        // Initialize party UI - ensure all party slots are properly shown
        this.party.forEach((unit, index) => {
            // First ensure the slot is visible
            const elementId = `party${unit.position + 1}`;
            const element = document.getElementById(elementId);
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '1';
                element.style.visibility = 'visible';
            }
            
            // Force recreate the UI
            unit.uiInitialized = false;
            this.createUnitUI(unit);
            unit.uiInitialized = true;
        });
        
        // Hide unused party slots
        for (let i = this.party.length + 1; i <= 5; i++) {
            const element = document.getElementById(`party${i}`);
            if (element) {
                element.style.display = 'none';
            }
        }
        
        // Initialize enemy UI
        this.initializeEnemyUI();
        
        // Force an initial UI update to ensure health bars are correct
        setTimeout(() => this.updateUI(), 0);
    }

    initializeEnemyUI() {
        // Initialize UI for current wave enemies
        this.enemies.forEach(unit => {
            if (!unit.uiInitialized) {
                this.createUnitUI(unit);
                unit.uiInitialized = true;
            }
        });
        
        // Show/hide enemy slots based on enemy count
        for (let i = 1; i <= 5; i++) {
            const element = document.getElementById(`enemy${i}`);
            if (element) {
                if (i <= this.enemies.length) {
                    element.style.display = 'block';
                } else {
                    element.style.display = 'none';
                }
            }
        }
    }

    createUnitUI(unit) {
        const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
        const element = document.getElementById(elementId);
        
        if (!element) return;
        
        // Make sure element is visible
        element.style.display = 'block';
        element.style.opacity = '1';
        element.style.visibility = 'visible';
        
        // Clear any previous content to ensure fresh UI
        element.innerHTML = '';
        
        // Create animation container for unit, shadow, and active circle
        const animContainer = document.createElement('div');
        animContainer.className = 'unitAnimationContainer';
        element.appendChild(animContainer);
        
        // Create unit div inside animation container
        const unitDiv = document.createElement('div');
        unitDiv.className = 'unit';
        unitDiv.style.display = 'block';
        unitDiv.style.opacity = '1';
        animContainer.appendChild(unitDiv);
        
        // Set unit sprite/content
if (unit.isEnemy) {
    const enemyId = unit.source.enemyId;
    unitDiv.innerHTML = `
        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/enemies/${enemyId}.png" alt="${unit.name}" 
             style="image-rendering: pixelated; object-fit: contain;"
             draggable="false"
             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 9px; text-align: center; line-height: 1.2;\\'><div>${unit.name}</div><div style=\\'color: #6a9aaa;\\'>Lv${unit.source.level}</div></div>'">
    `;
} else {
    const hero = unit.source;
    unitDiv.innerHTML = `
        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${hero.className}_battle.png" alt="${hero.displayClassName}" 
             style="image-rendering: pixelated; object-fit: contain;"
             draggable="false"
             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 9px; text-align: center; line-height: 1.2;\\'><div>${hero.name}</div><div style=\\'color: #6a9aaa;\\'>Lv${hero.level}</div></div>'">
    `;
}
        
        // Create shadow inside animation container
        const shadow = document.createElement('div');
        shadow.className = 'unitShadow';
        animContainer.appendChild(shadow);
        
        // Create active turn circle inside animation container
        const activeCircle = document.createElement('div');
        activeCircle.className = 'unitActiveCircle';
        activeCircle.style.display = 'none'; // Hidden by default
        animContainer.appendChild(activeCircle);
        
        // Create health bar container (static)
        const healthBarContainer = document.createElement('div');
        healthBarContainer.className = 'healthBarContainer';
        element.appendChild(healthBarContainer);
        
        // Create health bar elements
        const healthBar = document.createElement('div');
        healthBar.className = 'healthBar';
        healthBarContainer.appendChild(healthBar);
        
        // Create health fill
        const healthFill = document.createElement('div');
        healthFill.className = 'healthFill';
        healthFill.style.width = '100%';
        healthBar.appendChild(healthFill);
        
        // Create shield fill
        const shieldFill = document.createElement('div');
        shieldFill.className = 'shieldFill';
        shieldFill.style.width = '0%';
        shieldFill.style.display = 'none';
        healthBar.appendChild(shieldFill);
        
        // Create health text
        const healthText = document.createElement('div');
        healthText.className = 'healthText';
        healthText.textContent = unit.currentHp;
        healthBar.appendChild(healthText);
        
        // Create action bar (static)
        const actionBar = document.createElement('div');
        actionBar.className = 'actionBar';
        
        const actionFill = document.createElement('div');
        actionFill.className = 'actionFill';
        actionFill.style.width = '0%';
        
        actionBar.appendChild(actionFill);
        element.appendChild(actionBar);
        
        // Create level indicator (static)
        const levelIndicator = document.createElement('div');
        levelIndicator.className = 'levelIndicator';
        element.appendChild(levelIndicator);
        
        // Add click handler for unit info
        levelIndicator.style.cursor = 'pointer';
        const clickHandler = (e) => {
            e.stopPropagation();
            this.game.uiManager.closeHeroInfo();
            if (unit.isEnemy) {
                this.game.uiManager.showEnemyInfoPopup(unit.source);
            } else {
                this.game.uiManager.showHeroInfoPopup(unit.source);
            }
        };
        levelIndicator._unitInfoHandler = clickHandler;
        levelIndicator.addEventListener('click', clickHandler);
        levelIndicator.addEventListener('selectstart', (e) => e.preventDefault());
        
        // Update level indicator content
        const starData = unit.isEnemy ? unit.source.getStars() : unit.source.getStars();
        let html = '<div class="levelNumber">' + unit.source.level + '</div>';
        if (starData.html) {
            html += '<div class="levelStars ' + starData.colorClass + '">' + starData.html + '</div>';
        }
        levelIndicator.innerHTML = html;
        
        // Add right-click handler for the entire unit slot
        const rightClickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.game.uiManager.closeHeroInfo();
            if (unit.isEnemy) {
                this.game.uiManager.showEnemyInfoPopup(unit.source);
            } else {
                this.game.uiManager.showHeroInfoPopup(unit.source);
            }
        };
        element._rightClickHandler = rightClickHandler;
        element.addEventListener('contextmenu', rightClickHandler);
        
        // Create buff/debuff container (static)
        const buffDebuffContainer = document.createElement('div');
        buffDebuffContainer.className = 'buffDebuffContainer';
        element.appendChild(buffDebuffContainer);
        
        // Initialize last buff/debuff state tracking
        unit._lastBuffDebuffState = '';
        
        // Apply stun visuals if unit is already stunned
        if (unit.debuffs.some(d => d.name === 'Stun' || d.stunned)) {
            this.updateStunVisuals(unit);
        }
    }

    updateStunVisuals(unit) {
    const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
    const element = document.getElementById(elementId);
    
    if (!element) return;
    
    const animContainer = element.querySelector('.unitAnimationContainer');
    if (!animContainer) return;
    
    const unitDiv = animContainer.querySelector('.unit');
    if (!unitDiv) return;
    
    const isStunned = unit.debuffs.some(d => d.name === 'Stun' || d.stunned);
    
    if (isStunned) {
        // Apply stun visuals to unit img only
        const tiltDegrees = unit.isEnemy ? -4 : 4;
        unitDiv.style.transform = `rotate(${tiltDegrees}deg)`;
        unitDiv.style.opacity = '0.75';
        unitDiv.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    } else {
        // Remove stun visuals from unit img
        unitDiv.style.transform = '';
        unitDiv.style.opacity = '';
        unitDiv.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    }
}

    applyInitialPassives() {
    // Apply passive abilities at battle start
    this.allUnits.forEach(unit => {
        // Apply Champion Female passive shield
        if (unit.championFemalePassive || unit.shieldRegenAmount) {
            const shieldAmount = Math.floor(unit.maxHp * 0.2);
            this.applyBuff(unit, 'Shield', -1, { shieldAmount: shieldAmount });
            unit.shieldRegenTimer = 0;
            unit.shieldRegenTurns = 4;
            unit.shieldRegenAmount = shieldAmount;
        }
        
        unit.abilities.forEach((ability, index) => {
            if (ability.passive) {
                // Get spell data
                const spell = spellManager.getSpell(ability.id);
                
                if (spell && spell.logicKey && spellLogic[spell.logicKey]) {
                    try {
                        const spellLevel = ability.level || unit.spellLevel || 1;
                        // Pass all required parameters including spell and spellLevel
                        spellLogic[spell.logicKey](this, unit, unit, spell, spellLevel);
                    } catch (error) {
                        console.error(`Error applying passive ${ability.name}:`, error);
                    }
                }
            }
        });
    });
}
    
    start() {
    this.log("Battle started!");
    this.log(`Your party: ${this.party.map(u => u.name).join(', ')}`);
    
    // Animate entire battlefield pan down
    const battleField = document.querySelector('.battleField');
    if (battleField) {
        // Set to top position first (without transition)
        battleField.style.transition = 'none';
        battleField.style.top = '8%';
        
        // Force reflow to ensure the position is set before transition
        battleField.offsetHeight;
        
        // Re-enable transition and animate to final position
        setTimeout(() => {
            battleField.style.transition = 'top 3s cubic-bezier(0.4, 0, 0.2, 1)';
            battleField.style.top = '0%';
        }, 100);
    }
    
    // Ensure all party members start alive and visible
    this.party.forEach(unit => {
            if (unit) {
                unit.currentHp = unit.maxHp;
                unit.isDead = false;
                unit.deathAnimated = false;
                unit.actionBar = 0;
                
                // Force UI refresh for party member
                const elementId = `party${unit.position + 1}`;
                const element = document.getElementById(elementId);
                if (element) {
                    element.style.display = 'block';
                    element.style.opacity = '1';
                    element.style.visibility = 'visible';
                    
                    // Ensure all UI elements are visible
                    const healthBar = element.querySelector('.healthBar');
                    const actionBar = element.querySelector('.actionBar');
                    const levelIndicator = element.querySelector('.levelIndicator');
                    const buffDebuffContainer = element.querySelector('.buffDebuffContainer');
                    const animContainer = element.querySelector('.unitAnimationContainer');
                    const unitDiv = animContainer ? animContainer.querySelector('.unit') : null;
                    const unitActiveCircle = animContainer ? animContainer.querySelector('.unitActiveCircle') : null;
                    
                    if (healthBar) healthBar.style.display = '';
                    if (actionBar) actionBar.style.display = '';
                    if (levelIndicator) levelIndicator.style.display = '';
                    if (buffDebuffContainer) buffDebuffContainer.style.display = '';
                    if (unitActiveCircle) unitActiveCircle.style.display = 'none'; // Ensure it's hidden
                    if (unitDiv) {
                        unitDiv.style.opacity = '1';
                        unitDiv.style.display = 'block';
                        unitDiv.classList.remove('dying');
                    }
                }
            }
        });
        
        // Reset start time for this battle
        this.startTime = Date.now();
        
        // Clear any existing timer interval
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Create UI elements
        this.createBattleUI();
        
        // Initial UI update
        this.updateUI();
        
        // Start the battle loop with a small delay
        setTimeout(() => this.battleLoop(), 500);
        
        // Start timer update
        this.startTimerUpdate();
    }

    createBattleUI() {
        // Create wave counter (with timer)
        this.createWaveCounter();
        
        // Create dungeon name display
        this.createDungeonNameDisplay();
        
        // Create automatic mode display
        if (this.game.autoReplay) {
            this.createAutomaticModeDisplay();
        }
    }

    createDungeonNameDisplay() {
        // Remove any existing dungeon name
        const existingName = document.getElementById('dungeonNameDisplay');
        if (existingName) {
            existingName.remove();
        }
        
        // Create new dungeon name display
        const nameDisplay = document.createElement('div');
        nameDisplay.id = 'dungeonNameDisplay';
        nameDisplay.className = 'dungeonNameDisplay';
        nameDisplay.textContent = this.game.currentDungeon ? this.game.currentDungeon.name : '';
        
        const battleScene = document.getElementById('battleScene');
        if (battleScene) {
            battleScene.appendChild(nameDisplay);
        }
    }

    createAutomaticModeDisplay() {
        // Remove any existing automatic mode display
        const existingDisplay = document.getElementById('automaticModeDisplay');
        if (existingDisplay) {
            existingDisplay.remove();
        }
        
        // Create new automatic mode display
        const autoDisplay = document.createElement('div');
        autoDisplay.id = 'automaticModeDisplay';
        autoDisplay.className = 'automaticModeDisplay';
        
        // Initialize automatic mode tracking if not exists
        if (!this.game.automaticModeStartTime) {
            this.game.automaticModeStartTime = Date.now();
            this.game.automaticModeCompletions = 0;
        }
        
        autoDisplay.innerHTML = `
            <div class="autoModeTitle">Automatic Mode</div>
            <div class="autoModeTime">00:00</div>
            <div class="autoModeCompletions">Completions: ${this.game.automaticModeCompletions}</div>
        `;
        
        const battleScene = document.getElementById('battleScene');
        if (battleScene) {
            battleScene.appendChild(autoDisplay);
        }
    }

    startTimerUpdate() {
        // Clear any existing interval first
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Update timer every second
        this.timerInterval = setInterval(() => {
            this.updateTimer();
            this.updateAutomaticModeDisplay();
        }, 1000);
    }

    updateTimer() {
        const waveCounter = document.getElementById('waveCounter');
        if (waveCounter && this.startTime) {
            const timerElement = waveCounter.querySelector('.battleTimerText');
            if (timerElement) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }

    updateAutomaticModeDisplay() {
        const autoDisplay = document.getElementById('automaticModeDisplay');
        if (autoDisplay && this.game.automaticModeStartTime) {
            const elapsed = Math.floor((Date.now() - this.game.automaticModeStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeElement = autoDisplay.querySelector('.autoModeTime');
            if (timeElement) {
                timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }

    createWaveCounter() {
        // Remove any existing wave counter
        const existingCounter = document.getElementById('waveCounter');
        if (existingCounter) {
            existingCounter.remove();
        }
        
        // Create new wave counter with timer
        const waveCounter = document.createElement('div');
        waveCounter.id = 'waveCounter';
        waveCounter.className = 'waveCounter';
        waveCounter.innerHTML = `
            <div class="waveText">Wave: ${this.currentWave + 1}/${this.enemyWaves.length}</div>
            <div class="battleTimerText">00:00</div>        
        `;
        
        const battleScene = document.getElementById('battleScene');
        if (battleScene) {
            battleScene.appendChild(waveCounter);
        }
    }
    
    updateWaveCounter() {
        const waveCounter = document.getElementById('waveCounter');
        if (waveCounter) {
            const waveText = waveCounter.querySelector('.waveText');
            if (waveText) {
                waveText.textContent = `Wave: ${this.currentWave + 1}/${this.enemyWaves.length}`;
            }
        }
    }
    
    battleLoop() {
        if (!this.running) return;
        
        // Check for battle end first
        if (this.checkBattleEnd()) return;
        
        // If processing wave transition, wait
        if (this.processingWaveTransition) {
            setTimeout(() => this.battleLoop(), 100);
            return;
        }

        // If battle is paused for animations, wait
        if (this.battlePaused) {
            setTimeout(() => this.battleLoop(), 100);
            return;
        }

        // If waiting for player, don't progress
        if (this.waitingForPlayer) {
            setTimeout(() => this.battleLoop(), 100);
            return;
        }
        
        // Check for pending auto mode changes at cycle start
        if (this.pendingAutoMode !== null) {
            this.autoMode = this.pendingAutoMode;
            this.pendingAutoMode = null;
        }
        
        // Progress action bars for all living units
        let highestActionBar = 0;
        this.allUnits.forEach(unit => {
            if (unit.isAlive) {
                let speed = unit.actionBarSpeed;
                
                // Apply speed buffs (hardcoded +33%)
                unit.buffs.forEach(buff => {
                    if (buff.name === 'Increase Speed') {
                        speed *= 1.33;
                    }
                });

                // Apply speed debuffs (hardcoded -33%)
                unit.debuffs.forEach(debuff => {
                    if (debuff.name === 'Reduce Speed') {
                        speed *= 0.67;
                    }
                });
                
                unit.actionBar += speed;
                if (unit.actionBar > highestActionBar) {
                    highestActionBar = unit.actionBar;
                }
            }
        });
        
        // Update UI to show action bar progress
        this.updateUI();
        
        // Check if anyone can act
        const readyUnits = this.allUnits.filter(u => u.isAlive && u.actionBar >= 10000);
        
        if (readyUnits.length > 0) {
            // Sort by action bar value (highest first)
            readyUnits.sort((a, b) => b.actionBar - a.actionBar);
            this.currentUnit = readyUnits[0];
            
            // Subtract action bar
            this.currentUnit.actionBar -= 10000;
            
            // Log who's taking a turn
            this.log(`${this.currentUnit.name}'s turn! (Action: ${Math.floor(this.currentUnit.actionBar)})`);
            
            // Process turn
            this.processTurn();
        } else {
            // Continue the loop
            setTimeout(() => this.battleLoop(), 50);
        }
    }
    
    processTurn() {
        const unit = this.currentUnit;

        // Debug log all possible actions if debugging is enabled
        this.debugLogAllPossibleActions(unit);
        
        // Check for Twilight's End
        if (unit.twilightsEndPending) {
            // Check if stunned, taunted, silenced, or dead
            const canCast = !unit.isDead && !unit.debuffs.some(d => 
                d.name === 'Stun' || d.stunned || 
                d.name === 'Taunt' || 
                d.name === 'Silence'
            );
            
            if (canCast) {
                // Execute Twilight's End
                unit.twilightsEndPending = false;
                this.log(`${unit.name} unleashes Twilight's End!`);
                
                // Find the twilights_promise ability to get its level
                const twilightAbility = unit.abilities.find(a => a.id === 'twilights_promise');
                const spellLevel = twilightAbility ? twilightAbility.level : 1;
                
                // Execute the logic
                spellLogic.twilightsEndLogic(this, unit, 'all', spellManager.getSpell('twilights_promise'), spellLevel);
                
                // Continue with rest of turn
            } else {
                // Cannot cast, remove pending status
                unit.twilightsEndPending = false;
                this.log(`${unit.name}'s Twilight's End was interrupted!`);
            }
        }
        
        // Show active circle for current unit
        if (unit) {
            const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
            const element = document.getElementById(elementId);
            if (element) {
                const animContainer = element.querySelector('.unitAnimationContainer');
                if (animContainer) {
                    const activeCircle = animContainer.querySelector('.unitActiveCircle');
                    if (activeCircle) {
                        activeCircle.style.display = 'block';
                    }
                }
            }
        }
        
        // Check if unit is stunned
        if (unit.debuffs.some(d => d.name === 'Stun' || d.stunned)) {
            this.log(`${unit.name} is stunned!`);
            // End turn immediately - no actions allowed
            this.endTurn();
            return;
        }

        // Check if unit is silenced
        const silenceDebuff = unit.debuffs.find(d => d.name === 'Silence');
        if (silenceDebuff) {
            this.log(`${unit.name} is silenced and must use basic attack!`);
            // Force skill 1 on random enemy
            const enemies = unit.isEnemy ? this.party.filter(p => p && p.isAlive) : this.enemies.filter(e => e && e.isAlive);
            if (enemies.length > 0) {
                const randomTarget = enemies[Math.floor(Math.random() * enemies.length)];
                // Find first non-passive ability (skill 1)
                let skill1Index = -1;
                for (let i = 0; i < unit.abilities.length; i++) {
                    if (unit.abilities[i] && !unit.abilities[i].passive) {
                        skill1Index = i;
                        break;
                    }
                }
                if (skill1Index >= 0) {
                    this.executeAbility(unit, skill1Index, randomTarget);
                }
            }
            this.endTurn();
            return;
        }
        
        // Check if unit is taunted
        const tauntDebuff = unit.debuffs.find(d => d.name === 'Taunt' && d.tauntTarget);
        const isTaunted = tauntDebuff && tauntDebuff.tauntTarget && tauntDebuff.tauntTarget.isAlive;
        
        // Check if it's a player unit and not in auto mode and not taunted
        if (!unit.isEnemy && !this.autoMode && !isTaunted) {
            this.waitingForPlayer = true;
            this.showPlayerAbilities(unit);
        } else {
            // AI turn (or taunted player unit)
            if (isTaunted && !unit.isEnemy && !this.autoMode) {
                this.log(`${unit.name} is taunted and must attack ${tauntDebuff.tauntTarget.name}!`);
            }
            this.executeAITurn(unit);
        }
    }

    executeAITurn(unit) {
        // Check if unit has taunt debuff and must attack specific target
        const tauntDebuff = unit.debuffs.find(d => d.name === 'Taunt' && d.tauntTarget);
        
        if (tauntDebuff && tauntDebuff.tauntTarget && tauntDebuff.tauntTarget.isAlive) {
            // Force basic attack on taunting unit
            const target = tauntDebuff.tauntTarget;
            // Find first non-passive ability (usually skill 1)
            let attackIndex = -1;
            for (let i = 0; i < unit.abilities.length; i++) {
                const ability = unit.abilities[i];
                if (ability && !ability.passive) {
                    attackIndex = i;
                    break;
                }
            }
            if (attackIndex >= 0) {
                this.executeAbility(unit, attackIndex, target);
            }
            this.endTurn();
            return;
        }
        
        // Pre-calculate sorted lists once for this turn
        const aliveEnemies = this.getEnemies(unit).filter(e => e.isAlive);
        const aliveAllies = this.getParty(unit).filter(a => a.isAlive);
        
        const sortedLists = {
            // Enemy sorted lists
            enemiesByArmor: [...aliveEnemies].sort((a, b) => a.armor - b.armor),
            enemiesByResist: [...aliveEnemies].sort((a, b) => a.resist - b.resist),
            enemiesByTotalDefense: [...aliveEnemies].sort((a, b) => (a.armor + a.resist) - (b.armor + b.resist)),
            enemiesByAttack: [...aliveEnemies].sort((a, b) => b.source.attack - a.source.attack),
            enemiesByHealth: [...aliveEnemies].sort((a, b) => a.currentHp - b.currentHp),
            enemiesByActionBar: [...aliveEnemies].sort((a, b) => b.actionBar - a.actionBar),
            enemiesByBuffCount: [...aliveEnemies].sort((a, b) => b.buffs.length - a.buffs.length),
            
            // Ally sorted lists
            alliesByTotalDefense: [...aliveAllies].sort((a, b) => (a.armor + a.resist) - (b.armor + b.resist)),
            alliesByDebuffCount: [...aliveAllies].sort((a, b) => b.debuffs.length - a.debuffs.length),
            alliesByHealth: [...aliveAllies].sort((a, b) => a.currentHp - b.currentHp),
            alliesByAttack: [...aliveAllies].sort((a, b) => b.source.attack - a.source.attack),
            alliesByActionBar: [...aliveAllies].sort((a, b) => a.actionBar - b.actionBar),
            
            // Counts for quick access
            aliveEnemiesCount: aliveEnemies.length,
            aliveAlliesCount: aliveAllies.length
        };
        
        // Get all possible actions
        const possibleActions = this.getAllPossibleActions(unit);
        
        if (possibleActions.length === 0) {
            // This should NEVER happen - skill 1 has no cooldown
            console.error(`CRITICAL: ${unit.name} has NO available abilities! This is a bug!`);
            this.log(`ERROR: ${unit.name} cannot act - no abilities available!`);
            this.endTurn();
            return;
        }
        
        // Calculate score for each action
        possibleActions.forEach(action => {
            action.score = this.calculateAbilityScore(unit, action.abilityIndex, action.target, action.spell, sortedLists);
        });
        
        // Sort by score (highest first)
        possibleActions.sort((a, b) => b.score - a.score);
        
        // If best score is still negative, force use skill 1 on random target
        if (possibleActions[0].score < 0) {
            console.warn(`${unit.name} has only negative scoring options. Forcing skill 1.`);
            
            // Find skill 1 actions (first non-passive ability)
            const skill1Actions = possibleActions.filter(a => {
                const ability = unit.abilities[a.abilityIndex];
                return ability && !ability.passive && a.abilityIndex === 0;
            });
            
            if (skill1Actions.length > 0) {
                // Pick random target from skill 1 options
                const randomAction = skill1Actions[Math.floor(Math.random() * skill1Actions.length)];
                this.executeAbility(unit, randomAction.abilityIndex, randomAction.target);
                this.endTurn();
                return;
            }
        }
        
        // Execute the best action
        const bestAction = possibleActions[0];
        
        // Debug logging for AI decisions (optional)
        /*
        if (this.debugAI) {
            console.log(`AI Decision for ${unit.name}:`);
            console.log(`Chosen: ${bestAction.ability.name} on ${bestAction.target.name || 'all'} (score: ${bestAction.score.toFixed(1)})`);
            console.log('Top 3 options:', possibleActions.slice(0, 3).map(a => 
                `${a.ability.name} → ${a.target.name || 'all'} (${a.score.toFixed(1)})`
            ));
        }
        */
        this.executeAbility(unit, bestAction.abilityIndex, bestAction.target);
        this.endTurn();
    }

    
    getBuffNameFromEffect(effect) {
        const mapping = {
            'buff_increase_attack': 'Increase Attack',
            'buff_increase_speed': 'Increase Speed',
            'buff_increase_defense': 'Increase Defense',
            'buff_immune': 'Immune',
            'buff_shield': 'Shield'
        };
        return mapping[effect] || '';
    }

    getDebuffNameFromEffect(effect) {
        const mapping = {
            'debuff_reduce_attack': 'Reduce Attack',
            'debuff_reduce_speed': 'Reduce Speed',
            'debuff_reduce_defense': 'Reduce Defense',
            'debuff_blight': 'Blight',
            'debuff_bleed': 'Bleed',
            'debuff_stun': 'Stun',
            'debuff_taunt': 'Taunt',
            'debuff_silence': 'Silence',
            'debuff_mark': 'Mark'
        };
        return mapping[effect] || '';
    }

    // AI Scoring System
    calculateAbilityScore(caster, abilityIndex, target, spell, sortedLists) {
        let score = 0;
        const ability = caster.abilities[abilityIndex];
        const effects = spell.effects || [];
        
        // Base score for using any ability
        score += 10;
        
        // Prefer abilities with longer cooldowns when scores are close (tiebreaker)
        score += ability.cooldown * 0.1;
        
        // Check if it's an AOE ability
        const isAOE = effects.includes('aoe') || 
                      spell.target === 'all_enemies' || 
                      spell.target === 'all_allies' || 
                      spell.target === 'all';
        
        // For AOE abilities, we'll calculate scores for each target and average
        let aoeScores = [];
        let potentialTargets = [];
        
        if (isAOE) {
            if (spell.target === 'all_enemies') {
                potentialTargets = this.getEnemies(caster).filter(e => e.isAlive);
            } else if (spell.target === 'all_allies') {
                potentialTargets = this.getParty(caster).filter(a => a.isAlive);
            } else if (spell.target === 'all') {
                // For abilities that can target either team, evaluate both
                const enemies = this.getEnemies(caster).filter(e => e.isAlive);
                const allies = this.getParty(caster).filter(a => a.isAlive);
                // Determine which team would benefit more
                potentialTargets = enemies.length > 0 ? enemies : allies;
            }
        }
        
        // Function to calculate effect scores for a single target
        const calculateEffectScoreForTarget = (currentTarget) => {
            let targetScore = 0;
            
            // Rank bonuses for tiebreaking (small values)
            const rankBonus = [2.5, 2.0, 1.5, 1.0, 0.5];
            
            // Get spell duration for buff/debuff scoring
            const spellLevel = ability.level || caster.spellLevel || 1;
            const levelIndex = spellLevel - 1;
            const spellDuration = spell.duration ? (spell.duration[levelIndex] || spell.duration[0] || 1) : 1;
            
            // Check if target has Twilight's End pending
            if (currentTarget && currentTarget !== 'all' && currentTarget.twilightsEndPending) {
                targetScore += 10; // Base bonus for targeting Twilight's caster
                // Huge bonus for any disruptive action
                if (effects.includes('debuff_stun') || 
                    effects.includes('debuff_silence') || 
                    effects.includes('debuff_taunt') ||
                    effects.includes('physical') || 
                    effects.includes('magical') || 
                    effects.includes('pure')) {
                    targetScore += 50; // Priority to stop Twilight's End
                }
            }
            
            // Calculate damage multiplier based on buffs/debuffs
            let damageMultiplier = 1.0;
            if (caster.buffs.some(b => b.name === 'Increase Attack')) {
                damageMultiplier *= 1.3; // 30% bonus for having attack buff
            }
            if (currentTarget && currentTarget !== 'all' && currentTarget.isAlive) {
                if (currentTarget.debuffs.some(d => d.name === 'Reduce Defense')) {
                    damageMultiplier *= 1.25; // 25% bonus for defense debuff
                }
                if (currentTarget.debuffs.some(d => d.name === 'Mark')) {
                    damageMultiplier *= 1.2; // 20% bonus for marked target
                }
            }
            
            // Track total effect scores for multi-effect abilities
            let totalEffectScore = 0;
            
            // Process each effect
            effects.forEach(effect => {
                let effectScore = 0;
                
                // Damage effects
                if (effect === 'physical' || effect === 'magical' || effect === 'pure') {
                    effectScore += 32 * damageMultiplier;
                    
                    if (currentTarget && currentTarget !== 'all' && currentTarget.isAlive) {
                        // Bonus for low HP enemies
                        const hpPercent = currentTarget.currentHp / currentTarget.maxHp;
                        effectScore += (1 - hpPercent) * 30; // Up to +30 for nearly dead enemies
                        
                        const actionBarPercent = currentTarget.actionBar / 10000;
                        
                        // Bonus for killing high action bar enemies
                        if (actionBarPercent >= 0.9) {
                            effectScore += 20; // Significant bonus for preventing imminent turn
                        } else if (actionBarPercent >= 0.7) {
                            effectScore += actionBarPercent * 10; // Smaller scaling bonus
                        }
                        
                        // Bonus for targeting squishier enemies
                        const avgMaxHp = sortedLists.aliveEnemiesCount > 0 ?
                            sortedLists.enemiesByHealth.reduce((sum, e) => sum + e.maxHp, 0) / sortedLists.aliveEnemiesCount : 1;
                        if (currentTarget.maxHp < avgMaxHp * 0.8) {
                            effectScore += 8; // Bonus for low max HP targets
                        }
                        
                        // Defense-based targeting
                        if (sortedLists.aliveEnemiesCount > 1) {
                            // Find target's position in sorted lists
                            const armorRank = sortedLists.enemiesByArmor.indexOf(currentTarget);
                            const resistRank = sortedLists.enemiesByResist.indexOf(currentTarget);
                            const totalRank = sortedLists.enemiesByTotalDefense.indexOf(currentTarget);
                            
                            // Apply small bonuses based on damage type and defense weakness
                            if (effect === 'physical' && armorRank !== -1) {
                                effectScore += rankBonus[armorRank] || 0;
                            } else if (effect === 'magical' && resistRank !== -1) {
                                effectScore += rankBonus[resistRank] || 0;
                            } else if (effect === 'pure' && totalRank !== -1) {
                                // Pure damage prefers highest total defenses (reverse order)
                                const reversedRank = sortedLists.aliveEnemiesCount - 1 - totalRank;
                                effectScore += rankBonus[reversedRank] || 0;
                            }
                        }
                        
                        // Penalties for defensive buffs
                        if (currentTarget.buffs.some(b => b.name === 'Frost Armor')) {
                            effectScore -= 25; // Will get slowed if attacking
                        }
                        if (currentTarget.buffs.some(b => b.name === 'Increase Defense')) {
                            effectScore -= 20; // Significant damage reduction
                        }
                        if (currentTarget.buffs.some(b => b.name === 'Shield')) {
                            effectScore -= 5; // Minor penalty for shield absorption
                        }
                        
                        // Overkill protection - but not if enemy is about to act!
                        const estimatedDamageMultiplier = {
                            'physical': 80,
                            'magical': 70,
                            'pure': 100
                        };
                        const dmgType = effect; // Current effect is the damage type
                        const estimatedDamage = (estimatedDamageMultiplier[dmgType] || 50) * damageMultiplier;
                        
                        if (estimatedDamage > currentTarget.currentHp * 2) {
                            // If enemy is at 80%+ action bar, no overkill penalty
                            if (actionBarPercent < 0.8) {
                                const overkillRatio = estimatedDamage / currentTarget.currentHp;
                                effectScore *= Math.max(0.3, 1 - (overkillRatio - 2) * 0.2);
                            }
                        }
                    }
                }
                
                // Healing effects
                if (effect === 'heal') {
                    if (currentTarget && currentTarget !== 'all') {
                        // Check if target is blighted (can't be healed)
                        if (currentTarget.debuffs.some(d => d.name === 'Blight')) {
                            effectScore -= 100; // Strong negative for impossible heal
                            totalEffectScore += effectScore;
                            return;
                        }
                        
                        // Calculate health deficit including potential shields
                        const healthDeficit = this.calculateHealthDeficit(caster, currentTarget);
                        effectScore += healthDeficit * 100; // Higher score for more injured/shieldless allies
                        
                        // Slight preference for healing squishier allies
                        if (sortedLists.aliveAlliesCount > 1) {
                            const defenseRank = sortedLists.alliesByTotalDefense.indexOf(currentTarget);
                            if (defenseRank !== -1) {
                                effectScore += rankBonus[defenseRank] || 0;
                            }
                        }
                    }
                }
                
                // Buff effects - score EACH buff
                if (effect.startsWith('buff_')) {
                    if (currentTarget && currentTarget !== 'all') {
                        // Check if target is marked (can't receive buffs)
                        if (currentTarget.debuffs.some(d => d.name === 'Mark')) {
                            effectScore -= 100; // Negative score for trying to buff marked target
                            totalEffectScore += effectScore;
                            return;
                        }
                        
                        const buffName = this.getBuffNameFromEffect(effect);
                        const hasBuff = currentTarget.buffs.some(b => b.name === buffName);
                        
                        if (!hasBuff) {
                            effectScore += 40 * spellDuration; // Good to apply new buff, scaled by duration
                            
                            // Special cases for high-value buffs
                            if (effect === 'buff_increase_attack') {
                                effectScore += 20 * spellDuration; // Attack buffs are high value
                            } else if (effect === 'buff_increase_speed') {
                                effectScore += 20 * spellDuration; // Speed buffs are valuable
                            } else if (effect === 'buff_shield') {
                                const shieldDeficit = this.calculateHealthDeficit(caster, currentTarget);
                                effectScore += shieldDeficit * 50; // Shield value doesn't scale with duration
                            } else if (effect === 'buff_immune') {
                                effectScore += 25 * spellDuration; // Immunity is very valuable
                            }
                        } else {
                            // Check if we should refresh expiring buffs
                            const existingBuff = currentTarget.buffs.find(b => b.name === buffName);
                            if (existingBuff && existingBuff.duration > 0 && existingBuff.duration <= 2) {
                                effectScore += 15 * spellDuration; // Moderate value for refreshing
                            } else {
                                effectScore -= 10; // Small penalty for redundant buff
                            }
                        }
                    }
                }
                
                // Debuff effects - score EACH debuff
                if (effect.startsWith('debuff_')) {
                    if (currentTarget && currentTarget !== 'all') {
                        // Check if target is immune
                        if (currentTarget.buffs.some(b => b.name === 'Immune')) {
                            effectScore -= 50; // Can't debuff immune targets
                            totalEffectScore += effectScore;
                            return;
                        }
                        
                        const debuffName = this.getDebuffNameFromEffect(effect);
                        const hasDebuff = currentTarget.debuffs.some(d => d.name === debuffName);
                        
                        if (!hasDebuff) {
                            effectScore += 35 * spellDuration; // Good to apply new debuff, scaled by duration
                            
                            // Bonus for debuffing buffed enemies
                            if (currentTarget.buffs.length > 0) {
                                effectScore += currentTarget.buffs.length * 3 * spellDuration; // +3 per buff they have, scaled by duration
                            }
                            
                            // Special high-value debuffs
                            if (effect === 'debuff_stun') {
                                effectScore += 30 * spellDuration; // Stuns are very valuable
                                // Extra bonus for stunning high action bar enemies
                                if (currentTarget.actionBar >= 9000) {
                                    effectScore += 15;
                                }
                            } else if (effect === 'debuff_mark') {
                                effectScore += 25 * spellDuration; // Mark is valuable (prevents buffs + damage increase)
                            } else if (effect === 'debuff_reduce_defense') {
                                effectScore += 20 * spellDuration; // Defense reduction helps entire team
                                // Slight preference for high defense targets
                                if (sortedLists.aliveEnemiesCount > 1) {
                                    const defenseRank = sortedLists.enemiesByTotalDefense.indexOf(currentTarget);
                                    if (defenseRank !== -1) {
                                        const reversedRank = sortedLists.aliveEnemiesCount - 1 - defenseRank;
                                        effectScore += rankBonus[reversedRank] || 0;
                                    }
                                }
                            } else if (effect === 'debuff_reduce_attack') {
                                effectScore += 15 * spellDuration; // Attack reduction is defensive
                                // Slight preference for high attack targets
                                if (sortedLists.aliveEnemiesCount > 1) {
                                    const attackRank = sortedLists.enemiesByAttack.indexOf(currentTarget);
                                    if (attackRank !== -1) {
                                        effectScore += rankBonus[attackRank] || 0;
                                    }
                                }
                            } else if (effect === 'debuff_silence') {
                                effectScore += 20 * spellDuration; // Silence prevents abilities
                            } else if (effect === 'debuff_reduce_speed') {
                                effectScore += 15 * spellDuration; // Speed reduction is useful
                            }
                        } else {
                            // Small penalty for redundant debuff unless it stacks (like bleed)
                            if (effect === 'debuff_bleed') {
                                effectScore += 15 * spellDuration; // Bleeds stack duration
                            } else {
                                const existingDebuff = currentTarget.debuffs.find(d => d.name === debuffName);
                                if (existingDebuff && existingDebuff.duration > 0 && existingDebuff.duration <= 2) {
                                    effectScore += 10 * spellDuration; // Some value for refreshing expiring debuff
                                } else {
                                    effectScore -= 20; // Small penalty for redundant
                                }
                            }
                        }
                    }
                }
                
                // Cleanse effects (remove debuffs from allies)
                if (effect === 'cleanse') {
                    if (currentTarget && currentTarget !== 'all') {
                        effectScore += currentTarget.debuffs.length * 20; // High value per debuff removed
                        // Extra value for removing dangerous debuffs
                        if (currentTarget.debuffs.some(d => d.name === 'Stun')) effectScore += 20;
                        if (currentTarget.debuffs.some(d => d.name === 'Mark')) effectScore += 15;
                        if (currentTarget.debuffs.some(d => d.name === 'Blight')) effectScore += 15;
                        
                        // Slight preference for allies with more debuffs
                        if (sortedLists.aliveAlliesCount > 1) {
                            const debuffRank = sortedLists.alliesByDebuffCount.indexOf(currentTarget);
                            if (debuffRank !== -1) {
                                effectScore += rankBonus[debuffRank] || 0;
                            }
                        }
                    }
                }
                
                // Dispel effects (remove buffs from enemies)
                if (effect === 'dispel') {
                    if (currentTarget && currentTarget !== 'all') {
                        effectScore += currentTarget.buffs.length * 20; // High value per buff removed
                        // Extra value for removing powerful buffs
                        if (currentTarget.buffs.some(b => b.name === 'Immune')) effectScore += 30;
                        if (currentTarget.buffs.some(b => b.name === 'Shield')) effectScore += 20;
                        if (currentTarget.buffs.some(b => b.name === 'Increase Attack')) effectScore += 15;
                        
                        // Slight preference for enemies with more buffs
                        if (sortedLists.aliveEnemiesCount > 1) {
                            const buffRank = sortedLists.enemiesByBuffCount.indexOf(currentTarget);
                            if (buffRank !== -1) {
                                effectScore += rankBonus[buffRank] || 0;
                            }
                        }
                    }
                }
                
                // Shield break effects
                if (effect === 'shield_break') {
                    if (currentTarget && currentTarget !== 'all' && currentTarget.isAlive) {
                        const hasShield = currentTarget.buffs.some(b => b.name === 'Shield');
                        if (hasShield) {
                            effectScore += 40; // High value for breaking shields
                        } else {
                            effectScore += 5; // Small value even without shield (preventative)
                        }
                    }
                }
                
                // Support effects (action bar manipulation, etc)
                if (effect === 'support') {
                    effectScore += 15; // General support value
                    
                    // Extra points for action bar manipulation on high action bar enemies
                    if (currentTarget && currentTarget !== 'all' && currentTarget.isAlive) {
                        const actionBarPercent = currentTarget.actionBar / 10000;
                        effectScore += actionBarPercent * 20;
                    }
                }
                
                totalEffectScore += effectScore;
            });
            
            targetScore += totalEffectScore;
            return targetScore;
        };
        
        // Calculate scores
        if (isAOE && potentialTargets.length > 0) {
            // Calculate score for each target
            potentialTargets.forEach(t => {
                aoeScores.push(calculateEffectScoreForTarget(t));
            });
            
            // Average the scores (with divide by zero protection)
            const avgScore = aoeScores.length > 0 ? 
                aoeScores.reduce((sum, s) => sum + s, 0) / aoeScores.length : 
                0;
            
            // Apply AOE multiplier (1.3x for hitting multiple targets)
            score += avgScore * 1.3;
        } else {
            // Single target ability
            score += calculateEffectScoreForTarget(target);
        }
        
        // Special ability synergies and considerations (organized at bottom)
        if (target && target !== 'all' && target.isAlive) {
            // Blade Strike synergy with bleeding targets
            if (spell.id === 'blade_strike' && target.debuffs.some(d => d.name === 'Bleed')) {
                score += 30; // Significant bonus for 150% damage
            }
            
            // Void Strike synergy with debuffed targets
            if (spell.id === 'void_strike') {
                const debuffCount = target.debuffs ? target.debuffs.length : 0;
                score += debuffCount * 15; // Bonus per debuff since it hits multiple times
            }
            
            // Assassinate conditions (REBALANCED)
            if (spell.id === 'assassinate') {
                if ((target.currentHp / target.maxHp) < 0.3 && target.debuffs.length > 0) {
                    score += 100; // Reduced from 200
                } else {
                    score -= 50; // Reduced from 100
                }
            }
            
            // Double Shot gets bonus if target doesn't have reduce defense yet
            if (spell.id === 'double_shot' && !target.debuffs.some(d => d.name === 'Reduce Defense')) {
                score += 15; // Bonus for applying new debuff
            }
            
            // Divine Light bonus for debuffed allies
            if (spell.id === 'divine_light' && target.debuffs.length > 0) {
                score += 20; // Bonus for using on debuffed ally
            }
            
            // Hunter's Mark bonus for unmarked targets
            if (spell.id === 'hunters_mark' && !target.debuffs.some(d => d.name === 'Mark')) {
                score += 15; // Extra value for this powerful debuff combo
            }
            
            // Cheap Shot synergies
            if (spell.id === 'cheap_shot') {
                // MAJOR bonus if caster has debuffs to transfer
                if (caster.debuffs && caster.debuffs.length > 0) {
                    score += 30 * caster.debuffs.length; // +30 per debuff we can transfer
                }
                // Phantom Assassin Female - bonus if target is below 50% HP
                if (caster.phantomAssassinFemalePassive && (target.currentHp / target.maxHp) < 0.5) {
                    score += 25; // Will deal pure damage
                }
            }
            
            // Psychic Mark with Dark Arch Templar Female passive
            if (spell.id === 'psychic_mark' && caster.darkArchTemplarFemalePassive) {
                score += 10; // Extra value for applying 3 debuffs at once
            }
            
            // Protective Barrier - prefer low HP allies (uses sorted list)
            if (spell.id === 'protective_barrier') {
                const lowestHpAlly = sortedLists.alliesByHealth[0];
                if (lowestHpAlly) {
                    const hpPercent = lowestHpAlly.currentHp / lowestHpAlly.maxHp;
                    score += (1 - hpPercent) * 30; // Higher value for lower HP allies
                }
            }
            
            // NEW: Helping Hand - extremely powerful action bar fill
            if (spell.id === 'helping_hand' && target !== 'all') {
                // Huge value if target has low action bar
                const actionBarPercent = target.actionBar / 10000;
                score += (1 - actionBarPercent) * 40; // Up to +40 for empty action bar
                // Extra value if target is a high damage dealer
                const attackRank = sortedLists.alliesByAttack.indexOf(target);
                if (attackRank === 0) score += 10; // Best attacker
            }
            
            // NEW: Steal Magic - buff transfer is very powerful
            if (spell.id === 'steal_magic' && target !== 'all') {
                // Extra points for quality buffs to steal
                if (target.buffs.some(b => b.name === 'Increase Attack')) score += 10;
                if (target.buffs.some(b => b.name === 'Increase Speed')) score += 8;
            }
            
            // NEW: Shadowstep - triple debuff application
            if (spell.id === 'shadowstep' && target !== 'all') {
                // Bonus for applying 3 debuffs at once
                if (!target.debuffs.some(d => ['Taunt', 'Mark', 'Bleed'].includes(d.name))) {
                    score += 15; // Extra value for fresh target
                }
            }
        }
        
        // Multi-effect ability synergies
        if (spell.id === 'rally_banner') {
            const lowActionAllies = sortedLists.alliesByActionBar.filter(a => 
                a.actionBar < 5000
            );
            score += lowActionAllies.length * 15;
        }
        
        if (spell.id === 'mass_heal') {
            const injuredAllies = sortedLists.alliesByHealth.filter(a => 
                a.currentHp < a.maxHp * 0.7
            );
            score += injuredAllies.length * 10;
        }
        
        if (spell.id === 'natures_balance') {
            const debuffedAllies = sortedLists.alliesByDebuffCount.filter(a => a.debuffs.length > 0);
            const buffedEnemies = sortedLists.enemiesByBuffCount.filter(e => e.buffs.length > 0);
            score += Math.max(debuffedAllies.length * 15, buffedEnemies.length * 15);
        }
        
        // NEW: Sanctuary - debuff conversion is unique
        if (spell.id === 'sanctuary') {
            const debuffedAllies = sortedLists.alliesByDebuffCount.filter(a => a.debuffs.length > 0);
            score += debuffedAllies.length * 20; // High value per ally that will get converted buffs
        }
        
        // Self-harm abilities
        if (spell.id === 'blood_pact') {
            score -= 20; // Penalty for self-bleed
            const tauntedEnemies = this.getEnemies(caster).filter(e => 
                e.isAlive && e.debuffs.some(d => d.name === 'Taunt' && d.tauntTarget === caster)
            );
            score += tauntedEnemies.length * 10;
        }
        
        // Passive synergies
        if (caster.archSageMalePassive || caster.archSageFemalePassive) {
            if (spell.effects.some(e => e.startsWith('debuff_')) && target === caster) {
                score += 30; // Bonus for self-debuffing with Arch Sage passive
            }
        }
        
        if (spell.id === 'natures_blessing' && (caster.summonerMalePassive || caster.summonerFemalePassive)) {
            score += 15; // Extra value for enhanced version
        }
        
        if (spell.id === 'psi_shift' && caster.grandTemplarFemalePassive) {
            score += 20; // Sets to 0% instead of 25%
        }
        
        if (effects.includes('cleanse') && (caster.whiteWizardMalePassive || caster.whiteWitchFemalePassive)) {
            score += 10; // Their cleanses apply buffs
        }
        
        return score;
    }

    debugLogAllPossibleActions(unit) {
        if (!this.debugAI) return;
        console.log(`\n=========================================================================`);
        console.log(`\n========== AI Debug for ${unit.source.className} - ${unit.name}==========`);
        
        // Pre-calculate sorted lists once
        const aliveEnemies = this.getEnemies(unit).filter(e => e.isAlive);
        const aliveAllies = this.getParty(unit).filter(a => a.isAlive);
        
        const sortedLists = {
            enemiesByArmor: [...aliveEnemies].sort((a, b) => a.armor - b.armor),
            enemiesByResist: [...aliveEnemies].sort((a, b) => a.resist - b.resist),
            enemiesByTotalDefense: [...aliveEnemies].sort((a, b) => (a.armor + a.resist) - (b.armor + b.resist)),
            enemiesByAttack: [...aliveEnemies].sort((a, b) => b.source.attack - a.source.attack),
            enemiesByHealth: [...aliveEnemies].sort((a, b) => a.currentHp - b.currentHp),
            enemiesByActionBar: [...aliveEnemies].sort((a, b) => b.actionBar - a.actionBar),
            enemiesByBuffCount: [...aliveEnemies].sort((a, b) => b.buffs.length - a.buffs.length),
            
            alliesByTotalDefense: [...aliveAllies].sort((a, b) => (a.armor + a.resist) - (b.armor + b.resist)),
            alliesByDebuffCount: [...aliveAllies].sort((a, b) => b.debuffs.length - a.debuffs.length),
            alliesByHealth: [...aliveAllies].sort((a, b) => a.currentHp - b.currentHp),
            alliesByAttack: [...aliveAllies].sort((a, b) => b.source.attack - a.source.attack),
            alliesByActionBar: [...aliveAllies].sort((a, b) => a.actionBar - b.actionBar),
            
            aliveEnemiesCount: aliveEnemies.length,
            aliveAlliesCount: aliveAllies.length
        };
        
        // Get all possible actions
        const possibleActions = this.getAllPossibleActions(unit);
        
        // Calculate score for each action
        possibleActions.forEach(action => {
            action.score = this.calculateAbilityScore(unit, action.abilityIndex, action.target, action.spell, sortedLists);
        });
        
        // Sort by score (highest first)
        possibleActions.sort((a, b) => b.score - a.score);
        
        // Log top 10 actions
        const actionsToLog = possibleActions.slice(0, 10);
        
        actionsToLog.forEach((action, index) => {
            const targetInfo = action.target === 'all' ? 'ALL' : 
                `${action.target.name} (Lv${action.target.source.level}, ${Math.floor(action.target.currentHp)}hp)`;
            
            console.log(`${action.score.toFixed(1)}: ${action.ability.name} -> ${targetInfo}`);
        });
        
        console.log(`Total possible actions: ${possibleActions.length}`);
        console.log(`=======================================\n`);
    }
    
    calculateHealthDeficit(caster, target) {
        // Calculate how much health is "missing" including shield considerations
        const maxHp = target.maxHp;
        const currentHp = target.currentHp;
        const currentShield = target.currentShield;
        
        // Base health deficit
        let deficit = (maxHp - currentHp) / maxHp;
        
        // Check for overheal passive abilities on the caster
        if (caster.prophetMalePassive) {
            // Prophet Male can create shields up to 25% max HP from overhealing
            const potentialShield = maxHp * 0.25;
            const shieldDeficit = Math.max(0, potentialShield - currentShield);
            deficit += shieldDeficit / maxHp;
        }
        
        // Consider Champion Female passive shield regeneration
        if (target.championFemalePassive && !currentShield) {
            // They can regenerate a 20% shield
            deficit += 0.2;
        }
        
        return Math.min(deficit, 1.0); // Cap at 100% deficit
    }
    
    getAllPossibleActions(unit) {
        const actions = [];
        
        // Check all abilities
        unit.abilities.forEach((ability, index) => {
            // Skip passives and abilities on cooldown
            if (ability.passive || !unit.canUseAbility(index)) return;
            
            const spell = spellManager.getSpell(ability.id);
            if (!spell) return;
            
            // Get all possible targets for this ability
            const targets = this.getPossibleTargets(unit, spell);
            
            // Create an action for each valid target
            targets.forEach(target => {
                actions.push({
                    abilityIndex: index,
                    ability: ability,
                    spell: spell,
                    target: target,
                    score: 0 // Will be calculated
                });
            });
        });
        
        return actions;
    }
    
    getPossibleTargets(unit, spell) {
        const targets = [];
        
        switch (spell.target) {
            case 'enemy':
                const enemies = unit.isEnemy ? 
                    this.party.filter(p => p && p.isAlive) : 
                    this.enemies.filter(e => e && e.isAlive);
                targets.push(...enemies);
                break;
                
            case 'ally':
                const allies = unit.isEnemy ? 
                    this.enemies.filter(e => e && e.isAlive) : 
                    this.party.filter(p => p && p.isAlive);
                targets.push(...allies);
                break;
                
            case 'self':
                targets.push(unit);
                break;
                
            case 'all_enemies':
            case 'all_allies':
            case 'all':
                targets.push('all'); // Special marker for AOE
                break;
        }
        
        return targets;
    }
    
    executeAbility(caster, abilityIndex, target) {
    const ability = caster.abilities[abilityIndex];
    if (!ability || !caster.useAbility(abilityIndex)) return;
    
    const spell = spellManager.getSpell(ability.id);
    if (!spell) return;
    
    // Check for Grand Templar Male passive stun chance
    if (caster.grandTemplarMalePassive && caster.globalStunChance && target && target !== 'all' && target.isAlive) {
        if (Math.random() < caster.globalStunChance) {
            this.applyDebuff(target, 'Stun', 1, { stunned: true });
            this.log(`${caster.name}'s mastery stuns ${target.name}!`);
        }
    }
    
    // Show spell animation
    this.showSpellAnimation(caster, ability.name, spell.effects);
    
    // Execute spell logic
    if (spellLogic[spell.logicKey]) {
        try {
            const spellLevel = ability.level || caster.spellLevel || 1;
            spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
        } catch (error) {
            console.error(`Error executing ${ability.name}:`, error);
            this.log(`${caster.name} failed to use ${ability.name}!`);
        }
    }
}
    
    showSpellAnimation(caster, spellName, effects) {
    // Clear any existing spell animations first
    document.querySelectorAll('.spellText').forEach(text => text.remove());
    
    const elementId = caster.isEnemy ? `enemy${caster.position + 1}` : `party${caster.position + 1}`;
    const unitSlot = document.getElementById(elementId);
    
    if (unitSlot) {
        // Get animation container
        const animContainer = unitSlot.querySelector('.unitAnimationContainer');
        if (!animContainer) return;
        
        // Clear any existing spell text in this container
        const existingSpellText = animContainer.querySelector('.spellText');
        if (existingSpellText) {
            existingSpellText.remove();
        }
        
        // Check if effects contains any buff_* or debuff_* effects
        const hasBuff = effects.some(effect => effect.startsWith('buff_'));
        const hasDebuff = effects.some(effect => effect.startsWith('debuff_'));
        const hasDamage = effects.includes('physical') || effects.includes('magical') || effects.includes('pure');
        
        // Determine animation type based on spell effects with priority
        let animationClass = 'casting-damage'; // default
        
        // Priority order: damage > heal > shield > buff > debuff
        if (hasDamage) {
            animationClass = 'casting-damage';
        } else if (effects.includes('heal')) {
            animationClass = 'casting-heal';
        } else if (effects.includes('buff_shield')) {
            animationClass = 'casting-shield';
        } else if (hasBuff) {
            animationClass = 'casting-buff';
        } else if (hasDebuff) {
            animationClass = 'casting-debuff';
        }
        
        // Remove any existing animation classes
        animContainer.classList.remove('casting-damage', 'casting-heal', 'casting-shield', 'casting-buff', 'casting-debuff');
        
        // Add animation
        animContainer.classList.add(animationClass);
        setTimeout(() => animContainer.classList.remove(animationClass), 800);
        
        // Create spell text inside animation container
        const spellText = document.createElement('div');
        spellText.className = 'spellText';
        spellText.textContent = spellName;
        
        // Add appropriate color class based on spell type with priority
if (effects.includes('physical')) {
    spellText.classList.add('damage-physical');
} else if (effects.includes('magical')) {
    spellText.classList.add('damage-magical');
} else if (effects.includes('pure')) {
    spellText.classList.add('damage-pure');
} else if (effects.includes('heal')) {
    spellText.classList.add('heal');
} else if (effects.includes('buff_shield')) {
    spellText.classList.add('shield');
} else if (hasBuff) {
    spellText.classList.add('buff');
} else if (hasDebuff) {
    spellText.classList.add('debuff');
} else {
    spellText.classList.add('damage-physical'); // default
}
        
        animContainer.appendChild(spellText);
        
        // Remove spell text after animation
        setTimeout(() => {
            if (spellText.parentNode) {
                spellText.remove();
            }
        }, 3000);
    }
}
    
    endTurn() {
        if (this.currentUnit) {
            // Hide active circle for current unit
            const elementId = this.currentUnit.isEnemy ? `enemy${this.currentUnit.position + 1}` : `party${this.currentUnit.position + 1}`;
            const element = document.getElementById(elementId);
            if (element) {
                const animContainer = element.querySelector('.unitAnimationContainer');
                if (animContainer) {
                    const activeCircle = animContainer.querySelector('.unitActiveCircle');
                    if (activeCircle) {
                        activeCircle.style.display = 'none';
                    }
                }
            }
            
            // Hierophant Female passive regeneration
            if (this.currentUnit.hierophantFemalePassive) {
                const allies = this.getParty(this.currentUnit);
                allies.forEach(ally => {
                    if (ally.isAlive && ally.buffs.length > 0 && !ally.debuffs.some(d => d.name === 'Blight')) {
                        const regen = Math.floor(ally.maxHp * 0.05);
                        const actualRegen = Math.min(regen, ally.maxHp - ally.currentHp);
                        if (actualRegen > 0) {
                            ally.currentHp += actualRegen;
                            this.log(`${ally.name} regenerates ${actualRegen} HP from blessed regeneration.`);
                        }
                    }
                });
            }
            
            // Champion Female passive shield regeneration
            if (this.currentUnit.shieldRegenTimer !== undefined) {
                this.currentUnit.shieldRegenTimer++;
                if (this.currentUnit.shieldRegenTimer >= this.currentUnit.shieldRegenTurns) {
                    this.currentUnit.shieldRegenTimer = 0;
                    // Check if shield is already present
                    const existingShield = this.currentUnit.buffs.find(b => b.name === 'Shield');
                    if (!existingShield) {
                        this.applyBuff(this.currentUnit, 'Shield', -1, { shieldAmount: this.currentUnit.shieldRegenAmount });
                        this.log(`${this.currentUnit.name}'s shield regenerates!`);
                    }
                }
            }
            
            // Apply HP regen after turn
            if (this.currentUnit.isAlive && !this.currentUnit.debuffs.some(d => d.name === 'Blight')) {
                const regen = Math.floor(this.currentUnit.isEnemy ? 
                    this.currentUnit.stats.str * 0.05 : 
                    this.currentUnit.source.hpRegen);
                if (regen > 0) {
                    const actualRegen = Math.min(regen, this.currentUnit.maxHp - this.currentUnit.currentHp);
                    if (actualRegen > 0) {
                        this.currentUnit.currentHp += actualRegen;
                        this.log(`${this.currentUnit.name} regenerates ${actualRegen} HP.`);
                    }
                }
            }

            // Apply DOT effects first (before buff/debuff duration update)
            this.applyDotEffects(this.currentUnit);
            // Then update buff/debuff durations
            this.currentUnit.updateBuffsDebuffs();
            this.currentUnit.reduceCooldowns();
        }
        
        // Clear any active targeting before ending turn
        if (this.targetingState) {
            this.clearTargeting();
        }
        
        this.currentUnit = null;
        this.waitingForPlayer = false;
        this.turn++;
        
        // Hide ability panel
        this.hidePlayerAbilities();
        
        // Update UI
        this.updateUI();
        
        // Continue battle loop after delay
        setTimeout(() => this.battleLoop(), 1000);
    }
    
    // Combat methods referenced by spells
    dealDamage(attacker, target, amount, damageType = 'physical') {
        if (!target.isAlive) return 0;
        
        let damage = Math.round(amount);

        // Check for executioner passive (Sniper Male)
        if (attacker.onDamageCalculation) {
            attacker.onDamageCalculation.forEach(calc => {
                if (calc.type === 'executioner' && (target.currentHp / target.maxHp) < calc.hpThreshold) {
                    damage *= calc.damageBonus;
                }
            });
        }

        // Check if target can dodge (Marked prevents all dodging)
        const isMarked = target.debuffs.some(d => d.name === 'Mark');
        
        // Check for dodge chances from Master Stalker passives
        let dodgeChance = 0;
        if (!isMarked) {
            if (damageType === 'physical') {
                dodgeChance = target.physicalDodgeChance || target.dodgePhysical || 0;
            } else if (damageType === 'magical') {
                dodgeChance = target.magicalDodgeChance || target.dodgeMagical || 0;
            } else if (damageType === 'pure') {
                dodgeChance = target.dodgePure || 0;
            }
            
            if (dodgeChance > 0 && Math.random() < dodgeChance) {
                this.log(`${target.name} dodges the attack!`);
                this.showDodgeAnimation(target);
                return 0;
            }
        }
        
        // Apply attacker's damage modifiers from buffs
        attacker.buffs.forEach(buff => {
            if (buff.name === 'Increase Attack' || buff.damageMultiplier) {
                damage *= 1.5;
            }
        });
        
        // Apply Reduce Defense damage increase (25% more base damage)
        const hasReduceDefense = target.debuffs.some(d => d.name === 'Reduce Defense');
        if (hasReduceDefense) {
            damage = Math.round(damage * 1.25);
        }
        
// Apply Increase Defense damage reduction (25% less base damage)
const hasIncreaseDefense = target.buffs.some(b => b.name === 'Increase Defense');
if (hasIncreaseDefense) {
    damage = Math.round(damage * 0.75);
}

// Apply Frost Armor damage reduction (25% less damage, calculated separately)
const hasFrostArmor = target.buffs.some(b => b.name === 'Frost Armor');
if (hasFrostArmor) {
    damage = Math.round(damage * 0.75);
}
        
        // Apply damage reduction based on type (skip for pure damage)
if (damageType !== 'pure') {
    if (damageType === 'physical') {
        let physicalDR = target.physicalDamageReduction;
        
        // Apply Reduce Defense (flat -25 percentage points)
        if (hasReduceDefense) {
            physicalDR = Math.max(0, physicalDR - 0.25);
        }
        
        // Apply Increase Defense (flat +25 percentage points, capped at 90%)
        if (hasIncreaseDefense) {
            physicalDR = Math.min(0.9, physicalDR + 0.25);
        }

        damage = damage * (1 - physicalDR);
    } else if (damageType === 'magical') {
        // All non-physical, non-pure damage is considered magical
        let magicalDR = target.magicDamageReduction;
        
        // Apply Reduce Defense (flat -25 percentage points)
        if (hasReduceDefense) {
            magicalDR = Math.max(0, magicalDR - 0.25);
        }
        
        // Apply Increase Defense (flat +25 percentage points, capped at 50%)
        if (hasIncreaseDefense) {
            magicalDR = Math.min(0.5, magicalDR + 0.25);
        }
        
        damage = damage * (1 - magicalDR);
    }
}
        
        // Check for shields first
        const shield = target.buffs.find(b => b.name === 'Shield');
        if (shield && shield.shieldAmount > 0) {
            const shieldDamage = Math.min(damage, shield.shieldAmount);
            shield.shieldAmount -= shieldDamage;
            damage -= shieldDamage;
            
            if (shield.shieldAmount <= 0) {
                target.buffs = target.buffs.filter(b => b !== shield);
                this.log(`${target.name}'s shield breaks!`);
            }
        }
        
        // Apply remaining damage reduction from buffs
        target.buffs.forEach(buff => {
            if (buff.damageReduction) {
                damage *= (1 - buff.damageReduction);
            }
        });
        
        // Apply damage increase from debuffs
        target.debuffs.forEach(debuff => {
            if (debuff.damageTakenMultiplier) {
                damage *= debuff.damageTakenMultiplier;
            }
        });

        // Apply Mark damage increase (25% more damage)
        if (target.debuffs.some(d => d.name === 'Mark')) {
            damage *= 1.25;
        }
        
        // Apply Reduce Attack LAST
        attacker.debuffs.forEach(debuff => {
            if (debuff.name === 'Reduce Attack') {
                damage *= 0.5;
            }
        });
        
// Apply passive damage reduction (like Thick Hide) - skip for pure damage
if (target.damageReduction && damageType !== 'pure') {
    damage *= (1 - target.damageReduction);
}

        damage = Math.round(damage);
        const previousHp = target.currentHp;
        target.currentHp = Math.max(0, target.currentHp - damage);


// Check for on-hit effects from attacker
if (attacker.onHitEffects && target.isAlive) {
    attacker.onHitEffects.forEach(effect => {
        if (effect.type === 'debuff' && Math.random() < effect.chance) {
            this.applyDebuff(target, effect.debuffName, effect.duration, {});
        }
    });
}

// Check for on-damage-taken effects from target
if (target.onDamageTaken && target.isAlive && damage > 0) {
    target.onDamageTaken.forEach(effect => {
        if (effect.type === 'buff') {
            // Log Pack Fury activation
            if (effect.buffName === 'Increase Attack' && target.packFuryApplied) {
                this.log(`${target.name}'s Pack Fury activates!`);
            }
            this.applyBuff(target, effect.buffName, effect.duration, effect.buffEffects || {});
        } else if (effect.type === 'stun_counter' && Math.random() < effect.chance) {
            // Champion Male passive
            this.applyDebuff(attacker, 'Stun', effect.duration, { stunned: true });
            this.log(`${target.name} stuns ${attacker.name} with a counter!`);
        }
    });
}

// Avenger Female passive - gain action bar when damaged
if (target.actionBarGainOnDamage && target.isAlive && damage > 0) {
    const actionBarGain = target.actionBarGainOnDamage * 10000;
    target.actionBar += actionBarGain;
    this.log(`${target.name} gains ${Math.floor(actionBarGain / 100)}% action bar!`);
}

// Avenger Male passive - apply blight when attacked by taunted unit
if (target.avengerBlightOnTauntedAttack && target.isAlive && damage > 0) {
    const attackerTaunt = attacker.debuffs.find(d => d.name === 'Taunt' && d.tauntTarget === target);
    if (attackerTaunt) {
        this.applyDebuff(attacker, 'Blight', 2, { noHeal: true });
        this.log(`${attacker.name} is blighted by ${target.name}'s vengeance!`);
    }
}

        // Check for Frost Armor retaliation
if (target.isAlive && damage > 0 && hasFrostArmor) {
    // Apply or stack reduce speed on the attacker
    const existingSlowDebuff = attacker.debuffs.find(d => d.name === 'Reduce Speed');
    if (existingSlowDebuff) {
        // Stack the duration
        existingSlowDebuff.duration += 1;
        this.log(`${target.name}'s Frost Armor adds Reduce Speed to ${attacker.name} (${existingSlowDebuff.duration} turns)!`);
    } else {
        // Apply new reduce speed
        this.applyDebuff(attacker, 'Reduce Speed', 1, {});
        this.log(`${target.name}'s Frost Armor slows ${attacker.name}!`);
    }
}
        
        this.log(`${attacker.name} deals ${damage} ${damageType} damage to ${target.name}!`);
        
        // Show damage animation
        this.showDamageAnimation(attacker, target, damage, damageType);
        



        // Check if target died
        if (previousHp > 0 && target.currentHp <= 0) {
            this.handleUnitDeath(target, attacker);
        }
        
        return damage;
    }
    
    showDamageAnimation(attacker, target, damage, damageType) {
        // Show damage number
        const targetId = target.isEnemy ? `enemy${target.position + 1}` : `party${target.position + 1}`;
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
            // Get health bar position for damage number spawn
            const healthBar = targetElement.querySelector('.healthBar');
            const healthFill = healthBar ? healthBar.querySelector('.healthFill') : null;
            
            if (healthBar && healthFill) {
                // Calculate position at end of health fill
                const fillWidth = parseFloat(healthFill.style.width || '100');
                const fillPixelWidth = (healthBar.offsetWidth * fillWidth) / 100;
                
                // Create damage number
                const damageNum = document.createElement('div');
                damageNum.className = 'damageNumber';
                damageNum.textContent = `-${damage}`;
                
                // Add damage type class for color
                if (damageType === 'physical') damageNum.classList.add('physical');
                else if (damageType === 'magical') damageNum.classList.add('magical');
                else if (damageType === 'pure') damageNum.classList.add('pure');
                else damageNum.classList.add('physical'); // default
                
                // Position at end of health fill
                damageNum.style.left = `${54 + fillPixelWidth}px`; // 54px is the healthBar left offset
                damageNum.style.top = '0px'; // Start from health bar position
                
                targetElement.appendChild(damageNum);
                
                // Remove after animation
                setTimeout(() => {
                    if (damageNum.parentNode) {
                        damageNum.remove();
                    }
                }, 1500);
            }
        }
        
        // Animate attacker lunge
        const attackerId = attacker.isEnemy ? `enemy${attacker.position + 1}` : `party${attacker.position + 1}`;
        const attackerElement = document.getElementById(attackerId);
        
        if (attackerElement) {
            const attackerAnimContainer = attackerElement.querySelector('.unitAnimationContainer');
            if (attackerAnimContainer) {
                // Add directional lunge class based on attacker's side
                if (attacker.isEnemy) {
                    attackerAnimContainer.classList.add('unit-lunge-left');
                } else {
                    attackerAnimContainer.classList.add('unit-lunge-right');
                }
                setTimeout(() => {
                    attackerAnimContainer.classList.remove('unit-lunge-left', 'unit-lunge-right');
                }, 600);
            }
        }
        
        // Animate target recoil
        if (targetElement) {
            const targetAnimContainer = targetElement.querySelector('.unitAnimationContainer');
            if (targetAnimContainer) {
                // Add directional recoil class based on target's side
                if (target.isEnemy) {
                    targetAnimContainer.classList.add('unit-recoil-right');
                } else {
                    targetAnimContainer.classList.add('unit-recoil-left');
                }
                setTimeout(() => {
                    targetAnimContainer.classList.remove('unit-recoil-left', 'unit-recoil-right');
                }, 600);
            }
        }
    }

showDodgeAnimation(target) {
    const targetId = target.isEnemy ? `enemy${target.position + 1}` : `party${target.position + 1}`;
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
        // Create dodge text
        const dodgeText = document.createElement('div');
        dodgeText.className = 'dodgeText';
        dodgeText.textContent = 'Dodge!';
        dodgeText.style.cssText = `
            position: absolute;
            left: 50%;
            top: 30%;
            transform: translateX(-50%);
            color: #4dd0e1;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(77, 208, 225, 0.8);
            animation: dodgeFloat 1s ease-out;
            pointer-events: none;
            z-index: 100;
        `;
        
        targetElement.appendChild(dodgeText);
        
        // Animate target dodge
        const animContainer = targetElement.querySelector('.unitAnimationContainer');
        if (animContainer) {
            animContainer.classList.add('unit-dodge');
            setTimeout(() => {
                animContainer.classList.remove('unit-dodge');
            }, 600);
        }
        
        // Remove dodge text after animation
        setTimeout(() => {
            if (dodgeText.parentNode) {
                dodgeText.remove();
            }
        }, 1000);
    }
}



    handleUnitDeath(unit, killer = null) {
    unit.isDead = true;
    
    // Hide active circle on death
    const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
    const element = document.getElementById(elementId);
    if (element) {
        const animContainer = element.querySelector('.unitAnimationContainer');
        if (animContainer) {
            const activeCircle = animContainer.querySelector('.unitActiveCircle');
            if (activeCircle) {
                activeCircle.style.display = 'none';
            }
        }
    }
    
    // Check for kill effects from killer
    if (killer && killer.isAlive) {
        // Sniper Female passive - speed buff on kill
        if (killer.onKillEffects) {
            killer.onKillEffects.forEach(effect => {
                if (effect.type === 'buff') {
                    this.applyBuff(killer, effect.buffName, effect.duration, {});
                    this.log(`${killer.name} gains ${effect.buffName} from the kill!`);
                }
            });
        }
        
        // Phantom Assassin Male passive - refill action bar on assassinate kill
        if (killer.phantomAssassinMalePassive && killer.actionBarRefillOnKill) {
            // Check if the last ability used was Assassinate
            const lastAbility = killer.abilities.find(a => a.id === 'assassinate');
            if (lastAbility && killer.cooldowns[killer.abilities.indexOf(lastAbility)] === lastAbility.cooldown) {
                killer.actionBar = Math.floor(10000 * killer.actionBarRefillOnKill);
                this.log(`${killer.name}'s action bar refills to 75%!`);
            }
        }
        
        // Dark Arch Templar Male passive - spread debuffs on kill
        if (killer.darkArchTemplarMalePassive && unit.debuffs.length > 0) {
            const enemies = killer.isEnemy ? this.party.filter(p => p && p.isAlive) : this.enemies.filter(e => e && e.isAlive);
            if (enemies.length > 0) {
                const debuffsToSpread = [...unit.debuffs];
                debuffsToSpread.forEach(debuff => {
                    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                    this.applyDebuff(randomEnemy, debuff.name, debuff.duration, { ...debuff });
                });
                this.log(`${unit.name}'s debuffs spread to the enemy team!`);
            }
        }
    }
    
    // Check if this unit was the source of any taunts
    this.allUnits.forEach(otherUnit => {
        if (otherUnit.isAlive) {
            // Remove any taunts where this unit was the taunt target
            otherUnit.debuffs = otherUnit.debuffs.filter(debuff => {
                if (debuff.name === 'Taunt' && debuff.tauntTarget === unit) {
                    this.log(`${otherUnit.name}'s taunt ends as ${unit.name} has fallen!`);
                    return false;
                }
                return true;
            });
        }
    });
    
    // Trigger death animation only if not already animated
    if (!unit.deathAnimated) {
        unit.deathAnimated = true;
        this.triggerDeathAnimation(unit);
    }
}

    triggerDeathAnimation(unit) {
        const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
        const element = document.getElementById(elementId);
        
        if (element) {
            const animContainer = element.querySelector('.unitAnimationContainer');
            if (animContainer) {
                const unitDiv = animContainer.querySelector('.unit');
                const unitShadow = animContainer.querySelector('.unitShadow');
                
                if (unitDiv && !unitDiv.classList.contains('dying')) {
                    // Only add dying class if it doesn't already have it
                    unitDiv.classList.add('dying');
                    
                    // Hide shadow immediately when dying
                    if (unitShadow) {
                        unitShadow.style.display = 'none';
                    }
                    
                    // Hide UI elements after animation
                    setTimeout(() => {
                        // Double-check element still exists and unit is still dead
                        const currentElement = document.getElementById(elementId);
                        if (currentElement && unit.isDead) {
                            const healthBar = currentElement.querySelector('.healthBar');
                            const actionBar = currentElement.querySelector('.actionBar');
                            const levelIndicator = currentElement.querySelector('.levelIndicator');
                            const buffDebuffContainer = currentElement.querySelector('.buffDebuffContainer');
                            
                            if (healthBar) healthBar.style.display = 'none';
                            if (actionBar) actionBar.style.display = 'none';
                            if (levelIndicator) levelIndicator.style.display = 'none';
                            if (buffDebuffContainer) buffDebuffContainer.style.display = 'none';
                        }
                    }, 800); // Match CSS animation duration
                }
            }
        }
    }

    healUnit(target, amount) {
        if (!target.isAlive) return 0;
        
        // Check for blight
        if (target.debuffs.some(d => d.name === 'Blight')) {
            this.log(`${target.name} cannot be healed due to Blight!`);
            return 0;
        }
        
        let heal = Math.floor(amount);
        
        // Apply healing received modifiers
        if (target.healingReceived) {
            heal *= target.healingReceived;
        }
        
        heal = Math.floor(heal);
        const actualHeal = Math.min(heal, target.maxHp - target.currentHp);
        const overheal = heal - actualHeal;
        
        target.currentHp += actualHeal;
        
        // Handle overhealing for Prophet/Prophetess passives
        if (overheal > 0) {
            // Check if healer has Prophet/Prophetess passive
            const healer = this.currentUnit;
            if (healer) {
                // Prophet Male - create shield from overheal
                if (healer.prophetMalePassive && target.isAlive) {
                    const maxShield = Math.floor(target.maxHp * 0.25);
                    const shieldAmount = Math.min(overheal, maxShield);
                    
                    const existingShield = target.buffs.find(b => b.name === 'Shield');
                    if (existingShield) {
                        const newTotal = Math.min(existingShield.shieldAmount + shieldAmount, maxShield);
                        existingShield.shieldAmount = newTotal;
                        this.log(`${target.name}'s shield increased by overhealing!`);
                    } else {
                        this.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
                        this.log(`${target.name} gains shield from overhealing!`);
                    }
                }
                
                // Prophetess Female - apply immune on overheal
                if (healer.prophetessFemalePassive && target.isAlive) {
                    this.applyBuff(target, 'Immune', 1, { immunity: true });
                    this.log(`${target.name} gains immunity from overhealing!`);
                }
            }
        }
        
        this.log(`${target.name} is healed for ${actualHeal} HP!`);
        
        return actualHeal;
    }
    
    applyBuff(target, buffName, duration, effects) {
        if (!target.isAlive) return;
        
        // Check if target is marked (prevents gaining buffs)
        if (target.debuffs.some(d => d.name === 'Mark')) {
            this.log(`${target.name} is marked and cannot gain buffs!`);
            return;
        }
        
        // Special handling for shields
        if (buffName === 'Shield' && effects.shieldAmount !== undefined) {
            // Check if shield already exists
            const existingShield = target.buffs.find(b => b.name === 'Shield');
            
            if (existingShield) {
                // Compare shield amounts and keep the higher one
                if (effects.shieldAmount > existingShield.shieldAmount) {
                    existingShield.shieldAmount = effects.shieldAmount;
                    existingShield.duration = duration;
                    this.log(`${target.name}'s shield is strengthened to ${effects.shieldAmount} HP!`);
                } else {
                    this.log(`${target.name} already has a stronger shield (${existingShield.shieldAmount} HP)!`);
                }
            } else {
                // Create new shield
                const shield = {
                    name: buffName,
                    duration: duration,
                    shieldAmount: effects.shieldAmount,
                    ...effects
                };
                
                target.buffs.push(shield);
                this.log(`${target.name} gains a ${effects.shieldAmount} HP shield!`);
            }
            return;
        }
        
        // Check if caster is buffing themselves during their turn
        let adjustedDuration = duration;
        if (target === this.currentUnit) {
            adjustedDuration = duration + 1;
        }
        
        // Check if buff already exists
        const existingBuff = target.buffs.find(b => b.name === buffName);
        
        if (existingBuff) {
            // Update duration to the higher value
            const oldDuration = existingBuff.duration;
            existingBuff.duration = Math.max(existingBuff.duration, adjustedDuration);
            
            // Update other effects if provided
            Object.assign(existingBuff, effects);
            
            // Log if duration was increased
            if (existingBuff.duration > oldDuration) {
                this.log(`${target.name}'s ${buffName} is refreshed to ${existingBuff.duration} turns!`);
            } else {
                this.log(`${target.name} already has ${buffName} with ${oldDuration} turns remaining!`);
            }
        } else {
            // Create new buff
            const buff = {
                name: buffName,
                duration: adjustedDuration,
                ...effects
            };
            
            target.buffs.push(buff);
            this.log(`${target.name} gains ${buffName}!`);
        }
        
        // Hierophant Male passive - 20% shield when buffed
        if (buffName !== 'Shield') { // Prevent infinite loop
            // Find all Hierophant Male units
            const allies = this.getParty(target);
            allies.forEach(ally => {
                if (ally.isAlive && ally.hierophantMalePassive && ally === this.currentUnit) {
                    const shieldAmount = Math.floor(target.maxHp * 0.2);
                    const existingShield = target.buffs.find(b => b.name === 'Shield');
                    
                    if (!existingShield) {
                        this.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
                        this.log(`${target.name} gains divine protection shield!`);
                    }
                }
            });
        }
    }
    
    applyDebuff(target, debuffName, duration, effects) {
        if (!target.isAlive) return;
        
        // Check for immunity
        if (target.buffs.some(b => b.name === 'Immune' || b.immunity)) {
            this.log(`${target.name} is immune to debuffs!`);
            return;
        }
        
        // Check if caster is debuffing themselves during their turn
        let adjustedDuration = duration;
        if (target === this.currentUnit) {
            adjustedDuration = duration + 1;
        }
        
        // Check if debuff already exists
        const existingDebuff = target.debuffs.find(d => d.name === debuffName);
        
        if (existingDebuff) {
            // Special handling for Bleed - it stacks duration
            if (debuffName === 'Bleed') {
                existingDebuff.duration += adjustedDuration;
                this.log(`${target.name}'s ${debuffName} stacks to ${existingDebuff.duration} turns!`);
            } else {
                // Normal debuffs - update duration to the higher value
                const oldDuration = existingDebuff.duration;
                existingDebuff.duration = Math.max(existingDebuff.duration, adjustedDuration);
                
                // Update other effects if provided
                Object.assign(existingDebuff, effects);
                
                // Log if duration was increased
                if (existingDebuff.duration > oldDuration) {
                    this.log(`${target.name}'s ${debuffName} is refreshed to ${existingDebuff.duration} turns!`);
                } else {
                    this.log(`${target.name} already has ${debuffName} with ${oldDuration} turns remaining!`);
                }
            }
        } else {
            // Create new debuff
            const debuff = {
                name: debuffName,
                duration: adjustedDuration,
                ...effects
            };
            
            target.debuffs.push(debuff);
            this.log(`${target.name} suffers from ${debuffName}!`);
            
            // Apply stun visuals if it's a stun debuff
            if (debuffName === 'Stun' || effects.stunned) {
                this.updateStunVisuals(target);
            }
        }
        
        // Arch Sage passives - gain buff when receiving debuff
        if (target.archSageMalePassive || target.archSageFemalePassive) {
            if (target.archSageMalePassive) {
                this.applyBuff(target, 'Increase Attack', adjustedDuration, { damageMultiplier: 1.5 });
            }
            if (target.archSageFemalePassive) {
                this.applyBuff(target, 'Increase Speed', adjustedDuration, {});
            }
        }
    }
    
    applyShield(target, amount) {
        if (!target.isAlive) return;
        
        // Apply shield as a buff
        this.applyBuff(target, 'Shield', 3, { shieldAmount: Math.floor(amount) });
    }
    
    removeBuffs(target) {
        target.buffs = target.buffs.filter(buff => buff.duration === -1);
    }
    
    removeDebuffs(target) {
        // Store if unit was stunned before removing
        const wasStunned = target.debuffs.some(d => d.name === 'Stun' || d.stunned);
        
        target.debuffs = [];
        
        // Update stun visuals if needed
        if (wasStunned) {
            this.updateStunVisuals(target);
        }
        
        // White Wizard/Witch passives
        if (this.currentUnit) {
            if (this.currentUnit.whiteWizardMalePassive && target.isAlive) {
                this.applyBuff(target, 'Increase Attack', 1, { damageMultiplier: 1.5 });
            }
            if (this.currentUnit.whiteWitchFemalePassive && target.isAlive) {
                this.applyBuff(target, 'Increase Speed', 1, {});
            }
        }
    }
    
    getParty(unit) {
        return unit.isEnemy ? this.enemies : this.party;
    }
    
    getEnemies(unit) {
        return unit.isEnemy ? this.party : this.enemies;
    }
    
    summonUnit(summoner, unitData) {
        // TODO: Implement summon logic
        this.log(`${summoner.name} summons ${unitData.name}!`);
    }
    
    applyDotEffects(unit) {
        unit.debuffs.forEach(debuff => {
            if (debuff.dotDamage && unit.isAlive) {
                const damage = Math.floor(debuff.dotDamage);
                const previousHp = unit.currentHp;
                unit.currentHp = Math.max(0, unit.currentHp - damage);
                this.log(`${unit.name} takes ${damage} damage from ${debuff.name}!`);
                
                // Check if unit died from DOT
                if (previousHp > 0 && unit.currentHp <= 0) {
                    this.handleUnitDeath(unit);
                }
            } else if (debuff.name === 'Bleed' && unit.isAlive) {
                const damage = Math.ceil(unit.maxHp * 0.05);
                const previousHp = unit.currentHp;
                unit.currentHp = Math.max(0, unit.currentHp - damage);
                this.log(`${unit.name} bleeds for ${damage} damage!`);
                
                // Check if unit died from DOT
                if (previousHp > 0 && unit.currentHp <= 0) {
                    this.handleUnitDeath(unit);
                }
            }
        });
    }

    checkBattleEnd() {
        const partyAlive = this.party.some(u => u && u.isAlive);
        const enemiesAlive = this.enemies.some(u => u && u.isAlive);
        
        if (!partyAlive) {
            this.log("Defeat! Your party has been wiped out!");
            this.endBattle(false);
            return true;
        }
        
        if (!enemiesAlive) {
            // Only calculate exp once per wave
            if (!this.waveExpCalculated) {
                this.waveExpCalculated = true;
                
                // Calculate exp for this wave before transitioning
                const waveExp = this.calculateWaveExp();
                console.log(`Wave ${this.currentWave + 1} cleared, exp calculated: ${waveExp}`);
                this.waveExpEarned.push(waveExp);
                
                // Award exp to alive heroes
                this.party.forEach((unit, index) => {
                    if (unit && unit.isAlive) {
                        const hero = unit.source;
                        const prevExp = hero.pendingExp;
                        hero.pendingExp += waveExp;
                        this.log(`${hero.name} earned ${waveExp} exp from wave ${this.currentWave + 1} (total pending: ${hero.pendingExp})`);
                    }
                });
            }
            
            // Check if there are more waves
            if (this.currentWave < this.enemyWaves.length - 1) {
                // Prevent multiple wave transitions
                if (!this.processingWaveTransition) {
                    this.processingWaveTransition = true;
                    this.log("Wave cleared!");
                    
                    // Only update UI for living party members - don't revive dead ones
this.party.forEach((unit, index) => {
    if (unit && unit.isAlive && !unit.isDead) {
        // Only ensure UI is properly shown for LIVING party members
        const elementId = `party${unit.position + 1}`;
        const element = document.getElementById(elementId);
        
        if (element) {
            element.style.display = 'block';
            
            const healthBar = element.querySelector('.healthBar');
            const actionBar = element.querySelector('.actionBar');
            const levelIndicator = element.querySelector('.levelIndicator');
            const buffDebuffContainer = element.querySelector('.buffDebuffContainer');
            const animContainer = element.querySelector('.unitAnimationContainer');
            const unitActiveCircle = animContainer ? animContainer.querySelector('.unitActiveCircle') : null;
            
            if (healthBar) healthBar.style.display = '';
            if (actionBar) actionBar.style.display = '';
            if (levelIndicator) levelIndicator.style.display = '';
            if (buffDebuffContainer) buffDebuffContainer.style.display = '';
            if (unitActiveCircle) unitActiveCircle.style.display = 'none'; // Ensure it's hidden
        }
    }
});
                    
                    // Load next wave
                    setTimeout(() => {
                        this.loadWave(this.currentWave + 1);
                        this.processingWaveTransition = false;
                        this.waveExpCalculated = false; // Reset for next wave
                    }, 1000);
                }
                return false; // Battle continues
            } else {
                this.log("Victory! All waves defeated!");
                this.endBattle(true);
                return true;
            }
        }
        
        return false;
    }
    
    calculateWaveExp() {
        // Base exp per enemy level
        const baseExpPerLevel = 25;
        let totalExp = 0;
        
        // Safety check
        if (!this.dungeonWaves || !Array.isArray(this.dungeonWaves)) {
            return 0;
        }
        
        if (this.currentWave >= this.dungeonWaves.length) {
            return 0;
        }
        
        // Get the current wave configuration
        const currentWaveEnemies = this.dungeonWaves[this.currentWave];
        
        if (!currentWaveEnemies) {
            return 0;
        }
        
        // Calculate exp based on enemy levels
        currentWaveEnemies.forEach(enemy => {
            if (enemy) {
                const expFromEnemy = enemy.level * baseExpPerLevel;
                totalExp += expFromEnemy;
            }
        });
        
        return totalExp;
    }
    
    endBattle(victory) {
    this.running = false;
    this.endTime = Date.now();

    // Clear timer interval
    if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    // Clear all buffs and debuffs from all units
    this.allUnits.forEach(unit => {
        unit.buffs = [];
        unit.debuffs = [];
    });
    
    // Clear pending exp for all party members if defeat
    if (!victory) {
        this.party.forEach(unit => {
            if (unit && unit.source) {
                unit.source.pendingExp = 0;
            }
        });
    }

    // Clear any active targeting
    if (this.targetingState) {
        this.clearTargeting();
    }
    
    // Clean up level indicator event listeners for both party and enemies
    for (let i = 1; i <= 5; i++) {
        ['party', 'enemy'].forEach(type => {
            const element = document.getElementById(`${type}${i}`);
            if (element) {
                const levelIndicator = element.querySelector('.levelIndicator');
                if (levelIndicator && levelIndicator._unitInfoHandler) {
                    levelIndicator.removeEventListener('click', levelIndicator._unitInfoHandler);
                    delete levelIndicator._unitInfoHandler;
                }
                
                // Also clean up right-click handlers
                if (element._rightClickHandler) {
                    element.removeEventListener('contextmenu', element._rightClickHandler);
                    delete element._rightClickHandler;
                }
            }
        });
    }

    // Hide exit button when showing results
    const exitButton = document.querySelector('.exitBattleButton');
    if (exitButton) {
        exitButton.style.display = 'none';
    }
    
    // Close any open popup
    this.game.uiManager.closeHeroInfo();

    // Calculate battle duration
    const duration = Math.floor((this.endTime - this.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Get dungeon data
    const dungeonId = this.game.currentDungeon.id;
    const dungeonConfig = dungeonData.dungeons[dungeonId];
    const rewards = dungeonConfig.rewards || { gold: 0, exp: 0, items: [] };
    
    // Process items only on victory
    const itemRolls = [];
    if (victory) {
        // Only roll items if we won
        this.party.forEach(unit => {
            if (!unit || !unit.source) return;
            
            const hero = unit.source;
            
            // Check if villager (they only get items from first 3 dungeons and only gold after that)
            const isVillager = hero.className.includes('villager') || hero.className.includes('tester');
            const dungeonLevel = dungeonConfig.level;
            
            if (isVillager) {
                // Villagers only get items from dungeons level 50 and below (first 3 easy dungeons)
                if (dungeonLevel > 50 || !unit.isAlive) {
                    // Only gold for villagers in harder dungeons or if dead
                    itemRolls.push({
                        hero: hero,
                        gold: Math.floor(rewards.gold / this.party.length),
                        item: null
                    });
                } else if (unit.isAlive) {
                    // 50% chance for item in easy dungeons
                    if (Math.random() < 0.5) {
                        // Get item from dungeon rewards
                        if (rewards.items && rewards.items.length > 0) {
                            const itemId = rewards.items[Math.floor(Math.random() * rewards.items.length)];
                            const item = new Item(itemId);
                            itemRolls.push({
                                hero: hero,
                                gold: 0,
                                item: item
                            });
                        } else {
                            // No items available, give gold instead
                            itemRolls.push({
                                hero: hero,
                                gold: Math.floor(rewards.gold / this.party.length),
                                item: null
                            });
                        }
                    } else {
                        // Failed item roll, get gold
                        itemRolls.push({
                            hero: hero,
                            gold: Math.floor(rewards.gold / this.party.length),
                            item: null
                        });
                    }
                } else {
                    // Dead villagers get nothing
                    itemRolls.push({
                        hero: hero,
                        gold: 0,
                        item: null
                    });
                }
            } else {
                // Non-villager heroes - original logic
                if (unit.isAlive) {
                    // 50% chance for item
                    if (Math.random() < 0.5) {
                        // Get item from dungeon rewards
                        if (rewards.items && rewards.items.length > 0) {
                            const itemId = rewards.items[Math.floor(Math.random() * rewards.items.length)];
                            const item = new Item(itemId);
                            itemRolls.push({
                                hero: hero,
                                gold: 0,
                                item: item
                            });
                        } else {
                            // No items available, give gold instead
                            itemRolls.push({
                                hero: hero,
                                gold: Math.floor(rewards.gold / this.party.length),
                                item: null
                            });
                        }
                    } else {
                        // Failed item roll, get gold
                        itemRolls.push({
                            hero: hero,
                            gold: Math.floor(rewards.gold / this.party.length),
                            item: null
                        });
                    }
                } else {
                    // Dead heroes get nothing
                    itemRolls.push({
                        hero: hero,
                        gold: 0,
                        item: null
                    });
                }
            }
        });
    } else {
        // On defeat, no items are rolled - just empty entries
        this.party.forEach(unit => {
            if (!unit || !unit.source) return;
            itemRolls.push({
                hero: unit.source,
                gold: 0,
                item: null
            });
        });
    }
    
    // Store battle results
    this.game.pendingBattleResults = {
        victory: victory,
        dungeonName: this.game.currentDungeon.name,
        time: timeString,
        goldChange: 0, // No longer used at this level
        dungeonBonusExp: victory ? rewards.exp : 0,
        // In endBattle method, when creating heroResults:
        heroResults: this.party.map((unit, index) => {
            if (!unit) return null;
            const hero = unit.source;
            const waveExp = hero.pendingExp;
            const dungeonBonus = victory && unit.isAlive ? rewards.exp : 0;
            const totalExp = waveExp + dungeonBonus;
            
            const itemRoll = itemRolls[index];
            
            return {
                hero: hero,
                expGained: totalExp,
                survived: unit.isAlive,
                item: itemRoll.item,
                gold: itemRoll.gold
            };
        }).filter(r => r !== null)
    };
    
    // Show results popup
    setTimeout(() => {
        this.game.uiManager.showBattleResults();
    }, 1000);
}
    
    log(message) {
        this.battleLog.push(message);
        const logElement = document.getElementById('battleLog');
        if (logElement) {
            logElement.innerHTML = this.battleLog.slice(-50).join('<br>') + '<br>';
            logElement.scrollTop = logElement.scrollHeight;
        }
    }
    
    showPlayerAbilities(unit) {
    const abilityPanel = document.getElementById('abilityPanel');
    abilityPanel.innerHTML = '';
    
    // Show all abilities including passives
    unit.abilities.forEach((ability, index) => {
        const abilityDiv = document.createElement('div');
        abilityDiv.className = 'ability';
        
        if (!unit.canUseAbility(index)) {
            abilityDiv.classList.add('onCooldown');
        }
        
        // Add passive class if it's a passive ability
        const isPassive = ability.passive === true;
        if (isPassive) {
            abilityDiv.classList.add('passive');
        }
        
        const spell = spellManager.getSpell(ability.id);
        const iconUrl = `https://puzzle-drops.github.io/TEVE/img/spells/${ability.id}.png`;
        
        abilityDiv.innerHTML = `
            ${isPassive ? `
                <div class="waterbrush-overlay-1">
                    <div class="waterbrush-blob-1"></div>
                    <div class="waterbrush-blob-2"></div>
                </div>
            ` : ''}
            <img src="${iconUrl}" alt="${ability.name}" style="width: 100px; height: 100px;" onerror="this.style.display='none'">
            ${unit.cooldowns[index] > 0 && !isPassive ? `<span class="cooldownText">${unit.cooldowns[index]}</span>` : ''}
        `;
        
        // Add tooltip on hover using the new format
        abilityDiv.onmouseover = (e) => {
            const showFormula = e.altKey;
            const tooltipHtml = game.uiManager.formatAbilityTooltip(ability, ability.level, unit.source, showFormula);
            game.uiManager.showAbilityTooltipFromHTML(e, tooltipHtml);
        };
        abilityDiv.onmouseout = () => {
            game.uiManager.hideAbilityTooltip();
        };
        
        // Add click handler only to non-passive abilities
        if (!isPassive) {
            abilityDiv.onclick = () => {
                // Hide tooltip when clicked
                game.uiManager.hideAbilityTooltip();
                
                // If we're already targeting, clear it first
                if (this.targetingState) {
                    this.clearTargeting();
                }
                
                // Re-enable all abilities first
                const allAbilities = abilityPanel.querySelectorAll('.ability');
                allAbilities.forEach(ab => {
                    ab.style.opacity = '';
                });
                
                // If this ability can't be used, just return after clearing
                if (!unit.canUseAbility(index)) {
                    return;
                }
                
                // Visually disable all other abilities (but keep them clickable)
                allAbilities.forEach(ab => {
                    if (ab !== abilityDiv) {
                        ab.style.opacity = '0.5';
                    }
                });
                
                if (spell) {
                    // For targeted abilities, highlight valid targets
                    if (spell.target === 'enemy' || spell.target === 'ally') {
                        this.selectTarget(unit, index, spell.target);
                    } else {
                        this.executeAbility(unit, index, spell.target === 'self' ? unit : 'all');
                        this.endTurn();
                    }
                }
            };
        }
        
        abilityPanel.appendChild(abilityDiv);
    });
    
    // Apply centering based on ability count
    abilityPanel.style.width = '100%';
}

    hidePlayerAbilities() {
        const abilityPanel = document.getElementById('abilityPanel');
        if (abilityPanel) {
            abilityPanel.innerHTML = '';
        }
        // Don't trigger any targeting clear here - just hide the abilities
    }
    
    selectTarget(caster, abilityIndex, targetType) {
        // Store targeting state
        this.targetingState = {
            caster: caster,
            abilityIndex: abilityIndex,
            targetType: targetType
        };

        // Highlight valid targets - only alive units
        const validTargets = targetType === 'enemy' ? 
            this.enemies.filter(e => e && e.isAlive && !e.isDead) : 
            this.party.filter(p => p && p.isAlive && !p.isDead);
        
        // Add click handlers to valid targets
        validTargets.forEach(target => {
            const element = document.getElementById(target.isEnemy ? `enemy${target.position + 1}` : `party${target.position + 1}`);
            if (element) {
                element.style.cursor = 'pointer';
                element.style.filter = 'brightness(1.2)';
                
                // Add target arrow
                let targetArrow = element.querySelector('.targetArrow');
                if (!targetArrow) {
                    targetArrow = document.createElement('div');
                    targetArrow.className = 'targetArrow';
                    targetArrow.innerHTML = '▼';
                    element.appendChild(targetArrow);
                }
                
                const clickHandler = (e) => {
                    // Don't trigger if clicking on level indicator
                    if (e.target.closest('.levelIndicator')) {
                        return;
                    }
                    
                    // Remove all handlers and highlighting
                    this.clearTargeting();
                    
                    // Execute ability
                    this.executeAbility(caster, abilityIndex, target);
                    this.endTurn();
                };
                
                // Store handler reference so we can remove it later
                element._targetingHandler = clickHandler;
                element.addEventListener('click', clickHandler);
            }
        });
    }
    
    clearTargeting() {
        // Clear targeting state
        this.targetingState = null;
        
        // Re-enable all abilities
        const abilityPanel = document.getElementById('abilityPanel');
        if (abilityPanel) {
            const allAbilities = abilityPanel.querySelectorAll('.ability');
            allAbilities.forEach(ab => {
                ab.style.opacity = '';
            });
        }
        
        // Remove all targeting highlights and handlers
        this.allUnits.forEach(unit => {
            const element = document.getElementById(unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`);
            if (element) {
                // Always clean up targeting visuals
                element.style.cursor = '';
                element.style.filter = '';
                
                // Remove target arrow
                const targetArrow = element.querySelector('.targetArrow');
                if (targetArrow) {
                    targetArrow.remove();
                }
                
                // Remove targeting handler if exists
                if (element._targetingHandler) {
                    element.removeEventListener('click', element._targetingHandler);
                    delete element._targetingHandler;
                }
                
                // Skip further DOM manipulation for dead units
                if (unit.isDead || !unit.isAlive) {
                    return;
                }
            }
        });
    }
    
    toggleAutoMode(enabled) {
        // Set pending auto mode change
        this.pendingAutoMode = enabled;
        
        // If currently waiting for player and auto mode is enabled, execute AI turn
        if (enabled && this.waitingForPlayer) {
            this.executeAITurn(this.currentUnit);
        }
    }

    updateUI() {
        // Update all unit displays
        this.allUnits.forEach(unit => {
            const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
            const element = document.getElementById(elementId);
            
            if (!element) return;
            
            // Skip dead units entirely - no UI updates for them
            if (!unit.isAlive || unit.isDead) {
                return;
            }
            
            // Update health and shield bars
            const healthBar = element.querySelector('.healthBar');
            const healthFill = element.querySelector('.healthFill');
            const shieldFill = element.querySelector('.shieldFill');
            const healthText = element.querySelector('.healthText');
            
            if (healthBar && healthFill && shieldFill) {
                const currentShield = unit.currentShield;
                const totalMax = unit.maxHp + currentShield;
                
                // Calculate percentages
                const hpPercent = (unit.currentHp / totalMax) * 100;
                const shieldPercent = (currentShield / totalMax) * 100;
                
                // Update health bar width and position
                healthFill.style.width = `${hpPercent}%`;
                healthFill.style.position = 'absolute';
                healthFill.style.left = '0';
                
                // Update shield bar
                if (currentShield > 0) {
                    shieldFill.style.display = 'block';
                    shieldFill.style.width = `${shieldPercent}%`;
                    shieldFill.style.position = 'absolute';
                    shieldFill.style.left = `${hpPercent}%`;
                } else {
                    shieldFill.style.display = 'none';
                }
                
                // Change health bar color based on HP percentage (of max HP, not total)
                const hpOfMaxPercent = (unit.currentHp / unit.maxHp) * 100;
                if (hpOfMaxPercent > 60) {
                    healthFill.style.background = 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)';
                } else if (hpOfMaxPercent > 30) {
                    healthFill.style.background = 'linear-gradient(90deg, #ffaa00 0%, #ff8800 100%)';
                } else {
                    healthFill.style.background = 'linear-gradient(90deg, #ff4444 0%, #cc0000 100%)';
                }
            }
            
            if (healthText) {
                // Show current HP with shield if present
                if (unit.currentShield > 0) {
                    healthText.textContent = `${Math.floor(unit.currentHp)}+${Math.floor(unit.currentShield)}`;
                } else {
                    healthText.textContent = `${Math.floor(unit.currentHp)}`;
                }
            }
            
            // Update action bar fill
            const actionFill = element.querySelector('.actionFill');
            if (actionFill) {
                const actionPercent = Math.min((unit.actionBar / 10000) * 100, 100);
                actionFill.style.width = `${actionPercent}%`;
                
                // Glow when ready
                if (actionPercent >= 100) {
                    actionFill.style.boxShadow = '0 0 10px rgba(77, 208, 225, 1)';
                } else {
                    actionFill.style.boxShadow = '0 0 5px rgba(77, 208, 225, 0.5)';
                }
            }
            
            // Update buffs and debuffs display only if changed
            const currentBuffDebuffState = JSON.stringify({
                buffs: unit.buffs.map(b => ({ name: b.name, duration: b.duration, shieldAmount: b.shieldAmount })),
                debuffs: unit.debuffs.map(d => ({ name: d.name, duration: d.duration }))
            });
            
            if (unit._lastBuffDebuffState !== currentBuffDebuffState) {
                unit._lastBuffDebuffState = currentBuffDebuffState;
                
                // Hide tooltip when buff/debuff state changes since icons are being recreated
                this.hideBuffDebuffTooltip();
                
                const buffDebuffContainer = element.querySelector('.buffDebuffContainer');
                if (buffDebuffContainer) {
                    buffDebuffContainer.innerHTML = '';
                    
                    // Display buffs first
                    unit.buffs.forEach((buff, index) => {
                        const buffDiv = document.createElement('div');
                        buffDiv.className = 'buffIcon';
                        const iconName = this.getBuffIconName(buff.name);
                        
                        buffDiv.innerHTML = `
                            <img src="https://puzzle-drops.github.io/TEVE/img/buffs/${iconName}.png" 
                                 alt="${buff.name}"
                                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><rect fill=\\'%2300c3ff\\' width=\\'24\\' height=\\'24\\'/><text x=\\'12\\' y=\\'16\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'12\\'>B</text></svg>'">
                            ${buff.duration > 0 ? `<div class="buffDebuffDuration">${buff.duration}</div>` : ''}
                        `;
                        
                        // Add tooltip on hover
                        buffDiv.onmouseenter = (e) => {
                            this.showBuffDebuffTooltip(e, buff, true);
                        };
                        
                        buffDiv.onmouseleave = () => {
                            this.hideBuffDebuffTooltip();
                        };
                        
                        buffDebuffContainer.appendChild(buffDiv);
                    });
                    
                    // Display debuffs after buffs
                    unit.debuffs.forEach((debuff, index) => {
                        const debuffDiv = document.createElement('div');
                        debuffDiv.className = 'debuffIcon';
                        const iconName = this.getDebuffIconName(debuff.name);
                        
                        debuffDiv.innerHTML = `
                            <img src="https://puzzle-drops.github.io/TEVE/img/buffs/${iconName}.png" 
                                 alt="${debuff.name}"
                                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><rect fill=\\'%23ff4444\\' width=\\'24\\' height=\\'24\\'/><text x=\\'12\\' y=\\'16\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'12\\'>D</text></svg>'">
                            ${debuff.duration > 0 ? `<div class="buffDebuffDuration">${debuff.duration}</div>` : ''}
                        `;
                        
                        // Add tooltip on hover
                        debuffDiv.onmouseenter = (e) => {
                            this.showBuffDebuffTooltip(e, debuff, false);
                        };
                        
                        debuffDiv.onmouseleave = () => {
                            this.hideBuffDebuffTooltip();
                        };
                        
                        buffDebuffContainer.appendChild(debuffDiv);
                    });
                }
            }
        });
    }

    getBuffIconName(buffName) {
    const iconMap = {
        'Increase Attack': 'increase_attack',
        'Increase Speed': 'increase_speed',
        'Increase Defense': 'increase_defense',
        'Immune': 'immune',
        'Shield': 'shield',
        'Frost Armor': 'frost_armor'
    };
    return iconMap[buffName] || 'buff';
}

    getDebuffIconName(debuffName) {
        const iconMap = {
            'Reduce Attack': 'reduce_attack',
            'Reduce Speed': 'reduce_speed',
            'Reduce Defense': 'reduce_defense',
            'Blight': 'blight',
            'Bleed': 'bleed',
            'Stun': 'stun',
            'Taunt': 'taunt',
            'Silence': 'silence',
            'Mark': 'mark'
        };
        return iconMap[debuffName] || 'debuff';
    }

    showBuffDebuffTooltip(event, buffDebuff, isBuff) {
        // Ensure we have valid buff/debuff data
        if (!buffDebuff || !buffDebuff.name) {
            console.warn('Invalid buff/debuff data for tooltip');
            return;
        }

        let tooltip = document.getElementById('buffDebuffTooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'buffDebuffTooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: rgba(10, 15, 26, 0.95);
                border: 2px solid #2a6a8a;
                padding: 12px;
                border-radius: 4px;
                z-index: 10002;
                pointer-events: none;
                max-width: 300px;
                display: none;
            `;
            document.body.appendChild(tooltip);
        }
        
        const descriptions = {
    // Buffs
    'Increase Attack': '+50% attack damage',
    'Increase Speed': '+33% action bar progress',
    'Increase Defense': '+25% damage reduction, and -25% damage taken',
    'Immune': 'Cannot gain debuffs',
    'Shield': `Absorbs ${Math.round(buffDebuff.shieldAmount || 0)} damage`,
    'Frost Armor': '+25% damage reduction, attackers are slowed',
            
            // Debuffs
            'Reduce Attack': '-50% attack damage',
            'Reduce Speed': '-33% action bar progress',
            'Reduce Defense': '-25% damage reduction, and +25% damage taken',
            'Blight': 'No health regen, cannot be healed',
            'Bleed': 'Takes 5% max HP damage each turn',
            'Stun': 'Cannot act on next turn',
            'Taunt': 'Must attack the unit that taunted',
            'Silence': 'Forces skill 1 attack on random enemy',
            'Mark': '+25% damage taken, cannot gain buffs or evade'
        };
        
        tooltip.className = isBuff ? 'buff' : 'debuff';
        tooltip.innerHTML = `
            <div class="buffDebuffTooltipTitle">${buffDebuff.name}</div>
            <div class="buffDebuffTooltipDesc">${descriptions[buffDebuff.name] || 'Unknown effect'}</div>
            ${buffDebuff.duration > 0 ? `<div style="margin-top: 5px; color: #6a9aaa;">Turns remaining: ${buffDebuff.duration}</div>` : ''}
        `;
        
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        
        // Adjust if tooltip goes off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = (rect.top - tooltipRect.height - 5) + 'px';
        }
    }

    hideBuffDebuffTooltip() {
        const tooltip = document.getElementById('buffDebuffTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
            // Clear tooltip content to prevent stale data
            tooltip.innerHTML = '';
        }
    }
}
