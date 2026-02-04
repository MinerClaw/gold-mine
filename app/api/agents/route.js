import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { PICKAXES, calculateTotalValue } from '@/lib/game'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/agents - List all agents (public)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 100)
    const offset = parseInt(searchParams.get('offset')) || 0
    const sort = searchParams.get('sort') || 'gold' // gold, mines, pickaxe, recent
    const search = searchParams.get('search') || ''

    // Build sort order
    let orderBy = {}
    switch (sort) {
      case 'mines':
        orderBy = { totalMines: 'desc' }
        break
      case 'pickaxe':
        orderBy = { pickaxeLevel: 'desc' }
        break
      case 'recent':
        orderBy = { lastMineAt: 'desc' }
        break
      case 'gold':
      default:
        orderBy = { gold: 'desc' }
    }

    // Build where clause
    const where = search ? {
      name: { contains: search }
    } : {}

    // Get total count
    const totalCount = await prisma.agent.count({ where })

    // Get agents
    const agents = await prisma.agent.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        evmAddress: true,
        pickaxeLevel: true,
        gold: true,
        emerald: true,
        sapphire: true,
        ruby: true,
        diamond: true,
        totalMines: true,
        lastMineAt: true,
        createdAt: true,
      }
    })

    const formattedAgents = agents.map((agent, index) => {
      const pickaxe = PICKAXES[agent.pickaxeLevel] || PICKAXES[1]
      const totalValue = calculateTotalValue({
        gold: agent.gold,
        emerald: agent.emerald,
        sapphire: agent.sapphire,
        ruby: agent.ruby,
        diamond: agent.diamond,
      })

      return {
        rank: offset + index + 1,
        name: agent.name,
        evmAddress: agent.evmAddress.slice(0, 6) + '...' + agent.evmAddress.slice(-4),
        pickaxe: {
          level: agent.pickaxeLevel,
          icon: pickaxe.icon,
          name: pickaxe.name,
        },
        resources: {
          gold: agent.gold,
          emerald: agent.emerald,
          sapphire: agent.sapphire,
          ruby: agent.ruby,
          diamond: agent.diamond,
          totalValue,
        },
        stats: {
          totalMines: agent.totalMines,
          lastMineAt: agent.lastMineAt,
          joinedAt: agent.createdAt,
        }
      }
    })

    return NextResponse.json({
      total: totalCount,
      limit,
      offset,
      agents: formattedAgents,
    })

  } catch (error) {
    console.error('Agents list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
