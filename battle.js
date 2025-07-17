// Battle System for TEVE

class Battle {
constructor(game, party, enemyWaves, mode = 'dungeon') {
    this.game = game;
    this.mode = mode;
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
        this.enableBossScaling = false;

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

    // Initialize tracking for ALL battles (not just arena)
this.battleStats = {};

    // Track party deaths for arena
this.partyDeaths = 0;
        
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

        // Initialize battle stats
        this.initializeBattleStats();

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

        this.ai = new BattleAI(this);
        this.animations = new BattleAnimations(this);
        
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

        // Apply boss buff to boss enemies
this.enemies.forEach(enemy => {
    if (enemy.source.isBoss) {
        this.applyBuff(enemy, 'Boss', -1, {
            damageReduction: 0.25,
            stunResistance: 0.5
        });
        this.log(`${enemy.name} is a boss gaining stun resistance and damage reduction!`);
    }
});

        // Apply boss scaling for specific waves if animations is available
        if (this.animations) {
            this.animations.applyBossScaling(this.enemies, this.currentWave);
            
            // Add special log messages for scaled bosses
            if (this.enemies.length > 0 && this.enemies[0] && this.enemies[0].source.isBoss) {
                if (this.currentWave === 2) {
                    this.log(`${this.enemies[0].name} appears larger than usual!`);
                } else if (this.currentWave === 4) {
                    this.log(`${this.enemies[0].name} looms over the battlefield!`);
                }
            }
        }

        // Initialize battle stats for new wave enemies
this.enemies.forEach(enemy => {
    if (!this.battleStats[enemy.name]) {
        this.battleStats[enemy.name] = {
            kills: 0,
            deaths: 0,
            turnsTaken: 0,
            damageDealt: 0,
            damageTaken: 0,
            healingDone: 0,
            shieldingApplied: 0,
            buffsApplied: 0,
            debuffsApplied: 0,
            buffsDispelled: 0,
            debuffsCleansed: 0
        };
    }
});
        
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
        
        // Remove boss scaling classes if animations is available
        if (this.animations) {
            this.animations.removeBossScaling();
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
            this.animations.updateStunVisuals(unit);
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

processShieldRegeneration(unit, shieldPercent, regenTurns, passiveName) {
        // Initialize timer if not exists
        if (unit.shieldRegenTimer === undefined) {
            unit.shieldRegenTimer = 0;
        }
        
        unit.shieldRegenTimer++;
        
        if (unit.shieldRegenTimer >= regenTurns) {
            unit.shieldRegenTimer = 0;
            const shieldAmount = Math.floor(unit.maxHp * shieldPercent);
            const existingShield = unit.buffs.find(b => b.name === 'Shield');
            
            if (!existingShield) {
                this.applyBuff(unit, 'Shield', -1, { shieldAmount: shieldAmount });
                this.log(`${unit.name}'s ${passiveName} generates a shield!`);
            }
        }
    }
    
    processHealingOverTime(unit, durationProp, regenProp, effectName) {
        if (unit[regenProp] && unit.isAlive && unit[durationProp] > 0) {
            unit[durationProp]--;
            
            if (!unit.debuffs.some(d => d.name === 'Blight')) {
                const regenAmount = Math.floor(unit.maxHp * unit[regenProp]);
                const actualRegen = Math.min(regenAmount, unit.maxHp - unit.currentHp);
                
                if (actualRegen > 0) {
                    unit.currentHp += actualRegen;
                    this.log(`${unit.name} regenerates ${actualRegen} HP from ${effectName}.`);
                }
            }
            
            if (unit[durationProp] <= 0) {
                unit[regenProp] = null;
                unit[durationProp] = null;
            }
        }
    }

initializeBattleStats() {
    // For each unit in this.allUnits:
    this.allUnits.forEach(unit => {
        this.battleStats[unit.name] = {
            kills: 0,
            deaths: 0,
            turnsTaken: 0,
            damageDealt: 0,
            damageTaken: 0,
            healingDone: 0,
            shieldingApplied: 0,
            buffsApplied: 0,
            debuffsApplied: 0,
            buffsDispelled: 0,
            debuffsCleansed: 0
        };
    });
}

trackBattleStat(unitName, stat, value) {
    if (this.battleStats && this.battleStats[unitName]) {
        this.battleStats[unitName][stat] += value;
    } else {
        console.warn(`Battle stat tracking failed for ${unitName} - ${stat}`);
    }
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
        
        if (this.mode === 'arena') {
            // Show arena team name
            const currentTeam = this.game.arenaTeams && this.game.arenaTeams[this.game.currentArenaTeam];
            nameDisplay.textContent = currentTeam ? currentTeam.name : 'Arena Battle';
        } else {
            // Show dungeon name
            nameDisplay.textContent = this.game.currentDungeon ? this.game.currentDungeon.name : '';
        }
        
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
    this.ai.debugLogAllPossibleActions(unit);

    // Eternal Tide passive - every turn, lowest HP ally gains shield and removes debuff
    if (unit.eternalTidePassive && unit.isAlive) {
        const allies = this.getParty(unit);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            // Find lowest HP ally
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            
            // Apply shield
            const shieldAmount = Math.floor(lowestHpAlly.maxHp * (unit.eternalTideShieldPercent || 0.2));
            this.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: shieldAmount });
            
            // Remove one debuff
            if (lowestHpAlly.debuffs && lowestHpAlly.debuffs.length > 0) {
                lowestHpAlly.debuffs.shift();
                this.log(`Eternal tide protects and cleanses ${lowestHpAlly.name}!`);
            } else {
                this.log(`Eternal tide protects ${lowestHpAlly.name}!`);
            }
        }
    }

    // Tribal Leader passive - apply buffs to all allies at turn start
    if (unit.tribalLeaderPassive && unit.auraBuffs && unit.isAlive) {
        const allies = this.getParty(unit);
        allies.forEach(ally => {
            if (ally.isAlive && ally !== unit) {
                unit.auraBuffs.forEach(buffName => {
                    // Check if ally already has the buff
                    const hasBuff = ally.buffs.some(b => b.name === buffName);
                    if (!hasBuff) {
                        this.applyBuff(ally, buffName, unit.auraDuration || 1, {});
                    }
                });
            }
        });
    }
    
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
            
            // Add validation for spell manager
            if (spellManager && spellManager.getSpell) {
                const spell = spellManager.getSpell('twilights_promise');
                if (spell) {
                    // Execute the logic
                    spellLogic.twilightsEndLogic(this, unit, 'all', spell, spellLevel);
                } else {
                    console.error('Twilight\'s Promise spell not found in spell manager');
                    this.log(`${unit.name}'s Twilight's End fizzles!`);
                }
            } else {
                console.error('Spell manager not available');
                this.log(`${unit.name}'s Twilight's End fizzles!`);
            }
            
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

    // Track turn taken - unit made it past stun, silence, and taunt checks
    this.trackBattleStat(unit.name, 'turnsTaken', 1);
    
    // Check if it's a player unit and not in auto mode and not taunted
    if (!unit.isEnemy && !this.autoMode && !isTaunted) {
        this.waitingForPlayer = true;
        this.showPlayerAbilities(unit);
    } else {
        // AI turn (or taunted player unit)
        if (isTaunted && !unit.isEnemy && !this.autoMode) {
            this.log(`${unit.name} is taunted and must attack ${tauntDebuff.tauntTarget.name}!`);
        }
        this.ai.executeAITurn(unit);
    }
}

executeAbility(caster, abilityIndex, target) {
    const ability = caster.abilities[abilityIndex];
    if (!ability || !caster.useAbility(abilityIndex)) return;
    
    const spell = spellManager.getSpell(ability.id);
    if (!spell) return;

    caster.lastAbilityUsed = ability.id;
    
    // Check for Grand Templar Male passive stun chance
    if (caster.grandTemplarMalePassive && caster.globalStunChance && target && target !== 'all' && target.isAlive) {
        if (Math.random() < caster.globalStunChance) {
            this.applyDebuff(target, 'Stun', 1, { stunned: true });
            this.log(`${caster.name}'s mastery stuns ${target.name}!`);
        }
    }
    
    // Check for Fire Dance AoE effect
    if (caster.nextAttackIsAoE && (spell.effects.includes('physical') || spell.effects.includes('magical'))) {
        caster.nextAttackIsAoE = false;
        this.log(`${caster.name}'s fire dance turns the attack into an inferno!`);
        
        // Execute the ability on all enemies
        const enemies = this.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                if (spellLogic[spell.logicKey]) {
                    try {
                        const spellLevel = ability.level || caster.spellLevel || 1;
                        spellLogic[spell.logicKey](this, caster, enemy, spell, spellLevel);
                    } catch (error) {
                        console.error(`Error executing AoE ${ability.name}:`, error);
                    }
                }
            }
        });
        
        // Don't continue with normal execution since we already hit all enemies
        return;
    }
    
    // Show spell animation
    this.animations.showSpellAnimation(caster, ability.name, spell.effects);
    
    // Execute spell logic
    if (spellLogic[spell.logicKey]) {
        try {
            const spellLevel = ability.level || caster.spellLevel || 1;
            spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
            
            // Check for Whirling Step double attack
            if (caster.nextAttackHitsTwice && spell.effects.includes('physical')) {
                caster.nextAttackHitsTwice = false;
                this.log(`${caster.name}'s whirling momentum grants a second strike!`);
                // Execute the same ability again
                spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
            }
        } catch (error) {
            console.error(`Error executing ${ability.name}:`, error);
            this.log(`${caster.name} failed to use ${ability.name}!`);
        }
    }
    
    // Alpha's Call passive - check if any ally has Increase Speed after attacking
    if (caster.alphasCallPassive && !ability.passive && (spell.effects.includes('physical') || spell.effects.includes('magical'))) {
        const allies = this.getParty(caster);
        const hasSpeedBuffAlly = allies.some(ally => 
            ally.isAlive && ally.buffs && ally.buffs.some(b => b.name === 'Increase Speed')
        );
        
        if (hasSpeedBuffAlly) {
            this.applyBuff(caster, 'Increase Attack', caster.alphasCallBuffDuration || 2, { damageMultiplier: 1.5 });
            this.log(`${caster.name}'s alpha leadership inspires greater strength!`);
        }
    }
    
    // Blade Mastery passive - chance for extra attack
    if (caster.bladeMasteryPassive && !ability.passive && spell.effects.includes('physical')) {
        if (Math.random() < 0.3) { // 30% chance
            this.log(`${caster.name}'s blade mastery grants an extra strike!`);
            // Execute the same ability again on the same target if they're still alive
            if (target && target !== 'all' && target.isAlive) {
                // Use spell logic directly to avoid cooldown/ability use
                try {
                    const spellLevel = ability.level || caster.spellLevel || 1;
                    spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
                } catch (error) {
                    console.error(`Error executing blade mastery extra attack:`, error);
                }
            }
        }
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
            if (this.currentUnit.shieldRegenTimer !== undefined && this.currentUnit.shieldRegenAmount) {
                const shieldPercent = this.currentUnit.shieldRegenAmount / this.currentUnit.maxHp;
                this.processShieldRegeneration(
                    this.currentUnit, 
                    shieldPercent, 
                    this.currentUnit.shieldRegenTurns, 
                    'shield regenerates'
                );
            }

            // Reinforced Plating passive shield regeneration
            if (this.currentUnit.reinforcedPlatingPassive && this.currentUnit.shieldRegenPercent) {
                this.processShieldRegeneration(
                    this.currentUnit,
                    this.currentUnit.shieldRegenPercent,
                    this.currentUnit.shieldRegenTurns,
                    'reinforced plating'
                );
            }

            // Ancestral Vigor healing effect
            if (this.currentUnit.ancestralVigorRegen && this.currentUnit.ancestralVigorDuration) {
                this.processHealingOverTime(
                    this.currentUnit,
                    'ancestralVigorDuration',
                    'ancestralVigorRegen',
                    'Ancestral Vigor'
                );
            }

            // Tribal Chant healing effect
            if (this.currentUnit.tribalChantRegen && this.currentUnit.tribalChantDuration) {
                this.processHealingOverTime(
                    this.currentUnit,
                    'tribalChantDuration',
                    'tribalChantRegen',
                    'Tribal Chant'
                );
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

            // Mirror Image dodge duration tracking
if (this.currentUnit.mirrorImageDodge && this.currentUnit.mirrorImageDuration !== undefined) {
    this.currentUnit.mirrorImageDuration--;
    if (this.currentUnit.mirrorImageDuration <= 0) {
        this.currentUnit.dodgePhysical = (this.currentUnit.dodgePhysical || 0) - 0.5;
        this.currentUnit.mirrorImageDodge = false;
        this.currentUnit.mirrorImageDuration = undefined;
        this.log(`${this.currentUnit.name}'s mirror images fade away.`);
    }
}
            
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

    // Check for damage calculation modifiers
    if (attacker.onDamageCalculation) {
        attacker.onDamageCalculation.forEach(calc => {
            if (calc.type === 'executioner' && (target.currentHp / target.maxHp) < calc.hpThreshold) {
                damage *= calc.damageBonus;
            } else if (calc.type === 'missing_hp_damage' && attacker.savageMomentumPassive) {
                // Savage Momentum - bonus damage based on missing HP
                const missingHpPercent = 1 - (attacker.currentHp / attacker.maxHp);
                const damageBonus = 1 + (missingHpPercent * calc.maxBonus);
                damage *= damageBonus;
            } else if (calc.type === 'blade_mastery' && attacker.buffs.some(b => b.name === 'Increase Speed')) {
                damage *= calc.damageBonus;
            }
        });
    }

    // Check if target can dodge (Marked prevents all dodging)
    const isMarked = target.debuffs.some(d => d.name === 'Mark');

    // Check for Professional Witcher Female passive - Unavoidable Strike against silenced enemies
    const isPurgeSlashAgainstSilenced = attacker.professionalWitcherFemalePassive && 
                                       attacker.lastAbilityUsed === 'purge_slash' && 
                                       target.debuffs.some(d => d.name === 'Silence');

    // Check for dodge chances from Master Stalker passives
    let dodgeChance = 0;
    if (!isMarked && !isPurgeSlashAgainstSilenced) {
        if (damageType === 'physical') {
            dodgeChance = target.physicalDodgeChance || target.dodgePhysical || 0;
        } else if (damageType === 'magical') {
            dodgeChance = target.magicalDodgeChance || target.dodgeMagical || 0;
        } else if (damageType === 'pure') {
            dodgeChance = target.dodgePure || 0;
        }
        
        if (dodgeChance > 0 && Math.random() < dodgeChance) {
            this.log(`${target.name} dodges the attack!`);
            this.animations.showDodgeAnimation(target);
            return 0;
        }
    }
    
    // Apply attacker's damage modifiers from buffs
    attacker.buffs.forEach(buff => {
        if (buff.name === 'Increase Attack' || buff.damageMultiplier) {
            damage *= 1.5;
        }
    });

    // Apply magical damage bonus if applicable (from Cinder Lord passive)
    if (damageType === 'magical' && attacker.magicalDamageBonus) {
        damage *= (1 + attacker.magicalDamageBonus);
    }

    // Warmaster passive - check if attacker has bleed and if any ally has warmaster passive
    if (attacker.debuffs.some(d => d.name === 'Bleed')) {
        const allies = this.getParty(attacker);
        const warmasterAlly = allies.find(ally => ally.isAlive && ally.warmasterPassive);
        if (warmasterAlly) {
            damage *= 1.25; // 25% damage bonus
            // Only log once per turn to avoid spam
            if (!attacker._warmasterBonusLogged) {
                this.log(`${attacker.name} gains Warmaster's fury!`);
                attacker._warmasterBonusLogged = true;
            }
        }
    }
    
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
    let shieldDamageAbsorbed = 0;
    if (shield && shield.shieldAmount > 0) {
        const shieldDamage = Math.min(damage, shield.shieldAmount);
        shield.shieldAmount -= shieldDamage;
        damage -= shieldDamage;
        shieldDamageAbsorbed = shieldDamage;
        
        if (shield.shieldAmount <= 0) {
            target.buffs = target.buffs.filter(b => b !== shield);
            this.log(`${target.name}'s shield breaks!`);
            
            // Oceanic Resilience passive - when shield breaks, apply Increase Defense
            const allies = this.getParty(target);
            const oceanicResilienceAlly = allies.find(ally => 
                ally.isAlive && ally.oceanicResiliencePassive
            );
            
            if (oceanicResilienceAlly) {
                this.applyBuff(target, 'Increase Defense', oceanicResilienceAlly.oceanicResilienceBuffDuration || 2, {});
                this.log(`${target.name} gains defense from oceanic resilience!`);
            }
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
    
    // Apply passive damage reduction (like Thick Hide and Patchwork Body) - skip for pure damage
    if (damageType !== 'pure') {
        if (target.damageReduction) {
            damage *= (1 - target.damageReduction);
        }
        if (target.globalDamageReduction) {
            damage *= (1 - target.globalDamageReduction);
        }
    }

    // DEAL THE DAMAGE
    damage = Math.round(damage);
    const previousHp = target.currentHp;
    target.currentHp = Math.max(0, target.currentHp - damage);
    
    // Calculate actual damage dealt (for life drain calculations)
    const actualDamage = previousHp - target.currentHp;

    // Track damage stats
    this.trackBattleStat(attacker.name, 'damageDealt', actualDamage);
    this.trackBattleStat(target.name, 'damageTaken', actualDamage);

    // AFTER DAMAGE TAKEN EFFECTS BELOW

    // Check for From Ashes trigger
    if (target.fromAshesReady && !target.fromAshesTriggered && target.isAlive) {
        const hpPercent = target.currentHp / target.maxHp;
        if (hpPercent <= target.fromAshesThreshold) {
            target.fromAshesTriggered = true;
            
            // Heal all allies
            const allies = this.getParty(target);
            allies.forEach(ally => {
                if (ally.isAlive) {
                    const healAmount = Math.floor(ally.maxHp * target.fromAshesHealPercent);
                    this.healUnit(ally, healAmount);
                }
            });
            
            this.log(`${target.name} rises from ashes, healing all allies!`);
            
            // Set cooldown (this would need to be tracked properly in a real implementation)
            target.fromAshesReady = false;
        }
    }

    // Molten Shield retaliation
    if (target.moltenShieldActive && actualDamage > 0 && attacker.isAlive) {
        const retaliationDamage = target.moltenShieldDamage || 75;
        attacker.currentHp = Math.max(0, attacker.currentHp - retaliationDamage);
        this.log(`${attacker.name} takes ${retaliationDamage} fire damage from molten shield!`);
        
        if (attacker.currentHp <= 0 && !attacker.isDead) {
            this.handleUnitDeath(attacker, target);
        }
    }

    // Acidic Body reflection - based on shield damage absorbed
    if (target.acidicBodyReflect && shieldDamageAbsorbed > 0 && attacker.isAlive) {
        const reflectDamage = Math.floor(shieldDamageAbsorbed * target.acidicBodyReflect);
        attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage);
        this.log(`${attacker.name} takes ${reflectDamage} acidic damage from hitting the shield!`);
        
        if (attacker.currentHp <= 0 && !attacker.isDead) {
            this.handleUnitDeath(attacker, target);
        }
    }

    // Toxic Blood passive - chance to apply Blight when damaged
    if (target.toxicBloodPassive && target.isAlive && actualDamage > 0) {
        if (Math.random() < (target.toxicBloodChance || 0.3)) {
            this.applyDebuff(attacker, 'Blight', target.toxicBloodDuration || 2, { noHeal: true });
            this.log(`${attacker.name} is infected by toxic blood!`);
        }
    }

    // Runemaster Female passive - retaliate with Nature's Blessing when taking magical damage
    if (target.runemasterFemalePassive && target.isAlive && actualDamage > 0 && damageType === 'magical') {
        // Find lowest HP ally
        const allies = this.getParty(target);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            
            // Grant 10% action bar to lowest HP ally
            const actionBarGain = 0.1 * 10000;
            lowestHpAlly.actionBar = Math.min(10000, lowestHpAlly.actionBar + actionBarGain);
            this.log(`${target.name}'s Nature's Revenge grants action bar to ${lowestHpAlly.name}!`);
        }
    }
    
    // Check for on-hit effects from attacker
    if (attacker.onHitEffects && target.isAlive) {
        attacker.onHitEffects.forEach(effect => {
            if (effect.type === 'debuff' && Math.random() < effect.chance) {
                this.applyDebuff(target, effect.debuffName, effect.duration, {});
            }
        });
    }

    // Rotting Presence passive - attacks apply Blight
    if (attacker.rottingPresencePassive && target.isAlive && actualDamage > 0) {
        this.applyDebuff(target, 'Blight', attacker.rottingPresenceBlightDuration || 1, { noHeal: true });
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
            } else if (effect.type === 'hellfire_retaliation' && attacker.isAlive) {
                // Hellfire Aura passive
                attacker.currentHp = Math.max(0, attacker.currentHp - effect.damage);
                this.applyDebuff(attacker, 'Reduce Speed', effect.slowDuration, {});
                this.log(`${attacker.name} takes ${effect.damage} fire damage and is slowed by hellfire aura!`);
                
                if (attacker.currentHp <= 0 && !attacker.isDead) {
                    this.handleUnitDeath(attacker, target);
                }
            }
        });
    }
// Demolition Expert passive - AOE retaliation
    if (target.demolitionExpertPassive && target.isAlive && actualDamage > 0) {
        // Check if target has any debuffs
        if (!target.debuffs || target.debuffs.length === 0) {
            const retaliationDamage = actualDamage * 0.3;
            const enemies = this.getEnemies(target);
            enemies.forEach(enemy => {
                if (enemy.isAlive && enemy !== attacker) {
                    enemy.currentHp = Math.max(0, enemy.currentHp - retaliationDamage);
                    this.log(`${target.name}'s demolition expertise deals ${Math.floor(retaliationDamage)} damage to ${enemy.name}!`);
                    
                    // Check if enemy died from retaliation
                    if (enemy.currentHp <= 0 && !enemy.isDead) {
                        this.handleUnitDeath(enemy, target);
                    }
                }
            });
            // Also damage the original attacker
            if (attacker.isAlive) {
                attacker.currentHp = Math.max(0, attacker.currentHp - retaliationDamage);
                this.log(`${target.name}'s demolition expertise deals ${Math.floor(retaliationDamage)} damage to ${attacker.name}!`);
                
                if (attacker.currentHp <= 0 && !attacker.isDead) {
                    this.handleUnitDeath(attacker, target);
                }
            }
        }
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

    // Corrosive Splash passive - chance to reduce attacker's attack
    if (target.corrosiveSplashPassive && target.isAlive && damage > 0) {
        if (Math.random() < target.corrosiveSplashChance) {
            this.applyDebuff(attacker, 'Reduce Attack', target.corrosiveSplashDuration, {});
            this.log(`${attacker.name} is weakened by ${target.name}'s corrosive splash!`);
        }
    }
    
    // Burning Aura passive - chance to apply bleed to attacker
    if (target.burningAuraPassive && target.isAlive && actualDamage > 0 && attacker.isAlive) {
        if (Math.random() < 0.3) { // 30% chance
            this.applyDebuff(attacker, 'Bleed', 1, {});
            this.log(`${attacker.name} is burned by ${target.name}'s burning aura!`);
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
    this.animations.showDamageAnimation(attacker, target, damage, damageType);

    // Check if target died
    if (previousHp > 0 && target.currentHp <= 0) {
        this.handleUnitDeath(target, attacker);
    }
    
    return actualDamage;
});
    }

    getBuffIconName(buffName) {
    const iconMap = {
        'Boss': 'boss',
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
    'Boss': '50% stun resistance, 25% damage reduction',
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
