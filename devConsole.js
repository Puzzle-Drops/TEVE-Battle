// Developer Console Implementation
class DevConsole {
    constructor() {
        this.maxLogs = 1000; // Limit log history
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isVisible = false;
        this.logs = [];
        this.tabCompletionIndex = 0;
        this.tabCompletionOptions = [];
        this.currentTabBase = '';
        
        // Store original console methods
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };
        
        // Helper commands
        this.helpers = {
            heroes: () => this.showHeroes(),
            hero: (index) => this.showHero(index),
            setLevel: (heroIndex, level) => this.setHeroLevel(heroIndex, level),
            setAllLevels: (level) => this.setAllHeroLevels(level),
            addGold: (family, amount) => this.addGold(family, amount),
            addAllGold: (amount) => this.addAllGold(amount),
            addItem: (itemId, heroIndex) => this.addItem(itemId, heroIndex),
            promoteHero: (heroIndex, className) => this.promoteHero(heroIndex, className),
            maxHero: (heroIndex) => this.maxOutHero(heroIndex),
            unlockAll: () => this.unlockAllContent(),
            battle: () => this.showBattleInfo(),
            stash: (family) => this.showStash(family),
            givePerfectItem: (itemId, heroIndex) => this.givePerfectItem(itemId, heroIndex),
            generateItems: (stashFamily, dungeonName, count) => this.generateItems(stashFamily, dungeonName, count),
            setSpellLevel: (level) => this.setCurrentUnitSpellLevel(level),
            buff: (unitIndex, buffName, duration) => this.applyBuffToUnit(unitIndex, buffName, duration),
            debuff: (unitIndex, debuffName, duration) => this.applyDebuffToUnit(unitIndex, debuffName, duration),
            shield: (unitIndex, amount) => this.applyShieldToUnit(unitIndex, amount),
            listUnits: () => this.listBattleUnits()
        };
        
        this.init();
    }
    
    init() {
        // Override console methods
        this.overrideConsoleMethods();
        
        // Capture uncaught errors
        window.addEventListener('error', (event) => {
            this.addLog('error', `Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.addLog('error', `Unhandled Promise Rejection: ${event.reason}`);
        });
        
        // Setup input handlers
        const input = document.getElementById('devConsoleInput');
        if (input) {
            input.addEventListener('keydown', (e) => this.handleInput(e));
        }
        
        // Setup global key handler for toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                e.preventDefault();
                this.toggle();
            }
        });
    }
    
    overrideConsoleMethods() {
        // Override console.log
        console.log = (...args) => {
            this.addLog('log', args);
            this.originalConsole.log.apply(console, args);
        };
        
        // Override console.warn
        console.warn = (...args) => {
            this.addLog('warn', args);
            this.originalConsole.warn.apply(console, args);
        };
        
        // Override console.error
        console.error = (...args) => {
            this.addLog('error', args);
            this.originalConsole.error.apply(console, args);
        };
        
        // Override console.info
        console.info = (...args) => {
            this.addLog('info', args);
            this.originalConsole.info.apply(console, args);
        };
    }
    
    addLog(type, args, skipHtml = false) {
        const timestamp = new Date().toLocaleTimeString();
        const message = Array.isArray(args) ? 
            args.map(arg => this.stringify(arg)).join(' ') : 
            this.stringify(args);
        
        this.logs.push({ type, message, timestamp, skipHtml });
        
        // Limit log history
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Update display if visible
        if (this.isVisible) {
            this.appendLogToDisplay(type, message, timestamp, skipHtml);
        }
    }
    
    stringify(obj) {
        try {
            if (obj === null) return 'null';
            if (obj === undefined) return 'undefined';
            if (typeof obj === 'string') return obj;
            if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
            if (obj instanceof Error) return obj.stack || obj.toString();
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    }
    
    appendLogToDisplay(type, message, timestamp, skipHtml = false) {
        const output = document.getElementById('devConsoleOutput');
        if (!output) return;
        
        const entry = document.createElement('div');
        entry.className = `consoleEntry ${type}`;
        
        if (skipHtml) {
            entry.innerHTML = `<span class="consoleTimestamp">${timestamp}</span>${message}`;
        } else {
            entry.innerHTML = `<span class="consoleTimestamp">${timestamp}</span>${this.escapeHtml(message)}`;
        }
        
        output.appendChild(entry);
        output.scrollTop = output.scrollHeight;
    }
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    handleInput(e) {
        const input = e.target;
        
        if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabCompletion(input);
        } else if (e.key === 'Enter') {
            const command = input.value.trim();
            if (command) {
                this.executeCommand(command);
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
                input.value = '';
                this.tabCompletionOptions = [];
                this.tabCompletionIndex = 0;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                input.value = '';
            }
        } else {
            // Reset tab completion on other keys
            this.tabCompletionOptions = [];
            this.tabCompletionIndex = 0;
        }
    }
    
    handleTabCompletion(input) {
        const value = input.value;
        const cursorPos = input.selectionStart;
        
        // If we don't have options yet, generate them
        if (this.tabCompletionOptions.length === 0) {
            this.currentTabBase = value.substring(0, cursorPos);
            this.tabCompletionOptions = this.getCompletions(this.currentTabBase);
            this.tabCompletionIndex = 0;
        }
        
        if (this.tabCompletionOptions.length > 0) {
            // Cycle through options
            const completion = this.tabCompletionOptions[this.tabCompletionIndex];
            input.value = completion + value.substring(cursorPos);
            input.setSelectionRange(completion.length, completion.length);
            
            // Move to next option
            this.tabCompletionIndex = (this.tabCompletionIndex + 1) % this.tabCompletionOptions.length;
            
            // Show available options if multiple
            if (this.tabCompletionOptions.length > 1) {
                this.addLog('info', `Tab completions: ${this.tabCompletionOptions.join(', ')}`);
            }
        }
    }
    
    getCompletions(text) {
        const completions = [];
        
        // Helper commands
        const helperCommands = Object.keys(this.helpers);
        helperCommands.forEach(cmd => {
            if (cmd.startsWith(text)) {
                completions.push(cmd);
            }
        });
        
        // Try to complete object properties
        try {
            const parts = text.split('.');
            let obj = window;
            
            // Navigate to the object
            for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]];
                if (!obj) return completions;
            }
            
            const prefix = parts[parts.length - 1];
            const basePath = parts.slice(0, -1).join('.');
            
            // Get all properties
            const props = Object.getOwnPropertyNames(obj);
            props.forEach(prop => {
                if (prop.startsWith(prefix)) {
                    const fullPath = basePath ? `${basePath}.${prop}` : prop;
                    completions.push(fullPath);
                }
            });
        } catch (e) {
            // Ignore errors in completion
        }
        
        return completions.slice(0, 10); // Limit to 10 suggestions
    }
    
    executeCommand(command) {
        // Log the command
        this.addLog('command', `> ${command}`);
        
        try {
            // Check for helper commands
            const parts = command.match(/^(\w+)(?:\((.*)\))?$/);
            if (parts && this.helpers[parts[1]]) {
                const funcName = parts[1];
                const args = parts[2] ? 
                    parts[2].split(',').map(arg => {
                        const trimmed = arg.trim();
                        // Try to parse as JSON, fallback to string
                        try {
                            return JSON.parse(trimmed);
                        } catch {
                            // Remove quotes if present
                            return trimmed.replace(/^["']|["']$/g, '');
                        }
                    }) : [];
                
                this.helpers[funcName](...args);
                return;
            }
            
            // Special commands
            if (command === 'clear') {
                this.clear();
                return;
            }
            
            if (command === 'help') {
                this.showHelp();
                return;
            }
            
            // Evaluate the command
            const result = eval(command);
            this.addLog('result', this.stringify(result));
        } catch (error) {
            this.addLog('error', `Error: ${error.message}`);
        }
    }
    
    clear() {
        const output = document.getElementById('devConsoleOutput');
        if (output) {
            output.innerHTML = '';
        }
        this.logs = [];
    }
    
    showHelp() {
        const helpText = `
<span style="color: #4dd0e1; font-size: 16px;">═══ Developer Console Help ═══</span>

<span style="color: #ffd700;">Basic Commands:</span>
- clear - Clear the console
- help - Show this help
- Tab - Auto-complete commands

<span style="color: #ffd700;">Hero Commands:</span>
- heroes() - Show all heroes in a formatted table
- hero(index) - Show detailed info for a specific hero
- setLevel(heroIndex, level) - Set a hero's level
- setAllLevels(level) - Set all heroes to same level
- promoteHero(heroIndex, className) - Promote a hero
- maxHero(heroIndex) - Max out a hero (level 500, awakened)

<span style="color: #ffd700;">Battle Commands:</span>
- battle() - Show current battle info
- listUnits() - List all units with indices
- setSpellLevel(level) - Set spell level for current unit's turn
- buff(unitIndex, buffName, duration) - Apply buff to unit
- debuff(unitIndex, debuffName, duration) - Apply debuff to unit
- shield(unitIndex, amount) - Apply shield to unit

<span style="color: #ffd700;">Item/Gold Commands:</span>
- addGold(family, amount) - Add gold to a stash (e.g., "Villager", 1000000)
-addAllGold(amount) - Add gold to all stashes
- addItem(itemId, heroIndex) - Give item to hero
- givePerfectItem(itemId, heroIndex) - Give perfect 4-roll item
- generateItems(family, dungeon, count) - Generate dungeon items (e.g., "Villager", "satyrs_glade", 100)
- stash(family) - Show stash contents

<span style="color: #ffd700;">Game State:</span>
- unlockAll() - Unlock all content
- game - Access game instance
- game.currentBattle - Current battle state

<span style="color: #6a9aaa;">Use arrow up/down for command history
Press \` to toggle console</span>`;
        
        this.addLog('info', helpText, true);
    }
    
    // Helper command implementations
    showHeroes() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        let output = '<span style="color: #4dd0e1; font-size: 16px;">═══ Heroes List ═══</span>\n\n';
        
        game.heroes.forEach((hero, index) => {
            const starData = hero.getStars();
            const stars = starData.html || '';
            const awakened = hero.awakened ? '<span style="color: #d896ff;">★</span>' : '';
            
            output += `<span style="color: #ffd700;">[${index}]</span> `;
            output += `<span style="color: #b0e0f0;">${hero.name}</span> - `;
            output += `<span style="color: #4dd0e1;">${hero.displayClassName}</span> `;
            output += `<span style="color: #6a9aaa;">Lv${hero.level}</span> `;
            output += stars + awakened + '\n';
        });
        
        this.addLog('info', output, true);
    }
    
    showHero(index) {
        if (!window.game || !game.heroes[index]) {
            this.addLog('error', `Hero ${index} not found`);
            return;
        }
        
        const hero = game.heroes[index];
        const stats = hero.totalStats;
        
        let output = `<span style="color: #4dd0e1; font-size: 16px;">═══ ${hero.name} ═══</span>\n\n`;
        output += `Class: ${hero.displayClassName}\n`;
        output += `Level: ${hero.level} (${hero.exp}/${hero.expToNext} exp)\n`;
        output += `Awakened: ${hero.awakened ? 'Yes' : 'No'}\n\n`;
        
        output += '<span style="color: #ffd700;">Stats:</span>\n';
        output += `STR: ${stats.str} | AGI: ${stats.agi} | INT: ${stats.int}\n`;
        output += `HP: ${hero.hp} | Armor: ${Math.floor(hero.armor)} | Resist: ${Math.floor(hero.resist)}\n\n`;
        
        output += '<span style="color: #ffd700;">Gear:</span>\n';
        Object.entries(hero.gear).forEach(([slot, item]) => {
            if (item) {
                output += `${slot}: ${item.name} (${item.getQualityPercent()}%)\n`;
            } else {
                output += `${slot}: <empty>\n`;
            }
        });
        
        this.addLog('info', output, true);
    }
    
    setHeroLevel(index, level) {
        if (!window.game || !game.heroes[index]) {
            this.addLog('error', `Hero ${index} not found`);
            return;
        }
        
        const hero = game.heroes[index];
        level = Math.max(1, Math.min(500, parseInt(level)));
        hero.level = level;
        hero.exp = 0;
        hero.expToNext = hero.calculateExpToNext();
        
        this.addLog('info', `Set ${hero.name} to level ${level}`);
        
        if (game.currentScreen === 'heroesScreen') {
            game.updateHeroList();
            game.showHeroTab(game.currentTab);
        }
    }
    
    setAllHeroLevels(level) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        level = Math.max(1, Math.min(500, parseInt(level)));
        game.heroes.forEach(hero => {
            hero.level = level;
            hero.exp = 0;
            hero.expToNext = hero.calculateExpToNext();
        });
        
        this.addLog('info', `Set all heroes to level ${level}`);
        
        if (game.currentScreen === 'heroesScreen') {
            game.updateHeroList();
            game.showHeroTab(game.currentTab);
        }
    }
    
    addGold(family, amount) {
        if (!window.game || !game.stashes[family]) {
            this.addLog('error', `Stash family "${family}" not found`);
            this.addLog('info', 'Available families: ' + Object.keys(game.stashes).join(', '));
            return;
        }
        
        amount = parseInt(amount);
        game.stashes[family].gold += amount;
        this.addLog('info', `Added ${amount} gold to ${family} stash (total: ${game.stashes[family].gold})`);
    }

addAllGold(amount) {
    if (!window.game || !game.stashes) {
        this.addLog('error', 'Game or stashes not found');
        return;
    }

    amount = parseInt(amount);
    const families = Object.keys(game.stashes);
    
    families.forEach(family => {
        game.stashes[family].gold += amount;
    });

    this.addLog('info', `Added ${amount} gold to all stash families: ${families.join(', ')}`);
}
    
    addItem(itemId, heroIndex) {
        if (!window.game || !game.heroes[heroIndex]) {
            this.addLog('error', `Hero ${heroIndex} not found`);
            return;
        }
        
        try {
            const item = new Item(itemId);
            const hero = game.heroes[heroIndex];
            const family = game.getClassFamily(hero.className, hero.classTier);
            game.stashes[family].items.push(item);
            
            this.addLog('info', `Added ${item.name} to ${hero.name}'s stash`);
        } catch (e) {
            this.addLog('error', `Failed to create item: ${e.message}`);
        }
    }
    
    givePerfectItem(itemId, heroIndex) {
        if (!window.game || !game.heroes[heroIndex]) {
            this.addLog('error', `Hero ${heroIndex} not found`);
            return;
        }
        
        try {
            const item = new Item(itemId);
            // Set all qualities to 5/5
            if (item.roll1) item.quality1 = 5;
            if (item.roll2) item.quality2 = 5;
            if (item.roll3) item.quality3 = 5;
            if (item.roll4) item.quality4 = 5;
            
            const hero = game.heroes[heroIndex];
            const family = game.getClassFamily(hero.className, hero.classTier);
            game.stashes[family].items.push(item);
            
            this.addLog('info', `Added perfect ${item.name} (${item.getQualityPercent()}%) to ${hero.name}'s stash`);
        } catch (e) {
            this.addLog('error', `Failed to create item: ${e.message}`);
        }
    }
    
    promoteHero(index, className) {
        if (!window.game || !game.heroes[index]) {
            this.addLog('error', `Hero ${index} not found`);
            return;
        }
        
        const hero = game.heroes[index];
        const oldClass = hero.displayClassName;
        
        if (hero.promote(className)) {
            this.addLog('info', `Promoted ${hero.name} from ${oldClass} to ${hero.displayClassName}`);
            
            if (game.currentScreen === 'heroesScreen') {
                game.updateHeroList();
                game.showHeroTab(game.currentTab);
            }
        } else {
            this.addLog('error', `Failed to promote ${hero.name}`);
        }
    }
    
    maxOutHero(index) {
        if (!window.game || !game.heroes[index]) {
            this.addLog('error', `Hero ${index} not found`);
            return;
        }
        
        const hero = game.heroes[index];
        
        // Set to max level
        hero.level = 500;
        hero.exp = 0;
        hero.expToNext = 0;
        
        // Awaken if tier 4
        if (hero.classTier === 4 && !hero.awakened) {
            hero.awakened = true;
            hero.abilities = hero.getClassAbilities();
        }
        
        this.addLog('info', `Maxed out ${hero.name} - Level 500, Awakened: ${hero.awakened}`);
        
        if (game.currentScreen === 'heroesScreen') {
            game.updateHeroList();
            game.showHeroTab(game.currentTab);
        }
    }
    
    showBattleInfo() {
        if (!window.game || !game.currentBattle) {
            this.addLog('info', 'No battle in progress');
            return;
        }
        
        const battle = game.currentBattle;
        let output = '<span style="color: #4dd0e1; font-size: 16px;">═══ Battle Info ═══</span>\n\n';
        
        output += `Wave: ${battle.currentWave + 1}/${battle.enemyWaves.length}\n`;
        output += `Turn: ${battle.turn}\n`;
        output += `Auto Mode: ${battle.autoMode}\n\n`;
        
        output += '<span style="color: #00ff88;">Party:</span>\n';
        battle.party.forEach(unit => {
            if (unit) {
                output += `• ${unit.name} - HP: ${unit.currentHp}/${unit.maxHp} ${unit.isAlive ? '' : '(DEAD)'}\n`;
            }
        });
        
        output += '\n<span style="color: #ff4444;">Enemies:</span>\n';
        battle.enemies.forEach(unit => {
            if (unit) {
                output += `• ${unit.name} - HP: ${unit.currentHp}/${unit.maxHp} ${unit.isAlive ? '' : '(DEAD)'}\n`;
            }
        });
        
        this.addLog('info', output, true);
    }
    
    showStash(family) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        if (!family) {
            this.addLog('info', 'Available stashes: ' + Object.keys(game.stashes).join(', '));
            return;
        }
        
        if (!game.stashes[family]) {
            this.addLog('error', `Stash "${family}" not found`);
            return;
        }
        
        const stash = game.stashes[family];
        let output = `<span style="color: #4dd0e1; font-size: 16px;">═══ ${family} Stash ═══</span>\n\n`;
        output += `<span style="color: #ffd700;">Gold: ${stash.gold.toLocaleString()}</span>\n\n`;
        
        if (stash.items.length === 0) {
            output += 'No items in stash';
        } else {
            output += `Items (${stash.items.length}):\n`;
            stash.items.slice(0, 20).forEach((item, i) => {
                output += `[${i}] ${item.name} (${item.getQualityPercent()}%) - ${item.getRarity()}\n`;
            });
            if (stash.items.length > 20) {
                output += `... and ${stash.items.length - 20} more items`;
            }
        }
        
        this.addLog('info', output, true);
    }
    
    generateItems(stashFamily, dungeonName, count) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        // Validate stash family
        if (!game.stashes[stashFamily]) {
            this.addLog('error', `Stash family "${stashFamily}" not found`);
            this.addLog('info', 'Available families: ' + Object.keys(game.stashes).join(', '));
            return;
        }
        
        // Validate dungeon
        const dungeonId = dungeonName.toLowerCase().replace(/ /g, '_');
        const dungeon = dungeonData?.dungeons[dungeonId];
        if (!dungeon) {
            this.addLog('error', `Dungeon "${dungeonName}" not found`);
            // Show available dungeons
            const availableDungeons = Object.keys(dungeonData?.dungeons || {}).join(', ');
            this.addLog('info', 'Available dungeons: ' + availableDungeons);
            return;
        }
        
        // Validate count
        count = parseInt(count);
        if (isNaN(count) || count <= 0) {
            this.addLog('error', 'Count must be a positive number');
            return;
        }
        
        // Get item pool from dungeon
        const itemPool = dungeon.rewards?.items || [];
        if (itemPool.length === 0) {
            this.addLog('error', `Dungeon "${dungeonName}" has no items in its loot pool`);
            return;
        }
        
        // Generate items
        const generatedItems = [];
        for (let i = 0; i < count; i++) {
            const itemId = itemPool[Math.floor(Math.random() * itemPool.length)];
            const item = new Item(itemId);
            game.stashes[stashFamily].items.push(item);
            generatedItems.push(item);
        }
        
        // Report results
        this.addLog('info', `Generated ${count} items from ${dungeon.name} in ${stashFamily} stash`);
        
        // Show rarity distribution
        const rarityCount = {};
        generatedItems.forEach(item => {
            const rarity = item.getRarity();
            rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
        });
        
        // Display in correct order: green, blue, purple, red, gold
        const rarityOrder = ['green', 'blue', 'purple', 'red', 'gold'];
        let distribution = 'Rarity distribution: ';
        rarityOrder.forEach(rarity => {
            if (rarityCount[rarity]) {
                const cnt = rarityCount[rarity];
                const percentage = ((cnt / count) * 100).toFixed(1);
                distribution += `<span style="color: ${this.getRarityColor(rarity)}">${rarity}: ${cnt} (${percentage}%)</span> `;
            }
        });
        this.addLog('info', distribution, true);
    }
    
    getRarityColor(rarity) {
        const colors = {
            green: '#00ff88',
            blue: '#00c3ff',
            purple: '#d896ff',
            red: '#ff4444',
            gold: '#ffd700'
        };
        return colors[rarity] || '#ffffff';
    }

    unlockAll() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        // Give tons of gold to all stashes
        Object.keys(game.stashes).forEach(family => {
            game.stashes[family].gold = 999999999;
        });
        
        // Set all heroes to level 300
        game.heroes.forEach(hero => {
            hero.level = 300;
            hero.exp = 0;
            hero.expToNext = hero.calculateExpToNext();
        });
        
        this.addLog('info', 'Unlocked all content! All stashes have max gold, all heroes level 300');
    }
    
    setCurrentUnitSpellLevel(level) {
    if (!window.game || !game.currentBattle) {
        this.addLog('error', 'No battle in progress');
        return;
    }
    
    const battle = game.currentBattle;
    if (!battle.currentUnit) {
        this.addLog('error', "It's not anyone's turn yet");
        return;
    }
    
    const unit = battle.currentUnit;
    const oldLevel = unit.spellLevel;
    
    // Clamp level between 1 and 5
    level = Math.max(1, Math.min(5, parseInt(level)));
    
    // For both enemies and heroes, we can now use the setter
    unit.source.spellLevel = level;
    
    // Update abilities to reflect new level
    unit.abilities.forEach(ability => {
        if (ability.level !== undefined) {
            ability.level = level;
        }
    });
    
    this.addLog('info', `Set ${unit.name}'s spell level from ${oldLevel} to ${level}`);
    
    // Update the battle UI to reflect changes if needed
    if (battle.updateUI) {
        battle.updateUI();
    }
}

    applyBuffToUnit(unitIndex, buffName, duration) {
    if (!window.game || !game.currentBattle) {
        this.addLog('error', 'No battle in progress');
        return;
    }
    
    const battle = game.currentBattle;
    const allUnits = [...battle.party, ...battle.enemies];
    
    if (unitIndex < 0 || unitIndex >= allUnits.length) {
        this.addLog('error', `Invalid unit index. Use listUnits() to see available units (0-${allUnits.length - 1})`);
        return;
    }
    
    const unit = allUnits[unitIndex];
    if (!unit || !unit.isAlive) {
        this.addLog('error', 'Unit is dead or invalid');
        return;
    }
    
    // Validate buff name
    const validBuffs = ['Increase Attack', 'Increase Speed', 'Increase Defense', 'Immune', 'Shield', 'Frost Armor'];
    if (!validBuffs.includes(buffName)) {
        this.addLog('error', `Invalid buff name. Valid buffs: ${validBuffs.join(', ')}`);
        return;
    }
    
    duration = parseInt(duration) || 3;
    
    // Apply the buff
    battle.applyBuff(unit, buffName, duration, {});
    this.addLog('info', `Applied ${buffName} to ${unit.name} for ${duration} turns`);
    
    // Update the battle UI to show the buff
    battle.updateUI();
}

applyDebuffToUnit(unitIndex, debuffName, duration) {
    if (!window.game || !game.currentBattle) {
        this.addLog('error', 'No battle in progress');
        return;
    }
    
    const battle = game.currentBattle;
    const allUnits = [...battle.party, ...battle.enemies];
    
    if (unitIndex < 0 || unitIndex >= allUnits.length) {
        this.addLog('error', `Invalid unit index. Use listUnits() to see available units (0-${allUnits.length - 1})`);
        return;
    }
    
    const unit = allUnits[unitIndex];
    if (!unit || !unit.isAlive) {
        this.addLog('error', 'Unit is dead or invalid');
        return;
    }
    
    // Validate debuff name
    const validDebuffs = ['Reduce Attack', 'Reduce Speed', 'Reduce Defense', 'Blight', 'Bleed', 'Stun', 'Taunt', 'Silence', 'Mark'];
    if (!validDebuffs.includes(debuffName)) {
        this.addLog('error', `Invalid debuff name. Valid debuffs: ${validDebuffs.join(', ')}`);
        return;
    }
    
    duration = parseInt(duration) || 3;
    
    // Apply the debuff with appropriate effects
    const effects = {};
    if (debuffName === 'Stun') effects.stunned = true;
    if (debuffName === 'Bleed') effects.bleedDamage = true;
    if (debuffName === 'Blight') effects.noHeal = true;
    
    battle.applyDebuff(unit, debuffName, duration, effects);
    this.addLog('info', `Applied ${debuffName} to ${unit.name} for ${duration} turns`);
    
    // Update the battle UI to show the debuff
    battle.updateUI();
    
    // If applying stun, also update stun visuals
    if (debuffName === 'Stun') {
        battle.updateStunVisuals(unit);
    }
}

applyShieldToUnit(unitIndex, amount) {
    if (!window.game || !game.currentBattle) {
        this.addLog('error', 'No battle in progress');
        return;
    }
    
    const battle = game.currentBattle;
    const allUnits = [...battle.party, ...battle.enemies];
    
    if (unitIndex < 0 || unitIndex >= allUnits.length) {
        this.addLog('error', `Invalid unit index. Use listUnits() to see available units (0-${allUnits.length - 1})`);
        return;
    }
    
    const unit = allUnits[unitIndex];
    if (!unit || !unit.isAlive) {
        this.addLog('error', 'Unit is dead or invalid');
        return;
    }
    
    amount = parseInt(amount) || 100;
    
    // Apply shield as a buff with -1 duration (permanent until depleted)
    battle.applyBuff(unit, 'Shield', -1, { shieldAmount: amount });
    this.addLog('info', `Applied ${amount} HP shield to ${unit.name}`);
    
    // Update the battle UI to show the shield
    battle.updateUI();
}

    listBattleUnits() {
        if (!window.game || !game.currentBattle) {
            this.addLog('error', 'No battle in progress');
            return;
        }
        
        const battle = game.currentBattle;
        let output = '<span style="color: #4dd0e1; font-size: 16px;">═══ Battle Units ═══</span>\n\n';
        
        output += '<span style="color: #00ff88;">Party:</span>\n';
        battle.party.forEach((unit, index) => {
            if (unit) {
                const status = unit.isAlive ? `HP: ${unit.currentHp}/${unit.maxHp}` : '(DEAD)';
                const current = battle.currentUnit === unit ? ' <span style="color: #ffd700;">← Current Turn</span>' : '';
                output += `[${index}] ${unit.name} - ${status}${current}\n`;
            }
        });
        
        output += '\n<span style="color: #ff4444;">Enemies:</span>\n';
        battle.enemies.forEach((unit, index) => {
            if (unit) {
                const status = unit.isAlive ? `HP: ${unit.currentHp}/${unit.maxHp}` : '(DEAD)';
                const current = battle.currentUnit === unit ? ' <span style="color: #ffd700;">← Current Turn</span>' : '';
                const globalIndex = battle.party.length + index;
                output += `[${globalIndex}] ${unit.name} - ${status}${current}\n`;
            }
        });
        
        this.addLog('info', output, true);
    }
    
    toggle() {
        this.isVisible = !this.isVisible;
        const consoleEl = document.getElementById('devConsole');
        if (consoleEl) {
            consoleEl.style.display = this.isVisible ? 'flex' : 'none';
            
            if (this.isVisible) {
                // Refresh display with current logs
                this.refreshDisplay();
                
                // Focus input
                const input = document.getElementById('devConsoleInput');
                if (input) {
                    input.focus();
                }
            }
        }
    }
    
    refreshDisplay() {
        const output = document.getElementById('devConsoleOutput');
        if (!output) return;
        
        output.innerHTML = '';
        this.logs.forEach(log => {
            this.appendLogToDisplay(log.type, log.message, log.timestamp, log.skipHtml);
        });
    }
}

// Initialize dev console globally
window.devConsole = new DevConsole();
