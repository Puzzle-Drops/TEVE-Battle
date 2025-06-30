// Enemy Class
class Enemy {
    constructor(enemyId, level, spellLevel = null) {
        this.enemyId = enemyId;
        this.level = level;
        this.spellLevel = spellLevel || Math.max(1, Math.min(5, Math.floor(level / 100) + 1));
        this.stars = this.calculateStars(level);
                
                // Load enemy data from unitData
                const enemyData = unitData?.enemies[enemyId];
                if (enemyData) {
                    this.name = enemyData.name;
                    this.isBoss = enemyData.boss;
                    this.modifiers = enemyData.modifiers;
                    this.abilities = this.getAbilities(enemyData.spells);
                    
                    // Add default initial values
                    this.initial = {
                        hp: 0,
                        hpRegen: 0,
                        attack: 0,
                        attackSpeed: 0,
                        str: 0,
                        agi: 0,
                        int: 0,
                        armor: 0,
                        resist: 0
                    };

                    // Override with enemy-specific initial values if they exist
                    if (enemyData && enemyData.initial) {
                        Object.assign(this.initial, enemyData.initial);
                    }
                } else {
                    // Fallback values
                    this.name = enemyId;
                    this.isBoss = false;
                    this.modifiers = { str: 1.0, agi: 1.0, int: 1.0 };
                    this.abilities = [];
                    
                    // Default initial values
                    this.initial = {
                        hp: 0,
                        hpRegen: 0,
                        attack: 0,
                        attackSpeed: 0,
                        str: 0,
                        agi: 0,
                        int: 0,
                        armor: 0,
                        resist: 0
                    };
                }
            }

            calculateStars(level) {
                if (level < 50) return 1;
                if (level < 100) return 2;
                if (level < 200) return 3;
                if (level < 300) return 4;
                if (level < 400) return 5;
                if (level < 500) return 6;
                if (level < 800) return 7;
                return 8;
            }
            
            getStars() {
                return game.generateStars({ 
                    type: 'enemy', 
                    level: this.level, 
                    isBoss: this.isBoss 
                });
            }

get baseStats() {
    const str = Math.floor(this.initial.str + (this.level * this.modifiers.str));
    const agi = Math.floor(this.initial.agi + (this.level * this.modifiers.agi));
    const int = Math.floor(this.initial.int + (this.level * this.modifiers.int));
    
    return {
        str: str,
        agi: agi,
        int: int,
        hp: (str * 5) + this.initial.hp,
        hpRegen: (str * 0.05) + this.initial.hpRegen,
        attack: str + this.initial.attack, // Will be overridden by mainstat in getter
        attackSpeed: (100 + 100 * (agi / (agi + 1000))) + this.initial.attackSpeed,
        armor: (0.25 * str) + (0.05 * agi) + this.initial.armor,
        resist: (0.25 * int) + this.initial.resist
    };
}

get hp() {
    return this.baseStats.hp;
}

get attack() {
    const enemyData = unitData?.enemies[this.enemyId];
    const mainstat = enemyData?.mainstat || 'str';
    return this.baseStats[mainstat] + this.initial.attack;
}

get mainstat() {
    const enemyData = unitData?.enemies[this.enemyId];
    return enemyData?.mainstat || 'str';
}
		
get armor() {
    return this.baseStats.armor;
}

get resist() {
    return this.baseStats.resist;
}

get hpRegen() {
    return this.baseStats.hpRegen;
}

get actionBarSpeed() {
    return this.baseStats.attackSpeed;
}

get physicalDamageReduction() {
    const totalArmor = this.armor;
    return (0.9 * totalArmor) / (totalArmor + 500);
}

get magicDamageReduction() {
    const totalResist = this.resist;
    return (0.3 * totalResist) / (totalResist + 1000);
}

            getAbilities(spellIds) {
    if (!spellIds || !spellManager) return [];
    
    const abilities = [];
    const spells = spellManager.getSpellsByIds(spellIds);
    
    spells.forEach((spell, index) => {
    if (spell) {
        // Get the correct cooldown for this spell level
        let cooldownValue = 0;
        if (Array.isArray(spell.cooldown)) {
            const cooldownIndex = Math.max(0, Math.min(4, this.spellLevel - 1));
            cooldownValue = spell.cooldown[cooldownIndex] || spell.cooldown[0];
        } else {
            cooldownValue = spell.cooldown || 0;
        }
        
        abilities.push({
            id: spell.id,
            name: spell.name,
            description: spell.description,
            cooldown: cooldownValue,
            currentCooldown: 0,
            level: this.spellLevel,
            icon: `${spell.id}.png`,
            effects: spell.effects,
            passive: spell.passive || false
        });
    }
});
    
    return abilities;
}
	
}
