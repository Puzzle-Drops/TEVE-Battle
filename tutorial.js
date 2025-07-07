// tutorial.js - Tutorial and new hero creation functionality
class Tutorial {
    constructor(game) {
        this.game = game;
        this.selectedGender = null;
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

        // Create dialog container
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

// Build selection content
        dialog.innerHTML = `
            <h2 style="color: #4dd0e1; text-align: center; margin-bottom: 20px; font-size: 28px;">Create New Hero</h2>
            
            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <!-- Male Option -->
                <div id="maleOption" class="genderOption" style="flex: 1; border: 2px solid #2a6a8a; border-radius: 8px; cursor: pointer; transition: all 0.3s; overflow: hidden;">
                    <div style="position: relative; height: 200px; background-image: url('https://puzzle-drops.github.io/TEVE/img/backdrops/villager_backdrop.png'); background-size: cover; background-position: center;">
                        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/villager_male_battle.png" 
                             style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 180px; image-rendering: pixelated;">
                    </div>
                    <div style="padding: 15px; text-align: center; background: rgba(10, 25, 41, 0.8);">
                        <div style="color: #b0e0f0; font-size: 20px;">Villager <span class="gender-male">♂</span></div>
                    </div>
                </div>
                
                <!-- Female Option -->
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

<!-- Female Option -->
                <div id="femaleOption" class="genderOption" style="flex: 1; border: 2px solid #2a6a8a; border-radius: 8px; cursor: pointer; transition: all 0.3s; overflow: hidden;">
                    <div style="position: relative; height: 200px; background-image: url('https://puzzle-drops.github.io/TEVE/img/backdrops/villager_backdrop.png'); background-size: cover; background-position: center;">
                        <img src="https://puzzle-drops.github.io/TEVE/img/sprites/heroes/villager_female_battle.png" 
                             style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); height: 180px; image-rendering: pixelated;">
                    </div>
                    <div style="padding: 15px; text-align: center; background: rgba(10, 25, 41, 0.8);">
                        <div style="color: #b0e0f0; font-size: 20px;">Villager <span class="gender-female">♀</span></div>
                    </div>
                </div>

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
