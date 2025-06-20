// Battle System for TEVE

class BattleUnit {

    constructor(source, isEnemy = false, position = 0) {

        this.source = source; // Reference to Hero or Enemy object

        this.isEnemy = isEnemy;

        this.position = position;

        

        // Battle stats

        this.currentHp = this.maxHp;

        this.actionBar = 0;

        this.buffs = [];

        this.debuffs = [];

        this.cooldowns = {};

        

        // Initialize cooldowns

        const abilities = this.abilities;

        if (abilities && abilities.length > 0) {

            abilities.forEach((ability, index) => {

                if (ability.cooldown > 0) {

                    this.cooldowns[index] = 0;

                }

            });

        }

        

        console.log(`Created BattleUnit: ${this.name}, HP: ${this.currentHp}/${this.maxHp}, Speed: ${this.actionBarSpeed}`);

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

        let speed = this.isEnemy ? 100 + 100 * (agi / (agi + 1000)) : this.source.actionBarSpeed;

        

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

        return this.currentHp > 0;

    }

    

    get abilities() {

        return this.source.abilities || [];

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

        // Reduce duration and remove expired buffs

        this.buffs = this.buffs.filter(buff => {

            if (buff.duration > 0) {

                buff.duration--;

                return buff.duration > 0;

            }

            return buff.duration === -1; // Permanent buffs

        });

        

        // Reduce duration and remove expired debuffs

        this.debuffs = this.debuffs.filter(debuff => {

            if (debuff.duration > 0) {

                debuff.duration--;

                return debuff.duration > 0;

            }

            return debuff.duration === -1; // Permanent debuffs

        });

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

	// Clear any existing timer interval from previous battles
if (this.timerInterval) {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
}
    
    // Add timer tracking
    this.startTime = Date.now();
    this.endTime = null;
    
    // Wave management
    this.enemyWaves = enemyWaves;
    this.currentWave = 0;
    this.waveExpCalculated = false; // Track if exp was calculated for current wave
    
    console.log('Battle created with enemyWaves:', enemyWaves);
    console.log('Number of waves:', enemyWaves ? enemyWaves.length : 0);
    
    // Store the original wave data for exp calculation
    this.dungeonWaves = enemyWaves;
    
    // Track exp earned per wave for each hero
    this.waveExpEarned = [];
    
    // Create battle units for party
    this.party = party.map((hero, index) => hero ? new BattleUnit(hero, false, index) : null).filter(u => u);
    
    // Initialize with first wave of enemies
    this.enemies = [];
    this.loadWave(0);
    
    this.allUnits = [...this.party, ...this.enemies];
    
    // Apply initial passives
    this.applyInitialPassives();
}

    

    loadWave(waveIndex) {

        if (waveIndex >= this.enemyWaves.length) {

            return false;

        }

        

        this.currentWave = waveIndex;
        this.waveExpCalculated = false; // Reset exp calculation flag for new wave
        const wave = this.enemyWaves[waveIndex];

        
// Clear any existing enemies and their UI
for (let i = 1; i <= 5; i++) {
    const element = document.getElementById(`enemy${i}`);
    if (element) {
        const unitDiv = element.querySelector('.unit');
        if (unitDiv) {
            delete unitDiv.dataset.spriteSet;
            unitDiv.innerHTML = 'E' + i;
            unitDiv.classList.remove('dying');
            unitDiv.style.opacity = '';
            unitDiv.style.filter = '';
        }
        // Remove any existing shadow
        const shadow = element.querySelector('.unitShadow');
        if (shadow) {
            shadow.remove();
        }
    }
}

        

        // Clear enemies array

        this.enemies = [];

        

        // Create battle units for this wave

        wave.forEach((enemy, index) => {

            if (enemy) {

                const newUnit = new BattleUnit(enemy, true, index);

                // Ensure HP is set properly

                newUnit.currentHp = newUnit.maxHp;

                this.enemies.push(newUnit);

                console.log(`Created enemy: ${newUnit.name} with ${newUnit.currentHp}/${newUnit.maxHp} HP`);

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

        

        // Force complete UI update

        this.updateUI();

        

        return true;

    }

    

    applyInitialPassives() {

        // Apply passive abilities at battle start

        this.allUnits.forEach(unit => {

            unit.abilities.forEach((ability, index) => {

                if (ability.passive && spellLogic[ability.logicKey]) {

                    try {

                        spellLogic[ability.logicKey](this, unit);

                    } catch (error) {

                        console.error(`Error applying passive ${ability.name}:`, error);

                    }

                }

            });

        });

    }

    

start() {
    this.log("Battle started!");
    this.log(`Your party: ${this.party.map(u => u.name).join(', ')}`);
    
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

        

        //// Progress action bars for all living units
let highestActionBar = 0;
this.allUnits.forEach(unit => {
    if (unit.isAlive) {
        let speed = unit.actionBarSpeed;
        
        // Apply speed buffs
        unit.buffs.forEach(buff => {
            if (buff.name === 'Speed Boost' || buff.actionBarMultiplier) {
                speed *= buff.actionBarMultiplier || 1.5;
            }
        });
        
        // Apply speed debuffs
        unit.debuffs.forEach(debuff => {
            if (debuff.name === 'Slow' || debuff.actionBarSpeed) {
                speed *= debuff.actionBarSpeed || 0.5;
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

        

        // Update buffs/debuffs at turn start

        unit.updateBuffsDebuffs();

        

        // Apply DOT effects

        this.applyDotEffects(unit);

        

        // Check if unit is stunned

        if (unit.debuffs.some(d => d.stunned)) {

            this.log(`${unit.name} is stunned!`);

            this.endTurn();

            return;

        }

        

        // Check if it's a player unit and not in auto mode

        if (!unit.isEnemy && !this.autoMode) {

            this.waitingForPlayer = true;

            this.showPlayerAbilities(unit);

        } else {

            // AI turn

            this.executeAITurn(unit);

        }

    }

    

    executeAITurn(unit) {

        // Find the strongest available ability

        let bestAbility = null;

        let bestIndex = -1;

        

        for (let i = unit.abilities.length - 1; i >= 0; i--) {

            if (unit.canUseAbility(i)) {

                bestAbility = unit.abilities[i];

                bestIndex = i;

                break;

            }

        }

        

        if (bestAbility && bestIndex >= 0) {

            // Determine target based on ability

            let target = null;

            const spell = spellManager.getSpell(bestAbility.id);

            

            if (spell) {

                switch (spell.target) {

                    case 'enemy':
    const enemies = unit.isEnemy ? this.party : this.enemies;
    const aliveEnemies = enemies.filter(e => e && e.isAlive);
    
    // Check for taunt
    const tauntedEnemy = aliveEnemies.find(e => e.debuffs.some(d => d.name === 'Taunt'));
    
    if (tauntedEnemy && bestIndex === 0) { // Force basic attack on taunted target
        target = tauntedEnemy;
    } else if (aliveEnemies.length > 0) {
        target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    }
    break;

                    case 'ally':

                        const allies = unit.isEnemy ? this.enemies : this.party;

                        const aliveAllies = allies.filter(a => a && a.isAlive);

                        // Prioritize low HP allies for heals

                        if (spell.effects.includes('heal')) {

                            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));

                        }

                        if (aliveAllies.length > 0) {

                            target = aliveAllies[0];

                        }

                        break;

                    case 'self':

                        target = unit;

                        break;

                    case 'all_enemies':

                    case 'all_allies':

                        target = 'all';

                        break;

                }

                

                if (target || spell.target === 'passive') {

                    this.executeAbility(unit, bestIndex, target);

                }

            }

        } else {

            this.log(`${unit.name} has no abilities available!`);

        }

        

        this.endTurn();

    }

    

    executeAbility(caster, abilityIndex, target) {

        const ability = caster.abilities[abilityIndex];

        if (!ability || !caster.useAbility(abilityIndex)) return;

        

        const spell = spellManager.getSpell(ability.id);

        if (!spell) return;

        

        // Show spell animation

        this.showSpellAnimation(caster, ability.name, spell.effects);

        

        // Execute spell logic

        if (spellLogic[spell.logicKey]) {

            try {

                spellLogic[spell.logicKey](this, caster, target, spell);

            } catch (error) {

                console.error(`Error executing ${ability.name}:`, error);

                this.log(`${caster.name} failed to use ${ability.name}!`);

            }

        }

    }

    

showSpellAnimation(caster, spellName, effects) {
        const elementId = caster.isEnemy ? `enemy${caster.position + 1}` : `party${caster.position + 1}`;
        const unitSlot = document.getElementById(elementId);
        
        if (unitSlot) {
            // Clear any existing spell text first
            const existingSpellText = unitSlot.querySelector('.spellText');
            if (existingSpellText) {
                existingSpellText.remove();
            }
            
            // Determine animation type based on spell effects
            let animationClass = 'casting-damage'; // default
            
            if (effects.includes('speed') || effects.includes('buff')) {
                animationClass = 'casting-speed';
            } else if (effects.includes('heal')) {
                animationClass = 'casting-heal';
            } else if (effects.includes('holy')) {
                animationClass = 'casting-holy';
            } else if (effects.includes('shadow') || effects.includes('debuff')) {
                animationClass = 'casting-shadow';
            } else if (effects.includes('shield') || effects.includes('defense')) {
                animationClass = 'casting-shield';
            } else if (effects.includes('summon') || effects.includes('transform')) {
                animationClass = 'casting-summon';
            }
            
            // Add animation to unit
            unitSlot.classList.add(animationClass);
            setTimeout(() => unitSlot.classList.remove(animationClass), 800);
            
            // Create spell text
            const spellText = document.createElement('div');
            spellText.className = 'spellText';
            spellText.textContent = spellName;
            
            // Add appropriate color class based on spell type
            if (effects.includes('damage')) spellText.classList.add('damage');
            else if (effects.includes('heal')) spellText.classList.add('heal');
            else if (effects.includes('buff')) spellText.classList.add('buff');
            else if (effects.includes('debuff')) spellText.classList.add('debuff');
            else if (effects.includes('holy')) spellText.classList.add('holy');
            else if (effects.includes('shadow')) spellText.classList.add('shadow');
            else if (effects.includes('fire')) spellText.classList.add('fire');
            else if (effects.includes('frost')) spellText.classList.add('frost');
            else if (effects.includes('arcane')) spellText.classList.add('arcane');
            else spellText.classList.add('damage'); // default
            
            unitSlot.appendChild(spellText);
            
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
			this.currentUnit.reduceCooldowns();
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
    
    let damage = Math.floor(amount);
    
    // Apply attacker's damage modifiers from buffs
    attacker.buffs.forEach(buff => {
        if (buff.name === 'Attack Boost' || buff.damageMultiplier) {
            damage *= 1.5;
        }
    });
    
    // Apply attacker's damage reduction from debuffs
    attacker.debuffs.forEach(debuff => {
        if (debuff.name === 'Attack Break') {
            damage *= 0.5;
        }
    });
    
    // Apply damage reduction based on type
    if (damageType === 'physical') {
        let targetArmor = target.armor;
        
        // Apply armor buffs/debuffs
        target.buffs.forEach(buff => {
            if (buff.name === 'Armor Boost') {
                targetArmor *= 1.5;
            }
        });
        target.debuffs.forEach(debuff => {
            if (debuff.name === 'Armor Break') {
                targetArmor *= 0.5;
            }
        });
        
        const physicalDR = (0.9 * targetArmor) / (targetArmor + 500);
        damage = damage * (1 - physicalDR);
    } else {
        // All non-physical damage is considered magical
        damage = damage * (1 - target.magicDamageReduction);
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
    
    damage = Math.floor(damage);
    const previousHp = target.currentHp;
    target.currentHp = Math.max(0, target.currentHp - damage);
    
    this.log(`${attacker.name} deals ${damage} ${damageType} damage to ${target.name}!`);
    
    // Check if target died
    if (previousHp > 0 && target.currentHp <= 0) {
        this.triggerDeathAnimation(target);
    }
    
    return damage;
}
	

triggerDeathAnimation(unit) {
    const elementId = unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`;
    const element = document.getElementById(elementId);
    
    if (element) {
        const unitDiv = element.querySelector('.unit');
        if (unitDiv) {
            unitDiv.classList.add('dying');
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
    target.currentHp += actualHeal;
    
    this.log(`${target.name} is healed for ${actualHeal} HP!`);
    
    return actualHeal;
}

    

    applyBuff(target, buffName, duration, effects) {
    if (!target.isAlive) return;
    
    // Check for immunity
    if (target.buffs.some(b => b.name === 'Immune' || b.immunity)) {
        this.log(`${target.name} is immune to buffs!`);
        return;
    }
    
    const buff = {
        name: buffName,
        duration: duration,
        ...effects
    };
    
    target.buffs.push(buff);
    this.log(`${target.name} gains ${buffName}!`);
}

    

    applyDebuff(target, debuffName, duration, effects) {
    if (!target.isAlive) return;
    
    // Check for immunity
    if (target.buffs.some(b => b.name === 'Immune' || b.immunity)) {
        this.log(`${target.name} is immune to debuffs!`);
        return;
    }
    
    const debuff = {
        name: debuffName,
        duration: duration,
        ...effects
    };
    
    target.debuffs.push(debuff);
    this.log(`${target.name} suffers from ${debuffName}!`);
}

    

    applyShield(target, amount) {

        if (!target.isAlive) return;

        

        // For now, treat shields as temporary HP

        target.currentHp += Math.floor(amount);

    }

    

    removeBuffs(target) {

        target.buffs = target.buffs.filter(buff => buff.duration === -1);

    }

    

    removeDebuffs(target) {

        target.debuffs = [];

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
                this.triggerDeathAnimation(unit);
            }
        } else if (debuff.name === 'Bleed' && unit.isAlive) {
            const damage = Math.floor(unit.maxHp * 0.05);
            const previousHp = unit.currentHp;
            unit.currentHp = Math.max(0, unit.currentHp - damage);
            this.log(`${unit.name} bleeds for ${damage} damage!`);
            
            // Check if unit died from bleed
            if (previousHp > 0 && unit.currentHp <= 0) {
                this.triggerDeathAnimation(unit);
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
                    console.log(`${hero.name}: ${prevExp} + ${waveExp} = ${hero.pendingExp} pending exp`);
                }
            });
        }
        
// Check if there are more waves
        if (this.currentWave < this.enemyWaves.length - 1) {
            // Prevent multiple wave transitions
            if (!this.processingWaveTransition) {
                this.processingWaveTransition = true;
                this.log("Wave cleared!");
                
                // Revive dead party members between waves
                this.party.forEach((unit, index) => {
                    if (unit && !unit.isAlive) {
                        unit.currentHp = unit.maxHp;
                        this.log(`${unit.name} revived for next wave!`);
                        
                        // Reset death animation
                        const elementId = `party${unit.position + 1}`;
                        const element = document.getElementById(elementId);
                        if (element) {
                            const unitDiv = element.querySelector('.unit');
                            if (unitDiv) {
                                unitDiv.classList.remove('dying');
                                unitDiv.style.opacity = '';
                                unitDiv.style.filter = '';
                            }
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
    
    console.log(`calculateWaveExp called for wave ${this.currentWave}`);
    console.log('dungeonWaves:', this.dungeonWaves);
    
    // Safety check
    if (!this.dungeonWaves || !Array.isArray(this.dungeonWaves)) {
        console.error('dungeonWaves is not properly initialized');
        return 0;
    }
    
    if (this.currentWave >= this.dungeonWaves.length) {
        console.error(`Invalid wave index: ${this.currentWave} >= ${this.dungeonWaves.length}`);
        return 0;
    }
    
    // Get the current wave configuration
    const currentWaveEnemies = this.dungeonWaves[this.currentWave];
    
    if (!currentWaveEnemies) {
        console.error(`No enemies found for wave ${this.currentWave}`);
        return 0;
    }
    
    console.log(`Calculating exp for wave ${this.currentWave + 1}:`, currentWaveEnemies);
    
    // Calculate exp based on enemy levels
    currentWaveEnemies.forEach(enemy => {
        if (enemy) {
            const expFromEnemy = enemy.level * baseExpPerLevel;
            totalExp += expFromEnemy;
            console.log(`Enemy ${enemy.name} (Lv${enemy.level}): ${expFromEnemy} exp`);
        }
    });
    
    console.log(`Total wave exp: ${totalExp}`);
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

        

        // Clear any active targeting

        if (this.targetingState) {

            this.clearTargeting();

        }

        

// Clean up level indicator event listeners
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
        this.game.closeHeroInfo();

        // Calculate battle duration

        const duration = Math.floor((this.endTime - this.startTime) / 1000);

        const minutes = Math.floor(duration / 60);

        const seconds = duration % 60;

        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        
// Get dungeon data
const dungeonId = this.game.currentDungeon.id;
const dungeonConfig = dungeonData.dungeons[dungeonId];
const rewards = dungeonConfig.rewards || { gold: 0, exp: 0, items: [] };
        
// Process items for each hero
const itemRolls = [];
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
            if (Math.random() < 1.5) {
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
            if (Math.random() < 1.5) {
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
    
    console.log(`${hero.name} final exp: ${waveExp} (waves) + ${dungeonBonus} (dungeon) = ${totalExp} total`);
    
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

            this.game.showBattleResults();

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
    
    // Count abilities (excluding passives for display purposes)
    const activeAbilities = unit.abilities.filter(ability => !ability.passive);
    
    activeAbilities.forEach((ability, index) => {
        const actualIndex = unit.abilities.indexOf(ability);
        const abilityDiv = document.createElement('div');
        abilityDiv.className = 'ability';
        
        if (!unit.canUseAbility(actualIndex)) {
            abilityDiv.classList.add('onCooldown');
        }
        
        const spell = spellManager.getSpell(ability.id);
        const iconUrl = `https://puzzle-drops.github.io/TEVE/img/spells/${ability.id}.png`;
        
        abilityDiv.innerHTML = `
            <img src="${iconUrl}" alt="${ability.name}" style="width: 100px; height: 100px;" onerror="this.style.display='none'">
            ${unit.cooldowns[actualIndex] > 0 ? `<span class="cooldownText">${unit.cooldowns[actualIndex]}</span>` : ''}
        `;
        
        // Add tooltip on hover using the new format
        abilityDiv.onmouseover = (e) => {
            const tooltipHtml = game.formatAbilityTooltip(ability, ability.level);
            game.showAbilityTooltipFromHTML(e, tooltipHtml);
        };
        
        abilityDiv.onmouseout = () => {
            game.hideAbilityTooltip();
        };
        
        if (unit.canUseAbility(actualIndex)) {
            abilityDiv.onclick = () => {
                // Hide tooltip when clicked
                game.hideAbilityTooltip();
                
                if (spell) {
                    // For targeted abilities, highlight valid targets
                    if (spell.target === 'enemy' || spell.target === 'ally') {
                        this.selectTarget(unit, actualIndex, spell.target);
                    } else {
                        this.executeAbility(unit, actualIndex, spell.target === 'self' ? unit : 'all');
                        this.endTurn();
                    }
                }
            };
        }
        
        abilityPanel.appendChild(abilityDiv);
    });
    
    // Apply centering based on ability count
    abilityPanel.style.justifyContent = 'center';
    abilityPanel.style.width = '100%';
}

    hidePlayerAbilities() {

        const abilityPanel = document.getElementById('abilityPanel');

        if (abilityPanel) {

            abilityPanel.innerHTML = '';

        }

    }

    

selectTarget(caster, abilityIndex, targetType) {
    // Store targeting state
    this.targetingState = {
        caster: caster,
        abilityIndex: abilityIndex,
        targetType: targetType
    };

    // Highlight valid targets
    const validTargets = targetType === 'enemy' ? 
        this.enemies.filter(e => e && e.isAlive) : 
        this.party.filter(p => p && p.isAlive);
    
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
            
            const clickHandler = () => {
                // Remove all handlers and highlighting
                this.clearTargeting();
                
                // Execute ability
                this.executeAbility(caster, abilityIndex, target);
                this.endTurn();
            };
            
            element.addEventListener('click', clickHandler);
        }
    });
}
	
clearTargeting() {
    // Clear targeting state
    this.targetingState = null;
    
    // Remove all targeting highlights and handlers
    this.allUnits.forEach(unit => {
        const element = document.getElementById(unit.isEnemy ? `enemy${unit.position + 1}` : `party${unit.position + 1}`);
        if (element) {
            element.style.cursor = '';
            element.style.filter = '';
            
            // Remove target arrow
            const targetArrow = element.querySelector('.targetArrow');
            if (targetArrow) {
                targetArrow.remove();
            }
            
            // Clone to remove event listeners
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
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

            

            if (element) {

                const healthBar = element.querySelector('.healthFill');

                const healthText = element.querySelector('.healthText');

                const unitDiv = element.querySelector('.unit');

                

                // Update health bar

                if (healthBar) {

                    const hpPercent = (unit.currentHp / unit.maxHp) * 100;

                    healthBar.style.width = `${hpPercent}%`;

                    

                    // Change color based on HP

                    if (hpPercent > 60) {

                        healthBar.style.background = 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)';

                    } else if (hpPercent > 30) {

                        healthBar.style.background = 'linear-gradient(90deg, #ffaa00 0%, #ff8800 100%)';

                    } else {

                        healthBar.style.background = 'linear-gradient(90deg, #ff4444 0%, #cc0000 100%)';

                    }

                }

                

                if (healthText) {
                    healthText.textContent = `${Math.floor(unit.currentHp)}/${unit.maxHp}`;
                }

// Update or create level indicator
let levelIndicator = element.querySelector('.levelIndicator');
if (!levelIndicator && unit.isAlive) {
    levelIndicator = document.createElement('div');
    levelIndicator.className = 'levelIndicator';
    element.appendChild(levelIndicator);
}

if (levelIndicator) {
    // For heroes, show level and stars based on tier
    if (!unit.isEnemy) {
        const hero = unit.source;
        const starData = hero.getStars();
        
        let html = '<div class="levelNumber">' + unit.source.level + '</div>';
        if (starData.html) {
            html += '<div class="levelStars ' + starData.colorClass + '">' + starData.html + '</div>';
        }
        levelIndicator.innerHTML = html;
    } else {
        // For enemies, show level and stars based on their star rating
        const enemy = unit.source;
        const starData = enemy.getStars();
        
        let html = '<div class="levelNumber">' + unit.source.level + '</div>';
        if (starData.html) {
            html += '<div class="levelStars ' + starData.colorClass + '">' + starData.html + '</div>';
        }
        levelIndicator.innerHTML = html;
    }
    
    // Hide when dead
    if (!unit.isAlive) {
        levelIndicator.style.display = 'none';
    } else {
        levelIndicator.style.display = '';
    }
}

                
// Add click handler for unit info on level indicator
                if (levelIndicator && unit.isAlive) {
                    levelIndicator.style.cursor = 'pointer';
                    
                    // Only update handler if it doesn't exist or unit has changed
                    if (!levelIndicator._unitInfoHandler || levelIndicator._unitInfoHandlerUnit !== unit) {
                        // Remove any existing click handler
                        if (levelIndicator._unitInfoHandler) {
                            levelIndicator.removeEventListener('click', levelIndicator._unitInfoHandler);
                        }
                        
                        // Create new handler
                        const newHandler = (e) => {
                            e.stopPropagation();
                            // Store the unit data at click time
                            const clickedUnit = unit;

				
                            
                            // Close any existing popup first
                            this.game.closeHeroInfo();
                            
                            // Show popup immediately without delay
                            if (clickedUnit.isEnemy) {
                                this.game.showEnemyInfoPopup(clickedUnit.source);
                            } else {
                                this.game.showHeroInfoPopup(clickedUnit.source);
                            }
                        };
                        
                        // Store reference to handler and unit so we can remove it later
                        levelIndicator._unitInfoHandler = newHandler;
                        levelIndicator._unitInfoHandlerUnit = unit;
                        levelIndicator.addEventListener('click', newHandler);
                        
                        // Prevent text selection on level indicator
                        levelIndicator.addEventListener('selectstart', (e) => e.preventDefault());
                    }
                }

		    // Add right-click handler for the entire unit slot
if (unit.isAlive) {
    // Store reference to current unit for the handler
    const currentUnit = unit;
    
    // Remove any existing right-click handler
    if (element._rightClickHandler) {
        element.removeEventListener('contextmenu', element._rightClickHandler);
    }
    
    // Create new right-click handler
    const rightClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close any existing popup first
        this.game.closeHeroInfo();
        
        // Show popup
        if (currentUnit.isEnemy) {
            this.game.showEnemyInfoPopup(currentUnit.source);
        } else {
            this.game.showHeroInfoPopup(currentUnit.source);
        }
    };
    
    // Store and add the handler
    element._rightClickHandler = rightClickHandler;
    element.addEventListener('contextmenu', rightClickHandler);
}
		    
                // Update unit appearance with sprites

if (unitDiv) {
    if (!unit.isAlive) {
    // Don't immediately hide - let death animation play
    if (!unitDiv.classList.contains('dying')) {
        unitDiv.style.filter = 'grayscale(100%)';
    }
    levelIndicator.style.display = 'none';
    
    // Hide health bar and action bar when dead
    const healthBar = element.querySelector('.healthBar');
    const actionBar = element.querySelector('.actionBar');
    if (healthBar) {
        healthBar.style.display = 'none';
    }
    if (actionBar) actionBar.style.display = 'none';
} else {
    unitDiv.style.opacity = '';
    unitDiv.style.filter = '';
    unitDiv.classList.remove('dying');
    levelIndicator.style.display = '';
    
    // Show health bar and action bar when alive
    const healthBar = element.querySelector('.healthBar');
    const actionBar = element.querySelector('.actionBar');
    if (healthBar) healthBar.style.display = '';
    if (actionBar) actionBar.style.display = '';
}
                    // Update sprite for units

                    if (unit.isEnemy && unit.isAlive) {

                        const enemyId = unit.source.enemyId;

                        unitDiv.innerHTML = `

                            <img src="https://puzzle-drops.github.io/TEVE/img/sprites/enemies/${enemyId}.png" alt="${unit.name}" 

                                 style="image-rendering: pixelated; object-fit: contain;"

                                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 9px; text-align: center; line-height: 1.2;\\'><div>${unit.name}</div><div style=\\'color: #6a9aaa;\\'>Lv${unit.source.level}</div></div>'">

                        `;

                    } else if (!unit.isEnemy && unit.isAlive) {
                        const hero = unit.source;
                        
                        unitDiv.innerHTML = `
                            <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${hero.className}_battle.png" alt="${hero.displayClassName}" 
                                 style="image-rendering: pixelated; object-fit: contain;"
                                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size: 9px; text-align: center; line-height: 1.2;\\'><div>${hero.name}</div><div style=\\'color: #6a9aaa;\\'>Lv${hero.level}</div></div>'">
                        `;
                    }

                }

                

                // Update or create shadow if it doesn't exist

                let shadow = element.querySelector('.unitShadow');

                if (!shadow && unit.isAlive) {

                    shadow = document.createElement('div');

                    shadow.className = 'unitShadow';

                    element.appendChild(shadow);

                }

		    // Update or create buff/debuff container
let buffDebuffContainer = element.querySelector('.buffDebuffContainer');
if (!buffDebuffContainer && unit.isAlive) {
    buffDebuffContainer = document.createElement('div');
    buffDebuffContainer.className = 'buffDebuffContainer';
    element.appendChild(buffDebuffContainer);
}

// Update buffs and debuffs display
if (buffDebuffContainer && unit.isAlive) {
    buffDebuffContainer.innerHTML = '';
    
    // Display buffs
    unit.buffs.forEach((buff, index) => {
        const buffDiv = document.createElement('div');
        buffDiv.className = 'buffIcon';
        buffDiv.innerHTML = `
            <img src="https://puzzle-drops.github.io/TEVE/img/buffs/${this.getBuffIconName(buff.name)}.png" 
                 alt="${buff.name}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><rect fill=\\'%2300c3ff\\' width=\\'24\\' height=\\'24\\'/><text x=\\'12\\' y=\\'16\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'12\\'>B</text></svg>'">
            ${buff.duration > 0 ? `<div class="buffDebuffDuration">${buff.duration}</div>` : ''}
        `;
        
        // Add hover tooltip
        buffDiv.onmouseover = (e) => this.showBuffDebuffTooltip(e, buff, true);
        buffDiv.onmouseout = () => this.hideBuffDebuffTooltip();
        
        buffDebuffContainer.appendChild(buffDiv);
    });
    
    // Display debuffs
    unit.debuffs.forEach((debuff, index) => {
        const debuffDiv = document.createElement('div');
        debuffDiv.className = 'debuffIcon';
        debuffDiv.innerHTML = `
            <img src="https://puzzle-drops.github.io/TEVE/img/buffs/${this.getDebuffIconName(debuff.name)}.png" 
                 alt="${debuff.name}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><rect fill=\\'%23ff4444\\' width=\\'24\\' height=\\'24\\'/><text x=\\'12\\' y=\\'16\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'12\\'>D</text></svg>'">
            ${debuff.duration > 0 ? `<div class="buffDebuffDuration">${debuff.duration}</div>` : ''}
        `;
        
        // Add hover tooltip
        debuffDiv.onmouseover = (e) => this.showBuffDebuffTooltip(e, debuff, false);
        debuffDiv.onmouseout = () => this.hideBuffDebuffTooltip();
        
        buffDebuffContainer.appendChild(debuffDiv);
    });
} else if (buffDebuffContainer && !unit.isAlive) {
    buffDebuffContainer.style.display = 'none';
}

                

                // Update or create action bar

                let actionBar = element.querySelector('.actionBar');

                if (!actionBar) {

                    actionBar = document.createElement('div');

                    actionBar.className = 'actionBar';

                    actionBar.style.cssText = 'width: 80%; height: 10px; background: #0a1929; border: 1px solid #2a6a8a; margin-top: 0px; position: relative;';

                    

                    const actionFill = document.createElement('div');

                    actionFill.className = 'actionFill';

                    actionFill.style.cssText = 'height: 100%; background: linear-gradient(90deg, #4dd0e1 0%, #2a9aaa 100%); transition: width 0.1s; box-shadow: 0 0 5px rgba(77, 208, 225, 0.5);';

                    

                    actionBar.appendChild(actionFill);

                    element.appendChild(actionBar);

                }

                

                // Update action bar fill

                const actionFill = actionBar.querySelector('.actionFill');

                if (actionFill) {

                    const actionPercent = Math.min((unit.actionBar / 10000) * 100, 100);

                    actionFill.style.width = `${actionPercent}%`;

                    

                    // Glow when ready

                    if (actionPercent >= 100) {

                        actionFill.style.boxShadow = '0 0 10px rgba(77, 208, 225, 1)';

                    }

                }

                

                // Highlight current unit

                if (unit === this.currentUnit) {

                    element.style.border = '2px solid #4dd0e1';

                    element.style.boxShadow = '0 0 20px rgba(77, 208, 225, 0.5)';

                    // Add active turn circle
                    let activeCircle = element.querySelector('.activeCircle');
                    if (!activeCircle && unit.isAlive) {
                        activeCircle = document.createElement('div');
                        activeCircle.className = 'activeCircle';
                        element.appendChild(activeCircle);
                    }

                } else {

                    element.style.border = '';

                    element.style.boxShadow = '';

                    // Remove active circle
                    const activeCircle = element.querySelector('.activeCircle');
                    if (activeCircle) {
                        activeCircle.remove();
                    }

                }

                

                // Show/hide enemy slots based on how many enemies are in this wave

                if (unit.isEnemy) {

                    element.style.display = unit.position < this.enemies.length ? 'block' : 'none';

                }

            }

        });

        

        // Hide empty enemy slots

        for (let i = this.enemies.length + 1; i <= 5; i++) {

            const element = document.getElementById(`enemy${i}`);

            if (element) {

                element.style.display = 'none';

            }

        }

    }

getBuffIconName(buffName) {
    const iconMap = {
        'fury': 'speed_boost',
        'beastForm': 'attack_boost',
        'frostArmor': 'armor_boost',
        'divineShield': 'immune',
        'shield': 'shield',
        'Attack Boost': 'attack_boost',
        'Speed Boost': 'speed_boost',
        'Armor Boost': 'armor_boost',
        'Immune': 'immune',
        'Shield': 'shield'
    };
    return iconMap[buffName] || 'buff';
}

getDebuffIconName(debuffName) {
    const iconMap = {
        'poison': 'poison',
        'stun': 'stun',
        'slow': 'slow',
        'huntersMark': 'mark',
        'Attack Break': 'attack_break',
        'Slow': 'slow',
        'Armor Break': 'armor_break',
        'Blight': 'blight',
        'Bleed': 'bleed',
        'Stun': 'stun',
        'Taunt': 'taunt'
    };
    return iconMap[debuffName] || 'debuff';
}

showBuffDebuffTooltip(event, buffDebuff, isBuff) {
    let tooltip = document.getElementById('buffDebuffTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'buffDebuffTooltip';
        document.body.appendChild(tooltip);
    }
    
    const descriptions = {
        // Buffs
        'fury': 'Increased attack speed by 50%',
        'Attack Boost': 'Deal 50% increased damage',
        'Speed Boost': '50% increased action bar progress',
        'Armor Boost': '50% increased armor',
        'Immune': 'Cannot gain debuffs',
        'Shield': 'Attacks reduce shield HP before unit HP',
        'beastForm': 'Transformed, gaining 50% STR and AGI',
        'frostArmor': 'Reduces damage taken by 30%',
        'divineShield': 'Immune to all damage',
        
        // Debuffs
        'poison': 'Taking damage over time',
        'Attack Break': '50% reduced attack damage',
        'Slow': '50% reduced action bar progress',
        'Armor Break': '50% reduced armor',
        'Blight': 'No health regen, cannot be healed',
        'Bleed': 'Takes 5% max HP damage each turn',
        'Stun': 'Cannot act on next turn',
        'Taunt': 'Must attack the taunting unit',
        'huntersMark': 'Takes 25% increased damage'
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
    }
}
	

}
