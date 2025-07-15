// Helper Functions
const spellHelpers = {
    // Parameter extraction helper
    getParam: function(spell, paramName, levelIndex, defaultValue = null) {
        return spell[paramName]?.[levelIndex] ?? spell[paramName]?.[0] ?? defaultValue;
    },

    // Damage calculation helper
    calculateDamage: function(spell, levelIndex, caster, scalingTypes = {}) {
        const baseDamage = this.getParam(spell, 'scaling.base', levelIndex, 0);
        let damage = baseDamage;
        
        if (scalingTypes.attack !== false && spell.scaling?.attack) {
            const attackScaling = this.getParam(spell, 'scaling.attack', levelIndex, 1.0);
            damage += caster.source.attack * attackScaling;
        }
        
        if (scalingTypes.str && spell.scaling?.str) {
            const strScaling = this.getParam(spell, 'scaling.str', levelIndex, 0);
            damage += caster.stats.str * strScaling;
        }
        
        if (scalingTypes.int && spell.scaling?.int) {
            const intScaling = this.getParam(spell, 'scaling.int', levelIndex, 0);
            damage += caster.stats.int * intScaling;
        }
        
        if (scalingTypes.agi && spell.scaling?.agi) {
            const agiScaling = this.getParam(spell, 'scaling.agi', levelIndex, 0);
            damage += caster.stats.agi * agiScaling;
        }
        
        return damage;
    },

    // Find lowest HP ally
    getLowestHpAlly: function(battle, caster) {
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length === 0) return null;
        
        aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
        return aliveAllies[0];
    },

    // Apply effect to all alive enemies
    forEachAliveEnemy: function(battle, caster, callback) {
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                callback(enemy);
            }
        });
    },

    // Apply effect to all alive allies
    forEachAliveAlly: function(battle, caster, callback) {
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                callback(ally);
            }
        });
    },

    // Basic damage spell template
    basicDamageSpell: function(battle, caster, target, spell, spellLevel, options = {}) {
        const levelIndex = spellLevel - 1;
        const damage = this.calculateDamage(spell, levelIndex, caster, options.scalingTypes || {attack: true});
        
        const actualDamage = options.damageModifier ? damage * options.damageModifier : damage;
        battle.dealDamage(caster, target, actualDamage, options.damageType || 'physical', options.damageOptions);
        
        if (options.afterDamage) {
            options.afterDamage(battle, caster, target, spell, levelIndex);
        }
    },

    // AoE damage spell template
    aoeDamageSpell: function(battle, caster, spell, spellLevel, options = {}) {
        const levelIndex = spellLevel - 1;
        const damage = this.calculateDamage(spell, levelIndex, caster, options.scalingTypes || {attack: true});
        
        this.forEachAliveEnemy(battle, caster, enemy => {
            const actualDamage = options.getDamageModifier ? damage * options.getDamageModifier(enemy) : damage;
            battle.dealDamage(caster, enemy, actualDamage, options.damageType || 'physical', options.damageOptions);
            
            if (options.perEnemyEffect) {
                options.perEnemyEffect(battle, caster, enemy, spell, levelIndex);
            }
        });
    }
};

// Buff/Debuff helper functions
const buffDebuffHelpers = {
    // Safe getters
    getBuffs: function(unit) {
        return unit.buffs || [];
    },
    
    getDebuffs: function(unit) {
        return unit.debuffs || [];
    },
    
    // Check existence
    hasBuff: function(unit, buffName) {
        return this.getBuffs(unit).some(b => b.name === buffName);
    },
    
    hasDebuff: function(unit, debuffName) {
        return this.getDebuffs(unit).some(d => d.name === debuffName);
    },
    
    // Count
    countBuffs: function(unit, excludeNames = []) {
        return this.getBuffs(unit).filter(b => !excludeNames.includes(b.name)).length;
    },
    
    countDebuffs: function(unit) {
        return this.getDebuffs(unit).length;
    },
    
    // Remove specific
    removeBuff: function(unit, buffName) {
        if (!unit.buffs) return false;
        const index = unit.buffs.findIndex(b => b.name === buffName);
        if (index !== -1) {
            unit.buffs.splice(index, 1);
            return true;
        }
        return false;
    },
    
    removeFirstDebuff: function(unit) {
        if (unit.debuffs && unit.debuffs.length > 0) {
            return unit.debuffs.shift();
        }
        return null;
    },
    
    // Clear all
    clearBuffs: function(unit, excludeNames = ['Boss']) {
        if (!unit.buffs) return [];
        const removed = unit.buffs.filter(b => !excludeNames.includes(b.name));
        unit.buffs = unit.buffs.filter(b => excludeNames.includes(b.name));
        return removed;
    },
    
    clearDebuffs: function(unit) {
        const removed = unit.debuffs || [];
        unit.debuffs = [];
        return removed;
    },
    
    // Transfer
    transferBuffs: function(source, target, excludeNames = ['Boss']) {
        const transferred = [];
        if (source.buffs) {
            source.buffs = source.buffs.filter(buff => {
                if (!excludeNames.includes(buff.name)) {
                    target.buffs = target.buffs || [];
                    target.buffs.push(buff);
                    transferred.push(buff);
                    return false;
                }
                return true;
            });
        }
        return transferred;
    },
    
    stealRandomDebuff: function(source, target) {
        const debuffs = this.getDebuffs(source);
        if (debuffs.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * debuffs.length);
        const debuff = debuffs.splice(randomIndex, 1)[0];
        
        target.debuffs = target.debuffs || [];
        target.debuffs.push(debuff);
        return debuff;
    }
};

// Spell Logic Functions
const spellLogic = {
    // Villager Spells
    punchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true},
            damageType: 'physical'
        });
    },

    furyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    throwRockLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunDuration = spellHelpers.getParam(spell, 'stunDuration', levelIndex, 1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
            }
        });
    },

    // Acolyte Family Spells
    holySmiteLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healPercent = spellHelpers.getParam(spell, 'healPercent', levelIndex, 0.3);
        
        const damage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, int: true});
        battle.dealDamage(caster, target, damage, 'magical');
        
        const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
        if (lowestHpAlly) {
            const healAmount = damage * healPercent;
            battle.healUnit(lowestHpAlly, healAmount);
        }
    },

    divineLightLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healAmount = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: false, int: true});
        
        battle.healUnit(target, healAmount);
        
        if (buffDebuffHelpers.removeFirstDebuff(target)) {
            battle.log(`Removed a debuff from ${target.name}!`);
        }
    },

    sanctuaryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Defense', duration, {});
            
            const debuffCount = buffDebuffHelpers.countDebuffs(ally);
            if (debuffCount > 0) {
                buffDebuffHelpers.clearDebuffs(ally);
                for (let i = 0; i < debuffCount; i++) {
                    battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
                }
                battle.log(`${ally.name}'s debuffs converted to Increase Attack!`);
            }
        });
    },

    massHealLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healAmount = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: false, int: true});
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.healUnit(ally, healAmount);
        });
    },

    hierophantMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.hierophantMalePassive = true;
    },

    hierophantFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.hierophantFemalePassive = true;
    },

    prophetMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.prophetMalePassive = true;
    },

    prophetessFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.prophetessFemalePassive = true;
    },

    // Archer Family Spells
    aimedShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        
        if (buffDebuffHelpers.removeBuff(target, 'Shield')) {
            battle.log(`${target.name}'s shield was broken!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            damageOptions: { armorPierce: spell.armorPierce }
        });
        
        if (caster.aimedShotAppliesBleed && target.isAlive) {
            battle.applyDebuff(target, 'Bleed', caster.aimedShotBleedDuration || 1, { bleedDamage: true });
        }
        
        if (caster.aimedShotActionBarPerDebuff) {
            const debuffCount = buffDebuffHelpers.countDebuffs(target);
            const actionBarGain = debuffCount * caster.aimedShotActionBarPerDebuff * 10000;
            caster.actionBar += actionBarGain;
            if (actionBarGain > 0) {
                battle.log(`${caster.name} gains ${Math.floor(actionBarGain / 100)}% action bar!`);
            }
        }
    },

    huntersMarkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    doubleShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const debuffDuration = spellHelpers.getParam(spell, 'debuffDuration', levelIndex, 1);
        const damage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, agi: true});
        
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Defense', debuffDuration, {});
        
        const enemies = battle.getEnemies(caster);
        const aliveEnemies = enemies.filter(e => e && e.isAlive);
        if (aliveEnemies.length > 0) {
            const randomTarget = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            battle.dealDamage(caster, randomTarget, damage, 'physical');
            battle.applyDebuff(randomTarget, 'Bleed', debuffDuration, { bleedDamage: true });
        }
    },

    rainOfArrowsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const debuffBonus = spellHelpers.getParam(spell, 'debuffBonus', levelIndex, 5);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            getDamageModifier: (enemy) => {
                const baseDamage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, agi: true});
                const debuffCount = buffDebuffHelpers.countDebuffs(enemy);
                return (baseDamage + (debuffBonus * debuffCount)) / baseDamage;
            }
        });
    },

    sniperMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.onDamageCalculation = caster.onDamageCalculation || [];
        caster.onDamageCalculation.push({
            type: 'executioner',
            damageBonus: 1.5,
            hpThreshold: 0.3
        });
    },

    sniperFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.onKillEffects = caster.onKillEffects || [];
        caster.onKillEffects.push({
            type: 'buff',
            buffName: 'Increase Speed',
            duration: 2
        });
    },

    monsterHunterMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.aimedShotAppliesBleed = true;
        caster.aimedShotBleedDuration = 1;
    },

    monsterHunterFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.aimedShotActionBarPerDebuff = 0.05;
    },

    // Druid Family Spells
    naturesBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const damage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, int: true});
        battle.dealDamage(caster, target, damage, 'magical');
        
        const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
        if (lowestHpAlly) {
            lowestHpAlly.actionBar += 1000;
            battle.log(`${lowestHpAlly.name} gained 10% action bar!`);
            
            if (caster.summonerFemalePassive) {
                const healAmount = Math.floor(lowestHpAlly.maxHp * 0.05);
                battle.healUnit(lowestHpAlly, healAmount);
            }
        }
        
        if (caster.summonerMalePassive) {
            const enemies = battle.getEnemies(caster);
            const aliveEnemies = enemies.filter(e => e && e.isAlive);
            
            if (aliveEnemies.length > 0) {
                aliveEnemies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
                const lowestHpEnemy = aliveEnemies[0];
                const drain = lowestHpEnemy.actionBar * 0.05;
                lowestHpEnemy.actionBar = Math.max(0, lowestHpEnemy.actionBar - drain);
                battle.log(`${lowestHpEnemy.name}'s action bar drained by 5%!`);
            }
        }
    },

    barkskinLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyBuff(target, 'Increase Defense', duration, {});
        
        const healAmount = target.maxHp * spell.healPercent;
        battle.healUnit(target, healAmount);
        
        const shieldAmount = target.maxHp * spell.shieldPercent;
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    primalRoarLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Reduce Attack', duration, {});
                
                if (caster.runemasterMalePassive) {
                    battle.applyDebuff(enemy, 'Taunt', 1, { 
                        tauntTarget: caster,
                        forcedTarget: caster.position,
                        forcedTargetIsEnemy: caster.isEnemy
                    });
                }
            }
        });
    },

    naturesBalanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healAmount = spellHelpers.getParam(spell, 'healAmount', levelIndex, 10);
        const damageAmount = spellHelpers.getParam(spell, 'damageAmount', levelIndex, 10);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            buffDebuffHelpers.clearDebuffs(ally);
            battle.healUnit(ally, healAmount);
            battle.log(`${ally.name} cleansed and healed!`);
        });
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            buffDebuffHelpers.clearBuffs(enemy);
            battle.dealDamage(caster, enemy, damageAmount, 'magical');
            battle.log(`${enemy.name} dispelled and damaged!`);
        });
    },

    runemasterMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.runemasterMalePassive = true;
    },

    runemasterFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.runemasterFemalePassive = true;
        caster.retaliateWithNaturesBlessing = true;
    },

    summonerMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.summonerMalePassive = true;
    },

    summonerFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.summonerFemalePassive = true;
    },

    // Initiate Family Spells
    arcaneMissilesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const damage = spellHelpers.calculateDamage(spell, spellLevel - 1, caster, {attack: true, int: true});
        
        battle.dealDamage(caster, target, damage, 'magical');
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive && enemy !== target && buffDebuffHelpers.countDebuffs(enemy) > 0) {
                battle.dealDamage(caster, enemy, damage, 'magical');
            }
        });
    },

    frostArmorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    helpingHandLogic: function(battle, caster, target, spell, spellLevel = 1) {
        buffDebuffHelpers.clearDebuffs(target);
        battle.log(`All debuffs removed from ${target.name}!`);
        
        target.actionBar = 10000;
        battle.log(`${target.name}'s action bar filled to 100%!`);
    },

    twilightsPromiseLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            ally.actionBar = Math.max(0, ally.actionBar - 1000);
        });
        
        caster.twilightsEndPending = true;
        battle.log(`${caster.name} prepares Twilight's End!`);
    },

    twilightsEndLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = 2000 + (levelIndex * 1000);
        const damage = baseDamage + caster.source.attack + caster.stats.int;
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.dealDamage(caster, enemy, damage, 'magical');
            enemy.actionBar = Math.floor(enemy.actionBar * 0.5);
        });
    },

    whiteWizardMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.whiteWizardMalePassive = true;
    },

    whiteWitchFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.whiteWitchFemalePassive = true;
    },

    archSageMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.archSageMalePassive = true;
    },

    archSageFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.archSageFemalePassive = true;
    },

    // Swordsman Family Spells
    bladeStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const bleedBonus = buffDebuffHelpers.hasDebuff(target, 'Bleed') ? spell.bleedBonus : 1;
        
        if (bleedBonus > 1) {
            battle.log(`Critical strike on bleeding target!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageModifier: bleedBonus
        });
    },

    shieldBashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spellHelpers.getParam(spell, 'tauntDuration', levelIndex, 1);
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 25);
        
        battle.applyDebuff(target, 'Taunt', tauntDuration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    rallyBannerLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', duration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        });
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            ally.actionBar += 3000;
        });
    },

    bloodPactLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 2);
        
        for (let i = 0; i < spell.bleedStacks; i++) {
            battle.applyDebuff(caster, 'Bleed', bleedDuration, { bleedDamage: true });
        }
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', bleedDuration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
            
            for (let i = 0; i < spell.bleedStacks; i++) {
                battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
            }
        });
    },

    championMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.onDamageTaken = caster.onDamageTaken || [];
        caster.onDamageTaken.push({
            type: 'stun_counter',
            chance: 0.2,
            duration: 1
        });
    },

    championFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const shieldAmount = Math.floor(caster.maxHp * 0.2);
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        caster.shieldRegenTimer = 0;
        caster.shieldRegenTurns = 4;
        caster.shieldRegenAmount = shieldAmount;
        caster.championFemalePassive = true;
    },

    avengerMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.avengerBlightOnTauntedAttack = true;
    },

    avengerFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.actionBarGainOnDamage = 0.15;
    },

    // Templar Family Spells
    psiStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const damage = spellHelpers.calculateDamage(spell, spellLevel - 1, caster, {attack: true, int: true});
        
        if (target.actionBar >= 3000) {
            battle.dealDamage(caster, target, damage, 'physical');
            target.actionBar = Math.max(0, target.actionBar - 500);
        } else {
            battle.dealDamage(caster, target, damage, 'pure');
        }
    },

    psychicMarkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
        
        if (caster.darkArchTemplarFemalePassive) {
            battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
        }
    },

    voidStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffCount = buffDebuffHelpers.countDebuffs(target);
        
        if (debuffCount > 0) {
            for (let i = 0; i < debuffCount; i++) {
                spellLogic.psiStrikeLogic(battle, caster, target, {
                    scaling: {
                        base: spell.scaling?.base || [14, 55, 110, 220, 385],
                        attack: spell.scaling?.attack || [1.0, 1.0, 1.0, 1.0, 1.0],
                        int: spell.scaling?.int || [0.5, 0.52, 0.54, 0.56, 0.58]
                    },
                    actionBarDrain: 0.05
                }, spellLevel);
            }
        } else {
            battle.log(`${target.name} has no debuffs, Void Strike fizzles!`);
        }
    },

    psiShiftLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const stolenActionBar = target.actionBar;
        caster.actionBar = Math.min(10000, caster.actionBar + stolenActionBar);
        
        const damage = spellHelpers.calculateDamage(spell, spellLevel - 1, caster, {attack: true, int: true});
        battle.dealDamage(caster, target, damage, 'magical');
        
        target.actionBar = caster.grandTemplarFemalePassive ? 0 : 2500;
    },

    darkArchTemplarMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.darkArchTemplarMalePassive = true;
    },

    darkArchTemplarFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.darkArchTemplarFemalePassive = true;
    },

    grandTemplarMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.grandTemplarMalePassive = true;
        caster.globalStunChance = spell.stunChance;
    },

    grandTemplarFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.grandTemplarFemalePassive = true;
    },

    // Thief Family Spells
    cheapShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuff = buffDebuffHelpers.stealRandomDebuff(caster, target);
        if (debuff) {
            battle.log(`${caster.name} transfers ${debuff.name} to ${target.name}!`);
        }
        
        let damageType = 'physical';
        if (caster.phantomAssassinFemalePassive && caster.cheapShotPureThreshold) {
            if ((target.currentHp / target.maxHp) < caster.cheapShotPureThreshold) {
                damageType = 'pure';
            }
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: damageType,
            afterDamage: (battle, caster, target) => {
                if (caster.cheapShotAddsBleed && target.isAlive) {
                    battle.applyDebuff(target, 'Bleed', 2, { bleedDamage: true });
                }
            }
        });
    },

    crippleLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
        battle.applyDebuff(target, 'Reduce Attack', duration, {});
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    assassinateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if ((target.currentHp / target.maxHp) < spell.hpThreshold && buffDebuffHelpers.countDebuffs(target) > 0) {
            spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
                scalingTypes: {attack: true, agi: true},
                damageType: 'pure'
            });
        } else {
            battle.log(`Assassinate conditions not met!`);
        }
    },

    shadowstepLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    phantomAssassinMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.phantomAssassinMalePassive = true;
        caster.actionBarRefillOnKill = spell.actionBarRefill;
    },

    phantomAssassinFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.phantomAssassinFemalePassive = true;
        caster.cheapShotPureThreshold = spell.hpThreshold;
    },

    masterStalkerMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.masterStalkerMalePassive = true;
        caster.dodgePure = spell.dodgePure;
        caster.dodgeMagical = spell.dodgeMagical;
        caster.dodgePhysical = spell.dodgePhysical;
        caster.cheapShotAddsBleed = true;
    },

    masterStalkerFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.masterStalkerFemalePassive = true;
        caster.dodgePure = spell.dodgePure;
        caster.dodgePhysical = spell.dodgePhysical;
        caster.dodgeMagical = spell.dodgeMagical;
        caster.cheapShotAddsBleed = true;
    },

    // Witch Hunter Family Spells
    purgeSlashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        let buffsRemoved = 0;
        let damageType = 'physical';
        
        const buffsToRemove = caster.grandInquisitorFemalePassive && caster.purgeSlashBuffRemoveCount ? 
            caster.purgeSlashBuffRemoveCount : 1;
        
        if (buffDebuffHelpers.countBuffs(target) > 0) {
            for (let i = 0; i < buffsToRemove && buffDebuffHelpers.countBuffs(target) > 0; i++) {
                target.buffs.shift();
                buffsRemoved++;
            }
            battle.log(`Removed ${buffsRemoved} buff${buffsRemoved > 1 ? 's' : ''} from ${target.name}!`);
        }
        
        if (caster.grandInquisitorMalePassive && buffsRemoved === 0) {
            damageType = 'pure';
        }
        
        if (buffDebuffHelpers.hasDebuff(target, 'Silence')) {
            if (caster.professionalWitcherMalePassive) {
                damageType = 'pure';
            }
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: damageType
        });
    },

    nullbladeCleaveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const buffBonus = spellHelpers.getParam(spell, 'buffBonus', levelIndex, 10);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'physical',
            getDamageModifier: (enemy) => {
                const baseDamage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, int: true});
                const buffCount = buffDebuffHelpers.countBuffs(enemy);
                return (baseDamage + (buffBonus * buffCount)) / baseDamage;
            }
        });
    },

    stealMagicLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        if (buffDebuffHelpers.countBuffs(target) > 0) {
            const allies = battle.getParty(caster);
            const aliveAllies = allies.filter(a => a && a.isAlive);
            
            while (buffDebuffHelpers.countBuffs(target) > 0 && aliveAllies.length > 0) {
                const buff = target.buffs.shift();
                const randomAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
                randomAlly.buffs = randomAlly.buffs || [];
                randomAlly.buffs.push(buff);
                battle.log(`${buff.name} stolen and given to ${randomAlly.name}!`);
            }
        } else {
            battle.applyDebuff(target, 'Reduce Defense', duration, {});
        }
    },

    hexLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Silence', duration, {});
    },

    grandInquisitorMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.grandInquisitorMalePassive = true;
    },

    grandInquisitorFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.grandInquisitorFemalePassive = true;
        caster.purgeSlashBuffRemoveCount = spell.buffRemoveCount;
    },

    professionalWitcherMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.professionalWitcherMalePassive = true;
    },

    professionalWitcherFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.professionalWitcherFemalePassive = true;
    },

    // Boss/Enemy Spells
    slashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const percent = spellHelpers.getParam(spell, 'scaling.percent', levelIndex, 0.01);
        const cap = spellHelpers.getParam(spell, 'scaling.cap', levelIndex, 5);
        
        const damage = Math.min(target.maxHp * percent, cap);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    biteLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const percent = spellHelpers.getParam(spell, 'scaling.percent', levelIndex, 0.05);
        const floor = spellHelpers.getParam(spell, 'scaling.floor', levelIndex, 5);
        
        const damage = Math.max(target.maxHp * percent, floor);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    spearThrustLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedChance = spellHelpers.getParam(spell, 'bleedChance', levelIndex, 0.3);
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < bleedChance) {
                    battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
                }
            }
        });
    },

    defensiveFormationLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    crushingStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    armorBreakLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const debuffDuration = spellHelpers.getParam(spell, 'debuffDuration', levelIndex, 3);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Reduce Defense', debuffDuration, {});
            }
        });
    },

    crystalShardLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical'
        });
    },

    protectiveBarrierLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 20);
        
        const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
        if (lowestHpAlly) {
            battle.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: shieldAmount });
        }
    },

    staffWhackLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    ancientProtectionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if (!caster.ancientProtectionApplied) {
            caster.ancientProtectionApplied = true;
            const levelIndex = spellLevel - 1;
            caster.physicalDodgeChance = spellHelpers.getParam(spell, 'dodgeChance', levelIndex, 0.4);
        }
    },

    ancestralTauntLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spellHelpers.getParam(spell, 'tauntDuration', levelIndex, 1);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', tauntDuration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        });
    },

    chieftainsHammerLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunChance = spellHelpers.getParam(spell, 'stunChance', levelIndex, 0.15);
        const stunDuration = spellHelpers.getParam(spell, 'stunDuration', levelIndex, 1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < stunChance) {
                    battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
                }
            }
        });
    },

    warCryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const allyBuffDuration = spellHelpers.getParam(spell, 'allyBuffDuration', levelIndex, 2);
        const selfSpeedDuration = spellHelpers.getParam(spell, 'selfSpeedDuration', levelIndex, 1);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', allyBuffDuration, { damageMultiplier: 1.5 });
        });
        
        battle.applyBuff(caster, 'Increase Speed', selfSpeedDuration, {});
    },

    axeThrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedChance = spellHelpers.getParam(spell, 'bleedChance', levelIndex, 0.4);
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < bleedChance) {
                    battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
                }
            }
        });
    },

    berserkerRageLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    dualAxesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedChance = spellHelpers.getParam(spell, 'bleedChance', levelIndex, 0.5);
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 3);
        const hitCount = spellHelpers.getParam(spell, 'hitCount', levelIndex, 2);
        
        for (let i = 0; i < hitCount; i++) {
            spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
                scalingTypes: {attack: true, agi: true},
                damageType: 'physical',
                afterDamage: (battle, caster, target) => {
                    if (Math.random() < bleedChance) {
                        battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
                    }
                }
            });
        }
    },

    rallyingCryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        });
    },

    frostBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarDrain = spellHelpers.getParam(spell, 'actionBarDrain', levelIndex, 0.15);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            afterDamage: (battle, caster, target) => {
                if (target.isAlive) {
                    const drain = target.actionBar * actionBarDrain;
                    target.actionBar = Math.max(0, target.actionBar - drain);
                    battle.log(`${target.name}'s action bar drained by ${Math.floor(drain)}!`);
                }
            }
        });
    },

    chillingTouchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if (!caster.chillingTouchApplied) {
            caster.chillingTouchApplied = true;
            const levelIndex = spellLevel - 1;
            const slowChance = spellHelpers.getParam(spell, 'slowChance', levelIndex, 0.3);
            const slowDuration = spellHelpers.getParam(spell, 'slowDuration', levelIndex, 2);
            
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
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    packFuryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if (!caster.packFuryApplied) {
            caster.packFuryApplied = true;
            const levelIndex = spellLevel - 1;
            const buffDuration = spellHelpers.getParam(spell, 'buffDuration', levelIndex, 2);
            
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
        const debuffDuration = spellHelpers.getParam(spell, 'debuffDuration', levelIndex, 3);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Attack', debuffDuration, {});
            battle.applyDebuff(enemy, 'Reduce Speed', debuffDuration, {});
        });
    },

    crushingBlowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    thickHideLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if (!caster.thickHideApplied) {
            caster.thickHideApplied = true;
            const levelIndex = spellLevel - 1;
            const damageReduction = spellHelpers.getParam(spell, 'damageReduction', levelIndex, 0.15);
            caster.damageReduction = (caster.damageReduction || 0) + damageReduction;
        }
    },

    maulLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 3);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
            }
        });
    },

    rampageLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 4);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
        });
        battle.log(`${caster.name} goes on a rampage, causing all enemies to bleed!`);
    },

    frostBreathLogic: function(battle, caster, targets, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const strScaling = spellHelpers.getParam(spell, 'scaling.str', levelIndex, 0.8);
        const slowDuration = spellHelpers.getParam(spell, 'slowDuration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            const damage = caster.stats.str * strScaling;
            battle.dealDamage(caster, enemy, damage, 'magical');
            battle.applyDebuff(enemy, 'Reduce Speed', slowDuration, {});
        });
    },

    // Sorrowshade Hollow Spells
    spiritTouchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical'
        });
    },

    bansheeWailLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const silenceChance = spellHelpers.getParam(spell, 'silenceChance', levelIndex, 0.3);
        const silenceDuration = spellHelpers.getParam(spell, 'silenceDuration', levelIndex, 1);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: false, int: true},
            damageType: 'magical',
            perEnemyEffect: (battle, caster, enemy) => {
                if (Math.random() < silenceChance) {
                    battle.applyDebuff(enemy, 'Silence', silenceDuration, {});
                }
            }
        });
    },

    phaseShiftLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        buffDebuffHelpers.clearDebuffs(caster);
        battle.log(`${caster.name} phases out, removing all debuffs!`);
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    rootSlamLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    entanglingRootsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    sludgeBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical'
        });
    },

    toxicPoolLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
            battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
        });
    },

    corrosiveSplashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.corrosiveSplashPassive = true;
        const levelIndex = spellLevel - 1;
        caster.corrosiveSplashChance = spellHelpers.getParam(spell, 'procChance', levelIndex, 0.3);
        caster.corrosiveSplashDuration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
    },

    shadowBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical'
        });
    },

    shadowVeilLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(target, 'Increase Speed', duration, {});
    },

    darkBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyBuff(target, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        
        if (buffDebuffHelpers.removeFirstDebuff(target)) {
            battle.log(`Removed a debuff from ${target.name}!`);
        }
    },

    spectralSlashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarDrain = spellHelpers.getParam(spell, 'actionBarDrain', levelIndex, 0.1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            afterDamage: (battle, caster, target) => {
                const drain = target.actionBar * actionBarDrain;
                target.actionBar = Math.max(0, target.actionBar - drain);
                battle.log(`${target.name}'s action bar drained by ${Math.floor(actionBarDrain * 100)}%!`);
            }
        });
    },

    deathShriekLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const silenceDuration = spellHelpers.getParam(spell, 'silenceDuration', levelIndex, 1);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: false, int: true},
            damageType: 'magical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Silence', silenceDuration, {});
            }
        });
    },

    mournfulPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarDrain = spellHelpers.getParam(spell, 'actionBarDrain', levelIndex, 0.2);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            const drain = enemy.actionBar * actionBarDrain;
            enemy.actionBar = Math.max(0, enemy.actionBar - drain);
            battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
        });
        battle.log(`Mournful presence drains action bars and slows enemies!`);
    },

    branchWhipLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedChance = spellHelpers.getParam(spell, 'bleedChance', levelIndex, 0.4);
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < bleedChance) {
                    battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
                }
            }
        });
    },

    naturesCorruptionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Blight', 'Bleed', 'Mark'];
        
        const buffCount = buffDebuffHelpers.countBuffs(target);
        if (buffCount > 0) {
            buffDebuffHelpers.clearBuffs(target);
            
            for (let i = 0; i < buffCount; i++) {
                const randomDebuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
                const duration = 2;
                
                if (randomDebuff === 'Bleed') {
                    battle.applyDebuff(target, randomDebuff, duration, { bleedDamage: true });
                } else if (randomDebuff === 'Blight') {
                    battle.applyDebuff(target, randomDebuff, duration, { noHeal: true });
                } else {
                    battle.applyDebuff(target, randomDebuff, duration, {});
                }
            }
            battle.log(`${target.name}'s buffs corrupted into debuffs!`);
        }
    },

    thornedEmbraceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spellHelpers.getParam(spell, 'tauntDuration', levelIndex, 1);
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 3);
        const bleedStacks = spell.bleedStacks || 2;
        
        battle.applyDebuff(target, 'Taunt', tauntDuration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        
        for (let i = 0; i < bleedStacks; i++) {
            battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
        }
    },

    phantomStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const silencedMultiplier = spell.silencedMultiplier || 2.0;
        const multiplier = buffDebuffHelpers.hasDebuff(target, 'Silence') ? silencedMultiplier : 1;
        
        if (multiplier > 1) {
            battle.log(`Phantom strike critical on silenced target!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            damageModifier: multiplier
        });
    },

    wailingChorusLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: false, int: true},
            damageType: 'magical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Mark', duration, {});
            }
        });
    },

    spiritualDrainLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if (buffDebuffHelpers.countBuffs(target) > 0) {
            const stolen = buffDebuffHelpers.clearBuffs(target);
            caster.buffs = caster.buffs || [];
            caster.buffs.push(...stolen);
            battle.log(`${caster.name} steals all buffs from ${target.name}!`);
        }
        
        const stolenActionBar = target.actionBar;
        target.actionBar = 0;
        caster.actionBar = Math.min(10000, caster.actionBar + stolenActionBar);
        battle.log(`${caster.name} drains ${target.name}'s action bar!`);
    },

    queensLamentPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.queensLamentPassive = true;
        caster.queensLamentHealPercent = spell.healPercent || 0.1;
        caster.queensLamentBuffDuration = spell.buffDuration || 2;
    },

    // Forgotten Crypt Spells
    boneStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        if (buffDebuffHelpers.removeBuff(target, 'Shield')) {
            battle.log(`${target.name}'s shield was shattered!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    necroticStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
            }
        });
    },

    deathsAdvanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        battle.applyBuff(caster, 'Immune', duration, { immunity: true });
    },

    cursedArrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const markChance = spellHelpers.getParam(spell, 'markChance', levelIndex, 0.5);
        const markDuration = spellHelpers.getParam(spell, 'markDuration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < markChance) {
                    battle.applyDebuff(target, 'Mark', markDuration, {});
                }
            }
        });
    },

    volleyOfDecayLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            }
        });
    },

    piercingShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (buffDebuffHelpers.getBuffs(target).length > 0) {
                    target.buffs.shift();
                    battle.log(`Piercing shot removes a buff from ${target.name}!`);
                }
            }
        });
    },

    deathBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical'
        });
    },

    darkRitualLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healPercent = spellHelpers.getParam(spell, 'healPercent', levelIndex, 0.2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            const healAmount = ally.maxHp * healPercent;
            battle.healUnit(ally, healAmount);
        });
    },

    corpseShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const targetCount = spellHelpers.getParam(spell, 'targetCount', levelIndex, 2);
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 30);
        
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            
            const targetsToShield = Math.min(targetCount, aliveAllies.length);
            for (let i = 0; i < targetsToShield; i++) {
                battle.applyBuff(aliveAllies[i], 'Shield', -1, { shieldAmount: shieldAmount });
            }
        }
    },

    drainLifeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healPercent = spellHelpers.getParam(spell, 'healPercent', levelIndex, 0.3);
        
        const damage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, int: true});
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    unholyPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        });
    },

    curseOfWeaknessLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
        });
    },

    bloodFangLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healPercent = spellHelpers.getParam(spell, 'healPercent', levelIndex, 0.5);
        
        const damage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, agi: true});
        const damageDealt = battle.dealDamage(caster, target, damage, 'physical');
        
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    crimsonThirstLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedStacks = spellHelpers.getParam(spell, 'bleedStacks', levelIndex, 2);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        for (let i = 0; i < bleedStacks; i++) {
            battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
        }
    },

    batFormLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    frostStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Reduce Speed', duration, {});
            }
        });
    },

    deathGripLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', duration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        });
    },

    unholyShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 40);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    deathPactLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const hpCost = spell.hpCost || 0.2;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        const hpSacrifice = Math.floor(caster.currentHp * hpCost);
        caster.currentHp -= hpSacrifice;
        battle.log(`${caster.name} sacrifices ${hpSacrifice} HP!`);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        });
    },

    fleshRendLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const bleedBonus = spell.bleedBonus || 1.5;
        const multiplier = buffDebuffHelpers.hasDebuff(target, 'Bleed') ? bleedBonus : 1;
        
        if (multiplier > 1) {
            battle.log(`Flesh rend tears into bleeding wounds!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageModifier: multiplier
        });
    },

    corpseExplosionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const missingHpPercent = spellHelpers.getParam(spell, 'missingHpPercent', levelIndex, 0.2);
        const baseDamage = spellHelpers.getParam(spell, 'baseDamage', levelIndex, 50);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            const missingHp = enemy.maxHp - enemy.currentHp;
            const damage = baseDamage + (missingHp * missingHpPercent);
            battle.dealDamage(caster, enemy, damage, 'magical');
        });
    },

    unholyFrenzyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        const stackCount = spell.stackCount || 2;
        
        for (let i = 0; i < stackCount; i++) {
            battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyBuff(caster, 'Increase Speed', duration, {});
        }
    },

    patchworkBodyPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.patchworkBodyPassive = true;
        caster.globalDamageReduction = (caster.globalDamageReduction || 0) + (spell.damageReduction || 0.25);
    },

    // Bandit Den Spells
    dirtyStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const debuffChance = spellHelpers.getParam(spell, 'debuffChance', levelIndex, 0.4);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < debuffChance) {
                    battle.applyDebuff(target, 'Reduce Defense', duration, {});
                }
            }
        });
    },

    suckerPunchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunChance = spellHelpers.getParam(spell, 'stunChance', levelIndex, 0.3);
        const stunDuration = spellHelpers.getParam(spell, 'stunDuration', levelIndex, 1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < stunChance) {
                    battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
                }
            }
        });
    },

    serratedBladeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
            }
        });
    },

    lacerateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedStacks = spellHelpers.getParam(spell, 'bleedStacks', levelIndex, 3);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        for (let i = 0; i < bleedStacks; i++) {
            battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
        }
    },

    poisonArrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const blightChance = spellHelpers.getParam(spell, 'blightChance', levelIndex, 0.4);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < blightChance) {
                    battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
                }
            }
        });
    },

    suppressingFireLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
            }
        });
    },

    heavyStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            }
        });
    },

    intimidateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', duration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        });
    },

    captainsStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarGrant = spellHelpers.getParam(spell, 'actionBarGrant', levelIndex, 0.1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                const allies = battle.getParty(caster);
                allies.forEach(ally => {
                    if (ally.isAlive && ally !== caster) {
                        ally.actionBar += actionBarGrant * 10000;
                        if (ally.actionBar > 10000) ally.actionBar = 10000;
                    }
                });
                battle.log(`Captain's strike rallies the troops!`);
            }
        });
    },

    rallyThievesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        });
    },

    dirtyFightingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Bleed', 'Mark', 'Stun'];
        const debuffCount = spell.debuffCount || 3;
        const duration = 2;
        
        const enemies = battle.getEnemies(caster);
        const aliveEnemies = enemies.filter(e => e && e.isAlive);
        
        for (let i = 0; i < debuffCount && aliveEnemies.length > 0; i++) {
            const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            const randomDebuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
            
            if (randomDebuff === 'Bleed') {
                battle.applyDebuff(randomEnemy, randomDebuff, duration, { bleedDamage: true });
            } else if (randomDebuff === 'Stun') {
                battle.applyDebuff(randomEnemy, randomDebuff, 1, { stunned: true });
            } else {
                battle.applyDebuff(randomEnemy, randomDebuff, duration, {});
            }
        }
        battle.log(`Dirty fighting afflicts enemies with random debuffs!`);
    },

    executeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const executeThreshold = spell.executeThreshold || 0.25;
        
        if ((target.currentHp / target.maxHp) <= executeThreshold) {
            target.currentHp = 0;
            battle.log(`${caster.name} executes ${target.name}!`);
        } else {
            spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
                scalingTypes: {attack: true, str: true},
                damageType: 'pure'
            });
        }
    },

    shadowStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Mark', duration, {});
            }
        });
    },

    smokeBombLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const buffDuration = spellHelpers.getParam(spell, 'buffDuration', levelIndex, 3);
        const debuffDuration = spellHelpers.getParam(spell, 'debuffDuration', levelIndex, 2);
        
        battle.applyBuff(caster, 'Increase Speed', buffDuration, {});
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Attack', debuffDuration, { attackMultiplier: 0.5 });
        });
    },

    lordsBladeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (buffDebuffHelpers.countBuffs(target) > 0) {
                    const stolenBuff = target.buffs.shift();
                    caster.buffs = caster.buffs || [];
                    caster.buffs.push(stolenBuff);
                    battle.log(`${caster.name} steals ${stolenBuff.name} from ${target.name}!`);
                }
            }
        });
    },

    banditsGambitLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const enemies = battle.getEnemies(caster);
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        const stolenBuffs = [];
        
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const stolen = buffDebuffHelpers.clearBuffs(enemy);
                stolenBuffs.push(...stolen);
            }
        });
        
        while (stolenBuffs.length > 0 && aliveAllies.length > 0) {
            const randomAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
            randomAlly.buffs = randomAlly.buffs || [];
            randomAlly.buffs.push(stolenBuffs.shift());
        }
        
        battle.log(`Bandit's gambit redistributes the wealth!`);
    },

    plunderLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarSteal = spellHelpers.getParam(spell, 'actionBarSteal', levelIndex, 0.3);
        
        let totalStolen = 0;
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            const stolen = enemy.actionBar * actionBarSteal;
            enemy.actionBar = Math.max(0, enemy.actionBar - stolen);
            totalStolen += stolen;
        });
        
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        if (aliveAllies.length > 0) {
            const perAlly = totalStolen / aliveAllies.length;
            aliveAllies.forEach(ally => {
                ally.actionBar = Math.min(10000, ally.actionBar + perAlly);
            });
        }
        
        battle.log(`Plunder steals action bar from all enemies!`);
    },

    callToArmsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 50);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Shield', -1, { shieldAmount: shieldAmount });
            battle.applyBuff(ally, 'Increase Defense', duration, {});
        });
    },

    // Gold Mine Spells
    wrenchTossLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Reduce Defense', duration, {});
            }
        });
    },

    makeshift_shieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 40);
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    grenadeLobLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const reducedDefenseBonus = spell.reducedDefenseBonus || 1.5;
        const multiplier = buffDebuffHelpers.hasDebuff(target, 'Reduce Defense') ? reducedDefenseBonus : 1;
        
        if (multiplier > 1) {
            battle.log(`Grenade explodes on weakened armor!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'physical',
            damageModifier: multiplier
        });
    },

    smokeScreenLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
        });
    },

    repairBotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healPercent = spellHelpers.getParam(spell, 'healPercent', levelIndex, 0.15);
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 30);
        
        const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
        if (lowestHpAlly) {
            const healAmount = lowestHpAlly.maxHp * healPercent;
            battle.healUnit(lowestHpAlly, healAmount);
            battle.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: shieldAmount });
        }
    },

    overclockLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        });
    },

    bombVestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const selfDamagePercent = spell.selfDamagePercent || 0.2;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                const selfDamage = caster.maxHp * selfDamagePercent;
                caster.currentHp = Math.max(1, caster.currentHp - selfDamage);
                battle.log(`${caster.name} takes ${Math.floor(selfDamage)} explosive damage!`);
            }
        });
    },

    detonateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            battle.applyDebuff(enemy, 'Stun', 1, { stunned: true });
        });
    },

    shrapnelBlastLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 3);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
            }
        });
    },

    demolitionExpertPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.demolitionExpertPassive = true;
        caster.onDamageTaken = caster.onDamageTaken || [];
        caster.onDamageTaken.push({
            type: 'aoe_retaliation',
            damagePercent: 0.3
        });
    },

    drillChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageOptions: { armorPierce: 0.5 }
        });
    },

    defenseShredderLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const stackCount = spell.stackCount || 2;
        
        for (let i = 0; i < stackCount; i++) {
            battle.applyDebuff(target, 'Reduce Defense', duration, {});
        }
        battle.applyDebuff(target, 'Mark', duration, {});
    },

    scrapCannonLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const debuffBonus = spell.debuffBonus || 50;
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'physical',
            getDamageModifier: (enemy) => {
                const baseDamage = spellHelpers.calculateDamage(spell, levelIndex, caster, {attack: true, int: true});
                const debuffCount = buffDebuffHelpers.countDebuffs(enemy);
                return (baseDamage + (debuffBonus * debuffCount)) / baseDamage;
            }
        });
    },

    reinforcedPlatingPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.reinforcedPlatingPassive = true;
        caster.globalDamageReduction = (caster.globalDamageReduction || 0) + 0.3;
        caster.shieldRegenPercent = 0.1;
        caster.shieldRegenTurns = 3;
    },

    // Centaur Cliffs Spells
    arrowVolleyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const markDuration = spellHelpers.getParam(spell, 'markDuration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Mark', markDuration, {});
            }
        });
    },

    swiftGallopLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        const actionBarGain = spell.actionBarGain || 0.25;
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        caster.actionBar = Math.min(10000, caster.actionBar + (actionBarGain * 10000));
    },

    hoofStompLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunChance = spellHelpers.getParam(spell, 'stunChance', levelIndex, 0.25);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < stunChance) {
                    battle.applyDebuff(target, 'Stun', 1, { stunned: true });
                }
            }
        });
    },

    battleChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Taunt', 1, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
            }
        });
    },

    earthenBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healAmount = spellHelpers.getParam(spell, 'healAmount', levelIndex, 40);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.healUnit(ally, healAmount);
            battle.applyBuff(ally, 'Increase Defense', duration, {});
        });
    },

    ancestralVigorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const healPercent = spell.healPercent || 0.03;
        
        battle.applyBuff(target, 'Increase Speed', duration, {});
        
        if (!target.ancestralVigorRegen) {
            target.ancestralVigorRegen = healPercent;
            target.ancestralVigorDuration = duration;
        }
    },

    stampedeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const knockbackPercent = spell.knockbackPercent || 0.3;
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            perEnemyEffect: (battle, caster, enemy) => {
                enemy.actionBar = Math.max(0, enemy.actionBar - (enemy.actionBar * knockbackPercent));
            }
        });
    },

    warStompLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
        });
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        });
    },

    rallyingHornLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        const actionBarGrant = spell.actionBarGrant || 0.2;
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            ally.actionBar = Math.min(10000, ally.actionBar + (actionBarGrant * 10000));
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        });
    },

    tribalLeaderPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.tribalLeaderPassive = true;
        caster.auraBuffs = ['Increase Attack', 'Increase Defense'];
        caster.auraDuration = 1;
    },

    hornGoreLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 3);
        const bleedStacks = spell.bleedStacks || 2;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageOptions: { armorPierce: 0.3 },
            afterDamage: (battle, caster, target) => {
                for (let i = 0; i < bleedStacks; i++) {
                    battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
                }
            }
        });
    },

    bloodRageLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const stackCount = spell.stackCount || 3;
        
        for (let i = 0; i < stackCount; i++) {
            battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        }
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    thunderousChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const actionBarPercent = caster.actionBar / 10000;
        const damageMultiplier = 1 + actionBarPercent;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageModifier: damageMultiplier,
            afterDamage: (battle, caster, target) => {
                caster.actionBar = 0;
            }
        });
    },

    savageMomentumPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.savageMomentumPassive = true;
        caster.onDamageCalculation = caster.onDamageCalculation || [];
        caster.onDamageCalculation.push({
            type: 'missing_hp_damage',
            maxBonus: 0.5
        });
    },

    // Orc Warlands Spells
    brutalSwingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    bloodlustLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        const hpCost = spell.hpCost || 0.1;
        
        const hpSacrifice = Math.floor(caster.maxHp * hpCost);
        caster.currentHp = Math.max(1, caster.currentHp - hpSacrifice);
        
        battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    recklessAssaultLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const selfDebuffDuration = spell.selfDebuffDuration || 2;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(caster, 'Reduce Defense', selfDebuffDuration, {});
            }
        });
    },

    furyStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const hitCount = spell.hitCount || 3;
        
        for (let i = 0; i < hitCount; i++) {
            if (target.isAlive) {
                spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
                    scalingTypes: {attack: true, str: true},
                    damageType: 'physical'
                });
            }
        }
    },

    lightningBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical'
        });
    },

    bloodlustTotemLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyDebuff(ally, 'Bleed', 1, { bleedDamage: true });
        });
    },

    executeSwingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const executeThreshold = spell.executeThreshold || 0.35;
        const multiplier = (target.currentHp / target.maxHp) <= executeThreshold ? 3 : 1;
        
        if (multiplier > 1) {
            battle.log(`Execute swing devastates the wounded target!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageModifier: multiplier
        });
    },

    intimidatingShoutLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
        });
    },

    commandPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 60);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Increase Defense', duration, {});
        
        const enemies = battle.getEnemies(caster);
        const aliveEnemies = enemies.filter(e => e && e.isAlive);
        if (aliveEnemies.length > 0) {
            aliveEnemies.sort((a, b) => b.source.attack - a.source.attack);
            battle.applyDebuff(aliveEnemies[0], 'Taunt', duration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        }
    },

    warmasterPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.warmasterPassive = true;
        caster.warmasterAttackBonus = 0.25;
    },

    bladeFlurryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const critChance = spell.critChance || 0.3;
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            getDamageModifier: () => Math.random() < critChance ? 2 : 1,
            perEnemyEffect: (battle, caster, enemy, spell, levelIndex, modifier) => {
                if (modifier === 2) {
                    battle.log(`Critical blade strike!`);
                }
            }
        });
    },

    mirrorImageLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        buffDebuffHelpers.clearDebuffs(caster);
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        
        if (!caster.mirrorImageDodge) {
            caster.mirrorImageDodge = true;
            caster.dodgePhysical = (caster.dodgePhysical || 0) + 0.5;
            caster.mirrorImageDuration = duration;
        }
    },

    windWalkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical'
        });
        
        for (let i = 0; i < 2; i++) {
            battle.applyBuff(caster, 'Increase Speed', duration, {});
        }
    },

    bladeMasteryPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.bladeMasteryPassive = true;
        caster.onAttackEffects = caster.onAttackEffects || [];
        caster.onAttackEffects.push({
            type: 'extra_attack_chance',
            chance: 0.3
        });
    },

    // Snapdragon Swamp Spells
    venomSpitLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const blightChance = spellHelpers.getParam(spell, 'blightChance', levelIndex, 0.5);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < blightChance) {
                    battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
                }
            }
        });
    },

    toxicSporesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
            battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
        });
    },

    regenerativeRootsPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.regenerativeRootsPassive = true;
        caster.regenHealPercent = spell.healPercent || 0.03;
        caster.regenHpThreshold = spell.hpThreshold || 0.5;
    },

    brutalClubLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const markBonus = spell.markBonus || 1.5;
        const multiplier = buffDebuffHelpers.hasDebuff(target, 'Mark') ? markBonus : 1;
        
        if (multiplier > 1) {
            battle.log(`Brutal club crushes the marked target!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            damageModifier: multiplier
        });
    },

    intimidatingRoarLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            battle.applyDebuff(enemy, 'Taunt', duration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        });
    },

    thickSkullLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 50);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    hexBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const silenceChance = spellHelpers.getParam(spell, 'silenceChance', levelIndex, 0.3);
        const silenceDuration = spellHelpers.getParam(spell, 'silenceDuration', levelIndex, 1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < silenceChance) {
                    battle.applyDebuff(target, 'Silence', silenceDuration, {});
                }
            }
        });
    },

    swampCurseLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    darkRitualSwampLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healAmount = spellHelpers.getParam(spell, 'healAmount', levelIndex, 40);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
        if (lowestHpAlly) {
            battle.healUnit(lowestHpAlly, healAmount);
            battle.applyBuff(lowestHpAlly, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        }
    },

    ambushStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffThreshold = spell.debuffThreshold || 3;
        const damageType = buffDebuffHelpers.countDebuffs(target) >= debuffThreshold ? 'pure' : 'physical';
        
        if (damageType === 'pure') {
            battle.log(`Ambush strike finds all weaknesses!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: damageType
        });
    },

    murkyDisappearanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        buffDebuffHelpers.clearDebuffs(caster);
        battle.log(`${caster.name} disappears into the murk!`);
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    stalkersMarkPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.stalkersMarkPassive = true;
        caster.markDuration = spell.markDuration || 1;
    },

    crushingTendrilsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunChance = spellHelpers.getParam(spell, 'stunChance', levelIndex, 0.3);
        const stunDuration = spell.stunDuration || 1;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                if (Math.random() < stunChance) {
                    battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
                }
            }
        });
    },

    bogArmorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 80);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    swampsEmbraceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spellHelpers.getParam(spell, 'tauntDuration', levelIndex, 1);
        const bleedDuration = spellHelpers.getParam(spell, 'bleedDuration', levelIndex, 3);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', tauntDuration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
            battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
        });
    },

    naturesVengeancePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.naturesVengeancePassive = true;
        caster.naturesVengeanceChance = spell.procChance || 0.3;
        caster.naturesVengeanceDuration = spell.duration || 2;
    },

    rendingTalonsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        if (buffDebuffHelpers.removeBuff(target, 'Shield')) {
            battle.log(`${target.name}'s shield was shredded!`);
        }
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
            }
        });
    },

    wisdomsCallLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        });
    },

    moonlitBarrierLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 60);
        const targetCount = spell.targetCount || 3;
        
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            
            const targetsToShield = Math.min(targetCount, aliveAllies.length);
            for (let i = 0; i < targetsToShield; i++) {
                battle.applyBuff(aliveAllies[i], 'Shield', -1, { shieldAmount: shieldAmount });
            }
        }
    },

    ancientKnowledgeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const enemies = battle.getEnemies(caster);
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        const stolenBuffs = [];
        
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const stolen = buffDebuffHelpers.clearBuffs(enemy, ['Boss']);
                stolenBuffs.push(...stolen);
            }
        });
        
        while (stolenBuffs.length > 0 && aliveAllies.length > 0) {
            const randomAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
            const buff = stolenBuffs.shift();
            randomAlly.buffs = randomAlly.buffs || [];
            randomAlly.buffs.push(buff);
        }
        
        battle.log(`${caster.name} steals enemy knowledge and shares it with allies!`);
    },

    // Lizardman Volcano Spells
    scaleSlashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
            }
        });
    },

    battleFrenzyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const debuffDuration = spellHelpers.getParam(spell, 'debuffDuration', levelIndex, 2);
        
        battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        battle.applyDebuff(caster, 'Reduce Defense', debuffDuration, {});
    },

    warriorsChallengeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        battle.applyDebuff(target, 'Mark', duration, {});
    },

    spiritFlameLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const healPercent = spell.healPercent || 0.3;
        
        const damage = spellHelpers.calculateDamage(spell, spellLevel - 1, caster, {attack: true, int: true});
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
        if (lowestHpAlly) {
            const healAmount = damageDealt * healPercent;
            battle.healUnit(lowestHpAlly, healAmount);
        }
    },

    ancestralWardLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 40);
        const immuneDuration = spell.immuneDuration || 1;
        
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(target, 'Immune', immuneDuration, { immunity: true });
    },

    tribalChantLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const regenPercent = spellHelpers.getParam(spell, 'regenPercent', levelIndex, 0.03);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            if (buffDebuffHelpers.removeFirstDebuff(ally)) {
                battle.log(`Cleansed a debuff from ${ally.name}!`);
            }
            
            ally.tribalChantRegen = regenPercent;
            ally.tribalChantDuration = duration;
            battle.log(`${ally.name} begins regenerating ${Math.floor(regenPercent * 100)}% HP per turn!`);
        });
    },

    precisionShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const armorPierce = spell.armorPierce || 0.25;
        const actionBarDrain = spell.actionBarDrain || 0.1;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            damageOptions: { armorPierce: armorPierce },
            afterDamage: (battle, caster, target) => {
                const drain = target.actionBar * actionBarDrain;
                target.actionBar = Math.max(0, target.actionBar - drain);
                battle.log(`${target.name}'s action bar drained!`);
            }
        });
    },

    huntersFocusLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.huntersFocusActive = true;
        battle.log(`${caster.name} focuses for a devastating shot!`);
    },

    predatorsInstinctPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.predatorsInstinctPassive = true;
        caster.predatorsDamageBonus = spell.damageBonus || 1.5;
        caster.predatorsHpThreshold = spell.hpThreshold || 0.3;
    },

    moltenStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Reduce Defense', duration, {});
            }
        });
    },

    lavaShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const maxPercent = spellHelpers.getParam(spell, 'maxPercent', levelIndex, 0.3);
        
        const missingHp = caster.maxHp - caster.currentHp;
        const shieldAmount = Math.min(missingHp, caster.maxHp * maxPercent);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    burningAuraPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.burningAuraPassive = true;
        caster.burningAuraDamage = spell.retaliationDamage || 50;
        caster.burningAuraDebuffDuration = spell.debuffDuration || 1;
    },

    warchiefBladeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical'
        });
    },

    rallyTheTribeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const actionBarGrant = spell.actionBarGrant || 0.3;
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Defense', duration, {});
            ally.actionBar = Math.min(10000, ally.actionBar + (actionBarGrant * 10000));
        });
    },

    featheredFuryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const hitCount = spell.hitCount || 3;
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Bleed', 'Blight', 'Mark'];
        
        for (let i = 0; i < hitCount; i++) {
            if (target.isAlive) {
                spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
                    scalingTypes: {attack: true, str: true},
                    damageType: 'physical',
                    afterDamage: (battle, caster, target) => {
                        const randomDebuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
                        const duration = 2;
                        
                        if (randomDebuff === 'Bleed') {
                            battle.applyDebuff(target, randomDebuff, duration, { bleedDamage: true });
                        } else if (randomDebuff === 'Blight') {
                            battle.applyDebuff(target, randomDebuff, duration, { noHeal: true });
                        } else {
                            battle.applyDebuff(target, randomDebuff, duration, {});
                        }
                    }
                });
            }
        }
    },

    commandersPresencePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.commandersPresencePassive = true;
        caster.commandersAttackBonus = spell.attackBonus || 0.1;
    },

    trickStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const buffStealCount = spell.buffStealCount || 2;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, agi: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                for (let i = 0; i < buffStealCount && buffDebuffHelpers.countBuffs(target) > 0; i++) {
                    const stolenBuff = target.buffs.shift();
                    caster.buffs = caster.buffs || [];
                    caster.buffs.push(stolenBuff);
                    battle.log(`${caster.name} steals ${stolenBuff.name}!`);
                }
            }
        });
    },

    smokeAndMirrorsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const dodgePhysical = spell.dodgePhysical || 0.5;
        const dodgeMagical = spell.dodgeMagical || 0.5;
        const speedStacks = spell.speedStacks || 2;
        
        if (!caster.smokeAndMirrorsDodge) {
            caster.smokeAndMirrorsDodge = true;
            caster.dodgePhysical = (caster.dodgePhysical || 0) + dodgePhysical;
            caster.dodgeMagical = (caster.dodgeMagical || 0) + dodgeMagical;
            caster.smokeAndMirrorsDuration = duration;
        }
        
        for (let i = 0; i < speedStacks; i++) {
            battle.applyBuff(caster, 'Increase Speed', duration, {});
        }
    },

    chaosToxtinLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffCount = spell.debuffCount || 3;
        const targetCount = spell.targetCount || 3;
        const duration = spell.duration || 2;
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Bleed', 'Blight', 'Mark', 'Stun', 'Silence'];
        
        const enemies = battle.getEnemies(caster);
        const aliveEnemies = enemies.filter(e => e && e.isAlive);
        
        for (let i = 0; i < targetCount && aliveEnemies.length > 0; i++) {
            const randomEnemy = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
            
            for (let j = 0; j < debuffCount; j++) {
                const randomDebuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
                
                if (randomDebuff === 'Bleed') {
                    battle.applyDebuff(randomEnemy, randomDebuff, duration, { bleedDamage: true });
                } else if (randomDebuff === 'Blight') {
                    battle.applyDebuff(randomEnemy, randomDebuff, duration, { noHeal: true });
                } else if (randomDebuff === 'Stun' || randomDebuff === 'Silence') {
                    battle.applyDebuff(randomEnemy, randomDebuff, 1, randomDebuff === 'Stun' ? { stunned: true } : {});
                } else {
                    battle.applyDebuff(randomEnemy, randomDebuff, duration, {});
                }
            }
        }
    },

    masterOfDeceptionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Blight', 'Bleed', 'Mark', 'Stun', 'Silence'];
        const duration = 2;
        
        const buffCount = buffDebuffHelpers.countBuffs(target, ['Boss']);
        if (buffCount > 0) {
            buffDebuffHelpers.clearBuffs(target, ['Boss']);
            
            for (let i = 0; i < buffCount; i++) {
                const randomDebuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
                
                if (randomDebuff === 'Bleed') {
                    battle.applyDebuff(target, randomDebuff, duration, { bleedDamage: true });
                } else if (randomDebuff === 'Blight') {
                    battle.applyDebuff(target, randomDebuff, duration, { noHeal: true });
                } else if (randomDebuff === 'Stun' || randomDebuff === 'Silence') {
                    battle.applyDebuff(target, randomDebuff, 1, randomDebuff === 'Stun' ? { stunned: true } : {});
                } else {
                    battle.applyDebuff(target, randomDebuff, duration, {});
                }
            }
            
            battle.log(`${caster.name} twists ${target.name}'s buffs into debuffs!`);
        } else {
            battle.log(`${target.name} has no buffs to twist!`);
        }
    },

    // Puzzle Sanctuary Spells
    frostStrikeRevenantLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Reduce Speed', duration, {});
            }
        });
    },

    icyGraspLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunDuration = spellHelpers.getParam(spell, 'stunDuration', levelIndex, 1);
        const actionBarDrain = spell.actionBarDrain || 0.2;
        
        battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
        
        const drain = target.actionBar * actionBarDrain;
        target.actionBar = Math.max(0, target.actionBar - drain);
        battle.log(`${target.name} is frozen in place!`);
    },

    frozenSoulPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.frozenSoulPassive = true;
        caster.immuneToReduceSpeed = true;
        caster.magicResist = (caster.magicResist || 0) + (spell.magicResist || 0.2);
    },

    chillTouchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const frostArmorDuration = spell.frostArmorDuration || 2;
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            afterDamage: (battle, caster, target) => {
                const lowestHpAlly = spellHelpers.getLowestHpAlly(battle, caster);
                if (lowestHpAlly) {
                    battle.applyBuff(lowestHpAlly, 'Frost Armor', frostArmorDuration, {});
                }
            }
        });
    },

    spectralWailLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Silence', duration, {});
        });
    },

    phaseWalkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const actionBarGrant = spell.actionBarGrant || 0.5;
        
        buffDebuffHelpers.clearDebuffs(target);
        battle.log(`${target.name} phases through reality!`);
        
        target.actionBar = Math.min(10000, target.actionBar + (actionBarGrant * 10000));
    },

    stoneSlamLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunDuration = spellHelpers.getParam(spell, 'stunDuration', levelIndex, 1);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
            }
        });
    },

    crystallineShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 100);
        const tauntDuration = spellHelpers.getParam(spell, 'tauntDuration', levelIndex, 2);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Taunt', tauntDuration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        });
    },

    shatterPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.shatterPassive = true;
        caster.shatterDamage = spell.aoeDamage || 200;
        caster.shatterSlowDuration = spell.slowDuration || 2;
    },

    soulDrainLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const healPercent = spell.healPercent || 0.5;
        
        const damage = spellHelpers.calculateDamage(spell, spellLevel - 1, caster, {attack: true, int: true});
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    wraithFormLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        
        battle.applyBuff(caster, 'Immune', duration, { immunity: true });
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    lifeTapLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const hpCost = spell.hpCost || 0.2;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        
        const hpSacrifice = Math.floor(caster.currentHp * hpCost);
        caster.currentHp = Math.max(1, caster.currentHp - hpSacrifice);
        battle.log(`${caster.name} sacrifices ${hpSacrifice} HP!`);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        });
    },

    tombStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.basicDamageSpell(battle, caster, target, spell, spellLevel, {
            scalingTypes: {attack: true, str: true},
            damageType: 'physical',
            afterDamage: (battle, caster, target) => {
                battle.applyDebuff(target, 'Mark', duration, {});
                battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
            }
        });
    },

    eternalGuardLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 50);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.forEachAliveAlly(battle, caster, ally => {
            battle.applyBuff(ally, 'Shield', -1, { shieldAmount: shieldAmount });
        });
        
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    deathsDoorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const missingHpPercent = spellHelpers.getParam(spell, 'missingHpPercent', levelIndex, 0.3);
        const baseDamage = spellHelpers.getParam(spell, 'baseDamage', levelIndex, 100);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            const missingHp = enemy.maxHp - enemy.currentHp;
            const damage = baseDamage + (missingHp * missingHpPercent);
            battle.dealDamage(caster, enemy, damage, 'magical');
        });
    },

    undyingWillPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        caster.undyingWillPassive = true;
        caster.undyingWillHealPercent = spell.healPercent || 0.3;
    },

    frozenSoulBlastLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        
        spellHelpers.aoeDamageSpell(battle, caster, spell, spellLevel, {
            scalingTypes: {attack: true, int: true},
            damageType: 'magical',
            perEnemyEffect: (battle, caster, enemy) => {
                battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
                battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            }
        });
    },

    lichsPhylacteryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const shieldPercent = spell.shieldPercent || 0.5;
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const stolen = buffDebuffHelpers.clearBuffs(enemy);
                caster.buffs = caster.buffs || [];
                caster.buffs.push(...stolen);
            }
        });
        
        const shieldAmount = caster.maxHp * shieldPercent;
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    deathAndDecayLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 3);
        const actionBarDrain = spell.actionBarDrain || 0.3;
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
            battle.applyDebuff(enemy, 'Bleed', duration, { bleedDamage: true });
            
            const drain = enemy.actionBar * actionBarDrain;
            enemy.actionBar = Math.max(0, enemy.actionBar - drain);
        });
    },

    eternalWinterLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const hpDrainPercent = spell.hpDrainPercent || 0.1;
        let totalDrained = 0;
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            const drainAmount = Math.floor(enemy.maxHp * hpDrainPercent);
            const actualDrain = Math.min(drainAmount, enemy.currentHp - 1);
            enemy.currentHp -= actualDrain;
            totalDrained += actualDrain;
            battle.log(`${enemy.name} loses ${actualDrain} HP to eternal winter!`);
        });
        
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0 && totalDrained > 0) {
            const shieldPerAlly = Math.floor(totalDrained / aliveAllies.length);
            aliveAllies.forEach(ally => {
                battle.applyBuff(ally, 'Shield', -1, { shieldAmount: shieldPerAlly });
            });
            battle.log(`Allies gain ${shieldPerAlly} shield from the stolen life force!`);
        }
    },

    // Test Spells
    winLogic: function(battle, caster, targets, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spellHelpers.getParam(spell, 'scaling.base', levelIndex, 10000000);
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 5);
        
        spellHelpers.forEachAliveEnemy(battle, caster, enemy => {
            battle.dealDamage(caster, enemy, baseDamage, 'pure');
        });
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    loseLogic: function(battle, caster, targets, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spellHelpers.getParam(spell, 'scaling.base', levelIndex, 10000000);
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.currentHp > 0) {
                battle.dealDamage(caster, ally, baseDamage, 'pure');
            }
        });
    },

    increaseAttackTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        battle.applyBuff(target, 'Increase Attack', duration, { damageMultiplier: 1.5 });
    },

    increaseSpeedTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(target, 'Increase Speed', duration, {});
    },

    increaseDefenseTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(target, 'Increase Defense', duration, {});
    },

    immuneTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(target, 'Immune', duration, { immunity: true });
    },

    shieldTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spellHelpers.getParam(spell, 'shieldAmount', levelIndex, 50);
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    frostArmorTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyBuff(target, 'Frost Armor', duration, {});
    },

    reduceAttackTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
    },

    reduceSpeedTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    reduceDefenseTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Reduce Defense', duration, {});
    },
    
    blightTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    bleedTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    stunTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 1);
        battle.applyDebuff(target, 'Stun', duration, { stunned: true });
    },

    tauntTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
    },

    silenceTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Silence', duration, {});
    },

    markTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spellHelpers.getParam(spell, 'duration', levelIndex, 2);
        battle.applyDebuff(target, 'Mark', duration, {});
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
