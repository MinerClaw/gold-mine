import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { RESOURCES } from '@/lib/game'

// POST /api/convert - Convert gems to gold
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

    const body = await request.json()
    // Accept both 'gem' and 'resource' for compatibility
    const resource = body.resource || body.gem
    const amount = body.amount

    // Validate resource type
    const validResources = ['emerald', 'sapphire', 'ruby', 'diamond']
    if (!validResources.includes(resource)) {
      return NextResponse.json({
        error: `Invalid resource type. Must be one of: ${validResources.join(', ')}`,
      }, { status: 400 })
    }

    // Validate amount
    const convertAmount = parseInt(amount) || 0
    if (convertAmount <= 0) {
      return NextResponse.json({
        error: 'Amount must be positive',
      }, { status: 400 })
    }

    // Check if agent has enough resources
    if (agent[resource] < convertAmount) {
      return NextResponse.json({
        error: `Not enough ${resource}. You have ${agent[resource]}, trying to convert ${convertAmount}`,
        available: agent[resource],
        requested: convertAmount,
      }, { status: 400 })
    }

    // Calculate gold value
    const resourceValue = RESOURCES[resource].value
    const goldGained = convertAmount * resourceValue

    // Perform conversion
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        [resource]: agent[resource] - convertAmount,
        gold: agent.gold + goldGained,
      }
    })

    return NextResponse.json({
      success: true,
      message: `Converted ${convertAmount} ${resource} to ${goldGained} gold`,
      converted: {
        resource,
        amount: convertAmount,
        goldValue: goldGained,
      },
      newGoldBalance: agent.gold + goldGained,
    })

  } catch (error) {
    console.error('Convert error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/convert - Get conversion rates
export async function GET() {
  const rates = Object.entries(RESOURCES)
    .filter(([key]) => key !== 'gold')
    .map(([gem, config]) => ({
      gem,
      goldValue: config.value,
      description: `1 ${gem} = ${config.value} gold`,
    }))

  return NextResponse.json({
    rates,
    note: 'Convert gems to gold to increase your leaderboard score',
  })
}

