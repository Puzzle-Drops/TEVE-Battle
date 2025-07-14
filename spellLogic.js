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
    spectralWailLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        battle.applyDebuff(target, 'Reduce Attack', duration, {});
    },

    soulSiphonLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        const healAmount = damageDealt * healPercent;
        battle.healUnit(caster, healAmount);
    },

    mucousShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    toxicSplashLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Blight', duration, { noHeal: true });
    },

    rootSlamLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    hardenedBarkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    phaseStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        
        let damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        
        // 150% damage if target is marked
        if (target.debuffs && target.debuffs.some(d => d.name === 'Mark')) {
            damage *= spell.markedBonus;
            battle.log(`Critical phase strike on marked target!`);
        }
        
        battle.dealDamage(caster, target, damage, 'physical');
    },

    hauntingMarkLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Mark', duration, {});
    },

    wailingDespairLogic: function(battle, caster, target, spell, spellLevel = 1) {
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
                battle.applyDebuff(enemy, 'Silence', duration, {});
            }
        });
    },

    deathsEmbraceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
            }
        });
    },

    lifeDrainLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
        
        battle.healUnit(caster, damageDealt);
    },

    // Forgotten Crypt Spells
    boneShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    },

    boneArrowLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    criplingShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    deathBoltLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
    },

    curseOfWeaknessLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Reduce Attack', duration, {});
        battle.applyDebuff(target, 'Reduce Defense', duration, {});
    },

    darkEmpowermentLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(target, 'Increase Attack', duration, { damageMultiplier: 1.5 });
    },

    lifeTapLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
        
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

    necroticAuraLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Frost Armor', duration, {});
    },

    bloodFrenzyLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyBuff(caster, 'Increase Speed', duration, {});
    },

    hypnoticGazeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Stun', duration, { stunned: true });
    },

    crimsonShieldLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        const damageDealt = battle.dealDamage(caster, target, damage, 'physical');
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: damageDealt });
    },

    meatHookLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Taunt', duration, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
    },

    putridExplosionLogic: function(battle, caster, target, spell, spellLevel = 1) {
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
                battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
            }
        });
    },

    stitchedArmorLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    // Bandit Den Spells
    threateningShoutLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

    toughenUpLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Increase Defense', duration, {});
    },

    flashPowderLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
        battle.dealDamage(caster, target, damage, 'magical');
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
    },

    smokeScreenLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.applyDebuff(enemy, 'Silence', duration, {});
            }
        });
    },

    shadowStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Bleed', duration, { bleedDamage: true });
    },

    hamstringLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Reduce Speed', duration, {});
        battle.applyDebuff(target, 'Reduce Attack', duration, {});
    },

    markedForDeathLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyDebuff(target, 'Mark', duration, {});
        battle.applyDebuff(target, 'Reduce Defense', duration, {});
    },

    inspiringPresenceLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            }
        });
    },

    bladeFlurryLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
        const hitCount = spell.hitCount[levelIndex] || spell.hitCount[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
        
        for (let i = 0; i < hitCount; i++) {
            battle.dealDamage(caster, target, damage, 'physical');
        }
    },

    evasionLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        battle.applyBuff(caster, 'Immune', duration, { immunity: true });
    },

    lordsCommandLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const duration = spell.duration[levelIndex] || spell.duration[0];
        
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.isAlive) {
                battle.applyBuff(ally, 'Increase Speed', duration, {});
            }
        });
    },

    executionOrderLogic: function(battle, caster, target, spell, spellLevel = 1) {
        const levelIndex = spellLevel - 1;
        const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
        const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
        const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
        const stunDuration = spell.stunDuration[levelIndex] || spell.stunDuration[0];
        
        const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
        battle.dealDamage(caster, target, damage, 'physical');
        
        // Stun if below 50% HP
        if ((target.currentHp / target.maxHp) < spell.hpThreshold) {
            battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
        }
    },

    plunderLogic: function(battle, caster, target, spell, spellLevel = 1) {
        // Transfer all buffs from target to random allies
        if (target.buffs && target.buffs.length > 0) {
            const allies = battle.getParty(caster);
            const aliveAllies = allies.filter(a => a && a.isAlive);
            
            while (target.buffs.length > 0 && aliveAllies.length > 0) {
                const buff = target.buffs.shift();
                const randomAlly = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
                randomAlly.buffs = randomAlly.buffs || [];
                randomAlly.buffs.push(buff);
                battle.log(`${buff.name} plundered and given to ${randomAlly.name}!`);
            }
        }
    },
// Gold Mine Spells
pickaxeSwingLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const armorBreakChance = spell.armorBreakChance[levelIndex] || spell.armorBreakChance[0];
    const debuffDuration = spell.debuffDuration[levelIndex] || spell.debuffDuration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    
    if (Math.random() < armorBreakChance) {
        battle.applyDebuff(target, 'Reduce Defense', debuffDuration, {});
    }
},

reinforcePlatingLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

blastChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    const splashPercent = spell.splashPercent[levelIndex] || spell.splashPercent[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
    
    // Full damage to primary target
    battle.dealDamage(caster, target, damage, 'physical');
    
    // Splash damage to all other enemies
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive && enemy !== target) {
            battle.dealDamage(caster, enemy, damage * splashPercent, 'physical');
        }
    });
},

shrapnelStormLogic: function(battle, caster, target, spell, spellLevel = 1) {
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
            battle.applyDebuff(enemy, 'Bleed', duration, { bleedDamage: true });
        }
    });
},

mechanicalRepairLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseHeal = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
    
    const healAmount = baseHeal + (caster.stats.int * intScaling);
    battle.healUnit(target, healAmount);
    battle.applyBuff(target, 'Shield', -1, { shieldAmount: shieldAmount });
},

overclockLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const actionBarGrant = spell.actionBarGrant;
    const hpCost = spell.hpCost[levelIndex] || spell.hpCost[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Speed', duration, {});
            ally.actionBar += actionBarGrant * 10000;
            battle.dealDamage(caster, ally, hpCost, 'pure');
        }
    });
},

demolishLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

detonateLogic: function(battle, caster, target, spell, spellLevel = 1) {
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
    
    // Kill self after dealing damage
    battle.log(`${caster.name} self-destructs!`);
    caster.currentHp = 0;
    battle.handleUnitDeath(caster);
},

plantExplosiveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
    
    // Apply a special "bomb" debuff that will explode next turn
    battle.applyDebuff(target, 'Explosive', 1, { 
        bombDamage: damage,
        bombCaster: caster,
        isExplosive: true
    });
    battle.log(`${caster.name} plants an explosive on ${target.name}!`);
},

chainDetonationLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    const hitCount = spell.hitCount[levelIndex] || spell.hitCount[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
    
    const enemies = battle.getEnemies(caster);
    for (let i = 0; i < hitCount; i++) {
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'physical');
            }
        });
    }
},

volatileOverloadLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const damageBonus = spell.damageBonus[levelIndex] || spell.damageBonus[0];
    const selfDamage = spell.selfDamage[levelIndex] || spell.selfDamage[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: damageBonus });
    
    // Needs special implementation for self-damage per turn
    battle.log(`Volatile Overload needs self-damage per turn implementation!`);
},

grindingGearsLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const bleedStacks = spell.bleedStacks;
    const bleedDuration = spell.bleedDuration[levelIndex] || spell.bleedDuration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    
    for (let i = 0; i < bleedStacks; i++) {
        battle.applyDebuff(target, 'Bleed', bleedDuration, { bleedDamage: true });
    }
},

scrapArmorLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
    const reflectPercent = spell.reflectPercent[levelIndex] || spell.reflectPercent[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    battle.applyBuff(caster, 'Shield', -1, { shieldAmount: shieldAmount });
    
    // Needs special implementation for damage reflection
    battle.log(`Scrap Armor needs damage reflection implementation!`);
},

industrialRevolutionLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const damageBonus = spell.damageBonus;
    const speedBonus = spell.speedBonus;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: damageBonus });
            battle.applyBuff(ally, 'Increase Speed', duration, {});
        }
    });
},

// Centaur Cliffs Spells
piercingShotLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
    battle.dealDamage(caster, target, damage, 'physical', { armorPierce: spell.armorPierce });
},

naturesGuidanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Needs special implementation for critical strike chance on next attacks
    battle.log(`Nature's Guidance needs critical strike implementation!`);
},

thunderingChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const stunDuration = spell.stunDuration[levelIndex] || spell.stunDuration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.applyDebuff(target, 'Stun', stunDuration, { stunned: true });
},

defensiveStanceLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    battle.applyBuff(caster, 'Increase Defense', duration, {});
    battle.applyDebuff(target, 'Taunt', duration, { 
        tauntTarget: caster,
        forcedTarget: caster.position,
        forcedTargetIsEnemy: caster.isEnemy
    });
},

ancestralVigorLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseHeal = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    
    const healAmount = baseHeal + (caster.stats.int * intScaling);
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.healUnit(ally, healAmount);
            if (ally.debuffs && ally.debuffs.length > 0) {
                ally.debuffs.shift();
                battle.log(`Cleansed a debuff from ${ally.name}!`);
            }
        }
    });
},

earthBlessingLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Needs special implementation for regeneration effect
    battle.log(`Earth Blessing needs regeneration implementation!`);
},

trampleLogic: function(battle, caster, target, spell, spellLevel = 1) {
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
            battle.applyDebuff(enemy, 'Reduce Speed', duration, {});
        }
    });
},

warStompLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

rallyingHornLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const actionBarGrant = spell.actionBarGrant;
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: 1.5 });
            ally.actionBar += actionBarGrant * 10000;
        }
    });
},

honorChargeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const knockback = spell.knockback[levelIndex] || spell.knockback[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    
    // Knockback action bar
    target.actionBar = Math.max(0, target.actionBar - (knockback * 10000));
    battle.log(`${target.name}'s action bar knocked back!`);
},

earthquakeLogic: function(battle, caster, target, spell, spellLevel = 1) {
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
            battle.applyDebuff(enemy, 'Reduce Defense', duration, {});
        }
    });
},

primalSpiritsLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const shieldAmount = spell.shieldAmount[levelIndex] || spell.shieldAmount[0];
    const immuneDuration = spell.immuneDuration[levelIndex] || spell.immuneDuration[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Shield', -1, { shieldAmount: shieldAmount });
            battle.applyBuff(ally, 'Immune', immuneDuration, { immunity: true });
        }
    });
},

bloodhornRampageLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    const damageBonus = spell.damageBonus;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            // Deal mixed physical and magical damage
            battle.dealDamage(caster, enemy, damage * 0.5, 'physical');
            battle.dealDamage(caster, enemy, damage * 0.5, 'magical');
        }
    });
    
    battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: damageBonus });
},

// Orc Warlands Spells
brutalCleaveLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const cleavePercent = spell.cleavePercent[levelIndex] || spell.cleavePercent[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    
    // Full damage to primary target
    battle.dealDamage(caster, target, damage, 'physical');
    
    // Cleave damage to all other enemies
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive && enemy !== target) {
            battle.dealDamage(caster, enemy, damage * cleavePercent, 'physical');
        }
    });
},

orcishResilienceLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    caster.debuffs = [];
    battle.log(`${caster.name} cleanses all debuffs!`);
    battle.applyBuff(caster, 'Increase Defense', duration, {});
},

berserkerFuryLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Passive ability - needs special implementation
    battle.log(`Berserker Fury needs damage scaling based on missing HP implementation!`);
},

bloodFrenzyOrcLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const hpCost = spell.hpCost[levelIndex] || spell.hpCost[0];
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const strScaling = spell.scaling.str[levelIndex] || spell.scaling.str[0];
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    // Sacrifice HP
    const hpSacrifice = Math.floor(caster.maxHp * hpCost);
    battle.dealDamage(caster, caster, hpSacrifice, 'pure');
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.str * strScaling);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.applyBuff(caster, 'Increase Speed', duration, {});
},

bloodRitualLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const intScaling = spell.scaling.int[levelIndex] || spell.scaling.int[0];
    const healPercent = spell.healPercent[levelIndex] || spell.healPercent[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.int * intScaling);
    const damageDealt = battle.dealDamage(caster, target, damage, 'magical');
    
    const healAmount = damageDealt * healPercent;
    battle.healUnit(caster, healAmount);
},

ancestralCurseLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.applyDebuff(enemy, 'Reduce Attack', duration, {});
            battle.applyDebuff(enemy, 'Blight', duration, { noHeal: true });
        }
    });
},

wolfBiteLogic: function(battle, caster, target, spell, spellLevel = 1) {
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

packTacticsLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const actionBarGrant = spell.actionBarGrant;
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Speed', duration, {});
            ally.actionBar += actionBarGrant * 10000;
        }
    });
},

bladeStormLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const baseDamage = spell.scaling.base[levelIndex] || spell.scaling.base[0];
    const attackScaling = spell.scaling.attack[levelIndex] || spell.scaling.attack[0];
    const agiScaling = spell.scaling.agi[levelIndex] || spell.scaling.agi[0];
    const hitCount = spell.hitCount[levelIndex] || spell.hitCount[0];
    
    const damage = baseDamage + (caster.source.attack * attackScaling) + (caster.stats.agi * agiScaling);
    
    const enemies = battle.getEnemies(caster);
    for (let i = 0; i < hitCount; i++) {
        enemies.forEach(enemy => {
            if (enemy.isAlive) {
                battle.dealDamage(caster, enemy, damage, 'physical');
            }
        });
    }
},

counterStrikeLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Needs special implementation for counter-attack mechanic
    battle.log(`Counter Strike needs counter-attack implementation!`);
},

windWalkLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    const speedBonus = spell.speedBonus;
    
    battle.applyBuff(caster, 'Immune', duration, { immunity: true });
    battle.applyBuff(caster, 'Increase Speed', duration, {});
},

warlordsCommandLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const damageBonus = spell.damageBonus;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            // Cleanse all debuffs
            ally.debuffs = [];
            battle.log(`${ally.name} cleansed of all debuffs!`);
            
            // Apply buffs
            battle.applyBuff(ally, 'Increase Attack', duration, { damageMultiplier: damageBonus });
            battle.applyBuff(ally, 'Immune', duration, { immunity: true });
        }
    });
},

bloodRageLogic: function(battle, caster, target, spell, spellLevel = 1) {
    const levelIndex = spellLevel - 1;
    const damageBonus = spell.damageBonus;
    const speedBonus = spell.speedBonus;
    const duration = spell.duration[levelIndex] || spell.duration[0];
    
    battle.applyBuff(caster, 'Increase Attack', duration, { damageMultiplier: damageBonus });
    battle.applyBuff(caster, 'Increase Speed', duration, {});
},

callOfWarLogic: function(battle, caster, target, spell, spellLevel = 1) {
    // Needs special implementation for summoning units mid-battle
    battle.log(`Call of War needs summoning implementation!`);
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
