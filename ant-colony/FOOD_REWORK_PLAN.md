# Ant Colony Food System Rework Plan

## Overview
Complete rework of the food mechanic to create a more engaging, Vampire Survivors-inspired progression system with food leveling, zone-based bonuses, and automatic ant spawning.

---

## Core Changes

### 1. Food Placement System
- **Snap to center**: Food placed in a food zone snaps to the zone's center
- **One food per zone**: Each of the 5 zones can only hold one food at a time
- **No placement cost**: Food is free to place (no gold cost)
- **60 second timer**: Each food has a spoil timer, same as before

### 2. Food Leveling System
- Each food type has its own level (Lv.1 to Lv.10)
- Levels persist between placements

**Level Progression:**
| Level | Units to Deliver | On Success | On Fail/Spoil |
|-------|------------------|------------|---------------|
| Lv.1 | 1 unit | +1 level | -1 level (min 1) |
| Lv.2 | 2 units | +1 level | -1 level |
| Lv.3 | 3 units | +1 level | -1 level |
| Lv.4 | 4 units | +1 level | -1 level |
| Lv.5 | 5 units (needs capacity 5) | +1 level | -1 level |
| ... | ... | ... | ... |
| Lv.10 | 10 units (needs capacity 10) | ABILITY UNLOCKED | -1 level |

**Zone Multiplier on Level-Up:**
- x1 zone: +1 level on success
- x2 zone: +2 levels on success
- x3 zone: +3 levels on success

### 3. Food Types & Bonuses

**Base bonuses (per unit delivered, multiplied by zone):**
| Food | Emoji | Base Bonus | Lv.10 Ability |
|------|-------|------------|---------------|
| Sugar | 🍬 | +1 HP | **Gold Hunter** (+2g per kill) |
| Protein | 🍖 | +1 ATK | **Lifesteal** (heal on hit) |
| Fruit | 🍇 | +1 Carry | **Fresh Keeper** (food timer pauses while carrying) |
| Feast | 🍯 | +1 DEF | **Thorns** (reflect damage) |
| Nectar | 🌸 | +1 HP | **Regeneration** (1 HP/5sec) |
| Golden Apple | 🍎 | +1 ALL | **Champion** (all abilities) - rare spawn only |

**Zone Multiplier on Bonuses:**
- x1 zone: 1x bonus (Protein = +1 ATK per unit)
- x2 zone: 2x bonus (Protein = +2 ATK per unit)
- x3 zone: 3x bonus (Protein = +3 ATK per unit)

**Example:**
- Protein Lv.3 (3 units) placed in x3 zone
- Fully delivered = 3 units × +3 ATK = +9 ATK accumulated
- Food levels up by +3 (now Lv.6)

### 4. Ant Spawning System

**Every minute:**
1. Game pauses
2. **Harvest Summary Card** appears showing:
   - All food delivered this cycle
   - Breakdown of stat bonuses accumulated
   - Animation: food icons merge → ant hatches
3. New ant spawns with accumulated bonuses
4. If any Lv.10 food was delivered, ant gets that ability
5. Evolve upgrade cards appear
6. Game resumes

**Accumulated bonuses reset each minute** (new cycle starts fresh)

### 5. Gold Economy

**Gold Sources:**
- Killing enemies only
- Spider: ~3-5 gold
- Beetle: ~5-8 gold
- (Zone multiplier could apply: x1=base, x2=2x, x3=3x gold)

**Gold Sinks:**
- Evolve upgrades only
- No food costs

**Starting Gold:** 0 (or small amount for first upgrade)

---

## Implementation Tasks

### Phase 1: Data Structure Changes
- [ ] Add `foodLevels` object to track each food type's level
- [ ] Modify `FoodItem` class to use level-based unit count
- [ ] Remove food costs from CONFIG
- [ ] Add `accumulatedBonuses` object to track current cycle's deliveries
- [ ] Add `cycleTimer` for 1-minute cycles

### Phase 2: Food Placement Changes
- [ ] Modify `placeFood()` to snap to nearest food zone center
- [ ] Add zone occupation check (one food per zone)
- [ ] Remove gold deduction on food placement
- [ ] Update food zone visual to show if occupied

### Phase 3: Food Delivery Changes
- [ ] Modify delivery logic to accumulate bonuses instead of applying to delivering ant
- [ ] Apply zone multiplier to bonus calculation
- [ ] Track units delivered per food for level-up calculation
- [ ] On full delivery: level up food (+1/+2/+3 based on zone)
- [ ] On spoil/fail: level down food (-1, minimum 1)

### Phase 4: Harvest Summary UI
- [ ] Create Harvest Summary card component
- [ ] Show food icons delivered this cycle
- [ ] Show calculated stat bonuses
- [ ] Add merge animation (food → ant)
- [ ] Display newborn ant's final stats

### Phase 5: Ant Spawning
- [ ] Spawn ant at hive with accumulated bonuses
- [ ] Apply Lv.10 abilities if applicable
- [ ] Reset accumulated bonuses after spawn
- [ ] Add birth animation/particles

### Phase 6: Gold System Rework
- [ ] Remove gold from food delivery
- [ ] Add gold drop on enemy death
- [ ] Update UI to show gold earned from kills
- [ ] Adjust evolve card costs if needed

### Phase 7: UI Updates
- [ ] Food panel shows current level for each food type
- [ ] Food zones show occupation status
- [ ] Add "Next ant preview" showing accumulated bonuses
- [ ] Cycle timer display (time until next spawn)

### Phase 8: Lv.5+ Capacity Requirement
- [ ] Lv.5+ food requires multiple ants to carry
- [ ] Visual indicator for capacity needed
- [ ] Ants coordinate to carry together

### Phase 9: Lv.10 Abilities
- [ ] Implement Lifesteal ability (Protein)
- [ ] Implement Fresh Keeper ability (Fruit - food timer pauses while carrying)
- [ ] Implement Thorns ability (Feast)
- [ ] Implement Regeneration ability (Nectar)
- [ ] Implement Gold Hunter ability (Sugar)
- [ ] Implement Champion ability (Golden Apple - all abilities)

---

## Files to Modify
- `ant-colony/index.html` - Main game file (all logic is here)

## New UI Elements Needed
1. Food level indicators in food panel
2. Zone occupation indicators
3. Harvest Summary modal/card
4. Cycle timer display
5. "Next ant" preview panel
6. Gold from kill floating text

---

## Summary of Removed Features
- Food placement costs gold
- Food gives gold on delivery
- Food buffs the delivering ant directly
- Different base sizes per food type (now based on level)

## Summary of New Features
- Food leveling system (Lv.1-10)
- Zone snap placement
- One food per zone limit
- Accumulated bonuses → spawned ant
- Harvest Summary card every minute
- Auto ant spawn every minute
- Gold from enemy kills only
- Lv.10 special abilities
