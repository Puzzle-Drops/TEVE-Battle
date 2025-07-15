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

    // Acolyte Family Spells
    holySmiteLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Find lowest HP ally
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            const healAmount = damage * healPercent;
            battle.healUnit(lowestHpAlly, healAmount);
        }
    },

    divineLightLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseHeal = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const healAmount = baseHeal + (caster.stats.int * intScaling);
        battle.healUnit(target, healAmount);
        
        // Remove one debuff
        if (target.debuffs && target.debuffs.length > 0) {
            target.debuffs.shift(); // Remove first debuff
            battle.log(`Removed a debuff from ${target.name}!`);
        }
    },

    sanctuaryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                // Apply Increase Defense
                battle.applyBuff(ally, 'Increase Defense', duration, {});
                
                // Convert debuffs to Increase Attack
                if (ally.debuffs && ally.debuffs.length > 0) {
                    const debuffCount = ally.debuffs.length;
                    ally.debuffs = [];
                    for (let i = 0; i < debuffCount; i++) {
                        battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
                    }
                    battle.log(`${ally.name}'s debuffs converted to Increase Attack!`);
                }
            }
        });
    },

    massHealLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseHeal = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const healAmount = baseHeal + (caster.stats.int * intScaling);
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.healUnit(ally, healAmount);
            }
        });
    },

    hierophantMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when buffs are applied
        caster.hierophantMalePassive = true;
    },

    hierophantFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled during turn processing
        caster.hierophantFemalePassive = true;
    },

    prophetMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled during healing
        caster.prophetMalePassive = true;
    },

    prophetessFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled during healing
        caster.prophetessFemalePassive = true;
    },

    // Archer Family Spells
    aimedShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    
    // Break shield first
    if (target.buffs) {
        const shieldIndex = target.buffs.findIndex(b => b.name === 'Shield');
        if (shieldIndex !== -1) {
            target.buffs.splice(shieldIndex, 1);
            battle.log(`${target.name}'s shield was broken!`);
        }
    }
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
    // Deal damage with armor pierce (handled in battle.dealDamage)
    battle.dealDamage(caster, target, damage, 'physical', { armorPierce: spell.armorPierce });
    
    // Monster Hunter Male Passive - Apply bleed
    if (caster.aimedShotAppliesBleed && target.isAlive) {
        battle.applyDebuff(target, 'Bleed', caster.aimedShotBleedDuration || 1, { bleedDamage: true });
    }
    
    // Monster Hunter Female Passive - Gain action bar per debuff
    if (caster.aimedShotActionBarPerDebuff && target.debuffs) {
        const actionBarGain = target.debuffs.length * caster.aimedShotActionBarPerDebuff * 10000;
        caster.actionBar += actionBarGain;
        if (actionBarGain > 0) {
            battle.log(`${caster.name} gains ${Math.floor(actionBarGain / 100)}% action bar!`);
        }
    }
},

    huntersMarkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    doubleShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const debuffDuration = spell.debuffDuration[levelIndex] || spell.debuffDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        
        // First shot to target with Reduce Defense
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Defense', debuffDuration, {});
        
        // Second shot to random enemy with Bleed
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
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const debuffBonus = spell.debuffBonus[levelIndex] || spell.debuffBonus[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const debuffCount = (enemy.debuffs ? enemy.debuffs.length : 0);
                const damage = baseDamage + (caster.source.attack * attackScaling) + 
                              (caster.stats.agi * agiScaling) + (debuffBonus * debuffCount);
                battle.dealDamage(caster, enemy, damage, 'physical');
            }
        });
    },

    sniperMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Applies extra damage to low HP enemies
    caster.onDamageCalculation = caster.onDamageCalculation || [];
    caster.onDamageCalculation.push({
        type: 'executioner',
        damageBonus: 1.5,
        hpThreshold: 0.3
    });
},

sniperFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Grants speed buff on kill
    caster.onKillEffects = caster.onKillEffects || [];
    caster.onKillEffects.push({
        type: 'buff',
        buffName: 'Increase Speed',
        duration: 2
    });
},

monsterHunterMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Aimed Shot applies bleed
    caster.aimedShotAppliesBleed = true;
    caster.aimedShotBleedDuration = 1;
},

monsterHunterFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Gain action bar per debuff on aimed shot target
    caster.aimedShotActionBarPerDebuff = 0.05;
},


    // Druid Family Spells
    naturesBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Grant 10% action bar to lowest HP ally
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            lowestHpAlly.actionBar += 1000; // 10% of 10000
            battle.log(`${lowestHpAlly.name} gained 10% action bar!`);
            
            // Summoner Female passive - heal lowest HP ally
            if (caster.summonerFemalePassive) {
                const healAmount = Math.floor(lowestHpAlly.maxHp * 0.05);
                battle.healUnit(lowestHpAlly, healAmount);
            }
        }
        
        // Summoner Male passive - drain action bar from lowest HP enemy
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
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Apply Increase Defense
        battle.applyBuff(target, 'Increase Defense', duration, {});
        
        // Heal 5% HP
        const healAmount = target.maxHp * spell.healPercent;
        battle.healUnit(target, healAmount);
        
        // Grant 5% max HP shield
        const shieldAmount = target.maxHp * spell.shieldPercent;
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    primalRoarLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'physical');
                battle.applyDebuff(enemy, 'Reduce Attack', duration, {});
                
                // Runemaster Male passive - also taunt
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
        const healAmount = spell.healAmount[levelIndex] || spell.healAmount[0];
        const damageAmount = spell.damageAmount[levelIndex] || spell.damageAmount[0];
        
        // This spell can target allies or enemies
        // If targeting allies, remove debuffs and heal
        // If targeting enemies, remove buffs and damage
        // For simplicity, we'll implement it as affecting both teams
        
        // Cleanse allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                ally.debuffs = [];
                battle.healUnit(ally, healAmount);
                battle.log(`${ally.name} cleansed and healed!`);
            }
        });
        
        // Dispel enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                enemy.buffs = [];
                battle.dealDamage(caster, enemy, damageAmount, 'magical');
                battle.log(`${enemy.name} dispelled and damaged!`);
            }
        });
    },

    runemasterMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Primal Roar
        caster.runemasterMalePassive = true;
    },

    runemasterFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive triggers Nature's Blessing when taking magical damage
        caster.runemasterFemalePassive = true;
        caster.retaliateWithNaturesBlessing = true;
    },

    summonerMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Nature's Blessing
        caster.summonerMalePassive = true;
    },

    summonerFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Nature's Blessing
        caster.summonerFemalePassive = true;
    },

    // Initiate Family Spells
    arcaneMissilesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        
        // Hit primary target
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Hit each debuffed enemy once
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive && enemy !== target && enemy.debuffs && enemy.debuffs.length > 0) {
                battle.dealDamage(caster, enemy, damage, 'magical');
            }
        });
    },

    frostArmorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    helpingHandLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // Remove all debuffs
        target.debuffs = [];
        battle.log(`All debuffs removed from ${target.name}!`);
        
        // Fill action bar to 100%
        target.actionBar = 10000;
        battle.log(`${target.name}'s action bar filled to 100%!`);
    },

    twilightsPromiseLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // Consume 10% action bar from all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                ally.actionBar = Math.max(0, ally.actionBar - 1000);
            }
        });
        
        // Set up Twilight's End for next turn
        caster.twilightsEndPending = true;
        battle.log(`${caster.name} prepares Twilight's End!`);
    },

    twilightsEndLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = 2000 + (levelIndex * 1000); // Massive damage scaling
        const attackScaling = 1.0;
        const intScaling = 1.0;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'magical');
                // Reduce action bar by 50%
                enemy.actionBar = Math.floor(enemy.actionBar * 0.5);
            }
        });
    },

    whiteWizardMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when cleansing
        caster.whiteWizardMalePassive = true;
    },

    whiteWitchFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when cleansing
        caster.whiteWitchFemalePassive = true;
    },

    archSageMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when receiving debuffs
        caster.archSageMalePassive = true;
    },

    archSageFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when receiving debuffs
        caster.archSageFemalePassive = true;
    },

    // Swordsman Family Spells
    bladeStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        
        // 150% damage if target is bleeding
        if (target.debuffs && target.debuffs.some(d => d.name === 'Bleed')) {
            damage *= spell.bleedBonus;
            battle.log(`Critical strike on bleeding target!`);
        }
        
        battle.dealDamage(caster, target, damage, 'physical');
    },

    shieldBashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spell.tauntDuration[levelIndex] || spell.tauntDuration[0];
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        
        // Taunt target
        battle.applyDebuff(target, 'Taunt', tauntDuration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        
        // Gain shield
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    rallyBannerLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Taunt all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Taunt', duration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
            }
        });
        
        // Allies gain Increase Attack and action bar
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
                ally.actionBar += 3000; // 30%
            }
        });
    },

    bloodPactLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        
        // Apply 2 bleed stacks to self
        for (let i = 0; i < spell.bleedStacks; i++) {
            battle.applyDebuff(caster, 'Bleed', bleedDuration, { bleedDamage: true });
        }
        
        // Taunt all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Taunt', bleedDuration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
                
                // Apply 2 bleed stacks to taunted enemies
                for (let i = 0; i < spell.bleedStacks; i++) {
                    battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
                }
            }
        });
    },

    championMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Add stun counter effect
    caster.onDamageTaken = caster.onDamageTaken || [];
    caster.onDamageTaken.push({
        type: 'stun_counter',
        chance: 0.2,
        duration: 1
    });
},

championFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Start with shield and regenerate it
    const shieldAmount = Math.floor(caster.maxHp * 0.2);
    battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    caster.shieldRegenTimer = 0;
    caster.shieldRegenTurns = 4;
    caster.shieldRegenAmount = shieldAmount;
    caster.championFemalePassive = true;
},

avengerMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // When attacked by taunted enemy, apply blight
    caster.avengerBlightOnTauntedAttack = true;
},

avengerFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Already properly implemented in dealDamage
    caster.actionBarGainOnDamage = 0.15;
},

    // Templar Family Spells
    psiStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        
        if (target.actionBar >= 3000) { // 30% action bar
            // Physical damage and drain action bar
            battle.dealDamage(caster, target, damage, 'physical');
            target.actionBar = Math.max(0, target.actionBar - 500); // Drain 5%
        } else {
            // Pure damage
            battle.dealDamage(caster, target, damage, 'pure');
        }
    },

    psychicMarkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
        
        // Dark Arch Templar Female passive - also apply Blight
        if (caster.darkArchTemplarFemalePassive) {
            battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
        }
    },

    voidStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const debuffCount = target.debuffs ? target.debuffs.length : 0;
    
    if (debuffCount > 0) {
        for (let i = 0; i < debuffCount; i++) {
            // Use psiStrikeLogic directly
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
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        // Steal action bar
        const stolenActionBar = target.actionBar;
        caster.actionBar = Math.min(10000, caster.actionBar + stolenActionBar);
        
        // Deal damage
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Set target to 25% action bar (or 0% if female passive)
        if (caster.grandTemplarFemalePassive) {
            target.actionBar = 0;
        } else {
            target.actionBar = 2500;
        }
    },

    darkArchTemplarMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled on kill
        caster.darkArchTemplarMalePassive = true;
    },

    darkArchTemplarFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Psychic Mark
        caster.darkArchTemplarFemalePassive = true;
    },

    grandTemplarMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive adds stun chance to all abilities
        caster.grandTemplarMalePassive = true;
        caster.globalStunChance = spell.stunChance;
    },

    grandTemplarFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Psi Shift
        caster.grandTemplarFemalePassive = true;
    },

    // Thief Family Spells
    cheapShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        
        // Transfer random debuff
        if (caster.debuffs && caster.debuffs.length > 0) {
            const randomIndex = Math.floor(Math.random() * caster.debuffs.length);
            const debuff = caster.debuffs.splice(randomIndex, 1)[0];
            target.debuffs = target.debuffs || [];
            target.debuffs.push(debuff);
            battle.log(`${caster.name} transfers ${debuff.name} to ${target.name}!`);
        }
        
        let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        let damageType = 'physical';
        
        // Phantom Assassin Female passive - pure damage if below 50% HP
        if (caster.phantomAssassinFemalePassive && caster.cheapShotPureThreshold) {
            if ((target.currentHp / target.maxHp) < caster.cheapShotPureThreshold) {
                damageType = 'pure';
            }
        }
        
        battle.dealDamage(caster, target, damage, damageType);
        
        // Master Stalker passive - add bleed
        if (caster.cheapShotAddsBleed && target.isAlive) {
            battle.applyDebuff(target, 'Bleed', 2, { bleedDamage: true });
        }
    },

    crippleLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
        battle.applyDebuff(target, 'Reduce Attack', duration, {});
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    assassinateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        
        if ((target.currentHp / target.maxHp) < spell.hpThreshold && target.debuffs && target.debuffs.length > 0) {
            const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
            battle.dealDamage(caster, target, damage, 'pure');
        } else {
            battle.log(`Assassinate conditions not met!`);
        }
    },

    shadowstepLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    phantomAssassinMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled on Assassinate kill
        caster.phantomAssassinMalePassive = true;
        caster.actionBarRefillOnKill = spell.actionBarRefill;
    },

    phantomAssassinFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Cheap Shot
        caster.phantomAssassinFemalePassive = true;
        caster.cheapShotPureThreshold = spell.hpThreshold;
    },

    masterStalkerMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive adds dodge and modifies Cheap Shot
        caster.masterStalkerMalePassive = true;
        caster.dodgePure = spell.dodgePure;
        caster.dodgeMagical = spell.dodgeMagical;
        caster.dodgePhysical = spell.dodgePhysical;
        caster.cheapShotAddsBleed = true;
    },

    masterStalkerFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive adds dodge and modifies Cheap Shot
        caster.masterStalkerFemalePassive = true;
        caster.dodgePure = spell.dodgePure;
        caster.dodgePhysical = spell.dodgePhysical;
        caster.dodgeMagical = spell.dodgeMagical;
        caster.cheapShotAddsBleed = true;
    },

    // Witch Hunter Family Spells
    purgeSlashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        let buffsRemoved = 0;
        let damageType = 'physical';
        
        // Grand Inquisitor Female passive - remove 2 buffs
        const buffsToRemove = caster.grandInquisitorFemalePassive && caster.purgeSlashBuffRemoveCount ? 
            caster.purgeSlashBuffRemoveCount : 1;
        
        // Remove buffs
        if (target.buffs && target.buffs.length > 0) {
            for (let i = 0; i < buffsToRemove && target.buffs.length > 0; i++) {
                target.buffs.shift();
                buffsRemoved++;
            }
            battle.log(`Removed ${buffsRemoved} buff${buffsRemoved > 1 ? 's' : ''} from ${target.name}!`);
        }
        
        // Grand Inquisitor Male passive - pure damage if no buffs
        if (caster.grandInquisitorMalePassive && buffsRemoved === 0) {
            damageType = 'pure';
        }
        
        // Professional Witcher passives - check for silenced target
        if (target.debuffs && target.debuffs.some(d => d.name === 'Silence')) {
            if (caster.professionalWitcherMalePassive) {
                damageType = 'pure';
            }
            // Female passive makes it unavoidable (handled in dealDamage via dodge mechanics)
        }
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, damageType);
    },

    nullbladeCleaveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const buffBonus = spell.buffBonus[levelIndex] || spell.buffBonus[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const buffCount = enemy.buffs ? enemy.buffs.length : 0;
                const damage = baseDamage + (caster.source.attack * attackScaling) + 
                              (caster.stats.int * intScaling) + (buffBonus * buffCount);
                battle.dealDamage(caster, enemy, damage, 'physical');
            }
        });
    },

    stealMagicLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Transfer all buffs from target to random allies
        if (target.buffs && target.buffs.length > 0) {
            const allies = battle.getParty(caster);
            const aliveAllies = allies.filter(a => a && a.isAlive);
            
            while (target.buffs.length > 0 && aliveAllies.length > 0) {
                const buff = target.buffs.shift();
                const randomAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
                randomAlly.buffs = randomAlly.buffs || [];
                randomAlly.buffs.push(buff);
                battle.log(`${buff.name} stolen and given to ${randomAlly.name}!`);
            }
        } else {
            // No buffs to steal, apply Reduce Defense
            battle.applyDebuff(target, 'Reduce Defense', duration, {});
        }
    },

    hexLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Silence', duration, {});
    },

    grandInquisitorMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Silver Bolt
        caster.grandInquisitorMalePassive = true;
    },

    grandInquisitorFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Silver Bolt
        caster.grandInquisitorFemalePassive = true;
        caster.purgeSlashBuffRemoveCount = spell.buffRemoveCount;
    },

    professionalWitcherMalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Silver Bolt vs silenced
        caster.professionalWitcherMalePassive = true;
    },

    professionalWitcherFemalePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive modifies Silver Bolt vs silenced
        caster.professionalWitcherFemalePassive = true;
    },

    // Boss/Enemy Spells
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
    },
    // Sorrowshade Hollow Spells
    spiritTouchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
    },

    bansheeWailLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const silenceChance = spell.silenceChance[levelIndex] || spell.silenceChance[0];
        const silenceDuration = spell.silenceDuration[levelIndex] || spell.silenceDuration[0];
        
        const damage = baseDamage + (caster.stats.int * intScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'magical');
                if (Math.random() < silenceChance) {
                    battle.applyDebuff(enemy, 'Silence', silenceDuration, {});
                }
            }
        });
    },

    phaseShiftLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Remove all debuffs
        caster.debuffs = [];
        battle.log(`${caster.name} phases out, removing all debuffs!`);
        
        // Apply speed buff
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    rootSlamLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    entanglingRootsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    sludgeBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
    },

    toxicPoolLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
                battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            }
        });
    },

    corrosiveSplashLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const procChance = spell.procChance[levelIndex] || spell.procChance[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    // This passive is handled when taking damage
    caster.corrosiveSplashPassive = true;
    caster.corrosiveSplashChance = procChance;
    caster.corrosiveSplashDuration = duration;
},

    shadowBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
    },

    shadowVeilLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Increase Speed', duration, {});
    },

    darkBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        
        // Remove one debuff
        if (target.debuffs && target.debuffs.length > 0) {
            target.debuffs.shift();
            battle.log(`Removed a debuff from ${target.name}!`);
        }
    },

    spectralSlashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const actionBarDrain = spell.actionBarDrain[levelIndex] || spell.actionBarDrain[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Drain action bar
        const drain = target.actionBar * actionBarDrain;
        target.actionBar = Math.max(0, target.actionBar - drain);
        battle.log(`${target.name}'s action bar drained by ${Math.floor(actionBarDrain * 100)}%!`);
    },

    deathShriekLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const silenceDuration = spell.silenceDuration[levelIndex] || spell.silenceDuration[0];
        
        const damage = baseDamage + (caster.stats.int * intScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'magical');
                battle.applyDebuff(enemy, 'Silence', silenceDuration, {});
            }
        });
    },

    mournfulPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarDrain = spell.actionBarDrain[levelIndex] || spell.actionBarDrain[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const drain = enemy.actionBar * actionBarDrain;
                enemy.actionBar = Math.max(0, enemy.actionBar - drain);
                battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
            }
        });
        battle.log(`Mournful presence drains action bars and slows enemies!`);
    },

    branchWhipLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

    naturesCorruptionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Blight', 'Bleed', 'Mark'];
        
        if (target.buffs && target.buffs.length > 0) {
            const buffCount = target.buffs.length;
            target.buffs = [];
            
            // Apply random debuffs equal to number of buffs removed
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
        const tauntDuration = spell.tauntDuration[levelIndex] || spell.tauntDuration[0];
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
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
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const silencedMultiplier = spell.silencedMultiplier || 2.0;
        
        let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        
        // Double damage if target is silenced
        if (target.debuffs && target.debuffs.some(d => d.name === 'Silence')) {
            damage *= silencedMultiplier;
            battle.log(`Phantom strike critical on silenced target!`);
        }
        
        battle.dealDamage(caster, target, damage, 'magical');
    },

    wailingChorusLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.stats.int * intScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'magical');
                battle.applyDebuff(enemy, 'Mark', duration, {});
            }
        });
    },

    spiritualDrainLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // Steal all buffs
        if (target.buffs && target.buffs.length > 0) {
            caster.buffs = caster.buffs || [];
            while (target.buffs.length > 0) {
                const buff = target.buffs.shift();
                caster.buffs.push(buff);
            }
            battle.log(`${caster.name} steals all buffs from ${target.name}!`);
        }
        
        // Steal all action bar
        const stolenActionBar = target.actionBar;
        target.actionBar = 0;
        caster.actionBar = Math.min(10000, caster.actionBar + stolenActionBar);
        battle.log(`${caster.name} drains ${target.name}'s action bar!`);
    },

    queensLamentPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when units die
        caster.queensLamentPassive = true;
        caster.queensLamentHealPercent = spell.healPercent || 0.1;
        caster.queensLamentBuffDuration = spell.buffDuration || 2;
    },

    // Forgotten Crypt Spells
    boneStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        // Remove shield first
        if (target.buffs) {
            const shieldIndex = target.buffs.findIndex(b => b.name === 'Shield');
            if (shieldIndex !== -1) {
                target.buffs.splice(shieldIndex, 1);
                battle.log(`${target.name}'s shield was shattered!`);
            }
        }
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    necroticStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    deathsAdvanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        battle.applyBuff(caster, 'Immune', duration, { immunity: true });
    },

    cursedArrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const markChance = spell.markChance[levelIndex] || spell.markChance[0];
        const markDuration = spell.markDuration[levelIndex] || spell.markDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < markChance) {
            battle.applyDebuff(target, 'Mark', markDuration, {});
        }
    },

    volleyOfDecayLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'physical');
                battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            }
        });
    },

    piercingShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        // Remove one buff
        if (target.buffs && target.buffs.length > 0) {
            target.buffs.shift();
            battle.log(`Piercing shot removes a buff from ${target.name}!`);
        }
    },

    deathBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
    },

    darkRitualLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                const healAmount = ally.maxHp * healPercent;
                battle.healUnit(ally, healAmount);
            }
        });
    },

    corpseShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const targetCount = spell.targetCount[levelIndex] || spell.targetCount[0];
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            // Sort by HP percentage
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            
            // Shield lowest HP allies
            const targetsToShield = Math.min(targetCount, aliveAllies.length);
            for (let i = 0; i < targetsToShield; i++) {
                battle.applyBuff(aliveAllies[i], 'Shield', -1, { shieldAmount: shieldAmount });
            }
        }
    },

    drainLifeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        // Heal self for percentage of damage dealt
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    unholyPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            }
        });
    },

    curseOfWeaknessLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
                battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            }
        });
    },

    bloodFangLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'physical');
        
        // Heal for percentage of damage dealt
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    crimsonThirstLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedStacks = spell.bleedStacks[levelIndex] || spell.bleedStacks[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        for (let i = 0; i < bleedStacks; i++) {
            battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
        }
    },

    batFormLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    frostStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    deathGripLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Taunt', duration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
            }
        });
    },

    unholyShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    deathPactLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const hpCost = spell.hpCost || 0.2;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Sacrifice HP
        const hpSacrifice = Math.floor(caster.currentHp * hpCost);
        caster.currentHp -= hpSacrifice;
        battle.log(`${caster.name} sacrifices ${hpSacrifice} HP!`);
        
        // Grant buff to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            }
        });
    },

    fleshRendLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const bleedBonus = spell.bleedBonus || 1.5;
        
        let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        
        // Bonus damage vs bleeding targets
        if (target.debuffs && target.debuffs.some(d => d.name === 'Bleed')) {
            damage *= bleedBonus;
            battle.log(`Flesh rend tears into bleeding wounds!`);
        }
        
        battle.dealDamage(caster, target, damage, 'physical');
    },

    corpseExplosionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const missingHpPercent = spell.missingHpPercent[levelIndex] || spell.missingHpPercent[0];
        const baseDamage = spell.baseDamage[levelIndex] || spell.baseDamage[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const missingHp = enemy.maxHp - enemy.currentHp;
                const damage = baseDamage + (missingHp * missingHpPercent);
                battle.dealDamage(caster, enemy, damage, 'magical');
            }
        });
    },

    unholyFrenzyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        const stackCount = spell.stackCount || 2;
        
        for (let i = 0; i < stackCount; i++) {
            battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyBuff(caster, 'Increase Speed', duration, {});
        }
    },

    patchworkBodyPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled in damage calculation
        caster.patchworkBodyPassive = true;
        caster.globalDamageReduction = (caster.globalDamageReduction || 0) + (spell.damageReduction || 0.25);
    },

    // Bandit Den Spells
    dirtyStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const debuffChance = spell.debuffChance[levelIndex] || spell.debuffChance[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < debuffChance) {
            battle.applyDebuff(target, 'Reduce Defense', duration, {});
        }
    },

    suckerPunchLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

    serratedBladeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    lacerateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const bleedStacks = spell.bleedStacks[levelIndex] || spell.bleedStacks[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        for (let i = 0; i < bleedStacks; i++) {
            battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
        }
    },

    poisonArrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const blightChance = spell.blightChance[levelIndex] || spell.blightChance[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < blightChance) {
            battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
        }
    },

    suppressingFireLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'physical');
                battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
            }
        });
    },

    heavyStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
    },

    intimidateLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Taunt', duration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
            }
        });
    },

    captainsStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const actionBarGrant = spell.actionBarGrant[levelIndex] || spell.actionBarGrant[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        // Grant action bar to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive && ally !== caster) {
                ally.actionBar += actionBarGrant * 10000;
                if (ally.actionBar > 10000) ally.actionBar = 10000;
            }
        });
        battle.log(`Captain's strike rallies the troops!`);
    },

    rallyThievesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
                battle.applyBuff(ally, 'Increase Speed', duration, {});
            }
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
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const executeThreshold = spell.executeThreshold || 0.25;
        
        if ((target.currentHp / target.maxHp) <= executeThreshold) {
            // Instant kill
            target.currentHp = 0;
            battle.log(`${caster.name} executes ${target.name}!`);
        } else {
            // Heavy pure damage
            const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
            battle.dealDamage(caster, target, damage, 'pure');
        }
    },

    shadowStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Mark', duration, {});
    },

    smokeBombLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const buffDuration = spell.buffDuration[levelIndex] || spell.buffDuration[0];
        const debuffDuration = spell.debuffDuration[levelIndex] || spell.debuffDuration[0];
        
        // Self buff
        battle.applyBuff(caster, 'Increase Speed', buffDuration, {});
        
        // Enemy debuff
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Reduce Attack', debuffDuration, { attackMultiplier: 0.5 });
            }
        });
    },

    lordsBladeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        // Steal one buff
        if (target.buffs && target.buffs.length > 0) {
            const stolenBuff = target.buffs.shift();
            caster.buffs = caster.buffs || [];
            caster.buffs.push(stolenBuff);
            battle.log(`${caster.name} steals ${stolenBuff.name} from ${target.name}!`);
        }
    },

    banditsGambitLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        const enemies = battle.getEnemies(caster);
        
        // Collect all buffs from enemies
        const stolenBuffs = [];
        enemies.forEach(enemy => {
            if (enemy.isAlive && enemy.buffs && enemy.buffs.length > 0) {
                while (enemy.buffs.length > 0) {
                    stolenBuffs.push(enemy.buffs.shift());
                }
            }
        });
        
        // Distribute buffs randomly among allies
        while (stolenBuffs.length > 0 && aliveAllies.length > 0) {
            const randomAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
            randomAlly.buffs = randomAlly.buffs || [];
            randomAlly.buffs.push(stolenBuffs.shift());
        }
        
        battle.log(`Bandit's gambit redistributes the wealth!`);
    },

    plunderLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const actionBarSteal = spell.actionBarSteal[levelIndex] || spell.actionBarSteal[0];
        
        let totalStolen = 0;
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const stolen = enemy.actionBar * actionBarSteal;
                enemy.actionBar = Math.max(0, enemy.actionBar - stolen);
                totalStolen += stolen;
            }
        });
        
        // Distribute stolen action bar among allies
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
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Shield', -1, { shieldAmount: shieldAmount });
                battle.applyBuff(ally, 'Increase Defense', duration, {});
            }
        });
    },
    // Gold Mine Spells
wrenchTossLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.applyDebuff(target, 'Reduce Defense', duration, {});
},

makeshift_shieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
    
    battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
},

grenadeLobLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    const reducedDefenseBonus = spell.reducedDefenseBonus || 1.5;
    
    let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
    
    // Bonus damage vs reduced defense
    if (target.debuffs && target.debuffs.some(d => d.name === 'Reduce Defense')) {
        damage *= reducedDefenseBonus;
        battle.log(`Grenade explodes on weakened armor!`);
    }
    
    battle.dealDamage(caster, target, damage, 'physical');
},

smokeScreenLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
        }
    });
},

repairBotLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
    const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
    
    // Heal lowest HP ally
    const allies = battle.getParty(caster);
    const aliveAllies = allies.filter(a => a && a.isAlive);
    
    if (aliveAllies.length > 0) {
        aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
        const lowestHpAlly = aliveAllies[0];
        const healAmount = lowestHpAlly.maxHp * healPercent;
        battle.healUnit(lowestHpAlly, healAmount);
        battle.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: shieldAmount });
    }
},

overclockLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        }
    });
},

bombVestLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const selfDamagePercent = spell.selfDamagePercent || 0.2;
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    
    // Self damage
    const selfDamage = caster.maxHp * selfDamagePercent;
    caster.currentHp = Math.max(1, caster.currentHp - selfDamage);
    battle.log(`${caster.name} takes ${Math.floor(selfDamage)} explosive damage!`);
},

detonateLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            battle.applyDebuff(enemy, 'Stun', 1, { stunned: true });
        }
    });
},

shrapnelBlastLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.dealDamage(caster, enemy, damage, 'physical');
            battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
        }
    });
},

demolitionExpertPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // When taking damage, deal AoE damage
    caster.demolitionExpertPassive = true;
    caster.onDamageTaken = caster.onDamageTaken || [];
    caster.onDamageTaken.push({
        type: 'aoe_retaliation',
        damagePercent: 0.3
    });
},

drillChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical', { armorPierce: 0.5 });
},

defenseShredderLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const stackCount = spell.stackCount || 2;
    
    for (let i = 0; i < stackCount; i++) {
        battle.applyDebuff(target, 'Reduce Defense', duration, {});
    }
    battle.applyDebuff(target, 'Mark', duration, {});
},

scrapCannonLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    const debuffBonus = spell.debuffBonus || 50;
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            const debuffCount = (enemy.debuffs ? enemy.debuffs.length : 0);
            const damage = baseDamage + (caster.source.attack * attackScaling) + 
                          (caster.stats.int * intScaling) + (debuffBonus * debuffCount);
            battle.dealDamage(caster, enemy, damage, 'physical');
        }
    });
},

reinforcedPlatingPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Damage reduction and shield regeneration
    caster.reinforcedPlatingPassive = true;
    caster.globalDamageReduction = (caster.globalDamageReduction || 0) + 0.3;
    caster.shieldRegenPercent = 0.1;
    caster.shieldRegenTurns = 3;
},

// Centaur Cliffs Spells
arrowVolleyLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    const markDuration = spell.markDuration[levelIndex] || spell.markDuration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.applyDebuff(target, 'Mark', markDuration, {});
},

swiftGallopLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const actionBarGain = spell.actionBarGain || 0.25;
    
    battle.applyBuff(caster, 'Increase Speed', duration, {});
    caster.actionBar = Math.min(10000, caster.actionBar + (actionBarGain * 10000));
},

hoofStompLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const stunChance = spell.stunChance[levelIndex] || spell.stunChance[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    
    if (Math.random() < stunChance) {
        battle.applyDebuff(target, 'Stun', 1, { stunned: true });
    }
},

battleChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.applyDebuff(target, 'Taunt', 1, { 
        tauntTarget: caster,
        forcedTarget: caster.position,
        forcedTargetIsEnemy: caster.isEnemy
    });
},

earthenBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const healAmount = spell.healAmount[levelIndex] || spell.healAmount[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.healUnit(ally, healAmount);
            battle.applyBuff(ally, 'Increase Defense', duration, {});
        }
    });
},

ancestralVigorLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const healPercent = spell.healPercent || 0.03;
    
    battle.applyBuff(target, 'Increase Speed', duration, {});
    
    // Add regen effect
    if (!target.ancestralVigorRegen) {
        target.ancestralVigorRegen = healPercent;
        target.ancestralVigorDuration = duration;
    }
},

stampedeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const knockbackPercent = spell.knockbackPercent || 0.3;
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.dealDamage(caster, enemy, damage, 'physical');
            enemy.actionBar = Math.max(0, enemy.actionBar - (enemy.actionBar * knockbackPercent));
        }
    });
},

warStompLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
        }
    });
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        }
    });
},

rallyingHornLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const actionBarGrant = spell.actionBarGrant || 0.2;
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            ally.actionBar = Math.min(10000, ally.actionBar + (actionBarGrant * 10000));
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        }
    });
},

tribalLeaderPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Allies gain stats when near this unit
    caster.tribalLeaderPassive = true;
    caster.auraBuffs = ['Increase Attack', 'Increase Defense'];
    caster.auraDuration = 1;
},

hornGoreLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
    const bleedStacks = spell.bleedStacks || 2;
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical', { armorPierce: 0.3 });
    
    for (let i = 0; i < bleedStacks; i++) {
        battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
    }
},

bloodRageLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const stackCount = spell.stackCount || 3;
    
    for (let i = 0; i < stackCount; i++) {
        battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
    }
    battle.applyBuff(caster, 'Increase Speed', duration, {});
},

thunderousChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    
    // Damage increases based on caster's action bar
    const actionBarPercent = caster.actionBar / 10000;
    const damageMultiplier = 1 + actionBarPercent;
    
    const damage = (baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling)) * damageMultiplier;
    battle.dealDamage(caster, target, damage, 'physical');
    
    // Reset action bar
    caster.actionBar = 0;
},

savageMomentumPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Gain damage based on missing HP
    caster.savageMomentumPassive = true;
    caster.onDamageCalculation = caster.onDamageCalculation || [];
    caster.onDamageCalculation.push({
        type: 'missing_hp_damage',
        maxBonus: 0.5
    });
},

// Orc Warlands Spells
brutalSwingLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
},

bloodlustLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const hpCost = spell.hpCost || 0.1;
    
    // Sacrifice HP for power
    const hpSacrifice = Math.floor(caster.maxHp * hpCost);
    caster.currentHp = Math.max(1, caster.currentHp - hpSacrifice);
    
    battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
    battle.applyBuff(caster, 'Increase Speed', duration, {});
},

recklessAssaultLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const selfDebuffDuration = spell.selfDebuffDuration || 2;
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    
    // Apply Reduce Defense to self
    battle.applyDebuff(caster, 'Reduce Defense', selfDebuffDuration, {});
},

furyStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const hitCount = spell.hitCount || 3;
    
    // Multiple hits
    for (let i = 0; i < hitCount; i++) {
        if (target.isAlive) {
            const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
            battle.dealDamage(caster, target, damage, 'physical');
        }
    }
},

lightningBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
    battle.dealDamage(caster, target, damage, 'magical');
},

bloodlustTotemLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            // Also apply bleed to self for synergy
            battle.applyDebuff(ally, 'Bleed', 1, { bleedDamage: true });
        }
    });
},

executeSwingLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const executeThreshold = spell.executeThreshold || 0.35;
    
    let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    
    if ((target.currentHp / target.maxHp) <= executeThreshold) {
        damage *= 3; // Triple damage vs low HP
        battle.log(`Execute swing devastates the wounded target!`);
    }
    
    battle.dealDamage(caster, target, damage, 'physical');
},

intimidatingShoutLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
        }
    });
},

commandPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
    
    battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    battle.applyBuff(caster, 'Increase Defense', duration, {});
    
    // Taunt highest attack enemy
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
    // Allies gain attack when they have bleed
    caster.warmasterPassive = true;
    caster.warmasterAttackBonus = 0.25;
},

bladeFlurryLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    const critChance = spell.critChance || 0.3;
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
            
            // Critical strike chance
            if (Math.random() < critChance) {
                damage *= 2;
                battle.log(`Critical blade strike!`);
            }
            
            battle.dealDamage(caster, enemy, damage, 'physical');
        }
    });
},

mirrorImageLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    // Remove debuffs and gain evasion
    caster.debuffs = [];
    battle.applyBuff(caster, 'Increase Speed', duration, {});
    
    // Add dodge chance
    if (!caster.mirrorImageDodge) {
        caster.mirrorImageDodge = true;
        caster.dodgePhysical = (caster.dodgePhysical || 0) + 0.5;
        caster.mirrorImageDuration = duration;
    }
},

windWalkLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    // Damage all enemies
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
            battle.dealDamage(caster, enemy, damage, 'physical');
        }
    });
    
    // Gain massive speed
    for (let i = 0; i < 2; i++) {
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    }
},

bladeMasteryPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Each attack has chance to grant extra attack
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
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const blightChance = spell.blightChance[levelIndex] || spell.blightChance[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < blightChance) {
            battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
        }
    },

    toxicSporesLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
                battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            }
        });
    },

    regenerativeRootsPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled during turn processing
        caster.regenerativeRootsPassive = true;
        caster.regenHealPercent = spell.healPercent || 0.03;
        caster.regenHpThreshold = spell.hpThreshold || 0.5;
    },

    brutalClubLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const markBonus = spell.markBonus || 1.5;
        
        let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        
        // Bonus damage vs marked targets
        if (target.debuffs && target.debuffs.some(d => d.name === 'Mark')) {
            damage *= markBonus;
            battle.log(`Brutal club crushes the marked target!`);
        }
        
        battle.dealDamage(caster, target, damage, 'physical');
    },

    intimidatingRoarLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
                battle.applyDebuff(enemy, 'Taunt', duration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
            }
        });
    },

    thickSkullLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    hexBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const silenceChance = spell.silenceChance[levelIndex] || spell.silenceChance[0];
        const silenceDuration = spell.silenceDuration[levelIndex] || spell.silenceDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        if (Math.random() < silenceChance) {
            battle.applyDebuff(target, 'Silence', silenceDuration, {});
        }
    },

    swampCurseLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    darkRitualSwampLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const healAmount = spell.healAmount[levelIndex] || spell.healAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Find lowest HP ally
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            
            battle.healUnit(lowestHpAlly, healAmount);
            battle.applyBuff(lowestHpAlly, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        }
    },

    ambushStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const debuffThreshold = spell.debuffThreshold || 3;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        
        let damageType = 'physical';
        if (target.debuffs && target.debuffs.length >= debuffThreshold) {
            damageType = 'pure';
            battle.log(`Ambush strike finds all weaknesses!`);
        }
        
        battle.dealDamage(caster, target, damage, damageType);
    },

    murkyDisappearanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Remove all debuffs
        caster.debuffs = [];
        battle.log(`${caster.name} disappears into the murk!`);
        
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    stalkersMarkPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when attacking
        caster.stalkersMarkPassive = true;
        caster.markDuration = spell.markDuration || 1;
    },

    crushingTendrilsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const stunChance = spell.stunChance[levelIndex] || spell.stunChance[0];
        const stunDuration = spell.stunDuration || 1;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        if (Math.random() < stunChance) {
            battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
        }
    },

    bogArmorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    swampsEmbraceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const tauntDuration = spell.tauntDuration[levelIndex] || spell.tauntDuration[0];
        const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Taunt', tauntDuration, { 
                    tauntTarget: caster,
                    forcedTarget: caster.position,
                    forcedTargetIsEnemy: caster.isEnemy
                });
                battle.applyDebuff(enemy, 'Bleed', bleedDuration, { bleedDamage: true });
            }
        });
    },

    naturesVengeancePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when taking damage
        caster.naturesVengeancePassive = true;
        caster.naturesVengeanceChance = spell.procChance || 0.3;
        caster.naturesVengeanceDuration = spell.duration || 2;
    },

    rendingTalonsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Remove shield first
        if (target.buffs) {
            const shieldIndex = target.buffs.findIndex(b => b.name === 'Shield');
            if (shieldIndex !== -1) {
                target.buffs.splice(shieldIndex, 1);
                battle.log(`${target.name}'s shield was shredded!`);
            }
        }
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    wisdomsCallLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
                battle.applyBuff(ally, 'Increase Speed', duration, {});
            }
        });
    },

    moonlitBarrierLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const targetCount = spell.targetCount || 3;
        
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            // Sort by HP percentage
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            
            // Shield lowest HP allies
            const targetsToShield = Math.min(targetCount, aliveAllies.length);
            for (let i = 0; i < targetsToShield; i++) {
                battle.applyBuff(aliveAllies[i], 'Shield', -1, { shieldAmount: shieldAmount });
            }
        }
    },

    ancientKnowledgeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This requires special implementation
        battle.log(`${caster.name} channels ancient knowledge!`);
        // Implementation will be handled in battle system
    },

    // Lizardman Volcano Spells
    scaleSlashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    battleFrenzyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        const debuffDuration = spell.debuffDuration[levelIndex] || spell.debuffDuration[0];
        
        battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: 1.5 });
        battle.applyBuff(caster, 'Increase Speed', duration, {});
        battle.applyDebuff(caster, 'Reduce Defense', debuffDuration, {});
    },

    warriorsChallengeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
        battle.applyDebuff(target, 'Mark', duration, {});
    },

    spiritFlameLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const healPercent = spell.healPercent || 0.3;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        // Heal lowest HP ally
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            const healAmount = damageDealt * healPercent;
            battle.healUnit(lowestHpAlly, healAmount);
        }
    },

    ancestralWardLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const immuneDuration = spell.immuneDuration || 1;
        
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(target, 'Immune', immuneDuration, { immunity: true });
    },

    tribalChantLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                // Remove one debuff
                if (ally.debuffs && ally.debuffs.length > 0) {
                    ally.debuffs.shift();
                    battle.log(`Cleansed a debuff from ${ally.name}!`);
                }
                
                // Implementation note: Regen will need special handling
                battle.log(`${ally.name} begins regenerating!`);
            }
        });
    },

    precisionShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const armorPierce = spell.armorPierce || 0.25;
        const actionBarDrain = spell.actionBarDrain || 0.1;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical', { armorPierce: armorPierce });
        
        // Drain action bar
        const drain = target.actionBar * actionBarDrain;
        target.actionBar = Math.max(0, target.actionBar - drain);
        battle.log(`${target.name}'s action bar drained!`);
    },

    huntersFocusLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // Mark that next attack should deal double damage
        caster.huntersFocusActive = true;
        battle.log(`${caster.name} focuses for a devastating shot!`);
    },

    predatorsInstinctPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled in damage calculation
        caster.predatorsInstinctPassive = true;
        caster.predatorsDamageBonus = spell.damageBonus || 1.5;
        caster.predatorsHpThreshold = spell.hpThreshold || 0.3;
    },

    moltenStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        battle.applyDebuff(target, 'Reduce Defense', duration, {});
    },

    lavaShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const maxPercent = spell.maxPercent[levelIndex] || spell.maxPercent[0];
        
        const missingHp = caster.maxHp - caster.currentHp;
        const shieldAmount = Math.min(missingHp, caster.maxHp * maxPercent);
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    burningAuraPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when taking damage
        caster.burningAuraPassive = true;
        caster.burningAuraDamage = spell.retaliationDamage || 50;
        caster.burningAuraDebuffDuration = spell.debuffDuration || 1;
    },

    warchiefBladeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'physical');
            }
        });
    },

    rallyTheTribeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        const actionBarGrant = spell.actionBarGrant || 0.3;
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Defense', duration, {});
                ally.actionBar = Math.min(10000, ally.actionBar + (actionBarGrant * 10000));
            }
        });
    },

    featheredFuryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const hitCount = spell.hitCount || 3;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        const debuffTypes = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Bleed', 'Blight', 'Mark'];
        
        for (let i = 0; i < hitCount; i++) {
            if (target.isAlive) {
                battle.dealDamage(caster, target, damage, 'physical');
                
                // Apply random debuff
                const randomDebuff = debuffTypes[Math.floor(Math.random() * debuffTypes.length)];
                if (randomDebuff === 'Bleed') {
                    battle.applyDebuff(target, randomDebuff, 2, { bleedDamage: true });
                } else if (randomDebuff === 'Blight') {
                    battle.applyDebuff(target, randomDebuff, 2, { noHeal: true });
                } else {
                    battle.applyDebuff(target, randomDebuff, 2, {});
                }
            }
        }
    },

    commandersPresencePassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled when allies have buffs
        caster.commandersPresencePassive = true;
        caster.commandersAttackBonus = spell.attackBonus || 0.1;
    },

    trickStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const buffStealCount = spell.buffStealCount || 2;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        // Steal buffs
        if (target.buffs && target.buffs.length > 0) {
            for (let i = 0; i < buffStealCount && target.buffs.length > 0; i++) {
                const stolenBuff = target.buffs.shift();
                caster.buffs = caster.buffs || [];
                caster.buffs.push(stolenBuff);
                battle.log(`${caster.name} steals ${stolenBuff.name}!`);
            }
        }
    },

    smokeAndMirrorsLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        const dodgePhysical = spell.dodgePhysical || 0.5;
        const dodgeMagical = spell.dodgeMagical || 0.5;
        const speedStacks = spell.speedStacks || 2;
        
        // Add dodge
        if (!caster.smokeAndMirrorsDodge) {
            caster.smokeAndMirrorsDodge = true;
            caster.dodgePhysical = (caster.dodgePhysical || 0) + dodgePhysical;
            caster.dodgeMagical = (caster.dodgeMagical || 0) + dodgeMagical;
            caster.smokeAndMirrorsDuration = duration;
        }
        
        // Apply speed buffs
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
        // This requires special implementation
        battle.log(`${caster.name} twists reality!`);
        // Implementation will be handled in battle system
    },

    // Puzzle Sanctuary Spells
    frostStrikeRevenantLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    icyGraspLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const stunDuration = spell.stunDuration[levelIndex] || spell.stunDuration[0];
        const actionBarDrain = spell.actionBarDrain || 0.2;
        
        battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
        
        // Drain action bar
        const drain = target.actionBar * actionBarDrain;
        target.actionBar = Math.max(0, target.actionBar - drain);
        battle.log(`${target.name} is frozen in place!`);
    },

    frozenSoulPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled in damage calculation and debuff application
        caster.frozenSoulPassive = true;
        caster.immuneToReduceSpeed = true;
        caster.magicResist = (caster.magicResist || 0) + (spell.magicResist || 0.2);
    },

    chillTouchLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const frostArmorDuration = spell.frostArmorDuration || 2;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        
        // Apply Frost Armor to lowest HP ally
        const allies = battle.getParty(caster);
        const aliveAllies = allies.filter(a => a && a.isAlive);
        
        if (aliveAllies.length > 0) {
            aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const lowestHpAlly = aliveAllies[0];
            battle.applyBuff(lowestHpAlly, 'Frost Armor', frostArmorDuration, {});
        }
    },

    spectralWailLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Silence', duration, {});
            }
        });
    },

    phaseWalkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const actionBarGrant = spell.actionBarGrant || 0.5;
        
        // Remove all debuffs
        target.debuffs = [];
        battle.log(`${target.name} phases through reality!`);
        
        // Grant action bar
        target.actionBar = Math.min(10000, target.actionBar + (actionBarGrant * 10000));
    },

    stoneSlamLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const stunDuration = spell.stunDuration[levelIndex] || spell.stunDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
    },

    crystallineShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const tauntDuration = spell.tauntDuration[levelIndex] || spell.tauntDuration[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        
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

    shatterPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This passive is handled on death
        caster.shatterPassive = true;
        caster.shatterDamage = spell.aoeDamage || 200;
        caster.shatterSlowDuration = spell.slowDuration || 2;
    },

    soulDrainLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const healPercent = spell.healPercent || 0.5;
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        // Heal self
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    wraithFormLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Immune', duration, { immunity: true });
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    lifeTapLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const hpCost = spell.hpCost || 0.2;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Sacrifice HP
        const hpSacrifice = Math.floor(caster.currentHp * hpCost);
        caster.currentHp = Math.max(1, caster.currentHp - hpSacrifice);
        battle.log(`${caster.name} sacrifices ${hpSacrifice} HP!`);
        
        // Grant buff to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            }
        });
    },

    tombStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    eternalGuardLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        // Grant shields to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Shield', -1, { shieldAmount: shieldAmount });
            }
        });
        
        // Self gains Increase Defense
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    deathsDoorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const missingHpPercent = spell.missingHpPercent[levelIndex] || spell.missingHpPercent[0];
        const baseDamage = spell.baseDamage[levelIndex] || spell.baseDamage[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                const missingHp = enemy.maxHp - enemy.currentHp;
                const damage = baseDamage + (missingHp * missingHpPercent);
                battle.dealDamage(caster, enemy, damage, 'magical');
            }
        });
    },

    undyingWillPassiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // This requires special implementation
        caster.undyingWillPassive = true;
        caster.undyingWillHealPercent = spell.healPercent || 0.3;
    },

    frozenSoulBlastLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'magical');
                battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
                battle.applyDebuff(enemy, 'Reduce Attack', duration, { attackMultiplier: 0.5 });
            }
        });
    },

    lichsPhylacteryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const shieldPercent = spell.shieldPercent || 0.5;
        
        // Steal all buffs from all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive && enemy.buffs && enemy.buffs.length > 0) {
                while (enemy.buffs.length > 0) {
                    const stolenBuff = enemy.buffs.shift();
                    caster.buffs = caster.buffs || [];
                    caster.buffs.push(stolenBuff);
                }
            }
        });
        
        // Gain shield
        const shieldAmount = caster.maxHp * shieldPercent;
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    deathAndDecayLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        const actionBarDrain = spell.actionBarDrain || 0.3;
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
                battle.applyDebuff(enemy, 'Bleed', duration, { bleedDamage: true });
                
                // Drain action bar
                const drain = enemy.actionBar * actionBarDrain;
                enemy.actionBar = Math.max(0, enemy.actionBar - drain);
            }
        });
    },

    eternalWinterLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const hpDrainPercent = spell.hpDrainPercent || 0.1;
        
        // This requires special implementation
        battle.log(`${caster.name} brings eternal winter!`);
        // Implementation will be handled in battle system
    },
    // Test Spells
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

    frostArmorTestLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Frost Armor', duration, {});
    },

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
