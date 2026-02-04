import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { 
  calculateMiningRewards, 
  calculateTotalValue, 
  canMine, 
  getTimeUntilNextMine,
  formatCooldown 
} from '@/lib/game'

// POST /api/mine - Mine for resources
export async function POST(request) {
  try {
    // Get token from header
    const token = request.headers.get('X-Agent-Token')
    if (!token) {
      return NextResponse.json(
        { error: 'Missing X-Agent-Token header' },
        { status: 401 }
      )
    }

    // Find agent by token
    const agent = await prisma.agent.findUnique({
      where: { token }
    })
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check cooldown
    if (!canMine(agent.lastMineAt)) {
      const timeLeft = getTimeUntilNextMine(agent.lastMineAt)
      return NextResponse.json({
        success: false,
        error: 'Mining on cooldown',
        cooldownRemaining: timeLeft,
        cooldownFormatted: formatCooldown(timeLeft),
        message: `You can mine again in ${formatCooldown(timeLeft)}`
      }, { status: 429 })
    }

    // Get current active season
    const season = await prisma.season.findFirst({
      where: { isActive: true }
    })
    if (!season) {
      return NextResponse.json(
        { error: 'No active season' },
        { status: 400 }
      )
    }

    // Calculate rewards
    const rewards = calculateMiningRewards(agent.pickaxeLevel)
    const totalValue = calculateTotalValue(rewards)

    // Update agent resources
    const now = new Date()
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        gold: agent.gold + rewards.gold,
        emerald: agent.emerald + rewards.emerald,
        sapphire: agent.sapphire + rewards.sapphire,
        ruby: agent.ruby + rewards.ruby,
        diamond: agent.diamond + rewards.diamond,
        lastMineAt: now,
        totalMines: agent.totalMines + 1,
      }
    })

    // Update season stats
    await prisma.agentSeason.upsert({
      where: {
        agentId_seasonId: {
          agentId: agent.id,
          seasonId: season.id,
        }
      },
      create: {
        agentId: agent.id,
        seasonId: season.id,
        goldEarned: rewards.gold,
        emeraldEarned: rewards.emerald,
        sapphireEarned: rewards.sapphire,
        rubyEarned: rewards.ruby,
        diamondEarned: rewards.diamond,
        minesCount: 1,
        totalValue: totalValue,
      },
      update: {
        goldEarned: { increment: rewards.gold },
        emeraldEarned: { increment: rewards.emerald },
        sapphireEarned: { increment: rewards.sapphire },
        rubyEarned: { increment: rewards.ruby },
        diamondEarned: { increment: rewards.diamond },
        minesCount: { increment: 1 },
        totalValue: { increment: totalValue },
      }
    })

    // Log mining action
    await prisma.miningLog.create({
      data: {
        agentId: agent.id,
        seasonId: season.id,
        gold: rewards.gold,
        emerald: rewards.emerald,
        sapphire: rewards.sapphire,
        ruby: rewards.ruby,
        diamond: rewards.diamond,
        pickaxeLevel: agent.pickaxeLevel,
      }
    })

    // Build response message based on result type
    let message = ''
    const resultType = rewards.resultType
    
    if (resultType === 'empty') {
      message = '🚫 Đào trượt! Không tìm thấy gì...'
    } else if (resultType === 'legendary') {
      message = `🌟 LEGENDARY JACKPOT! Mined ${rewards.gold} gold`
    } else if (resultType === 'critical') {
      message = `⚡ CRITICAL STRIKE! Mined ${rewards.gold} gold`
    } else if (resultType === 'rich') {
      message = `📈 Rich vein! Mined ${rewards.gold} gold`
    } else if (resultType === 'normal') {
      message = `📊 Mined ${rewards.gold} gold`
    } else {
      message = `📉 Mined ${rewards.gold} gold`
    }
    
    const gems = []
    if (rewards.emerald > 0) gems.push(`${rewards.emerald} 💚 emerald`)
    if (rewards.sapphire > 0) gems.push(`${rewards.sapphire} 💙 sapphire`)
    if (rewards.ruby > 0) gems.push(`${rewards.ruby} ❤️ ruby`)
    if (rewards.diamond > 0) gems.push(`${rewards.diamond} 💎 diamond`)
    if (gems.length > 0) {
      message += ` and found ${gems.join(', ')}!`
    }

    return NextResponse.json({
      success: true,
      rewards,
      totalValue,
      message,
      nextMineAt: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    })

  } catch (error) {
    console.error('Mine error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

