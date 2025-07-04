// Arena System
class Arena {
    constructor(game) {
        this.game = game;
    }
    
enterSparMode() {
    // Set arena mode
    this.game.arenaMode = 'spar';
    
    // Load arena teams from data
    this.game.arenaTeams = arenaData ? arenaData.teams : [];
    this.game.currentArenaTeam = 0;
    
    // Get selected party heroes (use existing selection or default to first 5)
    let partyHeroes = [];
    if (this.game.selectedParty && this.game.selectedParty.some(h => h !== null)) {
        // Use existing selection
        partyHeroes = this.game.selectedParty
            .filter(index => index !== null)
            .map(index => this.game.heroes[index]);
    } else {
        // Default to first 5 heroes
        partyHeroes = this.game.heroes.slice(0, 5);
        this.game.selectedParty = [0, 1, 2, 3, 4];
    }
    
    // Generate opponents from first team
    if (this.game.arenaTeams.length > 0) {
        this.game.arenaOpponents = this.generateArenaTeamOpponents(this.game.arenaTeams[0]);
    } else {
        this.game.arenaOpponents = [];
    }
    
    // Show party select in arena mode
    this.game.uiManager.showPartySelect('arena');
}

generateArenaTeamOpponents(teamData) {
    const opponents = [];
    
    teamData.heroes.forEach(heroData => {
        // Create an Enemy object that looks like a hero
        const enemy = new Enemy(heroData.className, heroData.level);
        
        // Override the name
        enemy.name = heroData.name;
        enemy.gender = heroData.gender;
        enemy.className = heroData.className;

        // Set spell level based on class tier
const classData = unitData.classes[heroData.className];
if (classData) {
    enemy.spellLevel = Math.min(4, classData.tier || 1);
}
        
        // Create gear from the data
        const gear = {};
        Object.entries(heroData.gear || {}).forEach(([slot, gearData]) => {
            const item = new Item(gearData.id);
            // Set specific quality values
            item.quality1 = gearData.quality[0] || 0;
            item.quality2 = gearData.quality[1] || 0;
            item.quality3 = gearData.quality[2] || 0;
            item.quality4 = gearData.quality[3] || 0;
            gear[slot] = item;
        });
        
        enemy.arenaGear = gear;
        enemy.gear = gear; // Store directly on enemy for display
        
        // Calculate gear stats and add to initial stats
        const gearStats = this.calculateGearStats(gear);
        
        // Add gear stats to enemy's initial values
        enemy.initial.str += gearStats.str;
        enemy.initial.agi += gearStats.agi;
        enemy.initial.int += gearStats.int;
        enemy.initial.hp += gearStats.hp;
        enemy.initial.armor += gearStats.armor;
        enemy.initial.resist += gearStats.resist;
        enemy.initial.hpRegen += gearStats.hpRegen;
        enemy.initial.attack += gearStats.attack;
        enemy.initial.attackSpeed += gearStats.attackSpeed;
        
        opponents.push(enemy);
    });
    
    return opponents;
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
        // Determine spell level based on tier
        let spellLevel = 1;
        if (tier === 2) spellLevel = 2;
        else if (tier === 3) spellLevel = 3;
        else if (tier === 4) spellLevel = 4;
        
        // Create regular Enemy object
        const enemy = new Enemy(className, level, spellLevel);
        
        // Generate gear for display purposes (stored as metadata)
        const gear = this.generateHeroGear(enemy, level);
        enemy.arenaGear = gear; // Store gear for display in popup
        
        // Calculate gear stats and add to initial stats
        const gearStats = this.calculateGearStats(gear);
        
        // Add gear stats to enemy's initial values
        enemy.initial.str += gearStats.str;
        enemy.initial.agi += gearStats.agi;
        enemy.initial.int += gearStats.int;
        enemy.initial.hp += gearStats.hp;
        enemy.initial.armor += gearStats.armor;
        enemy.initial.resist += gearStats.resist;
        enemy.initial.hpRegen += gearStats.hpRegen;
        enemy.initial.attack += gearStats.attack;
        enemy.initial.attackSpeed += gearStats.attackSpeed;
        
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
    
    calculateGearStats(gear) {
        const stats = {
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
        Object.values(gear).forEach(item => {
            if (item) {
                const itemStats = item.getStats();
                Object.keys(itemStats).forEach(stat => {
                    stats[stat] += itemStats[stat];
                });
            }
        });
        
        return stats;
    }
}
