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

    // Bestiary System
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
            width: 90%;
            height: 90%;
            max-width: 1400px;
            max-height: 900px;
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
            <button class="bestiaryTab active" data-tab="heroes" style="
                padding: 10px 30px;
                font-size: 18px;
                background: #0066cc;
                color: white;
                border: none;
                border-radius: 4px 4px 0 0;
                cursor: pointer;
            ">Hero Classes</button>
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
                
                if (tab.dataset.tab === 'heroes') {
                    this.showHeroClasses();
                } else {
                    this.showEnemyUnits();
                }
            };
        });

        // Show heroes by default
        this.showHeroClasses();
    }

    closeBestiary() {
        const overlay = document.getElementById('bestiaryOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    showHeroClasses() {
        const content = document.getElementById('bestiaryContent');
        content.innerHTML = '';

        // Create SVG for paths
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;';
        content.appendChild(svg);

        // Create hero tree container
        const treeContainer = document.createElement('div');
        treeContainer.style.cssText = 'position: relative; min-height: 2000px;';
        content.appendChild(treeContainer);

        // Process male heroes (rows 1-4)
        this.renderHeroTrees(treeContainer, svg, 'male', 0);
        
        // Add spacing
        const spacer = document.createElement('div');
        spacer.style.cssText = 'height: 100px;';
        treeContainer.appendChild(spacer);
        
        // Process female heroes (rows 6-9)
        this.renderHeroTrees(treeContainer, svg, 'female', 1100);
    }

    renderHeroTrees(container, svg, gender, startY) {
        const tiers = [[], [], [], []]; // 4 tiers
        const startClass = gender === 'male' ? 'villager_male' : 'villager_female';
        
        // Organize classes by tier
        Object.entries(unitData.classes).forEach(([className, classData]) => {
            if (className.includes(gender) && className !== 'tester_male') {
                tiers[classData.tier].push({ className, classData });
            }
        });

        // Position calculations
        const xSpacing = 160;
        const ySpacing = 180;
        const startX = 50;

        // Render Villager
        const villagerData = unitData.classes[startClass];
        const villagerDiv = this.createHeroThumb(startClass, villagerData, startX, startY);
        container.appendChild(villagerDiv);

        // Track positions for SVG paths
        const positions = {};
        positions[startClass] = { x: startX + 48, y: startY + 48 };

        // Render tier 1
        let currentX = startX + xSpacing;
        const tier1Y = startY;
        
        tiers[1].forEach((classInfo) => {
            const div = this.createHeroThumb(classInfo.className, classInfo.classData, currentX, tier1Y);
            container.appendChild(div);
            positions[classInfo.className] = { x: currentX + 48, y: tier1Y + 48 };
            
            // Draw path from villager
            this.drawPath(svg, positions[startClass], positions[classInfo.className]);
            
            currentX += xSpacing;
        });

        // Render tiers 2-4 with promotion paths
        for (let tier = 2; tier <= 4; tier++) {
            const tierY = startY + (tier - 1) * ySpacing;
            const tierClasses = tiers[tier];
            
            tierClasses.forEach((classInfo, index) => {
                // Find parent class
                let parentX = startX;
                Object.entries(unitData.classes).forEach(([parentName, parentData]) => {
                    if (parentData.promotesTo && parentData.promotesTo.includes(classInfo.className)) {
                        if (positions[parentName]) {
                            parentX = positions[parentName].x - 48;
                        }
                    }
                });
                
                // Position based on parent with some offset for branching
                const offsetX = (index % 2) * 80;
                const x = parentX + offsetX;
                
                const div = this.createHeroThumb(classInfo.className, classInfo.classData, x, tierY);
                container.appendChild(div);
                positions[classInfo.className] = { x: x + 48, y: tierY + 48 };
                
                // Draw path from parent
                Object.entries(unitData.classes).forEach(([parentName, parentData]) => {
                    if (parentData.promotesTo && parentData.promotesTo.includes(classInfo.className)) {
                        if (positions[parentName]) {
                            this.drawPath(svg, positions[parentName], positions[classInfo.className]);
                        }
                    }
                });
            });
        }
    }

    createHeroThumb(className, classData, x, y) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 96px;
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

    showUnitDetails(unitId, unitData, unitType) {
        // Create popup overlay
        const popup = document.createElement('div');
        popup.id = 'unitDetailsPopup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 25, 41, 0.98);
            border: 2px solid #2a6a8a;
            border-radius: 8px;
            padding: 30px;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 10001;
            box-shadow: 0 0 50px rgba(42, 106, 138, 0.8);
        `;

        let content = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #4dd0e1; margin: 0; font-size: 24px;">${unitData.name}</h2>
                <button onclick="document.getElementById('unitDetailsPopup').remove()" style="
                    background: #cc0000;
                    color: white;
                    border: none;
                    padding: 5px 15px;
                    font-size: 18px;
                    cursor: pointer;
                    border-radius: 4px;
                ">✕</button>
            </div>
        `;

        // Unit image and basic info
        content += `
            <div style="display: flex; gap: 30px; margin-bottom: 20px;">
                <div>
                    <img src="https://puzzle-drops.github.io/TEVE/img/sprites/${unitType === 'hero' ? 'heroes' : 'enemies'}/${unitId}${unitType === 'hero' ? '_battle' : ''}.png"
                         style="width: 128px; height: 128px; image-rendering: pixelated; border: 2px solid #2a6a8a; padding: 10px; background: rgba(0, 0, 0, 0.3);"
                         onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 128 128\\'><rect fill=\\'%23666\\' width=\\'128\\' height=\\'128\\'/><text x=\\'64\\' y=\\'64\\' text-anchor=\\'middle\\' fill=\\'white\\'>${unitData.name}</text></svg>'">
                </div>
                <div style="flex: 1;">
        `;

        // Type-specific info
        if (unitType === 'hero') {
            const gender = unitId.includes('_male') ? 'Male' : 'Female';
            const tierStars = '★'.repeat(unitData.tier + 1);
            content += `
                <div style="color: #6a9aaa; font-size: 18px; margin-bottom: 10px;">
                    <div>Gender: <span style="color: #b0e0f0;">${gender}</span></div>
                    <div>Tier: <span style="color: #ffd700;">${tierStars}</span></div>
                </div>
            `;
        } else if (unitType === 'enemy' && unitData.boss) {
            content += `<div style="color: #ff4444; font-size: 20px; font-weight: bold; margin-bottom: 10px;">BOSS</div>`;
        }

        content += '</div></div>';

        // Stat Modifiers
        content += `
            <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #4dd0e1; margin-top: 0;">Stat Growth Modifiers (per level)</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div>STR: <span style="color: ${unitData.mainstat === 'str' ? '#ffd700' : '#b0e0f0'};">${unitData.modifiers.str}x</span></div>
                    <div>AGI: <span style="color: ${unitData.mainstat === 'agi' ? '#ffd700' : '#b0e0f0'};">${unitData.modifiers.agi}x</span></div>
                    <div>INT: <span style="color: ${unitData.mainstat === 'int' ? '#ffd700' : '#b0e0f0'};">${unitData.modifiers.int}x</span></div>
                </div>
            </div>
        `;

        // Initial Stats
        content += `
            <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <h3 style="color: #4dd0e1; margin-top: 0;">Base Stats (Level 1)</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>HP: <span style="color: #b0e0f0;">${unitData.initial.hp}</span></div>
                    <div>HP Regen: <span style="color: #b0e0f0;">${unitData.initial.hpRegen}</span></div>
                    <div>Attack: <span style="color: #b0e0f0;">${unitData.initial.attack}</span></div>
                    <div>Attack Speed: <span style="color: #b0e0f0;">${unitData.initial.attackSpeed}%</span></div>
                    <div>STR: <span style="color: #b0e0f0;">${unitData.initial.str}</span></div>
                    <div>AGI: <span style="color: #b0e0f0;">${unitData.initial.agi}</span></div>
                    <div>INT: <span style="color: #b0e0f0;">${unitData.initial.int}</span></div>
                    <div>Armor: <span style="color: #b0e0f0;">${unitData.initial.armor}</span></div>
                    <div>Resist: <span style="color: #b0e0f0;">${unitData.initial.resist}</span></div>
                </div>
            </div>
        `;

        // Promotion paths (heroes only)
        if (unitType === 'hero') {
            // Promotes from
            const promotesFrom = [];
            Object.entries(unitData.classes).forEach(([className, classData]) => {
                if (classData.promotesTo && classData.promotesTo.includes(unitId)) {
                    promotesFrom.push({ id: className, data: classData });
                }
            });

            if (promotesFrom.length > 0) {
                content += `
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <h3 style="color: #4dd0e1; margin-top: 0;">Promotes From</h3>
                        <div style="display: flex; gap: 15px;">
                `;
                promotesFrom.forEach(parent => {
                    content += `
                        <div style="cursor: pointer; text-align: center;" onclick="game.tutorial.showUnitDetails('${parent.id}', unitData.classes['${parent.id}'], 'hero')">
                            <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${parent.id}_portrait.png"
                                 style="width: 64px; height: 64px; image-rendering: pixelated; border: 1px solid #2a6a8a;"
                                 onerror="this.style.display='none'">
                            <div style="color: #b0e0f0; font-size: 12px; margin-top: 4px;">${parent.data.name}</div>
                        </div>
                    `;
                });
                content += '</div></div>';
            }

            // Promotes to
            if (unitData.promotesTo && unitData.promotesTo.length > 0) {
                content += `
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                        <h3 style="color: #4dd0e1; margin-top: 0;">Promotes To</h3>
                        <div style="display: flex; gap: 15px;">
                `;
                unitData.promotesTo.forEach(childId => {
                    const childData = unitData.classes[childId];
                    if (childData) {
                        content += `
                            <div style="cursor: pointer; text-align: center;" onclick="game.tutorial.showUnitDetails('${childId}', unitData.classes['${childId}'], 'hero')">
                                <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/${childId}_portrait.png"
                                     style="width: 64px; height: 64px; image-rendering: pixelated; border: 1px solid #2a6a8a;"
                                     onerror="this.style.display='none'">
                                <div style="color: #b0e0f0; font-size: 12px; margin-top: 4px;">${childData.name}</div>
                            </div>
                        `;
                    }
                });
                content += '</div></div>';
            }
        }

        // Spells
        if (unitData.spells && unitData.spells.length > 0) {
            content += `
                <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 4px;">
                    <h3 style="color: #4dd0e1; margin-top: 0;">Abilities</h3>
            `;
            
            unitData.spells.forEach(spellId => {
                const spell = spellManager?.getSpell(spellId);
                if (spell) {
                    content += `
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
            
            content += '</div>';
        }

        popup.innerHTML = content;
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
                return values.map((v, i) => {
                    if (typeof v === 'number' && v < 1 && v > 0 && property.includes('percent')) {
                        return Math.round(v * 100) + '%';
                    }
                    return v;
                }).join('/');
            } else if (values !== null && values !== undefined) {
                return values;
            }
            
            return match;
        });
        
        // Clean up any remaining brackets
        description = description.replace(/\[|\]/g, '');
        
        return description;
    }

    // NPC Dialogue System
    npcDialogue(npcName, dialogueText, blur = false) {
        // Clear any existing dialogue
        this.clearDialogue();
        
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
            }, 1000);
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
            this.closeNewHeroDialog();
        };

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
}

// Initialize tutorial system when game loads
window.addEventListener('DOMContentLoaded', () => {
    // This will be initialized after the game is created
});
