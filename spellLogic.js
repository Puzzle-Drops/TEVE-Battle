// Spell Logic Functions
const spellLogic = {
    // Villager Spells
    punchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    furyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    throwRockLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const stunDuration = spell.stunDuration[levelIndex] || spell.stunDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
    },

    // Boss Spells
    slashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const percent = spell.scaling.percent[levelIndex] || spell.scaling.percent[0];
        const cap = spell.scaling.cap[levelIndex] || spell.scaling.cap[0];
        
        const damage = Math.min(target.maxHp * percent, cap);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    biteLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const percent = spell.scaling.percent[levelIndex] || spell.scaling.percent[0];
        const floor = spell.scaling.floor[levelIndex] || spell.scaling.floor[0];
        
        const damage = Math.max(target.maxHp * percent, floor);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    // Murkin Spells
    spearThrustLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const bleedChance = spell.bleedChance[levelIndex] || spell.bleedChance[0];
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < bleedChance) {
            battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
        }
    },

    defensiveFormationLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    crushingStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    armorBreakLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const debuffDuration = spell.debuffDuration[levelIndex] || spell.debuffDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Defense', debuffDuration, {});
    },

    crystalShardLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
    },

    protectiveBarrierLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        
        // Find lowest HP ally
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            // Sort by HP percentage
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            
            // Use applyBuff with -1 duration for permanent shield
            battle.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: shieldAmount });
        }
    },

    staffWhackLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    ancientProtectionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const dodgeChance = spell.dodgeChance[levelIndex] || spell.dodgeChance[0];
        
        // This is a passive ability - the dodge logic will be handled in battle.js
        if (!caster.ancientProtectionApplied) {
            caster.ancientProtectionApplied = true;
            caster.physicalDodgeChance = dodgeChance;
        }
    },

    ancestralTauntLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spell.tauntDuration[levelIndex] || spell.tauntDuration[0];
        
        // Apply taunt to all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Taunt', tauntDuration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
            }
        });
    },

    chieftainsHammerLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const stunChance = spell.stunChance[levelIndex] || spell.stunChance[0];
        const stunDuration = spell.stunDuration[levelIndex] || spell.stunDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < stunChance) {
            battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
        }
    },

    warCryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const allyBuffDuration = spell.allyBuffDuration[levelIndex] || spell.allyBuffDuration[0];
        const selfSpeedDuration = spell.selfSpeedDuration[levelIndex] || spell.selfSpeedDuration[0];
        
        // Apply Increase Attack to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', allyBuffDuration, { damageMultiplier: 1.5 });
            }
        });
        
        // Apply Increase Speed to self only
        battle.applyBuff(caster, 'Increase Speed', selfSpeedDuration, {});
    },

    // Icy Highland Enemy Spells
    axeThrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const bleedChance = spell.bleedChance[levelIndex] || spell.bleedChance[0];
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < bleedChance) {
            battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
        }
    },

    berserkerRageLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    dualAxesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const bleedChance = spell.bleedChance[levelIndex] || spell.bleedChance[0];
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        const hitCount = spell.hitCount[levelIndex] || spell.hitCount[0];
        
        // Hit multiple times
        for (let i = 0; i < hitCount; i++) {
            const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
            battle.dealDamage(caster, target, damage, 'physical');
            
            if (Math.random() < bleedChance) {
                battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
            }
        }
    },

    rallyingCryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Apply Increase Speed to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Speed', duration, {});
            }
        });
    },

    frostBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const actionBarDrain = spell.actionBarDrain[levelIndex] || spell.actionBarDrain[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Drain action bar
        if (target.isAlive) {
            const drain = target.actionBar * actionBarDrain;
            target.actionBar = Math.max(0, target.actionBar - drain);
            battle.log(`${target.name}'s action bar drained by ${Math.floor(drain)}!`);
        }
    },

    chillingTouchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const slowChance = spell.slowChance[levelIndex] || spell.slowChance[0];
        const slowDuration = spell.slowDuration[levelIndex] || spell.slowDuration[0];
        
        // This is a passive ability - the effect will be handled elsewhere
        if (!caster.chillingTouchApplied) {
            caster.chillingTouchApplied = true;
            caster.onHitEffects = caster.onHitEffects || [];
            caster.onHitEffects.push({
                type: 'debuff',
                debuffName: 'Reduce Speed',
                chance: slowChance,
                duration: slowDuration
            });
        }
    },

    savageBiteLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    packFuryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const buffDuration = spell.buffDuration[levelIndex] || spell.buffDuration[0];
        
        // This is a passive ability - the effect will be handled when taking damage
        if (!caster.packFuryApplied) {
            caster.packFuryApplied = true;
            caster.onDamageTaken = caster.onDamageTaken || [];
            caster.onDamageTaken.push({
                type: 'buff',
                buffName: 'Increase Attack',
                duration: buffDuration
            });
        }
    },

    chillingHowlLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const debuffDuration = spell.debuffDuration[levelIndex] || spell.debuffDuration[0];
        
        // Apply both Reduce Attack and Reduce Speed to all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Reduce Attack', debuffDuration, {});
                battle.applyDebuff(enemy, 'Reduce Speed', debuffDuration, {});
            }
        });
    },

    crushingBlowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    thickHideLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const damageReduction = spell.damageReduction[levelIndex] || spell.damageReduction[0];
        
        // This is a passive ability - apply permanent damage reduction
        if (!caster.thickHideApplied) {
            caster.thickHideApplied = true;
            caster.damageReduction = (caster.damageReduction || 0) + damageReduction;
        }
    },

    maulLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        // Always apply bleed
        battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
    },

    rampageLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        
        // Apply bleed to all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
            }
        });
        battle.log(`${caster.name} goes on a rampage, causing all enemies to bleed!`);
    },

    // Tester Spells
    winLogic: function(battle, caster, targets, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Deal massive damage to all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.currentHp > 0) {
                battle.dealDamage(caster, enemy, baseDamage, 'pure');
            }
        });
        
        // Apply speed buff to self
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    loseLogic: function(battle, caster, targets, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        
        // Deal massive damage to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.currentHp > 0 && ally !== caster) {
                battle.dealDamage(caster, ally, baseDamage, 'pure');
            }
        });
        
        battle.dealDamage(caster, caster, baseDamage, 'pure');
    },

    // Test Buff Spells
    increaseAttackTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Increase Attack', duration, { damageMultiplier: 1.5 });
    },

    increaseSpeedTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Increase Speed', duration, {});
    },

    increaseDefenseTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Increase Defense', duration, {});
    },

    immuneTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Immune', duration, { immunity: true });
    },

    shieldTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    // Test Debuff Spells
    reduceAttackTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
    },

    reduceSpeedTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    reduceDefenseTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Reduce Defense', duration, {});
    },
    
    blightTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    bleedTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    stunTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Stun', duration, { stunned: true });
    },

    tauntTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Apply taunt to the target, making them attack the caster
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
    },

    silenceTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Silence', duration, {});
    },

    markTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Mark', duration, {});
    },
frostArmorTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    battle.applyBuff(target, 'Frost Armor', duration, {});
},
    frostBreathLogic: function(battle, caster, targets, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const slowDuration = spell.slowDuration[levelIndex] || spell.slowDuration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.currentHp > 0) {
                const damage = caster.stats.str * strScaling;
                battle.dealDamage(caster, enemy, damage, 'magical');
                battle.applyDebuff(enemy, 'Reduce Speed', slowDuration, {});
            }
        });
    }

};

// Spell Manager Class
class SpellManager {
    constructor() {
        this.spells = {};
        this.loaded = false;
    }

    async loadSpells() {
        try {
            const response = await fetch('spells.json');
            const spellData = await response.json();
            
            // spellData is already a flat object with spell IDs as keys
            this.spells = spellData;
            
            this.loaded = true;
            console.log('Spells loaded:', Object.keys(this.spells).length);
        } catch (error) {
            console.error('Failed to load spells:', error);
        }
    }

    getSpell(spellId) {
        return this.spells[spellId] || null;
    }

    getSpellsByIds(spellIds) {
        return spellIds.map(id => this.getSpell(id)).filter(spell => spell !== null);
    }

    executeSpell(spellId, battle, caster, target) {
        const spell = this.getSpell(spellId);
        if (!spell) {
            console.error(`Spell not found: ${spellId}`);
            return false;
        }

        const logicFunction = spellLogic[spell.logicKey];
        if (!logicFunction) {
            console.error(`Logic function not found: ${spell.logicKey}`);
            return false;
        }

        try {
            logicFunction(battle, caster, target, spell);
            return true;
        } catch (error) {
            console.error(`Error executing spell ${spellId}:`, error);
            return false;
        }
    }
}
