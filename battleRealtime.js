// battleRealtime.js - Real-time Autobattler Engine for TEVE-Battle
// Replaces the turn-based Battle class with a continuous real-time loop.
// All combat methods (dealDamage, healUnit, applyBuff, etc.) are ported
// from battle.js with duration conversion: 1 turn = 2 seconds.

class BattleRealtime {
    constructor(game, party, enemyWaves, mode = 'dungeon') {
        this.game = game;
        this.mode = mode;
        this.turn = 0; // kept for compatibility
        this.currentUnit = null;
        this.waitingForPlayer = false;
        this.autoMode = true; // default full auto in realtime
        this.pendingAutoMode = null;
        this.battleLog = [];
        this.gameSpeed = 1;
        this.running = true;
        this.processingWaveTransition = false;
        this.targetingState = null;
        this.battlePaused = false;
        this.enableBossScaling = false;

        // Real-time specific
        this._lastFrameTime = 0;
        this._animFrameId = null;
        this.projectiles = [];

        // Battlefield bounds (bottom half of 1920x1080)
        this.fieldMinX = 60;
        this.fieldMaxX = 1860;
        this.fieldMinY = 560;  // feet stay in bottom half
        this.fieldMaxY = 920;  // raised so feet don't clip off-screen

        // Timer
        this.startTime = Date.now();
        this.endTime = null;
        this.timerInterval = null;

        // Wave management
        this.enemyWaves = enemyWaves;
        this.currentWave = 0;
        this.waveExpCalculated = false;
        this.dungeonWaves = enemyWaves;
        this.waveExpEarned = [];

        // Battle stats
        this.battleStats = {};
        this.partyDeaths = 0;

        // Create battle units for party
        this.party = party.map((hero, index) => {
            if (!hero) return null;
            const unit = new BattleUnit(hero, false, index);
            unit.currentHp = unit.maxHp;
            unit.isDead = false;
            unit.deathAnimated = false;
            unit.uiInitialized = false;
            unit.battle = this;
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

        // Create AI
        this.ai = new RealtimeAI(this);
        this.animations = new BattleAnimations(this);
    }

    // --- Wave Management (ported from battle.js) ---

    loadWave(waveIndex) {
        if (waveIndex >= this.enemyWaves.length) return false;

        this.currentWave = waveIndex;
        this.waveExpCalculated = false;
        const wave = this.enemyWaves[waveIndex];

        this.enemies = [];

        wave.forEach((enemy, index) => {
            if (enemy) {
                const newUnit = new BattleUnit(enemy, true, index);
                newUnit.currentHp = newUnit.maxHp;
                newUnit.isDead = false;
                newUnit.deathAnimated = false;
                newUnit.uiInitialized = false;
                newUnit.battle = this;
                this.enemies.push(newUnit);
            }
        });

        this.allUnits = [...this.party, ...this.enemies];

        this.log(`Wave ${waveIndex + 1} begins!`);
        this.log(`Enemies: ${this.enemies.map(u => u.name).join(', ')}`);

        this.updateWaveCounter();

        // Apply boss buff
        this.enemies.forEach(enemy => {
            if (enemy.source.isBoss) {
                this.applyBuff(enemy, 'Boss', -1, {
                    damageReduction: 0.25,
                    stunResistance: 0.5
                });
                this.log(`${enemy.name} is a boss gaining stun resistance and damage reduction!`);
            }
        });

        this.applyInitialPassives(this.enemies);

        // Initialize battle stats for new wave enemies
        this.enemies.forEach(enemy => {
            if (!this.battleStats[enemy.name]) {
                this.battleStats[enemy.name] = {
                    kills: 0, deaths: 0, turnsTaken: 0,
                    damageDealt: 0, damageTaken: 0, healingDone: 0,
                    shieldingApplied: 0, buffsApplied: 0, debuffsApplied: 0,
                    buffsDispelled: 0, debuffsCleansed: 0
                };
            }
        });

        // Position new enemies on the battlefield
        this.positionUnits(this.enemies, false);

        // Create DOM elements for new enemies
        this.enemies.forEach(unit => {
            this.createRealtimeUnitEl(unit);
        });

        return true;
    }

    // --- Positioning ---

    positionUnits(units, isParty) {
        const count = units.length;
        if (count === 0) return;

        // Closer horizontally: party at 350, enemies at 1570
        const xBase = isParty ? 350 : 1570;
        const xSpread = 100;
        // Tighter vertical grouping
        const yMid = (this.fieldMinY + this.fieldMaxY) / 2;
        const yTotalSpread = Math.min(250, (this.fieldMaxY - this.fieldMinY) * 0.6);
        const yStart = yMid - yTotalSpread / 2;
        const ySpacing = count > 1 ? yTotalSpread / (count - 1) : 0;

        units.forEach((unit, i) => {
            const x = xBase + (Math.random() - 0.5) * xSpread;
            const y = count > 1 ? yStart + ySpacing * i : yMid;
            const facing = isParty ? 1 : -1;
            unit.initRealtime(x, y, facing);
        });
    }

    // --- DOM Creation for real-time units ---

    createRealtimeUnitEl(unit) {
        const battlefield = document.getElementById('realtimeBattlefield');
        if (!battlefield) return;

        const el = document.createElement('div');
        el.className = 'rt-unit';
        el.dataset.unitId = unit.isEnemy ? `enemy-${unit.position}` : `party-${unit.position}`;
        el.style.position = 'absolute';
        el.style.left = unit.x + 'px';
        el.style.top = unit.y + 'px';
        el.style.zIndex = Math.floor(unit.y);
        el.style.setProperty('--face', unit.facing);

        // Build sprite image
        let spriteUrl;
        if (unit.isEnemy) {
            spriteUrl = `https://puzzle-drops.github.io/TEVE/img/sprites/enemies/${unit.source.enemyId}.png`;
        } else {
            spriteUrl = `https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${unit.source.className}_battle.png`;
        }

        const isAlly = !unit.isEnemy;
        const nameColorClass = isAlly ? 'ally-name' : 'enemy-name';
        const hpFillClass = isAlly ? 'ally' : 'enemy';

        el.innerHTML = `
            <div class="rt-unit-inner">
                <div class="rt-name ${nameColorClass}">${unit.name} Lv.${unit.source.level}</div>
                <div class="rt-bars">
                    <div class="rt-hp-bg"><div class="rt-hp-fill ${hpFillClass}" style="width:100%"></div><div class="rt-shield-fill" style="width:0%;display:none"></div></div>
                </div>
                <div class="rt-buffs"></div>
                <div class="rt-sprite-container">
                    <div class="rt-sprite">
                        <img src="${spriteUrl}" alt="${unit.name}"
                             style="image-rendering: pixelated; transform: scaleX(${unit.isEnemy ? -unit.facing : unit.facing});"
                             draggable="false"
                             onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'font-size:11px;text-align:center;\\'>${unit.name}</div>'">
                    </div>
                    <div class="rt-shadow"></div>
                </div>
            </div>
        `;

        battlefield.appendChild(el);
        unit.el = el;

        // Add click handler for unit info
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.game.uiManager.closeHeroInfo();
            if (unit.isEnemy) {
                this.game.uiManager.showEnemyInfoPopup(unit.source);
            } else {
                this.game.uiManager.showHeroInfoPopup(unit.source);
            }
        });
    }

    // --- Start & Game Loop ---

    start() {
        this.log("Battle started!");
        this.log(`Your party: ${this.party.map(u => u.name).join(', ')}`);

        this.startTime = Date.now();

        // Build battlefield UI
        this.createBattleUI();

        // Position party units
        this.positionUnits(this.party, true);

        // Create DOM elements for party
        this.party.forEach(unit => {
            this.createRealtimeUnitEl(unit);
        });

        // Start timer
        this.startTimerUpdate();

        // Begin the real-time loop
        this._lastFrameTime = performance.now();
        this._animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(timestamp) {
        if (!this.running) return;

        // Calculate delta time in seconds, capped at 100ms
        let dt = (timestamp - this._lastFrameTime) / 1000;
        this._lastFrameTime = timestamp;
        dt = Math.min(dt, 0.1);
        dt *= this.gameSpeed;

        if (this.battlePaused || this.processingWaveTransition) {
            this._animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
            return;
        }

        // Update all living units
        const livingUnits = this.allUnits.filter(u => u.isAlive);
        livingUnits.forEach(unit => {
            this.updateUnit(unit, dt);
        });

        // Update projectiles
        this.updateProjectiles(dt);

        // Tick buffs/debuffs (time-based)
        this.tickBuffsDebuffs(dt);

        // Tick DOTs
        this.tickDOTs(dt);

        // Tick passives (every 2s per unit)
        this.tickPassives(dt);

        // Render unit positions
        this.renderUnits();

        // Check battle end
        if (!this.checkBattleEnd()) {
            this._animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    updateUnit(unit, dt) {
        // Reduce state timer
        if (unit.stateTimer > 0) {
            unit.stateTimer -= dt;
        }

        // Reduce global cooldown
        if (unit.globalCooldown > 0) {
            unit.globalCooldown -= dt;
        }

        // Reduce ability cooldowns
        for (const key in unit.abilityCooldowns) {
            if (unit.abilityCooldowns[key] > 0) {
                unit.abilityCooldowns[key] -= dt;
            }
        }

        // Skip if stunned
        if (unit.debuffs.some(d => d.name === 'Stun' || d.stunned)) {
            unit.animState = 'idle';
            return;
        }

        // Skip if in animation lock
        if (unit.stateTimer > 0 && (unit.animState === 'attacking' || unit.animState === 'casting')) {
            return;
        }

        // Let AI decide what to do
        this.ai.updateUnit(unit, dt);
    }

    // --- Buff/Debuff Time Ticking ---

    tickBuffsDebuffs(dt) {
        this.allUnits.forEach(unit => {
            if (!unit.isAlive) return;

            const wasStunned = unit.debuffs.some(d => d.name === 'Stun' || d.stunned);

            // Tick buff durations
            unit.buffs = unit.buffs.filter(buff => {
                if (buff.duration > 0) {
                    buff.duration -= dt;
                    return buff.duration > 0;
                }
                return buff.duration === -1; // permanent
            });

            // Tick debuff durations
            unit.debuffs = unit.debuffs.filter(debuff => {
                if (debuff.duration > 0) {
                    debuff.duration -= dt;
                    return debuff.duration > 0;
                }
                return debuff.duration === -1; // permanent
            });

            // Update stun visuals if changed
            const isStunned = unit.debuffs.some(d => d.name === 'Stun' || d.stunned);
            if (wasStunned !== isStunned && this.animations) {
                this.animations.updateStunVisuals(unit);
            }
        });
    }

    tickDOTs(dt) {
        this.allUnits.forEach(unit => {
            if (!unit.isAlive) return;

            unit._dotAccumulator += dt;

            // Process DOTs every 1 second
            if (unit._dotAccumulator >= 1) {
                unit._dotAccumulator -= 1;

                // Bleed: 2.5% max HP per second (half of 5% per turn)
                const bleedDebuff = unit.debuffs.find(d => d.name === 'Bleed');
                if (bleedDebuff && unit.isAlive) {
                    const damage = Math.ceil(unit.maxHp * 0.025);
                    const previousHp = unit.currentHp;
                    unit.currentHp = Math.max(0, unit.currentHp - damage);
                    this.log(`${unit.name} bleeds for ${damage} damage!`);
                    if (previousHp > 0 && unit.currentHp <= 0) {
                        this.handleUnitDeath(unit);
                    }
                }

                // Custom dotDamage debuffs: half per second
                unit.debuffs.forEach(debuff => {
                    if (debuff.dotDamage && debuff.name !== 'Bleed' && unit.isAlive) {
                        const damage = Math.floor(debuff.dotDamage / 2);
                        const previousHp = unit.currentHp;
                        unit.currentHp = Math.max(0, unit.currentHp - damage);
                        this.log(`${unit.name} takes ${damage} damage from ${debuff.name}!`);
                        if (previousHp > 0 && unit.currentHp <= 0) {
                            this.handleUnitDeath(unit);
                        }
                    }
                });

                // HP Regen (half per second, blocked by Blight)
                if (unit.isAlive && !unit.debuffs.some(d => d.name === 'Blight')) {
                    const regen = Math.floor((unit.isEnemy ?
                        unit.stats.str * 0.05 :
                        unit.source.hpRegen) / 2);
                    if (regen > 0) {
                        const actualRegen = Math.min(regen, unit.maxHp - unit.currentHp);
                        if (actualRegen > 0) {
                            unit.currentHp += actualRegen;
                        }
                    }
                }
            }
        });
    }

    tickPassives(dt) {
        this.allUnits.forEach(unit => {
            if (!unit.isAlive) return;

            unit._passiveTimer += dt;

            if (unit._passiveTimer >= 2) {
                unit._passiveTimer -= 2;
                this.processPeriodicPassives(unit);
            }
        });
    }

    processPeriodicPassives(unit) {
        // --- Turn-start passives ---

        // Burning Fury
        if (unit.burningFuryPassive) {
            const anyBleed = this.allUnits.some(u =>
                u.isAlive && buffDebuffHelpers.hasDebuff(u, 'Bleed')
            );
            if (anyBleed && !buffDebuffHelpers.hasBuff(unit, 'Increase Attack')) {
                this.applyBuff(unit, 'Increase Attack', (unit.burningFuryDuration || 1) * 2, { damageMultiplier: 1.5 });
                this.log(`${unit.name}'s burning fury ignites!`);
            }
        }

        // Eternal Tide
        if (unit.eternalTidePassive) {
            const allies = this.getParty(unit).filter(a => a && a.isAlive);
            if (allies.length > 0) {
                allies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
                const lowestHpAlly = allies[0];
                const shieldAmount = Math.floor(lowestHpAlly.maxHp * (unit.eternalTideShieldPercent || 0.2));
                this.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: shieldAmount });
                if (lowestHpAlly.debuffs && lowestHpAlly.debuffs.length > 0) {
                    lowestHpAlly.debuffs.shift();
                    this.log(`Eternal tide protects and cleanses ${lowestHpAlly.name}!`);
                } else {
                    this.log(`Eternal tide protects ${lowestHpAlly.name}!`);
                }
            }
        }

        // Tribal Leader
        if (unit.tribalLeaderPassive && unit.auraBuffs) {
            const allies = this.getParty(unit);
            allies.forEach(ally => {
                if (ally.isAlive && ally !== unit) {
                    unit.auraBuffs.forEach(buffName => {
                        if (!ally.buffs.some(b => b.name === buffName)) {
                            this.applyBuff(ally, buffName, (unit.auraDuration || 1) * 2, {});
                        }
                    });
                }
            });
        }

        // Sovereign's Presence
        if (unit.sovereignsPresencePassive) {
            const allies = this.getParty(unit);
            allies.forEach(ally => {
                if (ally.isAlive) {
                    this.applyBuff(ally, 'Immune', (unit.sovereignBuffDuration || 1) * 2, { immunity: true });
                    this.applyBuff(ally, 'Increase Speed', (unit.sovereignBuffDuration || 1) * 2, {});
                }
            });
        }

        // Mirror of Truth
        if (unit.mirrorOfTruthPassive) {
            const canAct = !unit.debuffs.some(d =>
                d.name === 'Stun' || d.stunned || d.name === 'Silence' || d.name === 'Taunt'
            );
            if (canAct) {
                const enemyBuffNames = new Set();
                const enemies = this.getEnemies(unit);
                enemies.forEach(enemy => {
                    if (enemy.isAlive) {
                        buffDebuffHelpers.getBuffs(enemy).forEach(buff => {
                            if (buff.name !== 'Boss') enemyBuffNames.add(buff.name);
                        });
                    }
                });
                enemyBuffNames.forEach(buffName => {
                    if (!buffDebuffHelpers.hasBuff(unit, buffName)) {
                        if (buffName === 'Shield') {
                            this.applyBuff(unit, buffName, -1, { shieldAmount: 50 });
                        } else if (buffName === 'Increase Attack') {
                            this.applyBuff(unit, buffName, 2, { damageMultiplier: 1.5 });
                        } else {
                            this.applyBuff(unit, buffName, 2, {});
                        }
                    }
                });
                if (enemyBuffNames.size > 0) {
                    this.log(`${unit.name}'s mirror reflects enemy power!`);
                }
            }
        }

        // Twilight's End
        if (unit.twilightsEndPending) {
            const canCast = !unit.isDead && !unit.debuffs.some(d =>
                d.name === 'Stun' || d.stunned || d.name === 'Taunt' || d.name === 'Silence'
            );
            if (canCast) {
                unit.twilightsEndPending = false;
                this.log(`${unit.name} unleashes Twilight's End!`);
                const twilightAbility = unit.abilities.find(a => a.id === 'twilights_promise');
                const spellLevel = twilightAbility ? twilightAbility.level : 1;
                if (spellManager && spellManager.getSpell) {
                    const spell = spellManager.getSpell('twilights_promise');
                    if (spell) {
                        spellLogic.twilightsEndLogic(this, unit, 'all', spell, spellLevel);
                    }
                }
            } else {
                unit.twilightsEndPending = false;
            }
        }

        // --- Turn-end passives ---

        // Champion Female shield regen
        if (unit.shieldRegenTimer !== undefined && unit.shieldRegenAmount) {
            const shieldPercent = unit.shieldRegenAmount / unit.maxHp;
            this.processShieldRegeneration(unit, shieldPercent, unit.shieldRegenTurns, 'shield regenerates');
        }

        // Reinforced Plating
        if (unit.reinforcedPlatingPassive && unit.shieldRegenPercent) {
            this.processShieldRegeneration(unit, unit.shieldRegenPercent, unit.shieldRegenTurns, 'reinforced plating');
        }

        // Ancestral Vigor
        if (unit.ancestralVigorRegen && unit.ancestralVigorDuration) {
            this.processHealingOverTime(unit, 'ancestralVigorDuration', 'ancestralVigorRegen', 'Ancestral Vigor');
        }

        // Tribal Chant
        if (unit.tribalChantRegen && unit.tribalChantDuration) {
            this.processHealingOverTime(unit, 'tribalChantDuration', 'tribalChantRegen', 'Tribal Chant');
        }

        // Regenerative Roots
        if (unit.regenerativeRootsPassive && unit.isAlive) {
            const hpPercent = unit.currentHp / unit.maxHp;
            if (hpPercent < unit.regenHpThreshold && !unit.debuffs.some(d => d.name === 'Blight')) {
                const healAmount = Math.floor(unit.maxHp * unit.regenHealPercent);
                const actualHeal = Math.min(healAmount, unit.maxHp - unit.currentHp);
                if (actualHeal > 0) {
                    unit.currentHp += actualHeal;
                    this.log(`${unit.name}'s regenerative roots heal ${actualHeal} HP.`);
                }
            }
        }

        // Lord's Presence
        if (unit.lordsPresencePassive) {
            const allies = this.getParty(unit);
            allies.forEach(ally => {
                if (ally.isAlive) {
                    this.applyBuff(ally, 'Increase Attack', (unit.lordsPresenceBuffDuration || 1) * 2, { damageMultiplier: 1.5 });
                }
            });
        }

        // Mirror Image dodge tracking
        if (unit.mirrorImageDodge && unit.mirrorImageDuration !== undefined) {
            unit.mirrorImageDuration--;
            if (unit.mirrorImageDuration <= 0) {
                unit.dodgePhysical = (unit.dodgePhysical || 0) - 0.5;
                unit.mirrorImageDodge = false;
                unit.mirrorImageDuration = undefined;
                this.log(`${unit.name}'s mirror images fade away.`);
            }
        }

        // Smoke and Mirrors dodge tracking
        if (unit.smokeAndMirrorsDodge && unit.smokeAndMirrorsDuration !== undefined) {
            unit.smokeAndMirrorsDuration--;
            if (unit.smokeAndMirrorsDuration <= 0) {
                unit.dodgePhysical = (unit.dodgePhysical || 0) - 0.5;
                unit.dodgeMagical = (unit.dodgeMagical || 0) - 0.5;
                unit.smokeAndMirrorsDodge = false;
                unit.smokeAndMirrorsDuration = undefined;
                this.log(`${unit.name}'s illusions disappear.`);
            }
        }

        // Hydra's Command
        if (unit.hydrasCommandPassive && unit.isAlive) {
            const allies = this.getParty(unit).filter(a => a && a.isAlive && a !== unit);
            if (allies.length > 0) {
                const randomAlly = allies[Math.floor(Math.random() * allies.length)];
                let firstAbilityIndex = -1;
                for (let i = 0; i < randomAlly.abilities.length; i++) {
                    if (randomAlly.abilities[i] && !randomAlly.abilities[i].passive) {
                        firstAbilityIndex = i;
                        break;
                    }
                }
                if (firstAbilityIndex >= 0) {
                    const aliveEnemies = this.getEnemies(randomAlly).filter(e => e && e.isAlive);
                    if (aliveEnemies.length > 0) {
                        const randomTarget = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
                        this.log(`Hydra commands ${randomAlly.name} to attack!`);
                        this.executeAbility(randomAlly, firstAbilityIndex, randomTarget);
                    }
                }
            }
        }
    }

    processShieldRegeneration(unit, shieldPercent, regenTurns, passiveName) {
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

    // --- Projectiles ---

    updateProjectiles(dt) {
        this.projectiles = this.projectiles.filter(proj => {
            proj.elapsed += dt;
            const t = Math.min(proj.elapsed / proj.duration, 1);

            // Lerp position
            const x = proj.startX + (proj.endX - proj.startX) * t;
            const y = proj.startY + (proj.endY - proj.startY) * t;

            if (proj.el) {
                proj.el.style.left = x + 'px';
                proj.el.style.top = y + 'px';
            }

            if (t >= 1) {
                // Arrived — apply damage
                if (proj.el) proj.el.remove();
                if (proj.onArrive) proj.onArrive();
                return false;
            }
            return true;
        });
    }

    createProjectile(fromUnit, toUnit, onArrive) {
        const battlefield = document.getElementById('realtimeBattlefield');
        if (!battlefield) {
            onArrive();
            return;
        }

        const el = document.createElement('div');
        el.className = 'rt-projectile';
        el.style.position = 'absolute';
        el.style.left = fromUnit.x + 'px';
        el.style.top = fromUnit.y + 'px';
        battlefield.appendChild(el);

        this.projectiles.push({
            el: el,
            startX: fromUnit.x, startY: fromUnit.y,
            endX: toUnit.x, endY: toUnit.y,
            elapsed: 0,
            duration: 0.3,
            onArrive: onArrive
        });
    }

    // --- Rendering ---

    renderUnits() {
        this.allUnits.forEach(unit => {
            if (!unit.el) return;

            if (unit.isDead) {
                if (unit.animState !== 'dead') {
                    unit.animState = 'dead';
                    unit.el.classList.add('rt-dead');
                }
                return;
            }

            // Position (always update — units move every frame)
            unit.el.style.left = unit.x + 'px';
            unit.el.style.top = unit.y + 'px';
            unit.el.style.zIndex = Math.floor(unit.y);

            // Sprite flip — only update when facing changes
            // Enemy sprites are pre-mirrored (already face left), so invert their flip
            if (unit._lastFacing !== unit.facing) {
                unit._lastFacing = unit.facing;
                if (!unit._spriteImg) unit._spriteImg = unit.el.querySelector('.rt-sprite img');
                const flipValue = unit.isEnemy ? -unit.facing : unit.facing;
                if (unit._spriteImg) unit._spriteImg.style.transform = `scaleX(${flipValue})`;
            }

            // Animation state class — only update when state changes
            if (unit._lastAnimState !== unit.animState) {
                unit._lastAnimState = unit.animState;
                unit.el.className = `rt-unit rt-${unit.animState}`;
            }

            // HP bar — only update when HP or shield changes
            const shield = unit.currentShield;
            const hpKey = `${unit.currentHp}|${shield}`;
            if (unit._lastHpKey !== hpKey) {
                unit._lastHpKey = hpKey;

                if (!unit._hpFill) unit._hpFill = unit.el.querySelector('.rt-hp-fill');
                if (!unit._shieldFill) unit._shieldFill = unit.el.querySelector('.rt-shield-fill');

                const hpFill = unit._hpFill;
                const shieldFill = unit._shieldFill;

                if (hpFill) {
                    const totalMax = unit.maxHp + shield;
                    const hpPercent = (unit.currentHp / totalMax) * 100;
                    hpFill.style.width = hpPercent + '%';

                    const hpOfMax = (unit.currentHp / unit.maxHp) * 100;
                    if (hpOfMax > 60) {
                        hpFill.style.background = 'linear-gradient(90deg, #00ff88, #00cc66)';
                    } else if (hpOfMax > 30) {
                        hpFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff8800)';
                    } else {
                        hpFill.style.background = 'linear-gradient(90deg, #ff4444, #cc0000)';
                    }

                    if (shieldFill) {
                        if (shield > 0) {
                            shieldFill.style.display = 'block';
                            shieldFill.style.width = (shield / totalMax * 100) + '%';
                            shieldFill.style.left = hpPercent + '%';
                        } else {
                            shieldFill.style.display = 'none';
                        }
                    }
                }
            }

            // Buff/debuff icons (already diff-checked inside)
            this.renderBuffDebuffIcons(unit);
        });
    }

    renderBuffDebuffIcons(unit) {
        const container = unit.el.querySelector('.rt-buffs');
        if (!container) return;

        const currentState = JSON.stringify({
            buffs: unit.buffs.map(b => ({ name: b.name, duration: Math.ceil(b.duration), shieldAmount: b.shieldAmount })),
            debuffs: unit.debuffs.map(d => ({ name: d.name, duration: Math.ceil(d.duration) }))
        });

        if (unit._lastBuffDebuffState === currentState) return;
        unit._lastBuffDebuffState = currentState;

        container.innerHTML = '';
        unit.buffs.forEach(buff => {
            const iconName = this.getBuffIconName(buff.name);
            const div = document.createElement('div');
            div.className = 'rt-buff-icon';
            div.innerHTML = `<img src="https://puzzle-drops.github.io/TEVE/img/buffs/${iconName}.png" alt="${buff.name}" onerror="this.style.display='none'">`;
            container.appendChild(div);
        });
        unit.debuffs.forEach(debuff => {
            const iconName = this.getDebuffIconName(debuff.name);
            const div = document.createElement('div');
            div.className = 'rt-debuff-icon';
            div.innerHTML = `<img src="https://puzzle-drops.github.io/TEVE/img/buffs/${iconName}.png" alt="${debuff.name}" onerror="this.style.display='none'">`;
            container.appendChild(div);
        });
    }

    // --- executeAbility (ported from battle.js) ---

    executeAbility(caster, abilityIndex, target) {
        const ability = caster.abilities[abilityIndex];
        if (!ability) return;

        const spell = spellManager.getSpell(ability.id);
        if (!spell) return;

        // Set currentUnit for spell compatibility
        this.currentUnit = caster;
        caster.lastAbilityUsed = ability.id;

        // Set cooldowns (real-time)
        if (ability.cooldown > 0) {
            caster.abilityCooldowns[abilityIndex] = ability.cooldown * 2; // turns → seconds
        }
        caster.globalCooldown = 1 / caster.attackSpeed;

        // Animation lock
        caster.animState = 'attacking';
        caster.stateTimer = 0.4;

        // Grand Templar Male passive stun chance
        if (caster.grandTemplarMalePassive && caster.globalStunChance && target && target !== 'all' && target.isAlive) {
            if (Math.random() < caster.globalStunChance) {
                this.applyDebuff(target, 'Stun', 2, { stunned: true }); // 1 turn = 2s
                this.log(`${caster.name}'s mastery stuns ${target.name}!`);
            }
        }

        // Show spell animation
        if (this.animations) {
            this.animations.showSpellAnimation(caster, ability.name, spell.effects, ability.id);
        }

        // Execute spell logic
        if (spellLogic[spell.logicKey]) {
            try {
                const spellLevel = ability.level || caster.spellLevel || 1;

                // Fire Dance AoE
                if (caster.nextAttackIsAoE && (spell.effects.includes('physical') || spell.effects.includes('magical'))) {
                    caster.nextAttackIsAoE = false;
                    this.log(`${caster.name}'s fire dance spreads the attack to all enemies!`);
                    this.getEnemies(caster).forEach(enemy => {
                        if (enemy.isAlive) {
                            spellLogic[spell.logicKey](this, caster, enemy, spell, spellLevel);
                        }
                    });
                } else {
                    spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
                }

                // Whirling Step double attack
                if (caster.nextAttackHitsTwice && spell.effects.includes('physical')) {
                    caster.nextAttackHitsTwice = false;
                    this.log(`${caster.name}'s whirling momentum grants a second strike!`);
                    spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
                }
            } catch (error) {
                console.error(`Error executing ${ability.name}:`, error);
                this.log(`${caster.name} failed to use ${ability.name}!`);
            }
        }

        // Alpha's Call passive
        if (caster.alphasCallPassive && !ability.passive && (spell.effects.includes('physical') || spell.effects.includes('magical'))) {
            const allies = this.getParty(caster);
            const hasSpeedBuff = allies.some(ally =>
                ally.isAlive && ally.buffs && ally.buffs.some(b => b.name === 'Increase Speed')
            );
            if (hasSpeedBuff) {
                this.applyBuff(caster, 'Increase Attack', (caster.alphasCallBuffDuration || 2) * 2, { damageMultiplier: 1.5 });
                this.log(`${caster.name}'s alpha leadership inspires greater strength!`);
            }
        }

        // Blade Mastery passive
        if (caster.bladeMasteryPassive && !ability.passive && spell.effects.includes('physical')) {
            if (Math.random() < (caster.bladeMasteryExtraAttackChance || 0.3)) {
                this.log(`${caster.name}'s blade mastery grants an extra strike!`);
                if (target && target !== 'all' && target.isAlive) {
                    try {
                        const spellLevel = ability.level || caster.spellLevel || 1;
                        spellLogic[spell.logicKey](this, caster, target, spell, spellLevel);
                    } catch (error) {
                        console.error(`Error executing blade mastery extra attack:`, error);
                    }
                }
            }
        }

        // Clear currentUnit
        this.currentUnit = null;
    }

    // --- Damage Pipeline (ported verbatim from battle.js) ---

    dealDamage(attacker, target, amount, damageType = 'physical', options = {}) {
        if (!target.isAlive) return 0;

        let damage = Math.round(amount);

        // Damage calculation modifiers
        if (attacker.onDamageCalculation) {
            attacker.onDamageCalculation.forEach(calc => {
                if (calc.type === 'executioner' && (target.currentHp / target.maxHp) < calc.hpThreshold) {
                    damage *= calc.damageBonus;
                } else if (calc.type === 'missing_hp_damage' && attacker.savageMomentumPassive) {
                    const missingHpPercent = 1 - (attacker.currentHp / attacker.maxHp);
                    damage *= 1 + (missingHpPercent * calc.maxBonus);
                } else if (calc.type === 'blade_mastery' && attacker.buffs.some(b => b.name === 'Increase Speed')) {
                    damage *= calc.damageBonus;
                }
            });
        }

        // Dodge checks
        const isMarked = target.debuffs.some(d => d.name === 'Mark');
        const isPurgeSlashAgainstSilenced = attacker.professionalWitcherFemalePassive &&
            attacker.lastAbilityUsed === 'purge_slash' &&
            target.debuffs.some(d => d.name === 'Silence');

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
                if (this.animations) this.animations.showDodgeAnimation(target);
                return 0;
            }
        }

        // Attacker buff damage modifiers
        attacker.buffs.forEach(buff => {
            if (buff.name === 'Increase Attack' || buff.damageMultiplier) {
                damage *= 1.5;
            }
        });

        // Commander's Presence
        const allies = this.getParty(attacker);
        const commanderAlly = allies.find(ally => ally.isAlive && ally.commandersPresencePassive);
        if (commanderAlly && allies.some(ally => ally.isAlive && ally.buffs.length > 0)) {
            damage *= (1 + commanderAlly.commandersAttackBonus);
        }

        // Hunter's Focus
        if (attacker.huntersFocusActive) {
            damage *= 2;
            attacker.huntersFocusActive = false;
            this.log(`${attacker.name}'s focused shot deals double damage!`);
        }

        // Predator's Instinct
        if (attacker.predatorsInstinctPassive && target.isAlive) {
            const targetHpPercent = target.currentHp / target.maxHp;
            if (targetHpPercent < attacker.predatorsHpThreshold) {
                damage *= attacker.predatorsDamageBonus;
                this.log(`${attacker.name}'s predator instincts trigger!`);
            }
        }

        // Cinder Lord magical bonus
        if (damageType === 'magical' && attacker.magicalDamageBonus) {
            damage *= (1 + attacker.magicalDamageBonus);
        }

        // Warmaster
        if (attacker.debuffs.some(d => d.name === 'Bleed')) {
            const warmasterAlly = this.getParty(attacker).find(ally => ally.isAlive && ally.warmasterPassive);
            if (warmasterAlly) {
                damage *= 1.25;
                if (!attacker._warmasterBonusLogged) {
                    this.log(`${attacker.name} gains Warmaster's fury!`);
                    attacker._warmasterBonusLogged = true;
                }
            }
        }

        // Reduce Defense / Increase Defense
        const hasReduceDefense = target.debuffs.some(d => d.name === 'Reduce Defense');
        const hasIncreaseDefense = target.buffs.some(b => b.name === 'Increase Defense');
        const hasFrostArmor = target.buffs.some(b => b.name === 'Frost Armor');

        if (hasReduceDefense) damage = Math.round(damage * 1.25);
        if (hasIncreaseDefense) damage = Math.round(damage * 0.75);
        if (hasFrostArmor) damage = Math.round(damage * 0.75);

        // DR
        if (damageType !== 'pure') {
            if (damageType === 'physical') {
                let physicalDR = target.physicalDamageReduction;
                if (options && options.armorPierce) physicalDR *= (1 - options.armorPierce);
                if (hasReduceDefense) physicalDR = Math.max(0, physicalDR - 0.25);
                if (hasIncreaseDefense) physicalDR = Math.min(0.9, physicalDR + 0.25);
                damage = damage * (1 - physicalDR);
            } else if (damageType === 'magical') {
                let magicalDR = target.magicDamageReduction;
                if (hasReduceDefense) magicalDR = Math.max(0, magicalDR - 0.25);
                if (hasIncreaseDefense) magicalDR = Math.min(0.5, magicalDR + 0.25);
                damage = damage * (1 - magicalDR);
            }
        }

        // Shields
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
                if (target.moltenShieldActive) {
                    target.moltenShieldActive = false;
                    target.moltenShieldDamage = null;
                }
                // Oceanic Resilience
                const oceanicAlly = this.getParty(target).find(ally => ally.isAlive && ally.oceanicResiliencePassive);
                if (oceanicAlly) {
                    this.applyBuff(target, 'Increase Defense', (oceanicAlly.oceanicResilienceBuffDuration || 2) * 2, {});
                    this.log(`${target.name} gains defense from oceanic resilience!`);
                }
            }
        }

        // Remaining damage reduction from buffs
        target.buffs.forEach(buff => {
            if (buff.damageReduction) damage *= (1 - buff.damageReduction);
        });

        // Damage increase from debuffs
        target.debuffs.forEach(debuff => {
            if (debuff.damageTakenMultiplier) damage *= debuff.damageTakenMultiplier;
        });

        // Mark
        if (target.debuffs.some(d => d.name === 'Mark')) damage *= 1.25;

        // Reduce Attack
        attacker.debuffs.forEach(debuff => {
            if (debuff.name === 'Reduce Attack') damage *= 0.5;
        });

        // Passive DR (skip for pure)
        if (damageType !== 'pure') {
            if (target.damageReduction) damage *= (1 - target.damageReduction);
            if (target.globalDamageReduction) damage *= (1 - target.globalDamageReduction);
        }

        // DEAL THE DAMAGE
        damage = Math.round(damage);
        const previousHp = target.currentHp;
        target.currentHp = Math.max(0, target.currentHp - damage);
        const actualDamage = previousHp - target.currentHp;

        // Track stats
        this.trackBattleStat(attacker.name, 'damageDealt', actualDamage);
        this.trackBattleStat(target.name, 'damageTaken', actualDamage);

        // --- AFTER DAMAGE TAKEN EFFECTS ---

        // Acidic Body
        if (target.acidicBodyReflect && shieldDamageAbsorbed > 0 && attacker.isAlive) {
            const reflectDamage = Math.floor(shieldDamageAbsorbed * target.acidicBodyReflect);
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage);
            this.log(`${attacker.name} takes ${reflectDamage} acidic damage from hitting the shield!`);
            if (attacker.currentHp <= 0 && !attacker.isDead) this.handleUnitDeath(attacker, target);
        }

        // Toxic Blood
        if (target.toxicBloodPassive && target.isAlive && actualDamage > 0) {
            if (Math.random() < (target.toxicBloodChance || 0.3)) {
                this.applyDebuff(attacker, 'Blight', (target.toxicBloodDuration || 2) * 2, { noHeal: true });
                this.log(`${attacker.name} is infected by toxic blood!`);
            }
        }

        // Burning Wounds
        if (target.burningWoundsPassive && target.isAlive && actualDamage > 0 && attacker.isAlive) {
            if (Math.random() < (target.burningWoundsChance || 0.3)) {
                this.applyDebuff(attacker, 'Bleed', (target.burningWoundsBleedDuration || 1) * 2, {});
                this.log(`${attacker.name} starts bleeding from ${target.name}'s burning wounds!`);
            }
        }

        // Runemaster Female
        if (target.runemasterFemalePassive && target.isAlive && actualDamage > 0 && damageType === 'magical' && !target.isDead) {
            let spell1Index = -1;
            for (let i = 0; i < target.abilities.length; i++) {
                if (target.abilities[i] && !target.abilities[i].passive) { spell1Index = i; break; }
            }
            if (spell1Index >= 0) {
                const enemies = this.getEnemies(target).filter(e => e && e.isAlive);
                if (enemies.length > 0) {
                    const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                    const retAbility = target.abilities[spell1Index];
                    const retSpell = spellManager.getSpell(retAbility.id);
                    if (retSpell && spellLogic[retSpell.logicKey]) {
                        const retSpellLevel = retAbility.level || target.spellLevel || 1;
                        this.log(`${target.name}'s Nature's Revenge triggers ${retAbility.name}!`);
                        if (this.animations) this.animations.showSpellAnimation(target, retAbility.name, retSpell.effects);
                        try { spellLogic[retSpell.logicKey](this, target, randomEnemy, retSpell, retSpellLevel); } catch (e) {}
                    }
                }
            }
        }

        // On-hit effects
        if (attacker.onHitEffects && target.isAlive) {
            attacker.onHitEffects.forEach(effect => {
                if (effect.type === 'debuff' && Math.random() < effect.chance) {
                    this.applyDebuff(target, effect.debuffName, effect.duration * 2, {});
                }
            });
        }

        // Rotting Presence
        if (attacker.rottingPresencePassive && target.isAlive && actualDamage > 0) {
            this.applyDebuff(target, 'Blight', (attacker.rottingPresenceBlightDuration || 1) * 2, { noHeal: true });
        }

        // Stalker's Mark
        if (attacker.stalkersMarkPassive && target.isAlive && actualDamage > 0) {
            this.applyDebuff(target, 'Mark', (attacker.markDuration || 1) * 2, {});
        }

        // On-damage-taken effects
        if (target.onDamageTaken && target.isAlive && damage > 0) {
            target.onDamageTaken.forEach(effect => {
                if (effect.type === 'buff') {
                    if (effect.buffName === 'Increase Attack' && target.packFuryApplied) {
                        this.log(`${target.name}'s Pack Fury activates!`);
                    }
                    this.applyBuff(target, effect.buffName, effect.duration * 2, effect.buffEffects || {});
                } else if (effect.type === 'stun_counter' && Math.random() < effect.chance) {
                    this.applyDebuff(attacker, 'Stun', effect.duration * 2, { stunned: true });
                    this.log(`${target.name} stuns ${attacker.name} with a counter!`);
                } else if (effect.type === 'grant_speed_to_ally' && target.eyeOfTheStormPassive) {
                    const allies2 = this.getParty(target).filter(a => a && a.isAlive && a !== target);
                    if (allies2.length > 0) {
                        const randomAlly = allies2[Math.floor(Math.random() * allies2.length)];
                        this.applyBuff(randomAlly, 'Increase Speed', (target.eyeOfTheStormDuration || 1) * 2, {});
                        this.log(`Storm's eye grants ${randomAlly.name} speed!`);
                    }
                } else if (effect.type === 'frozen_heart_defense' && damageType === 'magical') {
                    this.applyBuff(target, 'Increase Defense', (effect.duration || 1) * 2, {});
                    this.log(`${target.name}'s frozen heart grants defense against magic!`);
                }
            });
        }

        // Demolition Expert
        if (target.demolitionExpertPassive && target.isAlive && actualDamage > 0) {
            if (!target.debuffs || target.debuffs.length === 0) {
                const retaliationDamage = actualDamage * 0.3;
                this.getEnemies(target).forEach(enemy => {
                    if (enemy.isAlive && enemy !== attacker) {
                        enemy.currentHp = Math.max(0, enemy.currentHp - retaliationDamage);
                        this.log(`${target.name}'s demolition expertise deals ${Math.floor(retaliationDamage)} damage to ${enemy.name}!`);
                        if (enemy.currentHp <= 0 && !enemy.isDead) this.handleUnitDeath(enemy, target);
                    }
                });
                if (attacker.isAlive) {
                    attacker.currentHp = Math.max(0, attacker.currentHp - retaliationDamage);
                    this.log(`${target.name}'s demolition expertise deals ${Math.floor(retaliationDamage)} damage to ${attacker.name}!`);
                    if (attacker.currentHp <= 0 && !attacker.isDead) this.handleUnitDeath(attacker, target);
                }
            }
        }

        // Avenger Female action bar gain → cooldown reduction in real-time
        if (target.actionBarGainOnDamage && target.isAlive && damage > 0) {
            // Reduce global cooldown proportionally
            target.globalCooldown = Math.max(0, target.globalCooldown - target.actionBarGainOnDamage * 2);
        }

        // Avenger Male blight on taunted attack
        if (target.avengerBlightOnTauntedAttack && target.isAlive && damage > 0) {
            const attackerTaunt = attacker.debuffs.find(d => d.name === 'Taunt' && d.tauntTarget === target);
            if (attackerTaunt) {
                this.applyDebuff(attacker, 'Blight', (target.avengerBlightDuration || 2) * 2, { noHeal: true });
                this.log(`${attacker.name} is blighted by ${target.name}'s vengeance!`);
            }
        }

        // Corrosive Splash
        if (target.corrosiveSplashPassive && target.isAlive && damage > 0) {
            if (Math.random() < target.corrosiveSplashChance) {
                this.applyDebuff(attacker, 'Reduce Attack', target.corrosiveSplashDuration * 2, {});
                this.log(`${attacker.name} is weakened by ${target.name}'s corrosive splash!`);
            }
        }

        // Nature's Vengeance
        if (target.naturesVengeancePassive && target.isAlive && damage > 0 && attacker.isAlive) {
            if (Math.random() < target.naturesVengeanceChance) {
                this.applyDebuff(attacker, 'Reduce Speed', target.naturesVengeanceDuration * 2, {});
                this.log(`${attacker.name} is slowed by ${target.name}'s nature's vengeance!`);
            }
        }

        // Frost Armor retaliation
        if (target.isAlive && damage > 0 && hasFrostArmor) {
            const existingSlowDebuff = attacker.debuffs.find(d => d.name === 'Reduce Speed');
            if (existingSlowDebuff) {
                existingSlowDebuff.duration += 2;
            } else {
                this.applyDebuff(attacker, 'Reduce Speed', 2, {});
            }
            this.log(`${target.name}'s Frost Armor slows ${attacker.name}!`);
        }

        // Hellfire Aura
        if (target.hellfireAuraPassive && target.isAlive && damage > 0 && attacker.isAlive) {
            const retDmg = target.hellfireRetaliationDamage || 50;
            attacker.currentHp = Math.max(0, attacker.currentHp - retDmg);
            this.log(`${attacker.name} takes ${retDmg} hellfire damage!`);
            this.applyDebuff(attacker, 'Reduce Speed', (target.hellfireSlowDuration || 1) * 2, {});
            if (attacker.currentHp <= 0 && !attacker.isDead) this.handleUnitDeath(attacker, target);
        }

        // Burning Aura retaliation
        if (target.burningAuraPassive && target.isAlive && damage > 0 && attacker.isAlive) {
            if (Math.random() < (target.burningAuraProcChance || 0.3)) {
                const retDmg = target.burningAuraRetaliationDamage || 50;
                attacker.currentHp = Math.max(0, attacker.currentHp - retDmg);
                this.log(`${attacker.name} takes ${retDmg} burning damage!`);
                this.applyDebuff(attacker, 'Reduce Attack', (target.burningAuraDebuffDuration || 1) * 2, {});
                if (attacker.currentHp <= 0 && !attacker.isDead) this.handleUnitDeath(attacker, target);
            }
        }

        // Molten Shield
        if (target.moltenShieldActive && target.isAlive && damage > 0 && attacker.isAlive) {
            const retDmg = target.moltenShieldDamage || 75;
            attacker.currentHp = Math.max(0, attacker.currentHp - retDmg);
            this.log(`${attacker.name} takes ${retDmg} molten damage from hitting the shield!`);
            if (attacker.currentHp <= 0 && !attacker.isDead) this.handleUnitDeath(attacker, target);
        }

        // Burning Aura bleed on attack
        if (attacker.burningAuraPassive && attacker.isAlive && damage > 0 && target.isAlive) {
            if (Math.random() < (attacker.burningAuraChance || 0.3)) {
                this.applyDebuff(target, 'Bleed', (attacker.burningAuraBleedDuration || 1) * 2, {});
                this.log(`${target.name} starts bleeding from ${attacker.name}'s burning aura!`);
            }
        }

        // From Ashes
        if (target.fromAshesReady && !target.fromAshesTriggered && target.isAlive &&
            (target.currentHp / target.maxHp) <= (target.fromAshesThreshold || 0.25)) {
            target.fromAshesTriggered = true;
            const healPercent = target.fromAshesHealPercent || 0.25;
            this.getParty(target).forEach(ally => {
                if (ally.isAlive) {
                    this.healUnit(ally, Math.floor(ally.maxHp * healPercent));
                }
            });
            this.log(`${target.name} rises from near death, healing all allies!`);
        }

        this.log(`${attacker.name} deals ${damage} ${damageType} damage to ${target.name}!`);

        // Damage animation
        if (this.animations) this.animations.showDamageAnimation(attacker, target, damage, damageType);

        // Death check
        if (previousHp > 0 && target.currentHp <= 0) {
            this.handleUnitDeath(target, attacker);
        }

        return actualDamage;
    }

    // --- handleUnitDeath (ported from battle.js) ---

    handleUnitDeath(unit, killer = null) {
        if (unit.isDead) return;

        // Undying Will
        if (unit.undyingWillPassive && !unit.undyingWillUsed) {
            unit.undyingWillUsed = true;
            unit.currentHp = Math.floor(unit.maxHp * unit.undyingWillHealPercent);
            this.log(`${unit.name}'s undying will prevents death! Healed to ${unit.currentHp} HP!`);
            return;
        }

        unit.isDead = true;
        unit.animState = 'dying';
        unit.stateTimer = 0.5;
        this.trackBattleStat(unit.name, 'deaths', 1);

        if (killer && killer.isAlive) {
            this.trackBattleStat(killer.name, 'kills', 1);

            // Queen's Lament
            this.allUnits.forEach(otherUnit => {
                if (otherUnit.isAlive && otherUnit.queensLamentPassive) {
                    this.healUnit(otherUnit, Math.floor(otherUnit.maxHp * otherUnit.queensLamentHealPercent));
                    this.applyBuff(otherUnit, 'Increase Attack', otherUnit.queensLamentBuffDuration * 2, { damageMultiplier: 1.5 });
                    this.log(`${otherUnit.name} gains power from ${unit.name}'s death!`);
                }
            });

            // Shatter
            if (unit.shatterPassive && unit.shatterDamage) {
                this.getEnemies(unit).forEach(enemy => {
                    if (enemy.isAlive) {
                        enemy.currentHp = Math.max(0, enemy.currentHp - unit.shatterDamage);
                        this.log(`${enemy.name} takes ${unit.shatterDamage} damage from shatter!`);
                        if (unit.shatterSlowDuration) this.applyDebuff(enemy, 'Reduce Speed', unit.shatterSlowDuration * 2, {});
                        if (enemy.currentHp <= 0 && !enemy.isDead) this.handleUnitDeath(enemy, unit);
                    }
                });
                this.log(`${unit.name} shatters on death!`);
            }

            // Shattered Reflection
            if (unit.shatteredReflectionPassive && unit.shatteredReflectionImmuneDuration) {
                spellHelpers.forEachAliveAlly(this, unit, ally => {
                    this.applyBuff(ally, 'Immune', unit.shatteredReflectionImmuneDuration * 2, { immunity: true });
                });
                this.log(`${unit.name}'s shattered reflection protects all allies!`);
            }

            // Corpse Bloat
            if (unit.corpseBloatPassive && unit.corpseBloatBlightDuration) {
                this.getEnemies(unit).forEach(enemy => {
                    if (enemy.isAlive) {
                        this.applyDebuff(enemy, 'Blight', unit.corpseBloatBlightDuration * 2, { noHeal: true });
                    }
                });
                this.log(`${unit.name}'s corpse explodes with disease!`);
            }

            // Death's Domain
            this.allUnits.forEach(otherUnit => {
                if (otherUnit.isAlive && otherUnit.deathsDomainPassive) {
                    const shieldPercent = otherUnit.deathsDomainShieldPercent || 0.2;
                    this.applyBuff(otherUnit, 'Shield', -1, { shieldAmount: Math.floor(otherUnit.maxHp * shieldPercent) });
                    this.applyBuff(otherUnit, 'Increase Speed', (otherUnit.deathsDomainSpeedDuration || 2) * 2, {});
                    this.log(`${otherUnit.name} gains power from death itself!`);
                }
            });

            // Hivemind
            if (!unit.isEnemy) {
                this.party.forEach(ally => {
                    if (ally.isAlive && ally.hivemindPassive) {
                        this.healUnit(ally, Math.floor(ally.maxHp * (ally.hivemindHealPercent || 0.2)));
                        this.applyBuff(ally, 'Increase Attack', (ally.hivemindBuffDuration || 2) * 2, { damageMultiplier: 1.5 });
                        this.log(`${ally.name}'s hivemind grows stronger from ${unit.name}'s death!`);
                    }
                });
            }

            // On-kill effects
            if (killer.onKillEffects) {
                killer.onKillEffects.forEach(effect => {
                    if (effect.type === 'buff') {
                        this.applyBuff(killer, effect.buffName, effect.duration * 2, {});
                        this.log(`${killer.name} gains ${effect.buffName} from the kill!`);
                    }
                });
            }

            // Phantom Assassin Male
            if (killer.phantomAssassinMalePassive && killer.actionBarRefillOnKill) {
                if (killer.lastAbilityUsed === 'assassinate') {
                    killer.globalCooldown = 0; // instant next attack
                    this.log(`${killer.name}'s cooldown resets!`);
                }
            }

            // Dark Arch Templar Male
            if (killer.darkArchTemplarMalePassive && unit.debuffs.length > 0) {
                const enemies = killer.isEnemy ? this.party.filter(p => p && p.isAlive) : this.enemies.filter(e => e && e.isAlive);
                if (enemies.length > 0) {
                    [...unit.debuffs].forEach(debuff => {
                        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                        this.applyDebuff(randomEnemy, debuff.name, debuff.duration, { ...debuff });
                    });
                    this.log(`${unit.name}'s debuffs spread to the enemy team!`);
                }
            }
        }

        // Remove taunts from this unit
        this.allUnits.forEach(otherUnit => {
            if (otherUnit.isAlive) {
                otherUnit.debuffs = otherUnit.debuffs.filter(debuff => {
                    if (debuff.name === 'Taunt' && debuff.tauntTarget === unit) {
                        this.log(`${otherUnit.name}'s taunt ends as ${unit.name} has fallen!`);
                        return false;
                    }
                    return true;
                });
            }
        });

        // Death animation on the rt-unit element
        if (unit.el) {
            unit.el.classList.add('rt-dying');
            setTimeout(() => {
                if (unit.el) unit.el.classList.add('rt-dead');
            }, 500);
        }
    }

    // --- Heal, Buff, Debuff (ported from battle.js with duration × 2) ---

    healUnit(target, amount) {
        if (!target.isAlive) return 0;
        if (target.debuffs.some(d => d.name === 'Blight')) {
            this.log(`${target.name} cannot be healed due to Blight!`);
            return 0;
        }

        let heal = Math.floor(amount);
        if (target.healingReceived) heal *= target.healingReceived;
        heal = Math.floor(heal);
        const actualHeal = Math.min(heal, target.maxHp - target.currentHp);
        const overheal = heal - actualHeal;
        target.currentHp += actualHeal;

        if (this.currentUnit && this.currentUnit.isAlive) {
            this.trackBattleStat(this.currentUnit.name, 'healingDone', actualHeal);
        }

        // Prophet Male overheal spillover
        if (overheal > 0) {
            const healer = this.currentUnit;
            if (healer && healer.prophetMalePassive && healer.overhealingSpillover) {
                const allies2 = this.getParty(healer).filter(a => a && a.isAlive && a !== target);
                if (allies2.length > 0) {
                    allies2.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
                    const nextTarget = allies2[0];
                    const spillover = Math.floor(overheal * healer.overhealingSpillover);
                    if (spillover > 0) {
                        const spilloverHeal = Math.min(spillover, nextTarget.maxHp - nextTarget.currentHp);
                        nextTarget.currentHp += spilloverHeal;
                        this.log(`Divine spillover heals ${nextTarget.name} for ${spilloverHeal} HP!`);
                        this.trackBattleStat(healer.name, 'healingDone', spilloverHeal);
                    }
                }
            }
        }

        this.log(`${target.name} is healed for ${actualHeal} HP!`);
        return actualHeal;
    }

    applyBuff(target, buffName, duration, effects) {
        if (!target.isAlive) return;

        if (target.debuffs.some(d => d.name === 'Mark')) {
            this.log(`${target.name} is marked and cannot gain buffs!`);
            return;
        }

        // Convert duration: incoming turn-based durations → seconds
        // Duration of -1 stays permanent. Already-converted durations from
        // within BattleRealtime pass seconds directly, but spell logic
        // still passes turn counts. We multiply by 2 for positive durations
        // UNLESS the caller already converted (internal calls use *2).
        // To keep it simple: the spec says multiply incoming duration by 2.
        // Internal callers in this file already do *2 before calling.
        // So we do NOT double here — callers are responsible.
        let adjustedDuration = duration;

        // Shield handling
        if (buffName === 'Shield' && effects.shieldAmount !== undefined) {
            const existingShield = target.buffs.find(b => b.name === 'Shield');
            if (existingShield) {
                if (effects.shieldAmount > existingShield.shieldAmount) {
                    existingShield.shieldAmount = effects.shieldAmount;
                    existingShield.duration = adjustedDuration;
                }
            } else {
                target.buffs.push({ name: buffName, duration: adjustedDuration, shieldAmount: effects.shieldAmount, ...effects });
                this.log(`${target.name} gains a ${effects.shieldAmount} HP shield!`);
                if (this.currentUnit && this.currentUnit.isAlive) {
                    this.trackBattleStat(this.currentUnit.name, 'shieldingApplied', effects.shieldAmount);
                }
            }
            return;
        }

        // No self-targeting +1 adjustment in real-time

        const existingBuff = target.buffs.find(b => b.name === buffName);
        if (existingBuff) {
            existingBuff.duration = Math.max(existingBuff.duration, adjustedDuration);
            Object.assign(existingBuff, effects);
        } else {
            target.buffs.push({ name: buffName, duration: adjustedDuration, ...effects });
            this.log(`${target.name} gains ${buffName}!`);
            if (this.currentUnit && this.currentUnit.isAlive) {
                this.trackBattleStat(this.currentUnit.name, 'buffsApplied', 1);
            }
            if (this.animations) this.animations.queueBuffDebuffText(target, buffName, false);
        }
    }

    applyDebuff(target, debuffName, duration, effects) {
        if (!target.isAlive) return;

        if (target.buffs.some(b => b.name === 'Immune' || b.immunity)) {
            this.log(`${target.name} is immune to debuffs!`);
            return;
        }

        const immunityMap = {
            'Reduce Speed': 'immuneToReduceSpeed', 'Reduce Attack': 'immuneToReduceAttack',
            'Reduce Defense': 'immuneToReduceDefense', 'Blight': 'immuneToBlight',
            'Bleed': 'immuneToBleed', 'Stun': 'immuneToStun',
            'Taunt': 'immuneToTaunt', 'Silence': 'immuneToSilence', 'Mark': 'immuneToMark'
        };
        if (immunityMap[debuffName] && target[immunityMap[debuffName]]) {
            this.log(`${target.name} is immune to ${debuffName}!`);
            return;
        }

        if (debuffName === 'Stun') {
            const bossBuff = target.buffs.find(b => b.name === 'Boss');
            if (bossBuff && bossBuff.stunResistance) {
                if (Math.random() < bossBuff.stunResistance) {
                    this.log(`${target.name} is a boss and shrugged off your stun attempt!`);
                    return;
                }
            }
        }

        // Patient Zero
        if (target.patientZeroPassive && (debuffName === 'Blight' || debuffName === 'Bleed')) {
            const healAmount = Math.floor(target.maxHp * (target.patientZeroHealPercent || 0.05));
            const actualHeal = Math.min(healAmount, target.maxHp - target.currentHp);
            if (actualHeal > 0) {
                target.currentHp += actualHeal;
                this.log(`${target.name}'s toxic immunity converts ${debuffName} into ${actualHeal} healing!`);
            }
            return;
        }

        let adjustedDuration = duration;
        // No self-targeting +1 in real-time

        const existingDebuff = target.debuffs.find(d => d.name === debuffName);
        if (existingDebuff) {
            if (debuffName === 'Bleed') {
                existingDebuff.duration += adjustedDuration;
            } else {
                existingDebuff.duration = Math.max(existingDebuff.duration, adjustedDuration);
                Object.assign(existingDebuff, effects);
            }
        } else {
            target.debuffs.push({ name: debuffName, duration: adjustedDuration, ...effects });
            this.log(`${target.name} suffers from ${debuffName}!`);
            if (this.currentUnit && this.currentUnit.isAlive) {
                this.trackBattleStat(this.currentUnit.name, 'debuffsApplied', 1);
            }
            if (this.animations) this.animations.queueBuffDebuffText(target, debuffName, true);
            if ((debuffName === 'Stun' || effects.stunned) && this.animations) {
                this.animations.updateStunVisuals(target);
            }
        }

        // Arch Sage passives
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
        this.applyBuff(target, 'Shield', 6, { shieldAmount: Math.floor(amount) }); // 3 turns × 2
    }

    removeBuffs(target) {
        const removedCount = target.buffs.filter(b => b.duration !== -1 && b.name !== 'Boss').length;
        target.buffs = target.buffs.filter(b => b.duration === -1 || b.name === 'Boss');
        if (this.currentUnit && removedCount > 0) {
            this.trackBattleStat(this.currentUnit.name, 'buffsDispelled', removedCount);
        }
    }

    removeDebuffs(target) {
        const removedCount = target.debuffs.length;
        target.debuffs = [];
        if (this.currentUnit && removedCount > 0) {
            this.trackBattleStat(this.currentUnit.name, 'debuffsCleansed', removedCount);
        }
    }

    getParty(unit) {
        return unit.isEnemy ? this.enemies : this.party;
    }

    getEnemies(unit) {
        return unit.isEnemy ? this.party : this.enemies;
    }

    // --- Initial Passives (ported from battle.js) ---

    applyInitialPassives(units = null) {
        const unitsToProcess = units || this.allUnits;
        unitsToProcess.forEach(unit => {
            if (unit.championFemalePassive || unit.shieldRegenAmount) {
                const shieldAmount = Math.floor(unit.maxHp * 0.2);
                this.applyBuff(unit, 'Shield', -1, { shieldAmount: shieldAmount });
                unit.shieldRegenTimer = 0;
                unit.shieldRegenTurns = 4;
                unit.shieldRegenAmount = shieldAmount;
            }

            unit.abilities.forEach((ability, index) => {
                if (ability.passive) {
                    const spell = spellManager.getSpell(ability.id);
                    if (spell && spell.logicKey && spellLogic[spell.logicKey]) {
                        try {
                            const spellLevel = ability.level || unit.spellLevel || 1;
                            spellLogic[spell.logicKey](this, unit, unit, spell, spellLevel);
                        } catch (error) {
                            console.error(`Error applying passive ${ability.name}:`, error);
                        }
                    }
                }
            });

            if (unit.lordsPresencePassive) {
                const allies2 = this.getParty(unit);
                allies2.forEach(ally => {
                    if (ally.isAlive) {
                        this.applyBuff(ally, 'Increase Attack', (unit.lordsPresenceBuffDuration || 1) * 2, { damageMultiplier: 1.5 });
                        ally.stunImmunity = true;
                    }
                });
                this.log(`${unit.name}'s presence empowers all allies!`);
            }

            if (unit.ancientShellPassive || unit.ancientShellFrostArmorDuration) {
                const dur = (unit.ancientShellFrostArmorDuration || 3) * 2;
                this.applyBuff(unit, 'Frost Armor', dur, {});
                this.log(`${unit.name}'s ancient shell provides protection!`);
            }
        });
    }

    // --- Battle Stats ---

    initializeBattleStats() {
        this.allUnits.forEach(unit => {
            this.battleStats[unit.name] = {
                kills: 0, deaths: 0, turnsTaken: 0,
                damageDealt: 0, damageTaken: 0, healingDone: 0,
                shieldingApplied: 0, buffsApplied: 0, debuffsApplied: 0,
                buffsDispelled: 0, debuffsCleansed: 0
            };
        });
    }

    trackBattleStat(unitName, stat, value) {
        if (this.battleStats && this.battleStats[unitName]) {
            this.battleStats[unitName][stat] += value;
        }
    }

    // --- Battle End (ported from battle.js) ---

    checkBattleEnd() {
        const partyAlive = this.party.some(u => u && u.isAlive);
        const enemiesAlive = this.enemies.some(u => u && u.isAlive);

        if (!partyAlive) {
            this.log("Defeat! Your party has been wiped out!");
            this.endBattle(false);
            return true;
        }

        if (!enemiesAlive) {
            if (!this.waveExpCalculated) {
                this.waveExpCalculated = true;
                const waveExp = this.calculateWaveExp();
                this.waveExpEarned.push(waveExp);
                this.party.forEach(unit => {
                    if (unit && unit.isAlive) {
                        unit.source.pendingExp += waveExp;
                    }
                });
            }

            if (this.currentWave < this.enemyWaves.length - 1) {
                if (!this.processingWaveTransition) {
                    this.processingWaveTransition = true;
                    this.log("Wave cleared!");

                    // Clean up dead enemy elements
                    this.enemies.forEach(enemy => {
                        if (enemy.el) { enemy.el.remove(); enemy.el = null; }
                    });

                    setTimeout(() => {
                        this.loadWave(this.currentWave + 1);
                        this.processingWaveTransition = false;
                        this.waveExpCalculated = false;
                    }, 1000);
                }
                return false;
            } else {
                this.log("Victory! All waves defeated!");
                this.endBattle(true);
                return true;
            }
        }

        return false;
    }

    calculateWaveExp() {
        const baseExpPerLevel = 25;
        let totalExp = 0;
        if (!this.dungeonWaves || !Array.isArray(this.dungeonWaves)) return 0;
        if (this.currentWave >= this.dungeonWaves.length) return 0;
        const currentWaveEnemies = this.dungeonWaves[this.currentWave];
        if (!currentWaveEnemies) return 0;
        currentWaveEnemies.forEach(enemy => {
            if (enemy) totalExp += enemy.level * baseExpPerLevel;
        });
        return totalExp;
    }

    endBattle(victory) {
        this.running = false;
        this.endTime = Date.now();

        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Clear buffs/debuffs
        this.allUnits.forEach(unit => {
            unit.buffs = [];
            unit.debuffs = [];
        });

        if (!victory) {
            this.party.forEach(unit => {
                if (unit && unit.source) unit.source.pendingExp = 0;
            });
        }

        if (this.targetingState) this.clearTargeting();

        // Hide exit button
        const exitButton = document.querySelector('.exitBattleButton');
        if (exitButton) exitButton.style.display = 'none';

        this.game.uiManager.closeHeroInfo();

        const duration = Math.floor((this.endTime - this.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        let dungeonId = null;
        let dungeonConfig = null;
        let rewards = { gold: 0, exp: 0, items: [] };

        if (this.mode === 'dungeon' && this.game.currentDungeon) {
            dungeonId = this.game.currentDungeon.id;
            dungeonConfig = dungeonData.dungeons[dungeonId];
            rewards = dungeonConfig.rewards || { gold: 0, exp: 0, items: [] };
        }

        // Item rolls (same logic as battle.js)
        const itemRolls = [];
        if (victory && this.mode === 'dungeon' && dungeonConfig) {
            const globalDropBonus = this.game.getCollectionDropBonus();
            this.party.forEach(unit => {
                if (!unit || !unit.source) return;
                const hero = unit.source;
                const isVillager = hero.className.includes('villager') || hero.className.includes('tester');
                const dungeonLevel = dungeonConfig ? dungeonConfig.level : 0;

                if (isVillager && (dungeonLevel > 50 || !unit.isAlive)) {
                    itemRolls.push({ hero, gold: Math.floor(rewards.gold / this.party.length), item: null });
                } else if (unit.isAlive && Math.random() < 0.5 && rewards.items && rewards.items.length > 0) {
                    const itemId = rewards.items[Math.floor(Math.random() * rewards.items.length)];
                    const itemBonuses = this.game.getItemCollectionBonuses(itemId);
                    const collectionBonuses = { globalDropBonus, ...itemBonuses };
                    const item = new Item(itemId);
                    item.rollItem(collectionBonuses);
                    this.game.checkItemForCollection(item, hero.name, hero.displayClassName);
                    itemRolls.push(this.game.autosell.processItemRoll({ hero, gold: 0, item }));
                } else if (unit.isAlive) {
                    itemRolls.push({ hero, gold: Math.floor(rewards.gold / this.party.length), item: null });
                } else {
                    itemRolls.push({ hero, gold: 0, item: null });
                }
            });
            this.game.autosell.saveSettings();
        } else {
            this.party.forEach(unit => {
                if (!unit || !unit.source) return;
                itemRolls.push({ hero: unit.source, gold: 0, item: null });
            });
        }

        let partyDeaths = 0;
        this.party.forEach(unit => {
            if (unit && this.battleStats[unit.name]) {
                partyDeaths += this.battleStats[unit.name].deaths || 0;
            }
        });

        this.game.pendingBattleResults = {
            victory,
            dungeonName: this.mode === 'arena' ? 'Arena Battle' : (this.game.currentDungeon ? this.game.currentDungeon.name : 'Unknown'),
            time: timeString,
            goldChange: 0,
            dungeonBonusExp: victory ? rewards.exp : 0,
            battleStats: this.battleStats,
            partyDeaths,
            currentArenaTeam: this.mode === 'arena' ? this.game.currentArenaTeam : null,
            heroResults: this.party.map((unit, index) => {
                if (!unit) return null;
                const hero = unit.source;
                const waveExp = hero.pendingExp;
                const dungeonBonus = victory && unit.isAlive ? rewards.exp : 0;
                const itemRoll = itemRolls[index];
                return {
                    hero, expGained: waveExp + dungeonBonus, survived: unit.isAlive,
                    item: itemRoll.item, gold: itemRoll.gold,
                    soldItem: itemRoll.soldItem, autosold: itemRoll.autosold
                };
            }).filter(r => r !== null)
        };

        this.game.applyBattleResults();

        if (this.game && saveManager && saveManager.currentSlot) {
            saveManager.saveToSlot(saveManager.currentSlot, true);
        }

        setTimeout(() => {
            // Clean up battlefield elements
            const battlefield = document.getElementById('realtimeBattlefield');
            if (battlefield) battlefield.innerHTML = '';

            if (this.mode === 'arena') {
                this.game.uiManager.showArenaResults();
            } else {
                this.game.uiManager.showBattleResults();
            }
        }, 1000);
    }

    exitBattle() {
        // Clean up
        const battlefield = document.getElementById('realtimeBattlefield');
        if (battlefield) battlefield.innerHTML = '';

        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }

        if (this.mode === 'arena') {
            this.game.uiManager.showPartySelect('arena');
        } else {
            this.game.uiManager.showMainMenu();
        }
    }

    // --- UI Helpers (ported from battle.js) ---

    createBattleUI() {
        this.createWaveCounter();
        this.createDungeonNameDisplay();
        if (this.game.autoReplay) this.createAutomaticModeDisplay();
    }

    createDungeonNameDisplay() {
        const existingName = document.getElementById('dungeonNameDisplay');
        if (existingName) existingName.remove();

        const nameDisplay = document.createElement('div');
        nameDisplay.id = 'dungeonNameDisplay';
        nameDisplay.className = 'dungeonNameDisplay';

        if (this.mode === 'arena') {
            const currentTeam = this.game.arenaTeams && this.game.arenaTeams[this.game.currentArenaTeam];
            nameDisplay.textContent = currentTeam ? currentTeam.name : 'Arena Battle';
        } else {
            nameDisplay.textContent = this.game.currentDungeon ? this.game.currentDungeon.name : '';
        }

        const battleScene = document.getElementById('battleScene');
        if (battleScene) battleScene.appendChild(nameDisplay);
    }

    createAutomaticModeDisplay() {
        const existingDisplay = document.getElementById('automaticModeDisplay');
        if (existingDisplay) existingDisplay.remove();

        if (!this.game.automaticModeStartTime) {
            this.game.automaticModeStartTime = Date.now();
            this.game.automaticModeCompletions = 0;
        }

        const autoDisplay = document.createElement('div');
        autoDisplay.id = 'automaticModeDisplay';
        autoDisplay.className = 'automaticModeDisplay';
        autoDisplay.innerHTML = `
            <div class="autoModeTitle">Automatic Mode</div>
            <div class="autoModeTime">00:00</div>
            <div class="autoModeCompletions">Completions: ${this.game.automaticModeCompletions}</div>
        `;

        const battleScene = document.getElementById('battleScene');
        if (battleScene) battleScene.appendChild(autoDisplay);
    }

    startTimerUpdate() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
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
        const existingCounter = document.getElementById('waveCounter');
        if (existingCounter) existingCounter.remove();

        const waveCounter = document.createElement('div');
        waveCounter.id = 'waveCounter';
        waveCounter.className = 'waveCounter';
        waveCounter.innerHTML = `
            <div class="waveText">Wave: ${this.currentWave + 1}/${this.enemyWaves.length}</div>
            <div class="battleTimerText">00:00</div>
        `;

        const battleScene = document.getElementById('battleScene');
        if (battleScene) battleScene.appendChild(waveCounter);
    }

    updateWaveCounter() {
        const waveCounter = document.getElementById('waveCounter');
        if (waveCounter) {
            const waveText = waveCounter.querySelector('.waveText');
            if (waveText) waveText.textContent = `Wave: ${this.currentWave + 1}/${this.enemyWaves.length}`;
        }
    }

    log(message) {
        this.battleLog.push(message);
        const logElement = document.getElementById('battleLog');
        if (logElement) {
            logElement.innerHTML = this.battleLog.slice(-50).join('<br>') + '<br>';
            logElement.scrollTop = logElement.scrollHeight;
        }
    }

    toggleAutoMode(enabled) {
        this.autoMode = enabled;
    }

    clearTargeting() {
        this.targetingState = null;
    }

    showPlayerAbilities(unit) {
        // Placeholder for manual mode - to be implemented in Phase 5
    }

    hidePlayerAbilities() {
        const abilityPanel = document.getElementById('abilityPanel');
        if (abilityPanel) abilityPanel.innerHTML = '';
    }

    // Compatibility: updateUI is called by some animation code
    updateUI() {
        this.renderUnits();
    }

    // Icon name maps (same as battle.js)
    getBuffIconName(buffName) {
        const iconMap = {
            'Boss': 'boss', 'Increase Attack': 'increase_attack',
            'Increase Speed': 'increase_speed', 'Increase Defense': 'increase_defense',
            'Immune': 'immune', 'Shield': 'shield', 'Frost Armor': 'frost_armor'
        };
        return iconMap[buffName] || 'buff';
    }

    getDebuffIconName(debuffName) {
        const iconMap = {
            'Reduce Attack': 'reduce_attack', 'Reduce Speed': 'reduce_speed',
            'Reduce Defense': 'reduce_defense', 'Blight': 'blight',
            'Bleed': 'bleed', 'Stun': 'stun', 'Taunt': 'taunt',
            'Silence': 'silence', 'Mark': 'mark'
        };
        return iconMap[debuffName] || 'debuff';
    }

    // Buff/debuff tooltip (simplified for realtime — reuses battle.js pattern)
    showBuffDebuffTooltip(event, buffDebuff, isBuff) {
        // Delegate to battle.js pattern if needed
    }

    hideBuffDebuffTooltip() {
        const tooltip = document.getElementById('buffDebuffTooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
            tooltip.innerHTML = '';
        }
    }
}
