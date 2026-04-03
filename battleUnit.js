// battleUnit.js - Battle Unit class for TEVE

class BattleUnit {
    constructor(source, isEnemy = false, position = 0) {
        this.source = source; // Reference to Hero or Enemy object
        this.isEnemy = isEnemy;
        this.position = position;
        
        // Battle stats - ensure proper initialization
        this.currentHp = this.maxHp;
        this.actionBar = 0;
        this.buffs = [];
        this.debuffs = [];
        this.cooldowns = {};
        this.isDead = false; // Explicitly set to false at start
        this.deathAnimated = false; // Track if death animation has been played
        this.uiInitialized = false; // Track if UI has been created
        
        // Initialize cooldowns
        const abilities = this.abilities;
        if (abilities && abilities.length > 0) {
            abilities.forEach((ability, index) => {
                if (ability.cooldown > 0) {
                    this.cooldowns[index] = 0;
                }
            });
        }

        // Real-time positioning (battlefield bottom half: y 540-1080)
        this.x = 0;
        this.y = 0;
        this.moveSpeed = 0; // pixels per second, set by initRealtime()
        this.baseAtkRange = 0; // pixels, set by initRealtime()

        // Animation state
        this.animState = 'idle'; // 'idle' | 'walking' | 'attacking' | 'casting' | 'dying' | 'dead'
        this.facing = 1; // 1 = right, -1 = left
        this.stateTimer = 0; // time remaining in current animation lock

        // Real-time combat cooldowns
        this.globalCooldown = 0; // seconds remaining
        this.abilityCooldowns = {}; // ability index → seconds remaining
        this.currentTarget = null; // reference to target BattleUnit

        // Passive & DOT timers
        this._passiveTimer = 0; // fires passives every 2s
        this._dotAccumulator = 0; // accumulates time for 1s DOT ticks

        // DOM reference for real-time battlefield
        this.el = null;
    }
    
    get name() {
        return this.source.name;
    }
    
    get maxHp() {
        return this.isEnemy ? this.source.hp : this.source.hp;
    }
    
    get stats() {
        return this.isEnemy ? this.source.baseStats : this.source.totalStats;
    }

    get armor() {
        if (this.isEnemy) {
            return this.source.armor;
        } else {
            return this.source.armor;
        }
    }

    get resist() {
        if (this.isEnemy) {
            return this.source.resist;
        } else {
            return this.source.resist;
        }
    }

    get physicalDamageReduction() {
        const totalArmor = this.armor;
        return (0.9 * totalArmor) / (totalArmor + 500);
    }

    get magicDamageReduction() {
        const totalResist = this.resist;
        return (0.3 * totalResist) / (totalResist + 1000);
    }
    
    get actionBarSpeed() {
        const agi = this.stats.agi;
        // DOUBLED action bar speed
        let speed = this.isEnemy ? 200 + 200 * (agi / (agi + 1000)) : this.source.actionBarSpeed * 2;
        
        // Apply buffs/debuffs
        this.buffs.forEach(buff => {
            if (buff.actionBarMultiplier) {
                speed *= buff.actionBarMultiplier;
            }
        });
        
        this.debuffs.forEach(debuff => {
            if (debuff.actionBarSpeed) {
                speed *= debuff.actionBarSpeed;
            }
        });
        
        return speed;
    }
    
    get isAlive() {
        return this.currentHp > 0 && !this.isDead;
    }
    
    get abilities() {
        return this.source.abilities || [];
    }
    
    get countableBuffs() {
        return this.buffs.filter(b => b.name !== 'Boss');
    }
    
    get spellLevel() {
        return this.source.spellLevel || 1;
    }

    get currentShield() {
        const shieldBuff = this.buffs.find(b => b.name === 'Shield');
        return shieldBuff ? shieldBuff.shieldAmount : 0;
    }
    
    canUseAbility(abilityIndex) {
        const ability = this.abilities[abilityIndex];
        if (!ability) return false;
        
        // Check cooldown
        if (this.cooldowns[abilityIndex] > 0) return false;
        
        // Check if stunned
        if (this.debuffs.some(d => d.stunned)) return false;
        
        return true;
    }
    
    useAbility(abilityIndex) {
        const ability = this.abilities[abilityIndex];
        if (!ability || !this.canUseAbility(abilityIndex)) return false;
        
        // Set cooldown
        if (ability.cooldown > 0) {
            this.cooldowns[abilityIndex] = ability.cooldown;
        }
        
        return true;
    }
    
    reduceCooldowns() {
        Object.keys(this.cooldowns).forEach(key => {
            if (this.cooldowns[key] > 0) {
                this.cooldowns[key]--;
            }
        });
    }
    
    // --- Real-time getters & methods ---

    // Ranged class families and healer families
    static RANGED_FAMILIES = ['Archer', 'Initiate', 'Witch Hunter'];
    static HEALER_FAMILIES = ['Acolyte', 'Druid'];
    static RANGED_CLASSES = [
        'Archer', 'Ranger', 'Sharpshooter', 'Deadeye', 'Hawkeye',
        'Mage', 'Wizard', 'Warlock', 'Sorcerer', 'Sorceress',
        'Witch Hunter', 'Inquisitor', 'Shadowbane', 'Duskblade',
        'Initiate', 'Invoker'
    ];
    static HEALER_CLASSES = [
        'Acolyte', 'Cleric', 'Priest', 'Priestess', 'Hierophant',
        'Patriarch', 'Matriarch', 'Prophet', 'Prophetess',
        'Druid', 'Warden', 'Grove Keeper', 'Sage', 'Earthcaller',
        'Lifeshaper', 'Verdant Sentinel', 'Elderwood Guardian'
    ];

    get isRanged() {
        const className = this.source.classData?.name || this.source.name || '';
        return BattleUnit.RANGED_CLASSES.some(c => className.includes(c));
    }

    get isHealer() {
        const className = this.source.classData?.name || this.source.name || '';
        return BattleUnit.HEALER_CLASSES.some(c => className.includes(c));
    }

    get realtimeMoveSpeed() {
        const agi = this.stats.agi;
        // Base 80px/s, scales with AGI up to ~160px/s
        let speed = 80 + 80 * (agi / (agi + 1000));

        // Apply speed buffs/debuffs
        if (this.buffs.some(b => b.name === 'Increase Speed')) speed *= 1.33;
        if (this.debuffs.some(d => d.name === 'Reduce Speed')) speed *= 0.67;

        return speed;
    }

    get realtimeAtkRange() {
        if (this.isHealer) return 360;
        if (this.isRanged) return 400;
        return 120; // melee
    }

    get attackSpeed() {
        const agi = this.stats.agi;
        // Base 0.8 atk/s, scales with AGI up to ~1.5 atk/s
        let speed = 0.8 + 0.7 * (agi / (agi + 1000));

        // Apply speed buffs/debuffs
        if (this.buffs.some(b => b.name === 'Increase Speed')) speed *= 1.33;
        if (this.debuffs.some(d => d.name === 'Reduce Speed')) speed *= 0.67;

        return speed;
    }

    initRealtime(startX, startY, facingDir) {
        this.x = startX;
        this.y = startY;
        this.facing = facingDir;
        this.moveSpeed = this.realtimeMoveSpeed;
        this.baseAtkRange = this.realtimeAtkRange;
        this.animState = 'idle';
        this.stateTimer = 0;
        this.globalCooldown = 0;
        this.abilityCooldowns = {};
        this._passiveTimer = 0;
        this._dotAccumulator = 0;
        this.currentTarget = null;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    isInRange(target) {
        return this.distanceTo(target) <= this.realtimeAtkRange;
    }

    updateBuffsDebuffs() {
        // Store if unit was stunned before update
        const wasStunned = this.debuffs.some(d => d.name === 'Stun' || d.stunned);
        
        // Simple duration reduction - decrement all durations by 1
        this.buffs = this.buffs.filter(buff => {
            if (buff.duration > 0) {
                buff.duration--;
                return buff.duration > 0;
            }
            return buff.duration === -1; // Permanent buffs
        });
        
        this.debuffs = this.debuffs.filter(debuff => {
            if (debuff.duration > 0) {
                debuff.duration--;
                return debuff.duration > 0;
            }
            return debuff.duration === -1; // Permanent debuffs
        });
        
        // Check if stun status changed
        const isStunned = this.debuffs.some(d => d.name === 'Stun' || d.stunned);
        if (wasStunned !== isStunned) {
            // Find the battle instance and update stun visuals
            if (this.battle && this.battle.animations) {
                this.battle.animations.updateStunVisuals(this);
            }
        }
    }
}
