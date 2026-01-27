# Ant Colony - Current Game State & Skill System

## How The Game Currently Works

### Game Start
1. Player clicks to **place the hive** anywhere on the map
2. This determines **zone multipliers** (x1, x2, x3) based on distance from hive
3. **5 food zones** auto-spawn with assigned food types (Sugar, Protein, Fruit, Feast, Nectar)
4. 10 worker ants spawn at the hive
5. Game begins

### Food System (Automatic)
- **Food spawns automatically** in 5 fixed zones - player does NOT place food
- Each zone has an **assigned food type** (closest = Sugar, furthest = Nectar)
- When food is fully collected, it **auto-respawns** after 1 second
- Food has **levels** (Lv.1-10) that persist and affect unit count
- **Zone multipliers** affect both stat bonuses AND leveling speed

### Food Types & Stat Bonuses
| Food | Emoji | Stat Per Unit |
|------|-------|---------------|
| Sugar | 🍬 | +1 HP |
| Protein | 🍖 | +1 ATK |
| Fruit | 🍇 | +1 Carry |
| Feast | 🍯 | +1 DEF |
| Nectar | 🌸 | +1 HP |

---

## Ant Progression System

### Birth (Spawning)
- Ants spawn with **random base stat variance** (small deviations)
- **15% chance** to spawn with a **birth passive**:

| Birth Passive | Effect | Visual |
|---------------|--------|--------|
| **Brawler** | +2 base ATK | Red tint |
| **Lucky** | 20% chance +1 gold on food delivery | Faint sparkle |
| **Thick-Skinned** | +3 base HP | Slightly larger |

### Growth (Delivering Food)
- Ant delivers food → Gets stats based on food type
- 🍬 Sugar = +1 HP
- 🍖 Protein = +1 ATK
- 🍇 Fruit = +1 Carry
- 🍯 Feast = +1 DEF
- 🌸 Nectar = +1 HP

### Leveling Up
- Ants gain XP from delivering food
- **On level up: +1 to ALL stats** (automatic, no choice)
- Level thresholds: Lv.1 (0), Lv.2 (8), Lv.3 (20), Lv.4 (40), Lv.5 (75)

### Level 3 = Skill Choice!
When an ant reaches **Level 3**, game pauses and player picks **1 of 3 random skills**:

| Skill | Type | Effect | Cooldown | Visual |
|-------|------|--------|----------|--------|
| **Pounce** | Active | Leap to enemy within 150px, deal 2x ATK damage | 8s | Arc jump + dust cloud |
| **Iron Shell** | Passive | Take 50% less damage when below 30% HP | — | Metallic shine when low |
| **Gold Rush** | Passive | +3 gold per kill | — | Gold coins burst |

**Key rules:**
- Skills shown are **random** (not tied to food eaten)
- Player **must pick one** (no skip)
- Choice is strategic based on ant's unique stats

### After Skill Selection
- Ant gets a **shortcut button** in bottom-right UI
- Player can track/monitor all skilled ants
- Skilled ants are special — they're your heroes!

---

## Example Ant Journey

```
🐜 Ant #23 spawns
   Base: 10 HP, 2 ATK, 2 DEF
   Birth passive: Brawler (+2 ATK) ← Lucky 15% roll!

🐜 Ant #23 delivers Protein ×5
   Now: 10 HP, 9 ATK, 2 DEF (2 base + 2 Brawler + 5 Protein)

🐜 Ant #23 reaches Level 2
   Now: 11 HP, 10 ATK, 3 DEF (+1 all stats)

🐜 Ant #23 reaches Level 3
   SKILL CHOICE! Offered: [Pounce] [Iron Shell] [Gold Rush]
   Player thinks: "High ATK ant... Pounce is perfect!"
   Player picks: POUNCE

🐜 Ant #23 "The Pouncer"
   Now has shortcut in bottom-right
   Leaps at spiders dealing 20 damage (10 ATK × 2)
```

---

## Future Skill Additions (Lv.5, Lv.7, etc.)

More skills to add later:
- **Lifesteal** - Heal on hit
- **Thorns** - Reflect damage
- **Rally Cry** - Buff nearby ants
- **Sprint** - Speed burst when carrying food
- **Last Stand** - ATK doubles when low HP
- **Regeneration** - Heal over time
- **Guardian** - Reduce damage for nearby ants
- **Scavenger** - Bonus food find chance

---

## Implementation Status

### Completed
- [x] Auto food spawning in zones
- [x] Food leveling system (Lv.1-10)
- [x] Zone multipliers on bonuses
- [x] Harvest summary modal
- [x] Evolution upgrade system

### In Progress
- [ ] Birth passives (Brawler/Lucky/Thick-Skinned)
- [ ] Level up gives +1 all stats
- [ ] Level 3 skill choice UI
- [ ] Pounce skill + animation
- [ ] Iron Shell passive + visual
- [ ] Gold Rush passive + coin burst
- [ ] Skilled ant shortcuts UI
