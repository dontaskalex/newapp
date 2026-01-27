# Ant Colony Code Map

Quick reference for navigating `index.html` (~10,000 lines).

## Line Ranges

### CSS Styles (Lines 1-2400)
- **General UI**: 1-350
- **Character Card**: 350-750
- **Cycle Timer**: 1850-1890
- **Harvest Modal**: 1890-2100
- **Skill Modal**: 2106-2300
- **Skill Cards**: 2205-2260
- **Skilled Ants Panel**: 2300-2400

### HTML Structure (Lines 2400-2700)
- **Character Card Modal**: 2434-2465
- **Food Level Display**: 2480-2505
- **Cycle Timer UI**: 2491-2502
- **Skill Modal**: 2540-2565
- **Harvest Modal**: 2568-2610
- **Upgrade Panel**: 2608-2700

### JavaScript - Constants & Config (Lines 2700-3900)
- **BIRTH_PASSIVES**: ~2760
- **ANT_SKILLS**: ~2790
- **Skill Functions** (queueSkillChoice, showNextSkillChoice, selectSkillCard, confirmSkillChoice): 2850-3000
- **Skilled Ants Panel Update**: 3000-3050
- **CONFIG object**: 3600-3800
- **Level Thresholds**: 3725
- **Ant Types Config**: 3750-3900

### JavaScript - Upgrade System (Lines 4000-4700)
- **UPGRADE_INTERVAL**: 4013
- **AUTO_SPAWN_INTERVAL**: 4017
- **upgradeMultipliers**: 4020-4050
- **checkUpgradeTime()**: 4609
- **checkAutoSpawn()**: 4620
- **autoSpawnWorker()**: 4635
- **resetUpgrades()**: 4653
- **restartGame()**: 4680

### JavaScript - Food System (Lines 5000-5900)
- **Food Types**: 5100-5200
- **Zone Config**: 5200-5400
- **CYCLE_DURATION**: 5816
- **Food Spawning Logic**: 5400-5900

### JavaScript - Ant Class (Lines 6200-7500)
- **Ant constructor**: 6200-6400
- **Birth Passive Assignment**: ~6280
- **Skill Properties**: ~6310
- **getLevel()**: 6396
- **getTotalExp()**: 6494
- **checkLevelUp()**: 6502
- **recalculateStats()**: 6423
- **takeDamage() - Iron Shell**: ~6550
- **update() - Pounce skill**: ~7100
- **draw()**: 7378

### JavaScript - Predators (Lines 7600-8300)
- **Spider Class**: 7600-7900
- **Beetle Class**: 7900-8200
- **removePredator() - Gold Rush**: ~8250

### JavaScript - Character Card (Lines 8300-8900)
- **ANT_CARD_DATA**: 8300-8400
- **showCharacterCard()**: 8700
- **Card skill section display**: ~8795

### JavaScript - UI Updates (Lines 9400-9600)
- **updateCycleTimerUI()**: 9510
- **updatePreviewStats()**: 9533
- **triggerHarvestSummary()**: 9565
- **spawnHarvestAnt()**: 9625

### JavaScript - Main Loop (Lines 9700-9900)
- **update()**: 9697
- **draw()**: ~9750
- **Game initialization**: 9850-9900

## Key Functions Quick Find

| Function | Purpose | ~Line |
|----------|---------|-------|
| `queueSkillChoice(ant)` | Add ant to skill choice queue | 2853 |
| `showNextSkillChoice()` | Display skill modal | 2864 |
| `selectSkillCard(key)` | Handle skill selection | 2930 |
| `confirmSkillChoice()` | Apply skill to ant | 2944 |
| `checkAutoSpawn()` | Auto-spawn worker every 30s | 4620 |
| `autoSpawnWorker()` | Spawn worker at hive | 4635 |
| `checkUpgradeTime()` | Trigger upgrade modal at 60s | 4609 |
| `getLevel()` | Calculate ant level from XP | 6396 |
| `checkLevelUp()` | Check & trigger level up | 6502 |
| `showCharacterCard()` | Display ant/predator info | 8700 |

## Key Variables

| Variable | Purpose | ~Line |
|----------|---------|-------|
| `CONFIG.levelThresholds` | XP per level [0,4,10,20,38] | 3725 |
| `AUTO_SPAWN_INTERVAL` | 30 seconds | 4017 |
| `UPGRADE_INTERVAL` | 60 seconds | 4013 |
| `BIRTH_PASSIVES` | Brawler, Lucky, Thick-Skinned | 2760 |
| `ANT_SKILLS` | Pounce, Iron Shell, Gold Rush | 2790 |
| `pendingSkillChoices` | Queue of ants needing skills | 2848 |
| `skilledAnts` | Array of ants with skills | 2850 |

## Recent Changes Location

- **Skill Modal CSS**: 2106-2300
- **Skill Modal HTML**: 2540-2565
- **Skill System JS**: 2850-3050
- **Auto-spawn system**: 4017, 4620-4660
- **Card skill display**: 8795 (JS), 647-695 (CSS)
