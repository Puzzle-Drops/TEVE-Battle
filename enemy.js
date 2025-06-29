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
                } else {
                    // Fallback values
                    this.name = enemyId;
                    this.isBoss = false;
                    this.modifiers = { str: 1.0, agi: 1.0, int: 1.0 };
                    this.abilities = [];
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
                return {
                    str: Math.floor(this.level * this.modifiers.str),
                    agi: Math.floor(this.level * this.modifiers.agi),
                    int: Math.floor(this.level * this.modifiers.int)
                };
            }

            get hp() {
                return this.baseStats.str * 5;
            }

get attack() {
    const enemyData = unitData?.enemies[this.enemyId];
    const mainstat = enemyData?.mainstat || 'str';
    return this.baseStats[mainstat];
}

get mainstat() {
    const enemyData = unitData?.enemies[this.enemyId];
    return enemyData?.mainstat || 'str';
}
		
			get armor() {
				const stats = this.baseStats;
				return (0.25 * stats.str) + (0.05 * stats.agi);
			}

			get resist() {
				const stats = this.baseStats;
				return (0.25 * stats.int);
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
