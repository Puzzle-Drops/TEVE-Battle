// Spell Logic Functions
const spellLogic = {
    // Villager Spells
    punchLogic: function(battle, caster, target) {
        const damage = caster.source.attack;
        battle.dealDamage(caster, target, damage, 'physical');
    },

    furyLogic: function(battle, caster, target, spell) {
        battle.applyBuff(caster, 'Increase Speed', spell.duration || 3, {});
    },

    throwRockLogic: function(battle, caster, target) {
        const damage = caster.stats.int * 2;
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'Stun', 1, { stunned: true });
    },

    // Boss Spells
    slashLogic: function(battle, caster, target, spell) {
        const { percent, cap } = spell.scaling;
        const damage = Math.min(target.maxHp * percent, cap);
        battle.dealDamage(caster, target, damage, 'physical');
    },

    biteLogic: function(battle, caster, target, spell) {
        const { percent, floor } = spell.scaling;
        const damage = Math.max(target.maxHp * percent, floor);
        battle.dealDamage(caster, target, damage, 'physical');
    },
    
    slashkillLogic: function(battle, caster, target, spell) {
        const { percent, cap } = spell.scaling;
        const damage = Math.min(target.maxHp * percent, cap);
        battle.dealDamage(caster, target, damage, 'physical');
    },

// Murkin Spells
spearThrustLogic: function(battle, caster, target, spell) {
    const damage = caster.stats.str * 1.5;
    battle.dealDamage(caster, target, damage, 'physical');
    
    // 30% chance to apply bleed
    if (Math.random() < spell.bleedChance) {
        battle.applyDebuff(target, 'Bleed', spell.bleedDuration, { bleedDamage: true });
    }
},

defensiveFormationLogic: function(battle, caster, target, spell) {
    battle.applyBuff(caster, 'Increase Defense', spell.duration, {});
},

crushingStrikeLogic: function(battle, caster, target, spell) {
    const damage = caster.stats.str * 2.0;
    battle.dealDamage(caster, target, damage, 'physical');
},

armorBreakLogic: function(battle, caster, target, spell) {
    const damage = caster.stats.str * 1.5;
    battle.dealDamage(caster, target, damage, 'physical');
    battle.applyDebuff(target, 'Reduce Defense', spell.debuffDuration, {});
},

crystalShardLogic: function(battle, caster, target, spell) {
    const damage = caster.stats.int * 1.8;
    battle.dealDamage(caster, target, damage, 'magical');
},

protectiveBarrierLogic: function(battle, caster, target, spell) {
    // Find lowest HP ally
    const allies = battle.getParty(caster);
    const aliveAllies = allies.filter(a => a && a.isAlive);
    
    if (aliveAllies.length > 0) {
        // Sort by HP percentage
        aliveAllies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
        const lowestHpAlly = aliveAllies[0];
        
        // Use applyBuff with -1 duration for permanent shield
        battle.applyBuff(lowestHpAlly, 'Shield', -1, { shieldAmount: spell.shieldAmount });
    }
},

staffWhackLogic: function(battle, caster, target, spell) {
    const damage = caster.stats.str * 1.2;
    battle.dealDamage(caster, target, damage, 'physical');
},

ancientProtectionLogic: function(battle, caster) {
    // This is a passive ability - the dodge logic will be handled in battle.js
    // We need to add a permanent effect to the caster
    if (!caster.ancientProtectionApplied) {
        caster.ancientProtectionApplied = true;
        caster.physicalDodgeChance = 0.5;
    }
},

ancestralTauntLogic: function(battle, caster, target, spell) {
    // Apply taunt to all enemies
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            battle.applyDebuff(enemy, 'Taunt', spell.tauntDuration, { 
                tauntTarget: caster,
                forcedTarget: caster.position,
                forcedTargetIsEnemy: caster.isEnemy
            });
        }
    });
},

chieftainsHammerLogic: function(battle, caster, target, spell) {
    const damage = caster.stats.str * 2.0;
    battle.dealDamage(caster, target, damage, 'physical');
    
    // 15% chance to stun
    if (Math.random() < spell.stunChance) {
        battle.applyDebuff(target, 'Stun', spell.stunDuration, { stunned: true });
    }
},

warCryLogic: function(battle, caster, target, spell) {
    // Apply Increase Attack to all allies
    const allies = battle.getParty(caster);
    allies.forEach(ally => {
        if (ally.isAlive) {
            battle.applyBuff(ally, 'Increase Attack', spell.allyBuffDuration, { damageMultiplier: 1.5 });
        }
    });
    
    // Apply Increase Speed to self only
    battle.applyBuff(caster, 'Increase Speed', spell.selfSpeedDuration, {});
},

    // Tester Spells
    winLogic: function(battle, caster, targets, spell) {
        // Deal massive damage to all enemies
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.currentHp > 0) {
                const damage = 100000000;
                battle.dealDamage(caster, enemy, damage, 'pure');
            }
        });
        
        // Apply speed buff to self
        battle.applyBuff(caster, 'Increase Speed', spell.duration || 5, {});
        
    },

    loseLogic: function(battle, caster, targets) {
        // Deal massive damage to all allies
        const allies = battle.getParty(caster);
        allies.forEach(ally => {
            if (ally.currentHp > 0 && ally !== caster) {
                const damage = 100000000;
                battle.dealDamage(caster, ally, damage, 'pure');
            }
        });
        
        //caster.currentHp = 0;
        battle.dealDamage(caster, caster, damage, 'pure');
        
    },

    // Test Buff Spells
    increaseAttackTestLogic: function(battle, caster, target) {
        battle.applyBuff(target, 'Increase Attack', 2, { damageMultiplier: 1.5 });
    },

    increaseSpeedTestLogic: function(battle, caster, target, spell) {
        battle.applyBuff(target, 'Increase Speed', spell.duration || 2, {});
    },

    increaseDefenseTestLogic: function(battle, caster, target) {
        battle.applyBuff(target, 'Increase Defense', 2, {});
    },

    immuneTestLogic: function(battle, caster, target) {
        battle.applyBuff(target, 'Immune', 2, { immunity: true });
    },

    shieldTestLogic: function(battle, caster, target) {
        battle.applyBuff(target, 'Shield', -1, { shieldAmount: 200 });
    },

    // Test Debuff Spells
    reduceAttackTestLogic: function(battle, caster, target) {
        battle.applyDebuff(target, 'Reduce Attack', 2, { attackMultiplier: 0.5 });
    },

    reduceSpeedTestLogic: function(battle, caster, target, spell) {
        battle.applyDebuff(target, 'Reduce Speed', spell.duration || 2, {});
    },

    reduceDefenseTestLogic: function(battle, caster, target) {
        battle.applyDebuff(target, 'Reduce Defense', 2, {});
    },
    
    blightTestLogic: function(battle, caster, target) {
        battle.applyDebuff(target, 'Blight', 2, { noHeal: true });
    },

    bleedTestLogic: function(battle, caster, target) {
        battle.applyDebuff(target, 'Bleed', 2, { bleedDamage: true });
    },

    stunTestLogic: function(battle, caster, target) {
        battle.applyDebuff(target, 'Stun', 2, { stunned: true });
    },

    tauntTestLogic: function(battle, caster, target) {
        // Apply taunt to the target, making them attack the caster
        battle.applyDebuff(target, 'Taunt', 2, { 
            tauntTarget: caster,
            forcedTarget: caster.position,
            forcedTargetIsEnemy: caster.isEnemy
        });
    },
    
    frostBreathLogic: function(battle, caster, targets, spell) {
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.currentHp > 0) {
                const damage = caster.baseStats.str * 2;
                battle.dealDamage(caster, enemy, damage, 'magical');
                battle.applyDebuff(enemy, 'Reduce Speed', spell.slowDuration || 2, {});
            }
        });
    },

    goldTossLogic: function(battle, caster, target) {
        const randomMultiplier = Math.random() * 3;
        const damage = caster.baseStats.str * randomMultiplier;
        battle.dealDamage(caster, target, damage, 'physical');
    },

    summonGoblinsLogic: function(battle, caster, target) {
        for (let i = 0; i < 2; i++) {
            battle.summonUnit(caster, {
                name: 'Goblin Minion',
                hp: caster.hp * 0.3,
                str: caster.baseStats.str * 0.5,
                agi: caster.baseStats.agi * 0.5,
                int: caster.baseStats.int * 0.5
            });
        }
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
