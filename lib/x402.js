/**
 * x402 Payment Protocol Integration
 *
 * x402 is an open payment protocol that enables instant, automatic
 * stablecoin payments directly over HTTP using the HTTP 402 status code.
 *
 * Documentation: https://docs.cdp.coinbase.com/x402/welcome
 * Facilitator: https://x402.org/facilitator
 */

// Configuration
export const X402_CONFIG = {
  // Registration fee in USD
  REGISTRATION_FEE: '0.10',

  // Supported networks
  NETWORKS: {
    BASE_MAINNET: 'base',
    BASE_SEPOLIA: 'base-sepolia',
    ETHEREUM: 'ethereum',
  },

  // Default network for payments
  DEFAULT_NETWORK: 'base',

  // Coinbase CDP Facilitator URL
  FACILITATOR_URL: 'https://x402.org/facilitator',

  // Your wallet address to receive payments (set in .env)
  RECEIVER_ADDRESS: process.env.X402_RECEIVER_ADDRESS || '0x0000000000000000000000000000000000000000',

  // Supported tokens
  TOKENS: {
    USDC: 'USDC',
    ETH: 'ETH',
  }
}

/**
 * Generate x402 payment required response
 * Returns the payment instructions for the client
 */
export function generatePaymentRequired(options = {}) {
  const {
    price = X402_CONFIG.REGISTRATION_FEE,
    network = X402_CONFIG.DEFAULT_NETWORK,
    description = 'Gold Mine Agent Registration Fee',
    receiver = X402_CONFIG.RECEIVER_ADDRESS,
  } = options

  return {
    status: 402,
    headers: {
      'X-Payment-Required': 'true',
      'Content-Type': 'application/json',
    },
    body: {
      error: 'Payment Required',
      x402: {
        version: '1',
        price: `$${price}`,
        priceUsd: parseFloat(price),
        network,
        receiver,
        description,
        accepts: [
          {
            token: 'USDC',
            network: network,
            address: receiver,
            amount: price,
          },
          {
            token: 'ETH',
            network: network,
            address: receiver,
            // ETH amount will be calculated by facilitator based on current price
            amountUsd: price,
          }
        ],
        facilitator: X402_CONFIG.FACILITATOR_URL,
        paymentInstructions: `Send $${price} in USDC or equivalent ETH to ${receiver} on ${network}`,
      }
    }
  }
}

/**
 * Verify x402 payment from request headers
 * @param {Request} request - The incoming request
 * @returns {Promise<{valid: boolean, txHash?: string, error?: string}>}
 */
export async function verifyX402Payment(request) {
  try {
    // Get payment header
    const paymentHeader = request.headers.get('X-Payment') ||
                          request.headers.get('x-payment') ||
                          request.headers.get('X-PAYMENT')

    if (!paymentHeader) {
      return { valid: false, error: 'Missing X-Payment header' }
    }

    // Parse payment payload
    let paymentPayload
    try {
      paymentPayload = JSON.parse(paymentHeader)
    } catch {
      // Payment might be base64 encoded
      try {
        paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString())
      } catch {
        return { valid: false, error: 'Invalid payment payload format' }
      }
    }

    // Verify payment with facilitator
    const verifyResponse = await fetch(`${X402_CONFIG.FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment: paymentPayload,
        expectedReceiver: X402_CONFIG.RECEIVER_ADDRESS,
        expectedAmount: X402_CONFIG.REGISTRATION_FEE,
        network: X402_CONFIG.DEFAULT_NETWORK,
      })
    })

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json().catch(() => ({}))
      return {
        valid: false,
        error: errorData.error || 'Payment verification failed'
      }
    }

    const verifyResult = await verifyResponse.json()

    return {
      valid: true,
      txHash: verifyResult.txHash || paymentPayload.txHash,
      payer: verifyResult.payer || paymentPayload.payer,
      amount: verifyResult.amount || paymentPayload.amount,
      token: verifyResult.token || paymentPayload.token,
    }

  } catch (error) {
    console.error('x402 verification error:', error)
    return { valid: false, error: 'Payment verification service error' }
  }
}

/**
 * Alternative: Verify payment via transaction hash directly on-chain
 * Use this if facilitator is unavailable
 */
export async function verifyPaymentOnChain(txHash, network = X402_CONFIG.DEFAULT_NETWORK) {
  // This would require ethers.js or viem to verify on-chain
  // For now, we trust the facilitator

  const rpcUrls = {
    'base': 'https://mainnet.base.org',
    'base-sepolia': 'https://sepolia.base.org',
    'ethereum': 'https://eth.llamarpc.com',
  }

  try {
    const response = await fetch(rpcUrls[network], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      })
    })

    const data = await response.json()

    if (data.result && data.result.status === '0x1') {
      return { valid: true, txHash, receipt: data.result }
    }

    return { valid: false, error: 'Transaction not confirmed' }
  } catch (error) {
    return { valid: false, error: 'On-chain verification failed' }
  }
}

/**
 * Create payment required response for Next.js
 */
export function createPaymentRequiredResponse() {
  const paymentInfo = generatePaymentRequired()

  return new Response(JSON.stringify(paymentInfo.body), {
    status: 402,
    headers: {
      ...paymentInfo.headers,
      'Access-Control-Expose-Headers': 'X-Payment-Required',
    }
  })
}
