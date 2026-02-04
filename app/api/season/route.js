import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'

// GET /api/season - Get current season info
export async function GET() {
  try {
    // Get current active season
    let season = await prisma.season.findFirst({
      where: { isActive: true }
    })

    // Auto-create Season 1 if no season exists
    if (!season) {
      const now = new Date()
      const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      
      season = await prisma.season.create({
        data: {
          number: 1,
          startAt: now,
          endAt: endAt,
          isActive: true,
        }
      })
    }

    // Get stats
    const totalAgents = await prisma.agentSeason.count({
      where: { seasonId: season.id }
    })

    const stats = await prisma.agentSeason.aggregate({
      where: { seasonId: season.id },
      _sum: {
        totalValue: true,
        minesCount: true,
      }
    })

    // Calculate time remaining
    const now = new Date()
    const endTime = new Date(season.endAt).getTime()
    const timeRemaining = Math.max(0, endTime - now.getTime())

    // Format time remaining
    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000))
    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000))

    return NextResponse.json({
      active: true,
      season: {
        number: season.number,
        startAt: season.startAt,
        endAt: season.endAt,
        timeRemaining,
        timeRemainingFormatted: `${days}d ${hours}h ${minutes}m`,
        prizePool: season.prizePool,
      },
      stats: {
        totalAgents,
        totalGoldMined: stats._sum.totalValue || 0,
        totalMines: stats._sum.minesCount || 0,
      },
      prizes: {
        distribution: '50% / 30% / 20%',
        places: [
          { rank: 1, percentage: 50 },
          { rank: 2, percentage: 30 },
          { rank: 3, percentage: 20 },
        ]
      }
    })

  } catch (error) {
    console.error('Season error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

