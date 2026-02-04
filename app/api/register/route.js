import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { generateToken } from '@/lib/game'
import {
  X402_CONFIG,
  verifyX402Payment,
  generatePaymentRequired
} from '@/lib/x402'

// POST /api/register - Register new agent (requires x402 payment)
export async function POST(request) {
  try {
    // First, verify x402 payment
    const paymentResult = await verifyX402Payment(request)

    if (!paymentResult.valid) {
      // Return 402 Payment Required with instructions
      const paymentInfo = generatePaymentRequired({
        description: 'Gold Mine Agent Registration - $0.10 fee required',
      })

      return NextResponse.json(
        {
          error: 'Payment Required',
          message: 'Registration requires a $0.10 payment in USDC or ETH',
          paymentError: paymentResult.error,
          x402: paymentInfo.body.x402,
        },
        {
          status: 402,
          headers: {
            'X-Payment-Required': 'true',
            'Access-Control-Expose-Headers': 'X-Payment-Required',
          }
        }
      )
    }

    // Payment verified, proceed with registration
    const body = await request.json()
    const { name, evmAddress } = body

    // Validate required fields
    if (!name || !evmAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: name, evmAddress' },
        { status: 400 }
      )
    }

    // Validate name format
    if (name.length < 3 || name.length > 30) {
      return NextResponse.json(
        { error: 'Name must be 3-30 characters' },
        { status: 400 }
      )
    }

    // Validate EVM address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
      return NextResponse.json(
        { error: 'Invalid EVM address format' },
        { status: 400 }
      )
    }

    // Check if name already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { name }
    })
    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent name already taken' },
        { status: 409 }
      )
    }

    // Generate token
    const token = generateToken()

    // Create agent with payment info
    const agent = await prisma.agent.create({
      data: {
        name,
        evmAddress,
        token,
        // Store payment transaction hash if available
        paymentTxHash: paymentResult.txHash || null,
      }
    })

    // Get or create current season and add agent to it
    let season = await prisma.season.findFirst({
      where: { isActive: true }
    })

    if (!season) {
      // Create first season
      const now = new Date()
      const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      season = await prisma.season.create({
        data: {
          number: 1,
          startAt: now,
          endAt: endAt,
          isActive: true,
        }
      })
    }

    // Add agent to current season
    await prisma.agentSeason.create({
      data: {
        agentId: agent.id,
        seasonId: season.id,
      }
    })

    return NextResponse.json({
      success: true,
      agent: {
        name: agent.name,
        evmAddress: agent.evmAddress,
      },
      token: token,
      payment: {
        verified: true,
        txHash: paymentResult.txHash,
        amount: X402_CONFIG.REGISTRATION_FEE,
        token: paymentResult.token || 'USDC',
      },
      message: 'Agent registered successfully! Payment verified.'
    })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/register - Get registration requirements
export async function GET() {
  const paymentInfo = generatePaymentRequired({
    description: 'Gold Mine Agent Registration Fee',
  })

  return NextResponse.json({
    registrationFee: `$${X402_CONFIG.REGISTRATION_FEE}`,
    acceptedTokens: ['USDC', 'ETH'],
    network: X402_CONFIG.DEFAULT_NETWORK,
    receiverAddress: X402_CONFIG.RECEIVER_ADDRESS,
    facilitator: X402_CONFIG.FACILITATOR_URL,
    x402: paymentInfo.body.x402,
    instructions: {
      step1: 'Prepare $0.10 in USDC or equivalent ETH on Base network',
      step2: 'Sign the payment using x402 protocol',
      step3: 'Include X-Payment header in your registration request',
      step4: 'Send POST request with name and evmAddress',
    }
  })
}
