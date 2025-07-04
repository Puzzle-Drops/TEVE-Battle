// Arena System
class Arena {
    constructor(game) {
        this.game = game;
    }
    
    enterSparMode() {
        // Set arena mode
        this.game.arenaMode = 'spar';
        
        // Get selected party heroes (use existing selection or default to first 5)
        let partyHeroes = [];
        if (this.game.selectedParty.some(h => h !== null)) {
            // Use existing selection
            partyHeroes = this.game.selectedParty
                .filter(index => index !== null)
                .map(index => this.game.heroes[index]);
        } else {
            // Default to first 5 heroes
            partyHeroes = this.game.heroes.slice(0, 5);
            this.game.selectedParty = [0, 1, 2, 3, 4];
        }
        
        // Calculate average level of two highest level heroes
        const sortedByLevel = [...partyHeroes].sort((a, b) => b.level - a.level);
        const avgLevel = Math.floor((sortedByLevel[0].level + (sortedByLevel[1] || sortedByLevel[0]).level) / 2);
        
        // Find highest tier in party
        const highestTier = Math.max(...partyHeroes.map(h => h.classTier));
        
        // Generate opponents
        this.game.arenaOpponents = this.generateSparOpponents(partyHeroes, avgLevel, highestTier);
        
        // Show party select in arena mode
        this.game.uiManager.showPartySelect('arena');
    }
    
    generateSparOpponents(partyHeroes, avgLevel, highestTier) {
        const opponents = [];
        const families = ['Acolyte', 'Archer', 'Druid', 'Initiate', 'Swordsman', 'Templar', 'Thief', 'Witch Hunter'];
        
        // Helper to get class name for tier
        const getClassForTier = (family, tier, gender) => {
            // Get all classes in family
            const familyData = this.game.classFamilies.find(f => f.name === family);
            if (!familyData) return null;
            
            // Find class at specified tier
            for (const className of familyData.classes) {
                const classKey = className.toLowerCase().replace(/ /g, '_') + '_' + gender;
                const classData = unitData.classes[classKey];
                if (classData && classData.tier === tier) {
                    return classKey;
                }
            }
            return null;
        };
        
        // Position 0: Acolyte
        const gender0 = Math.random() < 0.5 ? 'male' : 'female';
        const acolyteClass = getClassForTier('Acolyte', highestTier, gender0);
        if (acolyteClass) {
            const enemy = this.createArenaEnemy(acolyteClass, avgLevel, highestTier);
            opponents.push(enemy);
        }
        
        // Position 1: Druid or Initiate (random)
        const gender1 = Math.random() < 0.5 ? 'male' : 'female';
        const family1 = Math.random() < 0.5 ? 'Druid' : 'Initiate';
        const class1 = getClassForTier(family1, highestTier, gender1);
        if (class1) {
            const enemy = this.createArenaEnemy(class1, avgLevel, highestTier);
            opponents.push(enemy);
        }
        
        // Position 2: Swordsman
        const gender2 = Math.random() < 0.5 ? 'male' : 'female';
        const swordsmanClass = getClassForTier('Swordsman', highestTier, gender2);
        if (swordsmanClass) {
            const enemy = this.createArenaEnemy(swordsmanClass, avgLevel, highestTier);
            opponents.push(enemy);
        }
        
        // Positions 3-4: Random from remaining families
        const remainingFamilies = families.filter(f => f !== 'Acolyte' && f !== family1 && f !== 'Swordsman');
        
        // Shuffle remaining families
        for (let i = remainingFamilies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingFamilies[i], remainingFamilies[j]] = [remainingFamilies[j], remainingFamilies[i]];
        }
        
        // Add two more random enemies
        for (let i = 0; i < 2 && i < remainingFamilies.length; i++) {
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const className = getClassForTier(remainingFamilies[i], highestTier, gender);
            if (className) {
                const enemy = this.createArenaEnemy(className, avgLevel, highestTier);
                opponents.push(enemy);
            }
        }
        
        // Ensure we have exactly 5 opponents
        while (opponents.length < 5) {
            // Fill with villagers if needed
            const gender = Math.random() < 0.5 ? 'male' : 'female';
            const enemy = this.createArenaEnemy('villager_' + gender, avgLevel, 0);
            opponents.push(enemy);
        }
        
        return opponents.slice(0, 5);
    }
    
    createArenaEnemy(className, level, tier) {
        // Create a special arena enemy that extends Enemy
        const enemy = new ArenaEnemy(className, level, tier);
        
        // Generate and equip gear
        const gear = this.generateHeroGear(enemy, level);
        enemy.gear = gear;
        enemy.updateGearStats();
        
        return enemy;
    }
    
    generateHeroGear(hero, targetLevel) {
        const gear = {
            weapon: null,
            offhand: null,
            head: null,
            chest: null,
            legs: null,
            trinket: null
        };
        
        // Find all items within 10 levels of target
        const minLevel = Math.max(1, targetLevel - 10);
        const maxLevel = targetLevel + 10;
        
        // Get available items for each slot
        const itemsBySlot = {
            weapon: [],
            offhand: [],
            head: [],
            chest: [],
            legs: [],
            trinket: []
        };
        
        // Collect items by slot
        Object.keys(itemData.items).forEach(itemId => {
            const itemTemplate = itemData.items[itemId];
            if (itemTemplate.level >= minLevel && itemTemplate.level <= maxLevel) {
                if (itemsBySlot[itemTemplate.slot]) {
                    itemsBySlot[itemTemplate.slot].push(itemId);
                }
            }
        });
        
        // Generate an item for each slot
        Object.keys(gear).forEach(slot => {
            if (itemsBySlot[slot].length > 0) {
                // Pick a random item from this slot
                const itemId = itemsBySlot[slot][Math.floor(Math.random() * itemsBySlot[slot].length)];
                const item = new Item(itemId);
                
                // Set all qualities to 4/5 (80%)
                item.quality1 = 4;
                if (item.roll2) item.quality2 = 4;
                if (item.roll3) item.quality3 = 4;
                if (item.roll4) item.quality4 = 4;
                
                gear[slot] = item;
            }
        });
        
        return gear;
    }
}

// Arena Enemy class that extends Enemy
class ArenaEnemy extends Enemy {
    constructor(className, level, tier) {
        // Extract enemy ID from class name (remove gender suffix)
        const enemyId = className.replace(/_male$|_female$/, '');
        
        // Initialize as normal enemy
        super(enemyId, level);
        
        // Override with hero class data
        this.className = className;
        this.classData = unitData.classes[className];
        this.name = this.classData.name;
        this.classTier = tier;
        
        // Set proper spell level based on tier
        if (tier === 0) this.spellLevel = 1;
        else if (tier === 1) this.spellLevel = 1;
        else if (tier === 2) this.spellLevel = 2;
        else if (tier === 3) this.spellLevel = 3;
        else if (tier === 4) this.spellLevel = 4;
        
        // Use class modifiers
        this.modifiers = this.classData.modifiers;
        this.mainstat = this.classData.mainstat;
        
        // Initialize gear system
        this.gear = {
            head: null,
            chest: null,
            legs: null,
            weapon: null,
            offhand: null,
            trinket: null
        };
        
        this.gearStats = { 
            str: 0, 
            agi: 0, 
            int: 0,
            hp: 0,
            armor: 0,
            resist: 0,
            hpRegen: 0,
            attack: 0,
            attackSpeed: 0
        };
        
        // Override initial values from class
        if (this.classData.initial) {
            Object.assign(this.initial, this.classData.initial);
        }
        
        // Get abilities from class
        this.abilities = this.getClassAbilities();
    }
    
    getClassAbilities() {
        const abilities = [];
        if (!this.classData.spells || this.classData.spells.length === 0) {
            return abilities;
        }
        
        const spellIds = this.classData.spells;
        const spells = spellManager ? spellManager.getSpellsByIds(spellIds) : [];
        
        spells.forEach((spell, index) => {
            if (spell) {
                // Skip 4th ability if not tier 4
                if (index === 3 && this.classTier < 4) {
                    return;
                }
                
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
    
    updateGearStats() {
        // Reset gear stats
        this.gearStats = {
            str: 0,
            agi: 0,
            int: 0,
            hp: 0,
            armor: 0,
            resist: 0,
            hpRegen: 0,
            attack: 0,
            attackSpeed: 0
        };
        
        // Add stats from all equipped items
        Object.values(this.gear).forEach(item => {
            if (item) {
                const itemStats = item.getStats();
                Object.keys(itemStats).forEach(stat => {
                    this.gearStats[stat] += itemStats[stat];
                });
            }
        });
    }
    
    // Override baseStats to include gear
    get baseStats() {
        const str = Math.floor(this.initial.str + (this.level * this.modifiers.str)) + this.gearStats.str;
        const agi = Math.floor(this.initial.agi + (this.level * this.modifiers.agi)) + this.gearStats.agi;
        const int = Math.floor(this.initial.int + (this.level * this.modifiers.int)) + this.gearStats.int;
        
        const mainstatValue = this.mainstat === 'str' ? str : (this.mainstat === 'agi' ? agi : int);
        
        return {
            str: str,
            agi: agi,
            int: int,
            hp: (str * 5) + this.initial.hp + this.gearStats.hp,
            hpRegen: (str * 0.05) + this.initial.hpRegen + this.gearStats.hpRegen,
            attack: mainstatValue + this.initial.attack + this.gearStats.attack,
            attackSpeed: (100 + 100 * (agi / (agi + 1000))) + this.initial.attackSpeed + this.gearStats.attackSpeed,
            armor: (0.25 * str) + (0.05 * agi) + this.initial.armor + this.gearStats.armor,
            resist: (0.25 * int) + this.initial.resist + this.gearStats.resist
        };
    }
}
