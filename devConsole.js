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
            // Basic commands
            help: () => this.showHelp(),
            clear: () => this.clear(),
            
            // Hero commands
            heroes: () => this.showHeroes(),
            hero: (index) => this.showHero(index),
            setLevel: (heroIndex, level) => this.setHeroLevel(heroIndex, level),
            setAllLevels: (level) => this.setAllHeroLevels(level),
            setAllHeroes: (className, level, awakened) => this.setAllHeroes(className, level, awakened),
            promoteHero: (heroIndex, className) => this.promoteHero(heroIndex, className),
            maxHero: (heroIndex) => this.maxOutHero(heroIndex),
            healAllHeroes: () => this.healAllHeroes(),
            
            // Gold/Item commands
            addGold: (family, amount) => this.addGold(family, amount),
            addAllGold: (amount) => this.addAllGold(amount),
            addItem: (itemId, heroIndex) => this.addItem(itemId, heroIndex),
            givePerfectItem: (itemId, heroIndex) => this.givePerfectItem(itemId, heroIndex),
            generateItems: (stashFamily, dungeonName, count) => this.generateItems(stashFamily, dungeonName, count),
            fillStashes: (itemLevel) => this.fillStashes(itemLevel),
            clearStashes: () => this.clearStashes(),
            perfectGear: (heroIndex) => this.perfectGear(heroIndex),
            stash: (family) => this.showStash(family),
            
            // Battle commands
            battle: () => this.showBattleInfo(),
            listUnits: () => this.listBattleUnits(),
            setSpellLevel: (level) => this.setCurrentUnitSpellLevel(level),
            buff: (unitIndex, buffName, duration) => this.applyBuffToUnit(unitIndex, buffName, duration),
            debuff: (unitIndex, debuffName, duration) => this.applyDebuffToUnit(unitIndex, debuffName, duration),
            shield: (unitIndex, amount) => this.applyShieldToUnit(unitIndex, amount),
            winBattle: () => this.winCurrentBattle(),
            
            // Progression commands
            unlockAll: () => this.unlockAllContent(),
            completeAllDungeons: () => this.completeAllDungeons(),
            unlockDungeon: (dungeonId) => this.unlockSpecificDungeon(dungeonId),
            setProgression: (tierName) => this.setProgressionToTier(tierName),
            resetProgression: () => this.resetProgression(),
            
            // Utility commands
            resetGame: () => this.resetGame(),
            testBattle: (dungeonId, heroIndices) => this.startTestBattle(dungeonId, heroIndices),
            showDungeons: () => this.showAvailableDungeons(),
            showClasses: () => this.showAvailableClasses()
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
            
            // Special commands handled internally
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
<span style="color: #4dd0e1; font-size: 18px; font-weight: bold;">═══════════════════════════════════════════════════════════════</span>
<span style="color: #4dd0e1; font-size: 16px; font-weight: bold;">                     DEVELOPER CONSOLE HELP</span>
<span style="color: #4dd0e1; font-size: 18px; font-weight: bold;">═══════════════════════════════════════════════════════════════</span>

<span style="color: #ffd700; font-size: 14px; font-weight: bold;">📋 BASIC COMMANDS</span>
<span style="color: #b0e0f0;">help</span> ........................... Show this help menu
<span style="color: #b0e0f0;">clear</span> .......................... Clear the console
<span style="color: #b0e0f0;">Tab</span> ............................ Auto-complete commands

<span style="color: #ffd700; font-size: 14px; font-weight: bold;">👥 HERO MANAGEMENT</span>
<span style="color: #b0e0f0;">heroes()</span> ....................... List all heroes
<span style="color: #b0e0f0;">hero(index)</span> .................... Show hero details
<span style="color: #b0e0f0;">setLevel(heroIndex, level)</span> ..... Set hero's level
<span style="color: #b0e0f0;">setAllLevels(level)</span> ............ Set all heroes to level
<span style="color: #b0e0f0;">setAllHeroes(class, lvl, awaken)</span> Set all heroes to class/level
<span style="color: #b0e0f0;">promoteHero(index, className)</span> .. Promote specific hero
<span style="color: #b0e0f0;">maxHero(heroIndex)</span> ............. Max out a hero (500 awakened)
<span style="color: #b0e0f0;">healAllHeroes()</span> ................ Restore all heroes to full HP

<span style="color: #ffd700; font-size: 14px; font-weight: bold;">💰 GOLD & ITEMS</span>
<span style="color: #b0e0f0;">addGold(family, amount)</span> ........ Add gold to stash
<span style="color: #b0e0f0;">addAllGold(amount)</span> ............. Add gold to all stashes
<span style="color: #b0e0f0;">stash(family)</span> .................. Show stash contents
<span style="color: #b0e0f0;">addItem(itemId, heroIndex)</span> ..... Give item to hero's stash
<span style="color: #b0e0f0;">givePerfectItem(id, heroIndex)</span> . Give perfect 4-roll item
<span style="color: #b0e0f0;">generateItems(fam, dung, count)</span> Generate dungeon items
<span style="color: #b0e0f0;">fillStashes(itemLevel)</span> ......... Fill all stashes with items
<span style="color: #b0e0f0;">clearStashes()</span> ................. Remove all items from stashes
<span style="color: #b0e0f0;">perfectGear(heroIndex)</span> ......... Equip hero with perfect gear

<span style="color: #ffd700; font-size: 14px; font-weight: bold;">⚔️ BATTLE COMMANDS</span>
<span style="color: #b0e0f0;">battle()</span> ....................... Show current battle info
<span style="color: #b0e0f0;">listUnits()</span> .................... List all battle units
<span style="color: #b0e0f0;">setSpellLevel(level)</span> ........... Set current unit's spell level
<span style="color: #b0e0f0;">buff(unit, name, duration)</span> ..... Apply buff to unit
<span style="color: #b0e0f0;">debuff(unit, name, duration)</span> ... Apply debuff to unit
<span style="color: #b0e0f0;">shield(unit, amount)</span> ........... Apply shield to unit
<span style="color: #b0e0f0;">winBattle()</span> .................... Instantly win current battle

<span style="color: #ffd700; font-size: 14px; font-weight: bold;">🏰 PROGRESSION</span>
<span style="color: #b0e0f0;">unlockAll()</span> .................... Unlock everything + max gold
<span style="color: #b0e0f0;">completeAllDungeons()</span> .......... Mark all dungeons complete
<span style="color: #b0e0f0;">unlockDungeon(dungeonId)</span> ....... Unlock specific dungeon
<span style="color: #b0e0f0;">setProgression(tierName)</span> ....... Unlock up to tier
<span style="color: #b0e0f0;">resetProgression()</span> ............. Reset all progression

<span style="color: #ffd700; font-size: 14px; font-weight: bold;">🛠️ UTILITIES</span>
<span style="color: #b0e0f0;">showDungeons()</span> ................. List all dungeon IDs
<span style="color: #b0e0f0;">showClasses()</span> .................. List all class names
<span style="color: #b0e0f0;">testBattle(dungeonId, heroes)</span> .. Start test battle
<span style="color: #b0e0f0;">resetGame()</span> .................... Reset to initial state
<span style="color: #b0e0f0;">game</span> ........................... Access game instance

<span style="color: #6a9aaa; font-size: 12px;">Examples:
  setAllHeroes("grand_templar_male", 300, true)
  generateItems("Villager", "satyrs_glade", 100)
  testBattle("twilights_fortress", [0, 1, 2, 3, 4])
  buff(0, "Increase Attack", 5)

Use arrow up/down for command history. Press \` to toggle console.</span>`;
        
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
    
    setAllHeroes(targetClassName, level, awakened = false) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        // First give tons of gold to all stashes for promotions
        Object.keys(game.stashes).forEach(family => {
            game.stashes[family].gold = 999999999;
        });
        
        level = Math.max(1, Math.min(500, parseInt(level)));
        
        // Find target class info
        const targetClass = unitData?.classes[targetClassName];
        if (!targetClass) {
            this.addLog('error', `Class "${targetClassName}" not found. Use showClasses() to see available classes.`);
            return;
        }
        
        const targetTier = targetClass.tier;
        let promotedCount = 0;
        
        game.heroes.forEach(hero => {
            // Promote to target tier
            while (hero.classTier < targetTier) {
                const promotions = hero.getPromotionOptions();
                if (promotions.length > 0) {
                    // Pick random promotion
                    const randomPromo = promotions[Math.floor(Math.random() * promotions.length)];
                    hero.promote(randomPromo);
                }
            }
            
            // Set level
            hero.level = level;
            hero.exp = 0;
            hero.expToNext = hero.calculateExpToNext();
            
            // Awaken if requested and eligible
            if (awakened && hero.classTier === 4 && level >= 400 && !hero.awakened) {
                hero.promote('Awaken');
            }
            
            promotedCount++;
        });
        
        this.addLog('info', `Set ${promotedCount} heroes to tier ${targetTier} (${targetClass.name}), level ${level}${awakened ? ', awakened' : ''}`);
        
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
    
    healAllHeroes() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        let healed = 0;
        game.heroes.forEach(hero => {
            hero.currentHp = hero.hp;
            healed++;
        });
        
        this.addLog('info', `Healed ${healed} heroes to full HP`);
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
    
    fillStashes(itemLevel = 100) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        itemLevel = parseInt(itemLevel);
        
        // Find a dungeon with appropriate level items
        let targetDungeon = null;
        for (const dungeonId in dungeonData.dungeons) {
            const dungeon = dungeonData.dungeons[dungeonId];
            if (dungeon.level >= itemLevel - 50 && dungeon.level <= itemLevel + 50) {
                targetDungeon = dungeon;
                break;
            }
        }
        
        if (!targetDungeon) {
            this.addLog('error', `No dungeon found with items around level ${itemLevel}`);
            return;
        }
        
        // Fill each stash with 100 items
        Object.keys(game.stashes).forEach(family => {
            this.generateItems(family, targetDungeon.id, 100);
        });
        
        this.addLog('info', `Filled all stashes with items from ${targetDungeon.name} (level ${targetDungeon.level})`);
    }
    
    clearStashes() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        let totalItems = 0;
        Object.keys(game.stashes).forEach(family => {
            totalItems += game.stashes[family].items.length;
            game.stashes[family].items = [];
        });
        
        this.addLog('info', `Cleared ${totalItems} items from all stashes`);
    }
    
    perfectGear(heroIndex) {
        if (!window.game || !game.heroes[heroIndex]) {
            this.addLog('error', `Hero ${heroIndex} not found`);
            return;
        }
        
        const hero = game.heroes[heroIndex];
        const slots = ['weapon', 'offhand', 'head', 'chest', 'legs', 'trinket'];
        
        // Find appropriate items for hero's level
        let targetDungeon = null;
        for (const dungeonId in dungeonData.dungeons) {
            const dungeon = dungeonData.dungeons[dungeonId];
            if (dungeon.level <= hero.level && dungeon.level >= hero.level - 50) {
                targetDungeon = dungeon;
            }
        }
        
        if (!targetDungeon || !targetDungeon.rewards?.items) {
            this.addLog('error', 'No appropriate items found for hero level');
            return;
        }
        
        const itemPool = targetDungeon.rewards.items;
        
        slots.forEach(slot => {
            // Find items for this slot
            const slotItems = itemPool.filter(itemId => {
                const template = itemData.items[itemId];
                return template && template.slot === slot;
            });
            
            if (slotItems.length > 0) {
                const itemId = slotItems[Math.floor(Math.random() * slotItems.length)];
                const item = new Item(itemId);
                
                // Make it perfect
                if (item.roll1) item.quality1 = 5;
                if (item.roll2) item.quality2 = 5;
                if (item.roll3) item.quality3 = 5;
                if (item.roll4) item.quality4 = 5;
                
                // Equip it
                hero.equipItem(item, slot);
            }
        });
        
        this.addLog('info', `Equipped ${hero.name} with perfect gear from ${targetDungeon.name}`);
        
        if (game.currentScreen === 'heroesScreen') {
            game.showHeroTab(game.currentTab);
        }
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

    unlockAllContent() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        // Give tons of gold to all stashes
        Object.keys(game.stashes).forEach(family => {
            game.stashes[family].gold = 999999999;
        });
        
        // Unlock all features
        game.progression.unlockedFeatures = {
            party: true,
            stash: true,
            arena: true
        };
        
        // Unlock all tiers
        game.progression.unlockedTiers = Object.keys(game.dungeonTiers);
        
        // Set all heroes to level 300
        game.heroes.forEach(hero => {
            hero.level = 300;
            hero.exp = 0;
            hero.expToNext = hero.calculateExpToNext();
        });
        
        // Save progression
        game.saveProgression();
        
        this.addLog('info', 'Unlocked all content! All features unlocked, all tiers available, all stashes have max gold, all heroes level 300');
        
        // Refresh UI if on main menu
        if (game.currentScreen === 'mainMenuScreen') {
            game.showMainMenu();
        }
    }
    
    completeAllDungeons() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        let count = 0;
        Object.keys(dungeonData.dungeons).forEach(dungeonId => {
            game.markDungeonComplete(dungeonId, '00:00');
            count++;
        });
        
        this.addLog('info', `Marked ${count} dungeons as completed`);
    }
    
    unlockSpecificDungeon(dungeonId) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        if (!dungeonData.dungeons[dungeonId]) {
            this.addLog('error', `Dungeon "${dungeonId}" not found`);
            return;
        }
        
        game.markDungeonComplete(dungeonId, '00:00');
        this.addLog('info', `Unlocked dungeon: ${dungeonId}`);
    }
    
    setProgressionToTier(tierName) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        const tierOrder = game.getTierOrder();
        const tierIndex = tierOrder.indexOf(tierName);
        
        if (tierIndex === -1) {
            this.addLog('error', `Tier "${tierName}" not found`);
            this.addLog('info', 'Available tiers: ' + tierOrder.join(', '));
            return;
        }
        
        // Unlock all tiers up to and including the specified one
        game.progression.unlockedTiers = tierOrder.slice(0, tierIndex + 1);
        
        // Complete all dungeons in unlocked tiers
        game.progression.unlockedTiers.forEach(tier => {
            const tierDungeons = game.dungeonTiers[tier].dungeons;
            tierDungeons.forEach(dungeon => {
                game.markDungeonComplete(dungeon.id, '00:00');
            });
        });
        
        game.saveProgression();
        this.addLog('info', `Set progression to ${tierName} tier`);
        
        if (game.currentScreen === 'mainMenuScreen') {
            game.showMainMenu();
        }
    }
    
    resetProgression() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        game.progression = {
            unlockedFeatures: {
                party: true,
                stash: false,
                arena: false
            },
            unlockedTiers: ['Easy'],
            completedDungeons: {}
        };
        
        game.saveProgression();
        this.addLog('info', 'Reset all progression to initial state');
        
        if (game.currentScreen === 'mainMenuScreen') {
            game.showMainMenu();
        }
    }
    
    resetGame() {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        // Confirm reset
        if (!confirm('Are you sure you want to reset the entire game?')) {
            return;
        }
        
        // Create new game instance
        window.game = new Game();
        this.addLog('info', 'Game reset to initial state');
        game.showSplashScreen();
    }
    
    startTestBattle(dungeonId, heroIndices) {
        if (!window.game) {
            this.addLog('error', 'Game not initialized');
            return;
        }
        
        if (!dungeonData.dungeons[dungeonId]) {
            this.addLog('error', `Dungeon "${dungeonId}" not found`);
            this.showAvailableDungeons();
            return;
        }
        
        // Set up dungeon
        const dungeon = dungeonData.dungeons[dungeonId];
        game.currentDungeon = {
            id: dungeonId,
            name: dungeon.name,
            boss: dungeon.boss,
            level: dungeon.level
        };
        
        // Set up waves
        game.dungeonWaves = dungeon.waves.map(wave => {
            return wave.enemies.map(enemyConfig => {
                return new Enemy(enemyConfig.id, enemyConfig.level);
            });
        });
        
        // Set party
        if (!heroIndices || !Array.isArray(heroIndices)) {
            heroIndices = [0, 1, 2, 3, 4]; // Default first 5 heroes
        }
        
        game.selectedParty = heroIndices.slice(0, 5);
        
        this.addLog('info', `Starting test battle in ${dungeon.name} with heroes: ${heroIndices.join(', ')}`);
        game.startBattle();
    }
    
    showAvailableDungeons() {
        if (!dungeonData || !dungeonData.dungeons) {
            this.addLog('error', 'Dungeon data not loaded');
            return;
        }
        
        let output = '<span style="color: #4dd0e1; font-size: 16px;">═══ Available Dungeons ═══</span>\n\n';
        
        Object.keys(dungeonData.dungeons).forEach(id => {
            const dungeon = dungeonData.dungeons[id];
            output += `<span style="color: #b0e0f0;">${id}</span> - ${dungeon.name} (Lv ${dungeon.level})\n`;
        });
        
        this.addLog('info', output, true);
    }
    
    showAvailableClasses() {
        if (!unitData || !unitData.classes) {
            this.addLog('error', 'Unit data not loaded');
            return;
        }
        
        let output = '<span style="color: #4dd0e1; font-size: 16px;">═══ Available Classes ═══</span>\n\n';
        
        const tiers = {};
        Object.keys(unitData.classes).forEach(id => {
            const cls = unitData.classes[id];
            if (!tiers[cls.tier]) tiers[cls.tier] = [];
            tiers[cls.tier].push({ id, name: cls.name });
        });
        
        Object.keys(tiers).sort((a, b) => a - b).forEach(tier => {
            output += `<span style="color: #ffd700;">Tier ${tier}:</span>\n`;
            tiers[tier].forEach(cls => {
                output += `  <span style="color: #b0e0f0;">${cls.id}</span> - ${cls.name}\n`;
            });
            output += '\n';
        });
        
        this.addLog('info', output, true);
    }
    
    winCurrentBattle() {
        if (!window.game || !game.currentBattle) {
            this.addLog('error', 'No battle in progress');
            return;
        }
        
        const battle = game.currentBattle;
        
        // Kill all enemies
        battle.enemies.forEach(enemy => {
            if (enemy && enemy.isAlive) {
                enemy.currentHp = 0;
                enemy.isDead = true;
            }
        });
        
        // Force battle end check
        battle.checkBattleEnd();
        
        this.addLog('info', 'Victory! All enemies defeated');
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
