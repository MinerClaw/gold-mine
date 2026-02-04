import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { PICKAXES } from '@/lib/game'

// GET /api/leaderboard - Get season leaderboard
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100)

    // Get current active season
    const season = await prisma.season.findFirst({
      where: { isActive: true }
    })

    if (!season) {
      return NextResponse.json({
        error: 'No active season',
        leaderboard: [],
      })
    }

    // Get top agents for this season
    const seasonStats = await prisma.agentSeason.findMany({
      where: { seasonId: season.id },
      orderBy: { totalValue: 'desc' },
      take: limit,
      include: {
        agent: {
          select: {
            name: true,
            pickaxeLevel: true,
            evmAddress: true,
          }
        }
      }
    })

    const leaderboard = seasonStats.map((stats, index) => {
      const pickaxe = PICKAXES[stats.agent.pickaxeLevel] || PICKAXES[1]
      return {
        rank: index + 1,
        name: stats.agent.name,
        evmAddress: stats.agent.evmAddress.slice(0, 6) + '...' + stats.agent.evmAddress.slice(-4),
        pickaxeLevel: stats.agent.pickaxeLevel,
        pickaxeIcon: pickaxe.icon,
        totalValue: stats.totalValue,
        minesCount: stats.minesCount,
      }
    })

    // Calculate time remaining
    const now = new Date()
    const timeRemaining = Math.max(0, new Date(season.endAt).getTime() - now.getTime())

    return NextResponse.json({
      season: {
        number: season.number,
        startAt: season.startAt,
        endAt: season.endAt,
        timeRemaining,
        isActive: season.isActive,
      },
      totalParticipants: seasonStats.length,
      leaderboard,
    })

  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

