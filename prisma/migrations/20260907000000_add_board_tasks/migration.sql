-- CreateEnum
CREATE TYPE "BoardTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "BoardTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "BoardTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "BoardTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "BoardTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardTaskHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" "BoardTaskStatus",
    "toStatus" "BoardTaskStatus",
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardTaskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardTask_status_orderIndex_idx" ON "BoardTask"("status", "orderIndex");

-- CreateIndex
CREATE INDEX "BoardTask_assignedToId_idx" ON "BoardTask"("assignedToId");

-- CreateIndex
CREATE INDEX "BoardTask_createdById_idx" ON "BoardTask"("createdById");

-- CreateIndex
CREATE INDEX "BoardTask_dueDate_idx" ON "BoardTask"("dueDate");

-- CreateIndex
CREATE INDEX "BoardTaskHistory_taskId_idx" ON "BoardTaskHistory"("taskId");

-- CreateIndex
CREATE INDEX "BoardTaskHistory_userId_idx" ON "BoardTaskHistory"("userId");

-- CreateIndex
CREATE INDEX "BoardTaskHistory_createdAt_idx" ON "BoardTaskHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "BoardTask" ADD CONSTRAINT "BoardTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTask" ADD CONSTRAINT "BoardTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTaskHistory" ADD CONSTRAINT "BoardTaskHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "BoardTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTaskHistory" ADD CONSTRAINT "BoardTaskHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
