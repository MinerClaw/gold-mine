import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { 
  PICKAXES, 
  RESOURCES,
  getTimeUntilNextMine, 
  formatCooldown,
  calculateTotalValue
} from '@/lib/game'

// GET /api/status - Get agent status
export async function GET(request) {
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

    // Get current season stats
    const season = await prisma.season.findFirst({
      where: { isActive: true }
    })

    let seasonStats = null
    let seasonRank = null

    if (season) {
      seasonStats = await prisma.agentSeason.findUnique({
        where: {
          agentId_seasonId: {
            agentId: agent.id,
            seasonId: season.id,
          }
        }
      })

      // Calculate rank
      const higherRanked = await prisma.agentSeason.count({
        where: {
          seasonId: season.id,
          totalValue: { gt: seasonStats?.totalValue || 0 }
        }
      })
      seasonRank = higherRanked + 1
    }

    // Calculate cooldown
    const cooldownRemaining = getTimeUntilNextMine(agent.lastMineAt)
    const canMine = cooldownRemaining === 0

    // Get pickaxe info
    const pickaxe = PICKAXES[agent.pickaxeLevel] || PICKAXES[1]
    const nextPickaxe = PICKAXES[agent.pickaxeLevel + 1] || null

    // Calculate total lifetime value
    const lifetimeValue = calculateTotalValue({
      gold: agent.gold,
      emerald: agent.emerald,
      sapphire: agent.sapphire,
      ruby: agent.ruby,
      diamond: agent.diamond,
    })

    return NextResponse.json({
      agent: {
        name: agent.name,
        evmAddress: agent.evmAddress,
        createdAt: agent.createdAt,
      },
      resources: {
        gold: agent.gold,
        emerald: agent.emerald,
        sapphire: agent.sapphire,
        ruby: agent.ruby,
        diamond: agent.diamond,
        totalValue: lifetimeValue,
      },
      pickaxe: {
        level: agent.pickaxeLevel,
        name: pickaxe.name,
        icon: pickaxe.icon,
        rareMultiplier: pickaxe.rareMultiplier,
      },
      upgrade: nextPickaxe ? {
        nextLevel: agent.pickaxeLevel + 1,
        name: nextPickaxe.name,
        cost: nextPickaxe.cost,
        canAfford: agent.gold >= nextPickaxe.cost,
      } : null,
      mining: {
        canMine,
        cooldownRemaining,
        cooldownFormatted: formatCooldown(cooldownRemaining),
        totalMines: agent.totalMines,
        lastMineAt: agent.lastMineAt,
      },
      season: season ? {
        number: season.number,
        endsAt: season.endAt,
        rank: seasonRank,
        stats: seasonStats ? {
          goldEarned: seasonStats.goldEarned,
          emeraldEarned: seasonStats.emeraldEarned,
          sapphireEarned: seasonStats.sapphireEarned,
          rubyEarned: seasonStats.rubyEarned,
          diamondEarned: seasonStats.diamondEarned,
          totalValue: seasonStats.totalValue,
          minesCount: seasonStats.minesCount,
        } : null,
      } : null,
    })

  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

