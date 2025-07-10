// saveManager.js - Handles all save/load operations with data validation
class SaveManager {
    constructor() {
        this.version = '1.0.0';
        this.maxSaveSlots = 3;
        this.currentSlot = null;
        this.autoSaveInterval = 60000; // Auto-save every 60 seconds
        this.autoSaveTimer = null;
        
        // Encryption key - in production, this should be more secure
        this.encryptionKey = 'TEVE_2025_TWILIGHT';
    }

    // Initialize save manager
    init(game) {
        this.game = game;
        this.startAutoSave();
    }

    // Start auto-save timer
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.currentSlot !== null) {
                this.saveToSlot(this.currentSlot, true); // Silent auto-save
            }
        }, this.autoSaveInterval);
    }

    // Get all save slots info
    getSaveSlots() {
        const slots = [];
        
        for (let i = 1; i <= this.maxSaveSlots; i++) {
            const saveKey = `teveSave_slot${i}`;
            const savedData = localStorage.getItem(saveKey);
            
            if (savedData) {
                try {
                    const decrypted = this.decrypt(savedData);
                    const saveData = JSON.parse(decrypted);
                    
                    // Validate save data
                    if (this.validateSaveData(saveData)) {
                        slots.push({
                            slot: i,
                            exists: true,
                            heroCount: saveData.heroes.length,
                            highestLevel: Math.max(...saveData.heroes.map(h => h.level)),
                            playtime: saveData.playtime || 0,
                            lastSaved: saveData.timestamp,
                            version: saveData.version
                        });
                    } else {
                        slots.push({ slot: i, exists: false, corrupted: true });
                    }
                } catch (e) {
                    slots.push({ slot: i, exists: false, corrupted: true });
                }
            } else {
                slots.push({ slot: i, exists: false });
            }
        }
        
        return slots;
    }

    // Save game to specific slot
    saveToSlot(slot, silent = false) {
        if (!this.game) return false;
        
        try {
            const saveData = this.createSaveData();
            const validated = this.validateSaveData(saveData);
            
            if (!validated) {
                if (!silent) alert('Failed to validate save data!');
                return false;
            }
            
            // Add checksum
            saveData.checksum = this.generateChecksum(saveData);
            
            // Encrypt and save
            const encrypted = this.encrypt(JSON.stringify(saveData));
            localStorage.setItem(`teveSave_slot${slot}`, encrypted);
            
            // Update current slot
            this.currentSlot = slot;
            
            if (!silent) {
                this.game.uiManager.showSaveNotification(`Game saved to Slot ${slot}`);
            }
            
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            if (!silent) alert('Failed to save game!');
            return false;
        }
    }

    // Load game from specific slot
    loadFromSlot(slot) {
        try {
            const savedData = localStorage.getItem(`teveSave_slot${slot}`);
            if (!savedData) {
                alert('No save data found in this slot!');
                return false;
            }
            
            // Decrypt
            const decrypted = this.decrypt(savedData);
            const saveData = JSON.parse(decrypted);
            
            // Validate checksum
            const checksum = saveData.checksum;
            delete saveData.checksum;
            
            if (checksum !== this.generateChecksum(saveData)) {
                alert('Save data appears to be corrupted or tampered with!');
                return false;
            }
            
            // Validate save data structure
            if (!this.validateSaveData(saveData)) {
                alert('Invalid save data format!');
                return false;
            }
            
            // Apply save data to game
            this.applySaveData(saveData);
            
            // Update current slot
            this.currentSlot = slot;
            
            // Show success message
            this.game.uiManager.showSaveNotification(`Game loaded from Slot ${slot}`);
            
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            alert('Failed to load save data!');
            return false;
        }
    }

    // Delete save slot
    deleteSlot(slot) {
        if (confirm(`Are you sure you want to delete Save Slot ${slot}? This cannot be undone!`)) {
            localStorage.removeItem(`teveSave_slot${slot}`);
            
            // If deleting current slot, clear it
            if (this.currentSlot === slot) {
                this.currentSlot = null;
            }
            
            return true;
        }
        return false;
    }

    // Create save data object
    createSaveData() {
        const game = this.game;
        
        return {
            version: this.version,
            timestamp: new Date().toISOString(),
            playtime: this.calculatePlaytime(),
            
            // Heroes
            heroes: game.heroes.map(hero => ({
                name: hero.name,
                gender: hero.gender,
                className: hero.className,
                level: hero.level,
                exp: hero.exp,
                expToNext: hero.expToNext,
                awakened: hero.awakened,
                initial: hero.initial,
                gear: {
                    head: this.serializeItem(hero.gear.head),
                    chest: this.serializeItem(hero.gear.chest),
                    legs: this.serializeItem(hero.gear.legs),
                    weapon: this.serializeItem(hero.gear.weapon),
                    offhand: this.serializeItem(hero.gear.offhand),
                    trinket: this.serializeItem(hero.gear.trinket)
                }
            })),
            
            // Stashes
            stashes: Object.entries(game.stashes).reduce((acc, [family, stash]) => {
                acc[family] = {
                    gold: stash.gold,
                    items: stash.items.map(item => this.serializeItem(item))
                };
                return acc;
            }, {}),
            
            // Progression
            progression: {
                unlockedFeatures: game.progression.unlockedFeatures,
                unlockedTiers: game.progression.unlockedTiers,
                completedDungeons: game.progression.completedDungeons,
                completedArenas: game.progression.completedArenas
            },
            
            // Collection log
            collectionLog: game.collectionLog,
            
            // Settings
            settings: {
                sortSettings: game.sortSettings,
                autoBattle: game.autoBattle,
                autoReplay: game.autoReplay,
                tutorialCompleted: game.tutorialCompleted,
                maxPartySize: game.maxPartySize
            },
            
            // Current state (optional)
            currentState: {
                currentScreen: game.currentScreen,
                selectedHero: game.uiManager.selectedHero,
                currentTab: game.uiManager.currentTab
            }
        };
    }

    // Apply save data to game
    applySaveData(saveData) {
        const game = this.game;
        
        // Clear existing data
        game.heroes = [];
        
        // Load heroes
        saveData.heroes.forEach(heroData => {
            const hero = new Hero(heroData.className);
            hero.name = heroData.name;
            hero.gender = heroData.gender;
            hero.level = heroData.level;
            hero.exp = heroData.exp;
            hero.expToNext = heroData.expToNext;
            hero.awakened = heroData.awakened || false;
            hero.initial = heroData.initial || hero.initial;
            
            // Load gear
            Object.entries(heroData.gear).forEach(([slot, itemData]) => {
                if (itemData) {
                    hero.gear[slot] = this.deserializeItem(itemData);
                }
            });
            
            // Update gear stats
            hero.updateGearStats();
            
            // Update abilities for current level
            hero.abilities = hero.getClassAbilities();
            
            game.heroes.push(hero);
        });
        
        // Load stashes
        Object.entries(saveData.stashes).forEach(([family, stashData]) => {
            game.stashes[family] = {
                gold: stashData.gold,
                items: stashData.items.map(itemData => this.deserializeItem(itemData))
            };
        });
        
        // Load progression
        game.progression = saveData.progression;
        
        // Load collection log
        game.collectionLog = saveData.collectionLog || {};
        
        // Load settings
        if (saveData.settings) {
            game.sortSettings = saveData.settings.sortSettings || game.sortSettings;
            game.autoBattle = saveData.settings.autoBattle || false;
            game.autoReplay = saveData.settings.autoReplay || false;
            game.tutorialCompleted = saveData.settings.tutorialCompleted || false;
            game.maxPartySize = saveData.settings.maxPartySize || 3;
        }
        
        // Update UI toggles
        const autoBattleToggle = document.getElementById('autoModeToggle');
        if (autoBattleToggle) autoBattleToggle.checked = game.autoBattle;
        const autoReplayToggle = document.getElementById('autoReplayToggle');
        if (autoReplayToggle) autoReplayToggle.checked = game.autoReplay;
        
        // Mark tutorial as checked so it doesn't restart
        game.hasCheckedForTutorial = true;
        
        // Go to main menu
        game.uiManager.showMainMenu();
    }

    // Serialize item for saving
    serializeItem(item) {
        if (!item) return null;
        
        return {
            id: item.id,
            name: item.name,
            slot: item.slot,
            level: item.level,
            sellcost: item.sellcost,
            quality1: item.quality1,
            quality2: item.quality2,
            quality3: item.quality3,
            quality4: item.quality4,
            quality5: item.quality5,
            roll1: item.roll1,
            roll2: item.roll2,
            roll3: item.roll3,
            roll4: item.roll4,
            roll5: item.roll5,
            value1: item.value1,
            value2: item.value2,
            value3: item.value3,
            value4: item.value4,
            value5: item.value5,
            refined: item.refined
        };
    }

    // Deserialize item from save data
    deserializeItem(itemData) {
        if (!itemData) return null;
        
        const item = new Item(itemData.id);
        
        // Restore all properties
        Object.assign(item, itemData);
        
        return item;
    }

    // Generate checksum for data integrity
    generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(16);
    }

    // Simple encryption (base64 + rotation)
    encrypt(text) {
        // Convert to base64
        let encrypted = btoa(text);
        
        // Rotate characters based on key
        let rotated = '';
        for (let i = 0; i < encrypted.length; i++) {
            const charCode = encrypted.charCodeAt(i);
            const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
            rotated += String.fromCharCode((charCode + keyChar) % 256);
        }
        
        return btoa(rotated);
    }

    // Simple decryption
    decrypt(encrypted) {
        try {
            // Decode outer base64
            const rotated = atob(encrypted);
            
            // Reverse rotation
            let decrypted = '';
            for (let i = 0; i < rotated.length; i++) {
                const charCode = rotated.charCodeAt(i);
                const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                decrypted += String.fromCharCode((charCode - keyChar + 256) % 256);
            }
            
            // Decode inner base64
            return atob(decrypted);
        } catch (e) {
            throw new Error('Decryption failed');
        }
    }

    // Validate save data structure
    validateSaveData(data) {
        // Check required fields
        if (!data.version || !data.timestamp || !data.heroes || !data.stashes) {
            return false;
        }
        
        // Validate heroes
        if (!Array.isArray(data.heroes)) return false;
        
        for (const hero of data.heroes) {
            if (!hero.name || !hero.className || typeof hero.level !== 'number') {
                return false;
            }
        }
        
        // Validate stashes
        if (typeof data.stashes !== 'object') return false;
        
        // Basic validation passed
        return true;
    }

    // Calculate playtime (would need to track session start time)
    calculatePlaytime() {
        // For now, return 0. In a full implementation, track session time
        return 0;
    }

    // Export save to file
    exportSave(slot) {
        const saveData = localStorage.getItem(`teveSave_slot${slot}`);
        if (!saveData) {
            alert('No save data in this slot!');
            return;
        }
        
        const blob = new Blob([saveData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TEVE_Save_Slot${slot}_${new Date().toISOString().split('T')[0]}.sav`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import save from file
    async importSave(file, slot) {
        try {
            const text = await file.text();
            
            // Validate it's encrypted save data
            try {
                const decrypted = this.decrypt(text);
                const saveData = JSON.parse(decrypted);
                
                if (!this.validateSaveData(saveData)) {
                    alert('Invalid save file!');
                    return false;
                }
            } catch (e) {
                alert('Invalid or corrupted save file!');
                return false;
            }
            
            // Save to slot
            localStorage.setItem(`teveSave_slot${slot}`, text);
            alert(`Save imported to Slot ${slot}!`);
            return true;
        } catch (e) {
            alert('Failed to import save file!');
            return false;
        }
    }
}

// Create global save manager instance
window.saveManager = new SaveManager();
