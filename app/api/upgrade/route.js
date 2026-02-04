import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { PICKAXES } from '@/lib/game'

// POST /api/upgrade - Upgrade pickaxe
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

    // Check if already max level
    const currentLevel = agent.pickaxeLevel
    const nextLevel = currentLevel + 1
    
    if (!PICKAXES[nextLevel]) {
      return NextResponse.json({
        success: false,
        error: 'Already at maximum pickaxe level',
        currentLevel,
        pickaxe: PICKAXES[currentLevel],
      }, { status: 400 })
    }

    const nextPickaxe = PICKAXES[nextLevel]
    
    // Check if can afford
    if (agent.gold < nextPickaxe.cost) {
      return NextResponse.json({
        success: false,
        error: 'Not enough gold',
        currentGold: agent.gold,
        required: nextPickaxe.cost,
        shortfall: nextPickaxe.cost - agent.gold,
      }, { status: 400 })
    }

    // Perform upgrade
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        gold: agent.gold - nextPickaxe.cost,
        pickaxeLevel: nextLevel,
      }
    })

    const currentPickaxe = PICKAXES[currentLevel]

    return NextResponse.json({
      success: true,
      message: `Upgraded from ${currentPickaxe.name} to ${nextPickaxe.name}!`,
      previousLevel: currentLevel,
      newLevel: nextLevel,
      pickaxe: {
        name: nextPickaxe.name,
        icon: nextPickaxe.icon,
        rareMultiplier: nextPickaxe.rareMultiplier,
      },
      goldSpent: nextPickaxe.cost,
      goldRemaining: agent.gold - nextPickaxe.cost,
    })

  } catch (error) {
    console.error('Upgrade error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/upgrade - Get upgrade info
export async function GET(request) {
  try {
    const token = request.headers.get('X-Agent-Token')
    if (!token) {
      return NextResponse.json(
        { error: 'Missing X-Agent-Token header' },
        { status: 401 }
      )
    }

    const agent = await prisma.agent.findUnique({
      where: { token }
    })
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const levels = Object.entries(PICKAXES).map(([level, pickaxe]) => ({
      level: parseInt(level),
      ...pickaxe,
      owned: parseInt(level) <= agent.pickaxeLevel,
      canAfford: agent.gold >= pickaxe.cost,
    }))

    const currentLevel = agent.pickaxeLevel
    const nextLevel = currentLevel + 1
    const nextPickaxe = PICKAXES[nextLevel] || null

    return NextResponse.json({
      currentLevel,
      currentPickaxe: PICKAXES[currentLevel],
      gold: agent.gold,
      nextUpgrade: nextPickaxe ? {
        level: nextLevel,
        ...nextPickaxe,
        canAfford: agent.gold >= nextPickaxe.cost,
        shortfall: Math.max(0, nextPickaxe.cost - agent.gold),
      } : null,
      allLevels: levels,
    })

  } catch (error) {
    console.error('Upgrade info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

