import crypto from 'crypto'

// Resource values (in gold) - x100 multiplier applied
export const RESOURCES = {
  gold: { value: 100, baseChance: 100 }, // always get gold
  emerald: { value: 1000, baseChance: 5 },
  sapphire: { value: 2500, baseChance: 3 },
  ruby: { value: 5000, baseChance: 2 },
  diamond: { value: 10000, baseChance: 0.5 },
}

// Pickaxe levels and their bonuses
export const PICKAXES = {
  1: { name: 'Wooden Pickaxe', icon: '🪵', rareMultiplier: 1.0, cost: 0 },
  2: { name: 'Stone Pickaxe', icon: '🪨', rareMultiplier: 1.1, cost: 10000 },
  3: { name: 'Iron Pickaxe', icon: '⛏️', rareMultiplier: 1.25, cost: 50000 },
  4: { name: 'Gold Pickaxe', icon: '✨', rareMultiplier: 1.5, cost: 200000 },
  5: { name: 'Diamond Pickaxe', icon: '💎', rareMultiplier: 2.0, cost: 1000000 },
}

// Mining cooldown in milliseconds (4 hours)
export const MINING_COOLDOWN_MS = 4 * 60 * 60 * 1000

// Season duration in days
export const SEASON_DURATION_DAYS = 7

// Generate random token
export function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// Generate claim code (shorter, human-friendly)
export function generateClaimCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// Mining result types
export const MINING_RESULTS = {
  EMPTY: 'empty',           // 25% - đào trượt
  LOW: 'low',               // 45% - yield thấp
  NORMAL: 'normal',         // 20% - yield bình thường
  RICH: 'rich',             // 8% - yield cao
  CRITICAL: 'critical',     // 1.8% - critical strike
  LEGENDARY: 'legendary',   // 0.2% - legendary jackpot
}

// Calculate mining rewards based on pickaxe level
// New system: Empty Swings + Critical System
export function calculateMiningRewards(pickaxeLevel) {
  const pickaxe = PICKAXES[pickaxeLevel] || PICKAXES[1]
  const rewards = {
    gold: 0,
    emerald: 0,
    sapphire: 0,
    ruby: 0,
    diamond: 0,
    resultType: MINING_RESULTS.EMPTY,
  }

  // Roll for mining result type
  // Better pickaxe = slightly lower empty chance, higher critical chance
  const emptyChance = Math.max(15, 25 - (pickaxeLevel - 1) * 2) // 25% -> 17% at max level
  const criticalBonus = (pickaxeLevel - 1) * 0.3 // +0.3% critical per level
  
  const roll = Math.random() * 100
  
  // 25% chance - Empty swing (đào trượt)
  if (roll < emptyChance) {
    rewards.resultType = MINING_RESULTS.EMPTY
    return rewards
  }
  
  // 45% chance - Low yield
  if (roll < emptyChance + 45) {
    rewards.resultType = MINING_RESULTS.LOW
    rewards.gold = Math.floor(Math.random() * 30) + 10 // 10-40 gold
  }
  // 20% chance - Normal yield
  else if (roll < emptyChance + 45 + 20) {
    rewards.resultType = MINING_RESULTS.NORMAL
    rewards.gold = Math.floor(Math.random() * 80) + 50 // 50-130 gold
  }
  // 8% chance - Rich yield
  else if (roll < emptyChance + 45 + 20 + 8) {
    rewards.resultType = MINING_RESULTS.RICH
    rewards.gold = Math.floor(Math.random() * 200) + 150 // 150-350 gold
  }
  // 1.8% + bonus chance - Critical strike
  else if (roll < emptyChance + 45 + 20 + 8 + 1.8 + criticalBonus) {
    rewards.resultType = MINING_RESULTS.CRITICAL
    rewards.gold = Math.floor(Math.random() * 400) + 400 // 400-800 gold
  }
  // 0.2% chance - Legendary jackpot
  else {
    rewards.resultType = MINING_RESULTS.LEGENDARY
    rewards.gold = Math.floor(Math.random() * 1000) + 1000 // 1000-2000 gold
  }

  // Gems chỉ có chance khi không Empty
  // Chance tăng theo result type
  const gemChanceMultiplier = {
    [MINING_RESULTS.LOW]: 0.5,
    [MINING_RESULTS.NORMAL]: 1.0,
    [MINING_RESULTS.RICH]: 1.5,
    [MINING_RESULTS.CRITICAL]: 2.5,
    [MINING_RESULTS.LEGENDARY]: 5.0,
  }
  
  const resultMultiplier = gemChanceMultiplier[rewards.resultType] || 0
  
  for (const [gem, config] of Object.entries(RESOURCES)) {
    if (gem === 'gold') continue
    
    const adjustedChance = config.baseChance * pickaxe.rareMultiplier * resultMultiplier
    const gemRoll = Math.random() * 100
    
    if (gemRoll < adjustedChance) {
      // Số lượng gem dựa vào result type
      if (rewards.resultType === MINING_RESULTS.LEGENDARY) {
        rewards[gem] = Math.floor(Math.random() * 5) + 3 // 3-7 gems
      } else if (rewards.resultType === MINING_RESULTS.CRITICAL) {
        rewards[gem] = Math.floor(Math.random() * 4) + 2 // 2-5 gems
      } else {
        rewards[gem] = Math.floor(Math.random() * 2) + 1 // 1-2 gems
      }
    }
  }

  return rewards
}

// Calculate total value of resources
export function calculateTotalValue(resources) {
  let total = 0
  for (const [resource, amount] of Object.entries(resources)) {
    if (RESOURCES[resource]) {
      total += amount * RESOURCES[resource].value
    }
  }
  return total
}

// Check if agent can mine (cooldown passed)
export function canMine(lastMineAt) {
  if (!lastMineAt) return true
  const now = Date.now()
  const lastMine = new Date(lastMineAt).getTime()
  return (now - lastMine) >= MINING_COOLDOWN_MS
}

// Get time until next mine
export function getTimeUntilNextMine(lastMineAt) {
  if (!lastMineAt) return 0
  const now = Date.now()
  const lastMine = new Date(lastMineAt).getTime()
  const nextMine = lastMine + MINING_COOLDOWN_MS
  return Math.max(0, nextMine - now)
}

// Format milliseconds to human readable
export function formatCooldown(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((ms % (60 * 1000)) / 1000)
  return `${hours}h ${minutes}m ${seconds}s`
}
