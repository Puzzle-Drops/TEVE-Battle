// Spell Logic Functions
const spellLogic = {
    // Villager Spells
    punchLogic: function(battle, caster, target) {
        const damage = caster.source.attack;
        battle.dealDamage(caster, target, damage, 'physical');
        battle.log(`${caster.name} punches ${target.name} for ${damage} damage!`);
    },

    furyLogic: function(battle, caster, target) {
        battle.applyBuff(caster, 'Speed Boost', 3, { actionBarMultiplier: 1.5 });
        battle.log(`${caster.name} enters a fury, increasing attack speed for 3 turns!`);
    },

    throwRockLogic: function(battle, caster, target) {
        const damage = caster.stats.int * 2;
        battle.dealDamage(caster, target, damage, 'physical');
        battle.applyDebuff(target, 'stun', 1, { stunned: true });
        battle.log(`${caster.name} throws a rock at ${target.name} for ${Math.floor(damage)} damage and stuns them!`);
    },

    // Boss Spells
slashLogic: function(battle, caster, target, spell) {
    const { percent, cap } = spell.scaling;
    const damage = Math.min(target.maxHp * percent, cap);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.log(`${caster.name} slashes ${target.name} for ${Math.round(damage)} damage!`);
},

biteLogic: function(battle, caster, target, spell) {
    const { percent, floor } = spell.scaling;
    const damage = Math.max(target.maxHp * percent, floor);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.log(`${caster.name} bites ${target.name} for ${Math.round(damage)} damage!`);
},
slashkillLogic: function(battle, caster, target, spell) {
    const { percent, cap } = spell.scaling;
    const damage = Math.min(target.maxHp * percent, cap);
    battle.dealDamage(caster, target, damage, 'physical');
    battle.log(`${caster.name} kills ${target.name} for ${Math.round(damage)} damage!`);
},

// Tester Spells
winLogic: function(battle, caster, targets) {
    // Deal massive damage to all enemies
    const enemies = battle.getEnemies(caster);
    enemies.forEach(enemy => {
        if (enemy.currentHp > 0) {
            const damage = 100000000;
            battle.dealDamage(caster, enemy, damage, 'pure');
        }
    });
    
    // Apply speed buff to self
    battle.applyBuff(caster, 'Speed Boost', 5, { actionBarMultiplier: 1.5 });
    
    battle.log(`${caster.name} uses Win! Victory is assured!`);
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
    
    // Set own HP to 0
    caster.currentHp = 0;
    
    battle.log(`${caster.name} uses Lose! Self-destruction initiated!`);
},

// Test Buff Spells
testAttackBoostLogic: function(battle, caster, target) {
    battle.applyBuff(target, 'Attack Boost', 2, { damageMultiplier: 1.5 });
},

testSpeedBoostLogic: function(battle, caster, target) {
    battle.applyBuff(target, 'Speed Boost', 2, { actionBarMultiplier: 1.5 });
},

testArmorBoostLogic: function(battle, caster, target) {
    battle.applyBuff(target, 'Armor Boost', 2, { armorMultiplier: 1.5 });
},

testImmuneLogic: function(battle, caster, target) {
    battle.applyBuff(target, 'Immune', 2, { immunity: true });
},

testShieldLogic: function(battle, caster, target) {
    battle.applyBuff(target, 'Shield', -1, { shieldAmount: 200 });
},

// Test Debuff Spells
testAttackBreakLogic: function(battle, caster, target) {
    battle.applyDebuff(target, 'Attack Break', 2, { attackMultiplier: 0.5 });
},

testSlowLogic: function(battle, caster, target) {
    battle.applyDebuff(target, 'Slow', 2, { actionBarSpeed: 0.5 });
},

testArmorBreakLogic: function(battle, caster, target) {
    battle.applyDebuff(target, 'Armor Break', 2, { armorMultiplier: 0.5 });
},

testBlightLogic: function(battle, caster, target) {
    battle.applyDebuff(target, 'Blight', 2, { noHeal: true });
},

testBleedLogic: function(battle, caster, target) {
    battle.applyDebuff(target, 'Bleed', 2, { bleedDamage: true });
},

testStunLogic: function(battle, caster, target) {
    battle.applyDebuff(target, 'Stun', 2, { stunned: true });
},

testTauntLogic: function(battle, caster, target) {
    // Apply taunt to the target, making them attack the caster
    battle.applyDebuff(target, 'Taunt', 2, { 
        tauntTarget: caster,
        forcedTarget: caster.position,
        forcedTargetIsEnemy: caster.isEnemy
    });
},
    
    frostBreathLogic: function(battle, caster, targets) {
        const enemies = battle.getEnemies(caster);
        enemies.forEach(enemy => {
            if (enemy.currentHp > 0) {
                const damage = caster.baseStats.str * 2;
                battle.dealDamage(caster, enemy, damage, 'frost');
                battle.applyDebuff(enemy, 'slow', 2, { actionBarSpeed: 0.5 });
            }
        });
        battle.log(`${caster.name} breathes frost!`);
    },

    goldTossLogic: function(battle, caster, target) {
        const randomMultiplier = Math.random() * 3;
        const damage = caster.baseStats.str * randomMultiplier;
        battle.dealDamage(caster, target, damage, 'physical');
        battle.log(`${caster.name} tosses gold coins for ${Math.floor(damage)} damage!`);
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
        battle.log(`${caster.name} summons goblin minions!`);
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
            logicFunction(battle, caster, target);
            return true;
        } catch (error) {
            console.error(`Error executing spell ${spellId}:`, error);
            return false;
        }
    }
}
