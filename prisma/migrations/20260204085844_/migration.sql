-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "prizePool" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "evmAddress" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '🤖',
    "pickaxeLevel" INTEGER NOT NULL DEFAULT 1,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "emerald" INTEGER NOT NULL DEFAULT 0,
    "sapphire" INTEGER NOT NULL DEFAULT 0,
    "ruby" INTEGER NOT NULL DEFAULT 0,
    "diamond" INTEGER NOT NULL DEFAULT 0,
    "lastMineAt" TIMESTAMP(3),
    "totalMines" INTEGER NOT NULL DEFAULT 0,
    "claimCode" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "twitterHandle" TEXT,
    "paymentTxHash" TEXT,
    "paymentToken" TEXT,
    "paymentAmount" TEXT,
    "paymentNetwork" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSeason" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "goldEarned" INTEGER NOT NULL DEFAULT 0,
    "emeraldEarned" INTEGER NOT NULL DEFAULT 0,
    "sapphireEarned" INTEGER NOT NULL DEFAULT 0,
    "rubyEarned" INTEGER NOT NULL DEFAULT 0,
    "diamondEarned" INTEGER NOT NULL DEFAULT 0,
    "minesCount" INTEGER NOT NULL DEFAULT 0,
    "totalValue" INTEGER NOT NULL DEFAULT 0,
    "finalRank" INTEGER,
    "prizeWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiningLog" (
    "id" SERIAL NOT NULL,
    "agentId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "emerald" INTEGER NOT NULL DEFAULT 0,
    "sapphire" INTEGER NOT NULL DEFAULT 0,
    "ruby" INTEGER NOT NULL DEFAULT 0,
    "diamond" INTEGER NOT NULL DEFAULT 0,
    "pickaxeLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiningLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_number_key" ON "Season"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_token_key" ON "Agent"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_claimCode_key" ON "Agent"("claimCode");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSeason_agentId_seasonId_key" ON "AgentSeason"("agentId", "seasonId");

-- CreateIndex
CREATE INDEX "MiningLog_agentId_idx" ON "MiningLog"("agentId");

-- CreateIndex
CREATE INDEX "MiningLog_seasonId_idx" ON "MiningLog"("seasonId");

-- AddForeignKey
ALTER TABLE "AgentSeason" ADD CONSTRAINT "AgentSeason_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSeason" ADD CONSTRAINT "AgentSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiningLog" ADD CONSTRAINT "MiningLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiningLog" ADD CONSTRAINT "MiningLog_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
