// tutorial.js - Tutorial and new hero creation functionality
class Tutorial {
    constructor(game) {
        this.game = game;
        this.selectedGender = null;
        
        // Dialogue system properties
        this.currentDialogueQueue = [];
        this.currentDialogueIndex = 0;
        this.isTyping = false;
        this.canContinue = false;
        this.typewriterTimeout = null;
        this.continueTimeout = null;
        
        // Bind the click handler
        this.handleDialogueClick = this.handleDialogueClick.bind(this);
    }

    // NPC Click Handler
    handleNPCClick(npcName) {
        const npcNameLower = npcName.toLowerCase();
        
        switch(npcNameLower) {
            case 'squeaky':
                this.showBestiary();
                break;
            case 'arnold':
                // Future implementation for Arnold's shop/services
                console.log('Arnold clicked - shop not yet implemented');
                break;
            case 'bob':
                // Future implementation for Bob's arena services
                console.log('Bob clicked - arena services not yet implemented');
                break;
            default:
                console.log(`NPC ${npcName} clicked - not yet implemented`);
        }
    }
    
showBestiary() {
    // Create bestiary overlay
    const overlay = document.createElement('div');
    overlay.id = 'bestiaryOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Create bestiary container
    const container = document.createElement('div');
    container.id = 'bestiaryContainer';
    container.style.cssText = `
        background: rgba(10, 25, 41, 0.98);
        border: 2px solid #2a6a8a;
        border-radius: 8px;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 30px rgba(42, 106, 138, 0.5);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 20px;
        border-bottom: 2px solid #2a6a8a;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <h1 style="color: #4dd0e1; margin: 0; font-size: 28px;">Squeaky's Unit Compendium</h1>
        <button id="closeBestiaryBtn" style="
            background: #cc0000;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 18px;
            cursor: pointer;
            border-radius: 4px;
        ">✕ Close</button>
    `;

    // Create tabs
    const tabContainer = document.createElement('div');
    tabContainer.style.cssText = `
        display: flex;
        gap: 10px;
        padding: 20px 20px 0 20px;
    `;
    tabContainer.innerHTML = `
        <button class="bestiaryTab active" data-tab="heroes-male" style="
            padding: 10px 30px;
            font-size: 18px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 4px 4px 0 0;
            cursor: pointer;
        ">Hero Classes <span class="gender-male">♂</span></button>
        <button class="bestiaryTab" data-tab="heroes-female" style="
            padding: 10px 30px;
            font-size: 18px;
            background: #004499;
            color: white;
            border: none;
            border-radius: 4px 4px 0 0;
            cursor: pointer;
        ">Hero Classes <span class="gender-female">♀</span></button>
        <button class="bestiaryTab" data-tab="enemies" style="
            padding: 10px 30px;
            font-size: 18px;
            background: #004499;
            color: white;
            border: none;
            border-radius: 4px 4px 0 0;
            cursor: pointer;
        ">Enemy Units</button>
    `;

    // Create content area
    const content = document.createElement('div');
    content.id = 'bestiaryContent';
    content.style.cssText = `
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: rgba(10, 15, 26, 0.5);
        position: relative;
    `;

    // Assemble container
    container.appendChild(header);
    container.appendChild(tabContainer);
    container.appendChild(content);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('closeBestiaryBtn').onclick = () => this.closeBestiary();
    
    const tabs = tabContainer.querySelectorAll('.bestiaryTab');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.background = '#004499';
            });
            tab.classList.add('active');
            tab.style.background = '#0066cc';
            
            if (tab.dataset.tab === 'heroes-male') {
                this.showHeroClasses('male');
            } else if (tab.dataset.tab === 'heroes-female') {
                this.showHeroClasses('female');
            } else {
                this.showEnemyUnits();
            }
        };
    });

    // Show male heroes by default
    this.showHeroClasses('male');
}
    
    closeBestiary() {
        const overlay = document.getElementById('bestiaryOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
showHeroClasses(gender) {
    const content = document.getElementById('bestiaryContent');
    content.innerHTML = '';

    // Create SVG for paths
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;';
    content.appendChild(svg);

    // Create hero tree container
    const treeContainer = document.createElement('div');
    treeContainer.style.cssText = 'position: relative; width: 100%; height: 100%;';
    content.appendChild(treeContainer);

    // Render hero tree for specified gender
    this.renderHeroTrees(treeContainer, svg, gender);
}
    
renderHeroTrees(container, svg, gender) {
    const cellWidth = 120;
    const cellHeight = 140;
    const startX = -24;
    const startY = 50;
    
    // Track all positions for drawing paths
    const positions = {};
    
    // Place villager at row 0, centered (between columns 8 and 9)
    const villagerClass = gender === 'male' ? 'villager_male' : 'villager_female';
    const villagerData = unitData.classes[villagerClass];
    if (villagerData) {
        const villagerX = startX + (8 * cellWidth); // Centered between columns 8 and 9
        const villagerY = startY;
        const villagerDiv = this.createHeroThumb(villagerClass, villagerData, villagerX, villagerY);
        container.appendChild(villagerDiv);
        positions['villager'] = { x: villagerX + 76, y: villagerY + 76 }; // Store without gender suffix for parent lookup
    }
    
    // Define class layout with specific positions
    const classLayout = [
        // Acolyte family (columns 0-1)
        { name: 'acolyte', row: 1, col: 0, parent: 'villager' },
        { name: 'cleric', row: 2, col: 0, parent: 'acolyte' },
        { name: 'priest', row: 3, col: 0, parent: 'cleric', gender: 'male' },
        { name: 'priestess', row: 3, col: 0, parent: 'cleric', gender: 'female' },
        { name: 'hierophant', row: 4, col: 0, parent: gender === 'male' ? 'priest' : 'priestess' },
        { name: 'patriarch', row: 3, col: 1, parent: 'cleric', gender: 'male' },
        { name: 'matriarch', row: 3, col: 1, parent: 'cleric', gender: 'female' },
        { name: 'prophet', row: 4, col: 1, parent: 'patriarch', gender: 'male' },
        { name: 'prophetess', row: 4, col: 1, parent: 'matriarch', gender: 'female' },
        
        // Archer family (columns 2-3)
        { name: 'archer', row: 1, col: 2, parent: 'villager' },
        { name: 'ranger', row: 2, col: 2, parent: 'archer' },
        { name: 'marksman', row: 3, col: 2, parent: 'ranger' },
        { name: 'sniper', row: 4, col: 2, parent: 'marksman' },
        { name: 'tracker', row: 3, col: 3, parent: 'ranger' },
        { name: 'monster_hunter', row: 4, col: 3, parent: 'tracker' },
        
        // Druid family (columns 4-5)
        { name: 'druid', row: 1, col: 4, parent: 'villager' },
        { name: 'arch_druid', row: 2, col: 4, parent: 'druid' },
        { name: 'shapeshifter', row: 3, col: 4, parent: 'arch_druid' },
        { name: 'runemaster', row: 4, col: 4, parent: 'shapeshifter' },
        { name: 'shaman', row: 3, col: 5, parent: 'arch_druid' },
        { name: 'summoner', row: 4, col: 5, parent: 'shaman' },
        
        // Initiate family (columns 6-7)
        { name: 'initiate', row: 1, col: 6, parent: 'villager' },
        { name: 'mage', row: 2, col: 6, parent: 'initiate' },
        { name: 'wizard', row: 3, col: 6, parent: 'mage', gender: 'male' },
        { name: 'witch', row: 3, col: 6, parent: 'mage', gender: 'female' },
        { name: 'white_wizard', row: 4, col: 6, parent: 'wizard', gender: 'male' },
        { name: 'white_witch', row: 4, col: 6, parent: 'witch', gender: 'female' },
        { name: 'sage', row: 3, col: 7, parent: 'mage' },
        { name: 'arch_sage', row: 4, col: 7, parent: 'sage' },
        
        // Swordsman family (columns 8-9)
        { name: 'swordsman', row: 1, col: 8, parent: 'villager' },
        { name: 'knight', row: 2, col: 8, parent: 'swordsman' },
        { name: 'imperial_knight', row: 3, col: 8, parent: 'knight' },
        { name: 'champion', row: 4, col: 8, parent: 'imperial_knight' },
        { name: 'crusader', row: 3, col: 9, parent: 'knight' },
        { name: 'avenger', row: 4, col: 9, parent: 'crusader' },
        
        // Templar family (columns 10-11)
        { name: 'templar', row: 1, col: 10, parent: 'villager' },
        { name: 'arch_templar', row: 2, col: 10, parent: 'templar' },
        { name: 'dark_templar', row: 3, col: 10, parent: 'arch_templar' },
        { name: 'dark_arch_templar', row: 4, col: 10, parent: 'dark_templar' },
        { name: 'high_templar', row: 3, col: 11, parent: 'arch_templar' },
        { name: 'grand_templar', row: 4, col: 11, parent: 'high_templar' },
        
        // Thief family (columns 12-13)
        { name: 'thief', row: 1, col: 12, parent: 'villager' },
        { name: 'rogue', row: 2, col: 12, parent: 'thief' },
        { name: 'assassin', row: 3, col: 12, parent: 'rogue' },
        { name: 'phantom_assassin', row: 4, col: 12, parent: 'assassin' },
        { name: 'stalker', row: 3, col: 13, parent: 'rogue' },
        { name: 'master_stalker', row: 4, col: 13, parent: 'stalker' },
        
        // Witch Hunter family (columns 14-15)
        { name: 'witch_hunter', row: 1, col: 14, parent: 'villager' },
        { name: 'slayer', row: 2, col: 14, parent: 'witch_hunter' },
        { name: 'inquisitor', row: 3, col: 14, parent: 'slayer' },
        { name: 'grand_inquisitor', row: 4, col: 14, parent: 'inquisitor' },
        { name: 'witcher', row: 3, col: 15, parent: 'slayer' },
        { name: 'professional_witcher', row: 4, col: 15, parent: 'witcher' }
    ];
    
    // Process and place each class
    classLayout.forEach(classInfo => {
        // Skip gender-specific classes that don't match current gender
        if (classInfo.gender && classInfo.gender !== gender) {
            return;
        }
        
        const className = classInfo.name + '_' + gender;
        const classData = unitData.classes[className];
        
        if (classData) {
            const x = startX + (classInfo.col * cellWidth);
            const y = startY + (classInfo.row * cellHeight);
            
            const div = this.createHeroThumb(className, classData, x, y);
            container.appendChild(div);
            
            // Store position with simple name for parent lookup
            positions[classInfo.name] = { x: x + 76, y: y + 76 };
            
            // Draw path from parent
            if (positions[classInfo.parent]) {
                this.drawPath(svg, positions[classInfo.parent], positions[classInfo.name]);
            }
        }
    });
}
    
    createHeroThumb(className, classData, x, y) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 120px;
            height: 120px;
            cursor: pointer;
            z-index: 2;
            text-align: center;
        `;
        
        div.innerHTML = `
            <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${className}_battle.png"
                 style="width: 96px; height: 96px; image-rendering: pixelated;"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 96 96\\'><rect fill=\\'%23666\\' width=\\'96\\' height=\\'96\\'/><text x=\\'48\\' y=\\'48\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'12\\'>${classData.name}</text></svg>'">
            <div style="color: #b0e0f0; font-size: 12px; margin-top: 4px;">${classData.name}</div>
        `;
        
        div.onclick = () => this.showUnitDetails(className, classData, 'hero');
        
        return div;
    }

    drawPath(svg, from, to) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Create curved path
        const midY = (from.y + to.y) / 2;
        const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
        
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#2a6a8a');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        
        svg.appendChild(path);
    }

    showEnemyUnits() {
        const content = document.getElementById('bestiaryContent');
        content.innerHTML = '';

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, 120px);
            gap: 20px;
            padding: 20px;
        `;

        // Add all enemies
        Object.entries(unitData.enemies).forEach(([enemyId, enemyData]) => {
            const div = document.createElement('div');
            div.style.cssText = `
                cursor: pointer;
                text-align: center;
                transition: transform 0.2s;
            `;
            
            div.innerHTML = `
                <img src="https://puzzle-drops.github.io/TEVE/img/sprites/enemies/${enemyId}.png"
                     style="width: 96px; height: 96px; image-rendering: pixelated;"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 96 96\\'><rect fill=\\'%23666\\' width=\\'96\\' height=\\'96\\'/><text x=\\'48\\' y=\\'48\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'12\\'>${enemyData.name}</text></svg>'">
                <div style="color: #b0e0f0; font-size: 12px; margin-top: 4px;">${enemyData.name}</div>
            `;
            
            div.onmouseover = () => div.style.transform = 'scale(1.1)';
            div.onmouseout = () => div.style.transform = 'scale(1)';
            div.onclick = () => this.showUnitDetails(enemyId, enemyData, 'enemy');
            
            grid.appendChild(div);
        });

        content.appendChild(grid);
    }

    calculateStatsAtLevel(unitData, level, unitType) {
        const mods = unitData.modifiers;
        const initial = unitData.initial;
        
        // Calculate base stats
        const str = Math.floor(initial.str + (level * mods.str));
        const agi = Math.floor(initial.agi + (level * mods.agi));
        const int = Math.floor(initial.int + (level * mods.int));
        
        // Get mainstat value for attack calculation
        const mainstat = unitData.mainstat || 'str';
        const mainstatValue = mainstat === 'str' ? str : (mainstat === 'agi' ? agi : int);
        
        return {
            str: str,
            agi: agi,
            int: int,
            hp: Math.floor(initial.hp + (str * mods.hp)),
            attack: Math.floor(initial.attack + (mainstatValue * mods.attack)),
            attackSpeed: Math.floor(initial.attackSpeed + (95 + 100 * (agi / (agi + 1000)))),
            armor: Math.floor(initial.armor + (mods.armor * level) + (0.05 * str) + (0.01 * agi)),
            resist: Math.floor(initial.resist + (mods.resist * level) + (0.05 * int))
        };
    }

    getMaxValuesForTier(tier, level) {
        // Calculate max values based on the modifier ranges provided:
        // STR/AGI/INT: 2.5 to 8 per level
        // HP: 2.5 to 6.1 per str point
        // Attack: 0.1 to 0.82 per mainstat
        
        const maxStatModifier = 8;
        const maxHPModifier = 6.1;
        const maxAttackModifier = 0.82;
        
        // Calculate theoretical max stats at each level
        const maxPrimaryStat = level * maxStatModifier;
        const maxHP = maxPrimaryStat * maxHPModifier;
        const maxAttack = maxPrimaryStat * maxAttackModifier;
        
        // For armor and resist, use approximate scaling
        const maxArmor = level * 1.5 + (maxPrimaryStat * 0.05);
        const maxResist = level * 1.5 + (maxPrimaryStat * 0.05);
        
        return {
            str: maxPrimaryStat,
            agi: maxPrimaryStat,
            int: maxPrimaryStat,
            hp: Math.floor(maxHP),
            attack: Math.floor(maxAttack),
            attackSpeed: 205, // Max attack speed
            armor: Math.floor(maxArmor),
            resist: Math.floor(maxResist)
        };
    }

    createStatBar(value, maxValue, label, color, isAttackSpeed = false) {
        let percentage;
        
        if (isAttackSpeed) {
            // For attack speed, 95 is 0% and 205 is 100%
            const adjustedValue = value - 95;
            const adjustedMax = 110; // 205 - 95
            percentage = Math.min((adjustedValue / adjustedMax) * 100, 100);
            percentage = Math.max(0, percentage); // Ensure it's not negative
        } else {
            percentage = Math.min((value / maxValue) * 100, 100);
        }
        
        return `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span style="color: #b0e0f0; font-size: 14px;">${label}</span>
                    <span style="color: #b0e0f0; font-size: 14px;">${value}</span>
                </div>
                <div style="width: 100%; height: 20px; background: rgba(0, 0, 0, 0.5); border: 1px solid #2a6a8a; border-radius: 3px;">
                    <div style="width: ${percentage}%; height: 100%; background: ${color}; border-radius: 2px; transition: width 0.3s;"></div>
                </div>
            </div>
        `;
    }

    showUnitDetails(unitId, unitData, unitType) {
    // Create popup overlay
    const popup = document.createElement('div');
    popup.id = 'unitDetailsPopup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 25, 41, 0.98);
        z-index: 10001;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    `;

    // Header with close button
    let headerContent = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 30px; border-bottom: 2px solid #2a6a8a;">
        <h2 style="color: #4dd0e1; margin: 0; font-size: 28px;">
            ${unitData.name}${unitType === 'hero' ? ` <span class="gender-${unitId.includes('_male') ? 'male' : 'female'}">${unitId.includes('_male') ? '♂' : '♀'}</span>` : ''}
        </h2>
        <button onclick="document.getElementById('unitDetailsPopup').remove()" style="
                background: #cc0000;
                color: white;
                border: none;
                padding: 10px 20px;
                font-size: 18px;
                cursor: pointer;
                border-radius: 4px;
            ">✕</button>
        </div>
    `;

    // Main content area with 3 columns
    let mainContent = `<div style="flex: 1; display: flex; padding: 30px; gap: 30px; align-items: flex-start;">`;

    // Column 1: Portrait with backdrop
    mainContent += `<div style="flex: 0 0 300px; display: flex; align-items: center; justify-content: center;">`;
    
    if (unitType === 'hero') {
        // Get class family for backdrop
        const familyName = this.game.getClassFamily(unitId.replace(/_male$|_female$/, ''), unitData.tier);
        const backdropName = familyName.toLowerCase().replace(/ /g, '_');
        
        mainContent += `
    <div style="text-align: center;">
        <div style="position: relative; width: 256px; height: 256px; 
                    background-image: url('https://puzzle-drops.github.io/TEVE/img/backdrops/${backdropName}_backdrop.png');
                    background-size: cover; background-position: center;
                    border: 2px solid #2a6a8a; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 15px;">
            <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${unitId}_battle.png"
                 style="width: 90%; height: 90%; image-rendering: pixelated; z-index: 1;"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 256 256\\'><rect fill=\\'%23666\\' width=\\'256\\' height=\\'256\\'/><text x=\\'128\\' y=\\'128\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'20\\'>${unitData.name}</text></svg>'">
        </div>
        <div style="font-size: 36px; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">${'★'.repeat(unitData.tier + 1)}</div>
    </div>
`;
    } else {
    // Enemy portrait with universal enemy backdrop
    mainContent += `
        <div style="text-align: center;">
            <div style="width: 256px; height: 256px; 
                        background-image: url('https://puzzle-drops.github.io/TEVE/img/backdrops/enemy_backdrop.png');
                        background-size: cover; background-position: center;
                        border: 2px solid #2a6a8a; border-radius: 8px;
                        display: flex; align-items: center; justify-content: center;
                        margin-bottom: 15px;">
                <img src="https://puzzle-drops.github.io/TEVE/img/sprites/enemies/${unitId}.png"
                     style="width: 90%; height: 90%; image-rendering: pixelated;"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 256 256\\'><rect fill=\\'%23666\\' width=\\'256\\' height=\\'256\\'/><text x=\\'128\\' y=\\'128\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'20\\'>${unitData.name}</text></svg>'">
            </div>
            ${unitData.boss ? '<div style="color: #ff4444; font-size: 24px; font-weight: bold; text-align: center;">BOSS</div>' : ''}
        </div>
    `;
}
    
    mainContent += `</div>`;

    // Column 2: Stats Bar Graph
    mainContent += `<div style="flex: 1; min-width: 400px;">`;

    // Determine the level to show stats at
    let statLevel;
    if (unitType === 'hero') {
        const promoteLevels = { 0: 50, 1: 100, 2: 200, 3: 300, 4: 500 };
        statLevel = promoteLevels[unitData.tier] || 500;
    } else {
        // For enemies, show stats at level 100 as a reasonable comparison
        statLevel = 100;
    }

    // Calculate stats at the appropriate level
    const stats = this.calculateStatsAtLevel(unitData, statLevel, unitType);

    // Get max values based on tier/level
    const maxValues = this.getMaxValuesForTier(unitData.tier || 0, statLevel);

    // Stats Bar Graph
    mainContent += `
        <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #4dd0e1; margin-top: 0; margin-bottom: 20px;">Stats (Level ${statLevel})</h3>
            ${this.createStatBar(stats.str, maxValues.str, 'Strength', '#ff6b6b')}
            ${this.createStatBar(stats.agi, maxValues.agi, 'Agility', '#66d9ef')}
            ${this.createStatBar(stats.int, maxValues.int, 'Intelligence', '#bd93f9')}
            ${this.createStatBar(stats.hp, maxValues.hp, 'Health', '#50fa7b')}
            ${this.createStatBar(stats.attack, maxValues.attack, 'Attack', '#ffb86c')}
            ${this.createStatBar(stats.attackSpeed, maxValues.attackSpeed, 'Attack Speed', '#f1fa8c', true)}
            ${this.createStatBar(stats.armor, maxValues.armor, 'Armor', '#8be9fd')}
            ${this.createStatBar(stats.resist, maxValues.resist, 'Resistance', '#ff79c6')}
        </div>
    `;

    // Promotion paths (heroes only)
    if (unitType === 'hero') {
        // Get the base unit ID without gender suffix
        const baseUnitId = unitId.replace(/_male$|_female$/, '');
        const gender = unitId.includes('_male') ? 'male' : 'female';
        
        // Promotes from
        const promotesFrom = [];
        if (window.unitData && window.unitData.classes) {
            Object.entries(window.unitData.classes).forEach(([className, classData]) => {
                if (classData.promotesTo) {
                    // Check if this class promotes to our base unit
                    const promotesToBase = classData.promotesTo.some(promo => {
                        const promoWithGender = promo + '_' + gender;
                        return promoWithGender === unitId;
                    });
                    
                    if (promotesToBase) {
                        promotesFrom.push({ id: className, data: classData });
                    }
                }
            });
        }
        
        if (promotesFrom.length > 0) {
            mainContent += `
                <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #4dd0e1; margin-top: 0;">Promotes From</h3>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            `;
            promotesFrom.forEach(parent => {
                mainContent += `
                    <div style="cursor: pointer; text-align: center;" onclick="window.game.tutorial.showUnitDetails('${parent.id}', unitData.classes['${parent.id}'], 'hero')">
                        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${parent.id}_portrait.png"
                             style="width: 64px; height: 64px; image-rendering: pixelated; border: 1px solid #2a6a8a;"
                             onerror="this.style.display='none'">
                        <div style="color: #b0e0f0; font-size: 12px; margin-top: 4px;">${parent.data.name}</div>
                    </div>
                `;
            });
            mainContent += '</div></div>';
        }

        // Promotes to
        if (unitData.promotesTo && unitData.promotesTo.length > 0 && window.unitData && window.unitData.classes) {
            mainContent += `
                <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #4dd0e1; margin-top: 0;">Promotes To</h3>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: center;">
            `;
            unitData.promotesTo.forEach(childId => {
                const childIdWithGender = childId + '_' + gender;
                const childData = window.unitData.classes[childIdWithGender];
                if (childData) {
                    mainContent += `
                        <div style="cursor: pointer; text-align: center;" onclick="window.game.tutorial.showUnitDetails('${childIdWithGender}', unitData.classes['${childIdWithGender}'], 'hero')">
                            <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${childIdWithGender}_portrait.png"
                                 style="width: 64px; height: 64px; image-rendering: pixelated; border: 1px solid #2a6a8a;"
                                 onerror="this.style.display='none'">
                            <div style="color: #b0e0f0; font-size: 12px; margin-top: 4px;">${childData.name}</div>
                        </div>
                    `;
                }
            });
            mainContent += '</div></div>';
        }
    }

    mainContent += `</div>`; // Close column 2

    // Column 3: Abilities
    mainContent += `<div style="flex: 1; min-width: 400px;">`;
    
    if (unitData.spells && unitData.spells.length > 0) {
        mainContent += `
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px;">
                <h3 style="color: #4dd0e1; margin-top: 0; margin-bottom: 20px;">Abilities | Level 1/2/3/4/5</h3>
        `;
        
        unitData.spells.forEach(spellId => {
            const spell = spellManager?.getSpell(spellId);
            if (spell) {
                mainContent += `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(10, 25, 41, 0.5); border: 1px solid #2a6a8a; border-radius: 4px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="https://puzzle-drops.github.io/TEVE/img/spells/${spellId}.png"
                                 style="width: 64px; height: 64px; border: 1px solid #2a6a8a;"
                                 onerror="this.style.display='none'">
                            <div style="flex: 1;">
                                <div style="font-size: 18px; color: #4dd0e1; font-weight: bold;">${spell.name}</div>
                                <div style="color: #6a9aaa; margin-top: 5px;">
                                    ${spell.passive || (spell.effects && spell.effects.includes('passive')) ? 'Passive' : `Cooldown: ${Array.isArray(spell.cooldown) ? spell.cooldown.join('/') : spell.cooldown} turns`}
                                </div>
                                <div style="color: #b0e0f0; margin-top: 10px; line-height: 1.5;">
                                    ${this.formatSpellDescription(spell)}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        mainContent += '</div>';
    }

    mainContent += `</div></div>`;

    popup.innerHTML = headerContent + mainContent;
    document.body.appendChild(popup);
}

    formatSpellDescription(spell) {
        let description = spell.description || '';
        
        // Replace placeholders with actual values (showing all levels)
        description = description.replace(/{(\w+(?:\.\w+)*)}/g, (match, property) => {
            // Get the value for this property
            let values = null;
            
            // Handle nested properties
            if (property.includes('.')) {
                const parts = property.split('.');
                let temp = spell;
                for (const part of parts) {
                    temp = temp?.[part];
                }
                values = temp;
            } else if (spell[property]) {
                values = spell[property];
            } else if (spell.scaling && spell.scaling[property]) {
                values = spell.scaling[property];
            }
            
            // Format the values
            if (Array.isArray(values)) {
                const formattedValues = values.map((v, i) => {
                    if (typeof v === 'number' && v < 1 && v > 0 && property.includes('percent')) {
                        return Math.round(v * 100) + '%';
                    }
                    return v;
                }).join('/');
                
                // Add brackets around the values
                let formattedOutput = `[${formattedValues}]`;
                
                // For scaling properties (attack, str, agi, int), add 'x (property)'
                if (['attack', 'str', 'agi', 'int'].includes(property)) {
                    formattedOutput += `x (${property})`;
                }
                
                return formattedOutput;
            } else if (values !== null && values !== undefined) {
                return values;
            }
            
            return match;
        });
        
        // Bracket cleanup - remove double brackets
        description = description.replace(/\[\[+/g, '[').replace(/\]\]+/g, ']');
        description = description.replace(/\[(?![^\]]*[/%x])/g, '').replace(/(?<![/%\d])\]/g, '');
        
        return description;
    }

    // NPC Dialogue System
    npcDialogue(npcName, dialogueText, blur = false, onComplete = null) {
    // Clear any existing dialogue
    this.clearDialogue();
    
    // Store the callback
    this.dialogueCompleteCallback = onComplete;
    
    // Convert single string to array for consistency
    let dialogueArray = Array.isArray(dialogueText) ? dialogueText : [dialogueText];
        
        // Format NPC name properly (capitalize first letter)
        const formattedNPCName = npcName.charAt(0).toUpperCase() + npcName.slice(1).toLowerCase();
        
        // Prepend NPC name to each dialogue line
        this.currentDialogueQueue = dialogueArray.map(text => `${formattedNPCName}: ${text}`);
        this.currentDialogueIndex = 0;
        
        // Show overlay with optional blocking
        const overlay = document.getElementById('npcDialogueOverlay');
        overlay.style.display = 'block';
        if (blur) {
            overlay.classList.add('blocking');
        } else {
            overlay.classList.remove('blocking');
        }
        
        // Set NPC portrait
        const validNPCs = ['skypper', 'bob', 'arnold', 'squeaky'];
        const npcNameLower = npcName.toLowerCase();
        if (validNPCs.includes(npcNameLower)) {
            const portraitImg = document.getElementById('npcPortraitImage');
            portraitImg.src = `https://puzzle-drops.github.io/TEVE/img/npc/${npcNameLower}_dialogue.png`;
        }
        
        // Add click handler
        overlay.addEventListener('click', this.handleDialogueClick);
        
        // Start first dialogue
        this.showNextDialogue();
    }
    
    showNextDialogue() {
        if (this.currentDialogueIndex >= this.currentDialogueQueue.length) {
            this.closeDialogue();
            return;
        }
        
        const text = this.currentDialogueQueue[this.currentDialogueIndex];
        this.typewriterEffect(text);
        this.currentDialogueIndex++;
    }
    
    typewriterEffect(text) {
        this.isTyping = true;
        this.canContinue = false;
        
        const textElement = document.getElementById('npcDialogueText');
        const continueElement = document.getElementById('npcDialogueContinue');
        
        textElement.textContent = '';
        continueElement.style.display = 'none';
        
        let charIndex = 0;
        const typeSpeed = 30; // milliseconds per character
        
        const typeNextChar = () => {
            if (charIndex < text.length) {
                textElement.textContent += text[charIndex];
                charIndex++;
                this.typewriterTimeout = setTimeout(typeNextChar, typeSpeed);
            } else {
                // Typing complete
                this.isTyping = false;
                // Wait 2 seconds before allowing continue
                this.continueTimeout = setTimeout(() => {
                    this.canContinue = true;
                    continueElement.style.display = 'block';
                }, 2000);
            }
        };
        
        typeNextChar();
    }
    
    handleDialogueClick(event) {
        // Prevent clicking through to game elements
        event.stopPropagation();
        
        if (this.isTyping) {
            // Skip typewriter effect
            clearTimeout(this.typewriterTimeout);
            const textElement = document.getElementById('npcDialogueText');
            const currentText = this.currentDialogueQueue[this.currentDialogueIndex - 1];
            textElement.textContent = currentText;
            this.isTyping = false;
            
            // Still wait before allowing continue
            clearTimeout(this.continueTimeout);
            this.continueTimeout = setTimeout(() => {
                this.canContinue = true;
                document.getElementById('npcDialogueContinue').style.display = 'block';
            }, 250);
        } else if (this.canContinue) {
            this.showNextDialogue();
        }
    }
    
    closeDialogue() {
    const overlay = document.getElementById('npcDialogueOverlay');
    overlay.style.display = 'none';
    overlay.classList.remove('blocking');
    overlay.removeEventListener('click', this.handleDialogueClick);
    
    // Clear timeouts
    clearTimeout(this.typewriterTimeout);
    clearTimeout(this.continueTimeout);
    
    // Reset state
    this.currentDialogueQueue = [];
    this.currentDialogueIndex = 0;
    this.isTyping = false;
    this.canContinue = false;
    
    // Execute callback if provided
    if (this.dialogueCompleteCallback) {
        const callback = this.dialogueCompleteCallback;
        this.dialogueCompleteCallback = null; // Clear it
        setTimeout(() => callback(), 100); // Small delay for smooth transition
    }
}
    
    clearDialogue() {
        // Force clear any existing dialogue
        this.closeDialogue();
        document.getElementById('npcDialogueText').textContent = '';
        document.getElementById('npcDialogueContinue').style.display = 'none';
    }
    
    // Test function for Arnold
    testDialogueArnold() {
        this.npcDialogue('Arnold', [
            "Hello there, adventurer! My name is Arnold.",
            "I've been waiting for someone like you to arrive.",
            "The City of New Lights needs heroes now more than ever.",
            "Are you ready to begin your journey?"
        ], false);
    }

    // Test function for Bob
    testDialogueBob() {
        this.npcDialogue('Bob', [
            "Welcome to the Arena! I'm Bob, the arena master.",
            "This is where the bravest warriors test their mettle.",
            "You'll find challenges here that push you to your limits.",
            "Think you have what it takes to become a champion?"
        ], false);
    }

    // Test function for Squeaky
    testDialogueSqueaky() {
        this.npcDialogue('Squeaky', [
            "Squeak squeak! Oh, I mean... Hello there!",
            "I'm Squeaky, the city's... um... information broker.",
            "I hear things. Lots of things. Tiny mouse ears, you know?",
            "If you need to know something, just ask! *squeak*"
        ], false);
    }

    // Test function for Skypper
    testDialogueSkypper() {
        this.npcDialogue('Skypper', [
            "Greetings, traveler. I am Skypper.",
            "I have watched over these lands for countless years.",
            "Ancient secrets and forgotten powers lie dormant here.",
            "Perhaps you are the one destined to awaken them..."
        ], false);
    }

    showNewHeroCreation() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'newHeroOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create villager select container
        const dialog = document.createElement('div');
        dialog.id = 'newHeroDialog';
        dialog.style.cssText = `
            background: rgba(10, 25, 41, 0.95);
            border: 2px solid #2a6a8a;
            border-radius: 8px;
            padding: 30px;
            width: 600px;
            box-shadow: 0 0 30px rgba(42, 106, 138, 0.5);
        `;

        // Build villager select content
        dialog.innerHTML = `
            <h2 style="color: #4dd0e1; text-align: center; margin-bottom: 20px; font-size: 28px;">Create New Hero</h2>
            
            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <div id="maleOption" class="genderOption" style="flex: 1; border: 2px solid #2a6a8a; border-radius: 8px; cursor: pointer; transition: all 0.3s; overflow: hidden;">
                    <div style="position: relative; height: 200px; background-image: url('https://puzzle-drops.github.io/TEVE/img/backdrops/villager_backdrop.png'); background-size: cover; background-position: center;">
                        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/villager_male_battle.png" 
                             style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 180px; image-rendering: pixelated;">
                    </div>
                    <div style="padding: 15px; text-align: center; background: rgba(10, 25, 41, 0.8);">
                        <div style="color: #b0e0f0; font-size: 20px;">Villager <span class="gender-male">♂</span></div>
                    </div>
                </div>
                
                <div id="femaleOption" class="genderOption" style="flex: 1; border: 2px solid #2a6a8a; border-radius: 8px; cursor: pointer; transition: all 0.3s; overflow: hidden;">
                    <div style="position: relative; height: 200px; background-image: url('https://puzzle-drops.github.io/TEVE/img/backdrops/villager_backdrop.png'); background-size: cover; background-position: center;">
                        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/villager_female_battle.png" 
                             style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 180px; image-rendering: pixelated;">
                    </div>
                    <div style="padding: 15px; text-align: center; background: rgba(10, 25, 41, 0.8);">
                        <div style="color: #b0e0f0; font-size: 20px;">Villager <span class="gender-female">♀</span></div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="color: #6a9aaa; display: block; margin-bottom: 10px; font-size: 18px;">Hero Name:</label>
                <input type="text" id="heroNameInput" style="width: 100%; padding: 10px; font-size: 18px; background: rgba(10, 25, 41, 0.8); border: 1px solid #2a6a8a; color: #b0e0f0; border-radius: 4px;">
            </div>
            
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="confirmHeroBtn" style="padding: 10px 30px; font-size: 18px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; opacity: 0.5;" disabled>
                    Confirm
                </button>
                <button id="cancelHeroBtn" style="padding: 10px 30px; font-size: 18px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Add event listeners
        this.setupNewHeroEventListeners();
    }

    setupNewHeroEventListeners() {
        const maleOption = document.getElementById('maleOption');
        const femaleOption = document.getElementById('femaleOption');
        const nameInput = document.getElementById('heroNameInput');
        const confirmBtn = document.getElementById('confirmHeroBtn');
        const cancelBtn = document.getElementById('cancelHeroBtn');

        // Gender selection
        maleOption.onclick = () => {
            this.selectedGender = 'male';
            maleOption.style.borderColor = '#4dd0e1';
            maleOption.style.boxShadow = '0 0 20px rgba(77, 208, 225, 0.5)';
            femaleOption.style.borderColor = '#2a6a8a';
            femaleOption.style.boxShadow = 'none';
            this.checkFormValidity();
        };

        femaleOption.onclick = () => {
            this.selectedGender = 'female';
            femaleOption.style.borderColor = '#4dd0e1';
            femaleOption.style.boxShadow = '0 0 20px rgba(77, 208, 225, 0.5)';
            maleOption.style.borderColor = '#2a6a8a';
            maleOption.style.boxShadow = 'none';
            this.checkFormValidity();
        };

        // Name input
        nameInput.oninput = () => {
            this.checkFormValidity();
        };

        // Focus name input
        nameInput.focus();

        // Confirm button
        confirmBtn.onclick = () => {
            if (this.selectedGender && nameInput.value.trim()) {
                this.createNewHero(nameInput.value.trim(), this.selectedGender);
                this.closeNewHeroDialog();
            }
        };

        // Cancel button
cancelBtn.onclick = () => {
    // Only allow cancel if we have at least 3 heroes
    if (this.game.heroes.length >= 3) {
        this.closeNewHeroDialog();
    }
};

// Disable cancel button if less than 3 heroes
if (this.game.heroes.length < 3) {
    cancelBtn.disabled = true;
    cancelBtn.style.opacity = '0.5';
    cancelBtn.style.cursor = 'default';
}

        // Enter key support
        nameInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                confirmBtn.click();
            }
        };
    }

    checkFormValidity() {
        const nameInput = document.getElementById('heroNameInput');
        const confirmBtn = document.getElementById('confirmHeroBtn');
        
        if (this.selectedGender && nameInput.value.trim()) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'default';
        }
    }

    closeNewHeroDialog() {
        const overlay = document.getElementById('newHeroOverlay');
        if (overlay) {
            overlay.remove();
        }
        this.selectedGender = null;
    }

    createNewHero(name, gender) {
        // Create new hero
        const newHero = new Hero(`villager_${gender}`);
        newHero.name = name;
        newHero.gender = gender;
        newHero.level = 5;
        newHero.exp = 0;
        newHero.expToNext = newHero.calculateExpToNext();
        
        // Add to game's hero array
        this.game.heroes.push(newHero);
        
        // If on heroes screen, update the display
        if (this.game.currentScreen === 'heroesScreen') {
            this.game.uiManager.updateHeroList();
        }
        
        console.log(`Created new hero: ${name} (${gender} villager, level 5)`);
    }
    
    skypperAdditionalRecruit(dialogueText = null) {
    // Check if we need to create more heroes
    if (this.game.maxPartySize > this.game.heroes.length) {
        if (dialogueText) {
            // If dialogue text is provided, show dialogue first
            this.npcDialogue('Skypper', dialogueText, false, () => {
                this.showNewHeroCreation();
            });
        } else {
            // If no dialogue text, go straight to hero creation
            this.showNewHeroCreation();
        }
    }
}



    
}

// Initialize tutorial system when game loads
window.addEventListener('DOMContentLoaded', () => {
    // This will be initialized after the game is created
});
