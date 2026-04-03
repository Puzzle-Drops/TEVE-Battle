// realtimeAI.js - Per-unit-per-tick AI for TEVE-Battle real-time autobattler
// Handles target selection, movement, ability usage, and healer logic.

class RealtimeAI {
    constructor(battle) {
        this.battle = battle;
    }

    // Called every frame for each living, non-stunned unit
    updateUnit(unit, dt) {
        if (unit.isHealer) {
            this.updateHealer(unit, dt);
        } else {
            this.updateCombatant(unit, dt);
        }
    }

    // --- Combatant AI ---

    updateCombatant(unit, dt) {
        // Taunt forces target
        const tauntDebuff = unit.debuffs.find(d => d.name === 'Taunt' && d.tauntTarget && d.tauntTarget.isAlive);
        if (tauntDebuff) {
            unit.currentTarget = tauntDebuff.tauntTarget;
        }

        // Validate current target
        if (!unit.currentTarget || !unit.currentTarget.isAlive) {
            unit.currentTarget = this.selectTarget(unit);
        }

        if (!unit.currentTarget) {
            unit.animState = 'idle';
            return;
        }

        // Face toward target
        this.faceTarget(unit, unit.currentTarget);

        // Check if in attack range
        if (unit.isInRange(unit.currentTarget)) {
            // Try to use an ability
            if (unit.globalCooldown <= 0) {
                this.useAbility(unit);
            } else {
                unit.animState = 'idle';
            }
        } else {
            // Move toward target
            this.moveToward(unit, unit.currentTarget, dt);
        }
    }

    // --- Healer AI ---

    updateHealer(unit, dt) {
        // Check for wounded allies (HP < 80%)
        const allies = this.battle.getParty(unit).filter(a => a && a.isAlive);
        const wounded = allies.filter(a => (a.currentHp / a.maxHp) < 0.8);

        if (wounded.length > 0) {
            // Find lowest HP ally
            wounded.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
            const healTarget = wounded[0];

            // Face toward heal target
            this.faceTarget(unit, healTarget);

            // Check if in heal range
            if (unit.distanceTo(healTarget) <= unit.realtimeAtkRange) {
                if (unit.globalCooldown <= 0) {
                    this.useHealAbility(unit, healTarget);
                } else {
                    unit.animState = 'idle';
                }
            } else {
                this.moveToward(unit, healTarget, dt);
            }
        } else {
            // No one to heal — act as combatant
            this.updateCombatant(unit, dt);
        }
    }

    // --- Target Selection ---

    selectTarget(unit) {
        const enemies = this.battle.getEnemies(unit).filter(e => e && e.isAlive);
        if (enemies.length === 0) return null;

        // Pick nearest enemy
        let nearest = null;
        let nearestDist = Infinity;
        enemies.forEach(enemy => {
            const dist = unit.distanceTo(enemy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        });
        return nearest;
    }

    selectAllyTarget(unit) {
        // Find most wounded ally
        const allies = this.battle.getParty(unit).filter(a => a && a.isAlive);
        if (allies.length === 0) return unit;

        allies.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp));
        return allies[0];
    }

    // --- Movement ---

    faceTarget(unit, target) {
        if (target.x > unit.x) {
            unit.facing = 1;
        } else if (target.x < unit.x) {
            unit.facing = -1;
        }
    }

    moveToward(unit, target, dt) {
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) return;

        // Direction to target
        let dirX = dx / dist;
        let dirY = dy / dist;

        // Separation force — avoid stacking with nearby allies
        const allies = this.battle.getParty(unit).filter(a => a && a.isAlive && a !== unit);
        const separationThreshold = 80;
        const separationForce = 5;
        let sepX = 0;
        let sepY = 0;

        allies.forEach(ally => {
            const adx = unit.x - ally.x;
            const ady = unit.y - ally.y;
            const aDist = Math.sqrt(adx * adx + ady * ady);
            if (aDist < separationThreshold && aDist > 0) {
                sepX += (adx / aDist) * separationForce;
                sepY += (ady / aDist) * separationForce;
            }
        });

        dirX += sepX;
        dirY += sepY;

        // Normalize
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len > 0) {
            dirX /= len;
            dirY /= len;
        }

        // Move
        const speed = unit.realtimeMoveSpeed;
        unit.x += dirX * speed * dt;
        unit.y += dirY * speed * dt;

        // Clamp to battlefield bounds
        unit.x = Math.max(this.battle.fieldMinX, Math.min(this.battle.fieldMaxX, unit.x));
        unit.y = Math.max(this.battle.fieldMinY, Math.min(this.battle.fieldMaxY, unit.y));

        unit.animState = 'walking';
    }

    // --- Ability Usage ---

    useAbility(unit) {
        // Check for Silence — force basic attack
        const isSilenced = unit.debuffs.some(d => d.name === 'Silence');

        if (isSilenced) {
            this.useBasicAttack(unit);
            return;
        }

        // Iterate abilities from highest index to lowest (strongest first)
        const abilities = unit.abilities;
        for (let i = abilities.length - 1; i >= 0; i--) {
            const ability = abilities[i];
            if (!ability) continue;

            // Skip passives
            if (ability.passive) continue;

            // Skip if on cooldown
            if (unit.abilityCooldowns[i] > 0) continue;

            // Get spell data to determine target type
            const spell = spellManager.getSpell(ability.id);
            if (!spell) continue;

            // Determine target
            let target = null;
            const targetType = spell.target;

            if (targetType === 'enemy') {
                target = unit.currentTarget;
                if (!target || !target.isAlive) {
                    target = this.selectTarget(unit);
                }
            } else if (targetType === 'all_enemies' || targetType === 'all') {
                target = 'all';
            } else if (targetType === 'ally') {
                target = this.selectAllyTarget(unit);
            } else if (targetType === 'all_allies') {
                target = 'all';
            } else if (targetType === 'self') {
                target = unit;
            } else {
                // Default to current target
                target = unit.currentTarget;
            }

            if (!target) continue;

            // Execute the ability
            this.battle.executeAbility(unit, i, target);
            return;
        }

        // Fallback to basic attack (ability 0)
        this.useBasicAttack(unit);
    }

    useBasicAttack(unit) {
        // Find first non-passive ability (should be index 0)
        let basicIndex = -1;
        for (let i = 0; i < unit.abilities.length; i++) {
            if (unit.abilities[i] && !unit.abilities[i].passive) {
                basicIndex = i;
                break;
            }
        }

        if (basicIndex < 0) return;

        // Need a target
        let target = unit.currentTarget;
        if (!target || !target.isAlive) {
            target = this.selectTarget(unit);
        }
        if (!target) return;

        this.battle.executeAbility(unit, basicIndex, target);
    }

    useHealAbility(unit, healTarget) {
        // Check for Silence
        const isSilenced = unit.debuffs.some(d => d.name === 'Silence');
        if (isSilenced) {
            // Silenced healer falls back to basic attack on nearest enemy
            unit.currentTarget = this.selectTarget(unit);
            if (unit.currentTarget && unit.isInRange(unit.currentTarget)) {
                this.useBasicAttack(unit);
            } else {
                unit.animState = 'idle';
            }
            return;
        }

        const abilities = unit.abilities;

        // Try heal abilities from strongest to weakest
        for (let i = abilities.length - 1; i >= 0; i--) {
            const ability = abilities[i];
            if (!ability || ability.passive) continue;
            if (unit.abilityCooldowns[i] > 0) continue;

            const spell = spellManager.getSpell(ability.id);
            if (!spell) continue;

            // Check if this is a healing/support ability
            const isHealAbility = spell.target === 'ally' || spell.target === 'all_allies' || spell.target === 'self';
            const hasHealEffect = spell.effects && (
                spell.effects.includes('heal') ||
                spell.effects.includes('buff_shield') ||
                spell.effects.includes('buff_increase_defense') ||
                spell.effects.includes('cleanse')
            );

            if (isHealAbility || hasHealEffect) {
                let target;
                if (spell.target === 'ally') {
                    target = healTarget;
                } else if (spell.target === 'all_allies') {
                    target = 'all';
                } else if (spell.target === 'self') {
                    target = unit;
                } else {
                    // Skip abilities targeting enemies — healer shouldn't cast those here
                    continue;
                }

                this.battle.executeAbility(unit, i, target);
                return;
            }
        }

        // No heal ability available — use basic attack on enemy instead
        const enemies = this.battle.getEnemies(unit).filter(e => e && e.isAlive);
        if (enemies.length > 0) {
            unit.currentTarget = this.selectTarget(unit);
            if (unit.currentTarget && unit.isInRange(unit.currentTarget)) {
                this.useBasicAttack(unit);
            }
        }
    }
}
