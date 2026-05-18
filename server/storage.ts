import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { User, InsertUser, Project, InsertProject, Transaction, Block, CreditTransaction, RewardTransaction, MrvScore, NdviMeasurement, MrvAuditLog } from "@shared/schema";
import { users, projects, transactions, blocks, creditTransactions, rewardTransactions, mrvScores, ndviMeasurements, mrvAuditLog } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

// Type for project creation with calculated carbon values
export type InsertProjectWithCarbon = InsertProject & {
  annualCO2: number;
  lifetimeCO2: number;
  co2Captured: number
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectsByStatus(status: string): Promise<Project[]>;
  getProjectsByVerifierId(verifierId: string): Promise<Project[]>;
  getVerifiedProjectsByVerifierId(verifierId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProjectWithCarbon): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;

  // Transactions
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByTxId(txId: string): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: string): Promise<Transaction[]>;
  getTransactionsByBlockId(blockId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Blocks
  getBlock(id: string): Promise<Block | undefined>;
  getBlockByHash(blockHash: string): Promise<Block | undefined>;
  getBlockByIndex(index: number): Promise<Block | undefined>;
  getAllBlocks(): Promise<Block[]>;
  getLastBlock(): Promise<Block | undefined>;
  createBlock(block: Omit<Block, 'id'>): Promise<Block>;

  // Credit Transactions
  getCreditTransaction(id: string): Promise<CreditTransaction | undefined>;
  getAllCreditTransactions(): Promise<CreditTransaction[]>;
  getCreditTransactionsByBuyerId(buyerId: string): Promise<CreditTransaction[]>;
  getCreditTransactionsByContributorId(contributorId: string): Promise<CreditTransaction[]>;
  createCreditTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction>;
  updateCreditTransaction(id: string, updates: Partial<CreditTransaction>): Promise<CreditTransaction | undefined>;
  purchaseCredits(buyerId: string, contributorId: string, projectId: string, credits: number, amount: number, idempotencyKey?: string): Promise<{ buyer: User; contributor: User; project: Project; transaction: CreditTransaction }>;
  reverseRewardsForTransaction(transactionId: string): Promise<{ reversed: boolean; buyerId: string; contributorId: string }>;

  // Admin Ledger & Governance
  getTopBuyers(): Promise<any[]>;
  getTopContributors(): Promise<any[]>;
  getAdminLedger(): Promise<any[]>;
  issueWarning(data: { contributorId: string; message: string; severity: string }): Promise<any>;
  getWarningsByContributorId(contributorId: string): Promise<any[]>;
  setMintingStatus(enabled: boolean): Promise<void>;
  getMintingStatus(): Promise<boolean>;
  rollbackAction(data: { adminId: string; targetId: string; type: string; reason: string }): Promise<void>;

  // MRV System
  getMrvScore(projectId: string): Promise<MrvScore | undefined>;
  createMrvScore(scoreData: any): Promise<MrvScore>;
  createNdviMeasurement(data: any): Promise<NdviMeasurement>;
  getNdviMeasurements(projectId: string): Promise<NdviMeasurement[]>;
  updateProjectMrvStatus(projectId: string, status: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private transactions: Map<string, Transaction>;
  private blocks: Map<string, Block>;
  private creditTransactions: Map<string, CreditTransaction>;
  private systemSettings: { mintingEnabled: boolean };
  private warnings: Map<string, any>;
  private rollbacks: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.transactions = new Map();
    this.blocks = new Map();
    this.creditTransactions = new Map();
    this.warnings = new Map();
    this.rollbacks = new Map();
    this.systemSettings = { mintingEnabled: true };
    this.initializeData();
  }

  private initializeData() {
    const adminId = randomUUID();
    const verifier1Id = randomUUID();
    const aliceId = randomUUID();
    const bobId = randomUUID();

    // Hash passwords synchronously during initialization
    this.users.set(adminId, {
      id: adminId,
      name: 'Admin User',
      email: 'admin@bluecarbon.com',
      password: bcrypt.hashSync('admin123', 12),
      role: 'admin',
      username: 'admin',
      location: null,
      creditsPurchased: null,
      rewardPoints: 0,
      deletedAt: null,
    });

    this.users.set(verifier1Id, {
      id: verifier1Id,
      name: 'Verifier One',
      email: 'verifier1@bluecarbon.com',
      password: bcrypt.hashSync('verifier123', 12),
      role: 'verifier',
      username: 'verifier1',
      location: null,
      creditsPurchased: null,
      rewardPoints: 0,
      deletedAt: null,
    });

    this.users.set(aliceId, {
      id: aliceId,
      name: 'Alice Johnson',
      email: 'alice@bluecarbon.com',
      password: bcrypt.hashSync('password123', 12),
      role: 'contributor',
      username: 'alice',
      location: 'California, USA',
      creditsPurchased: null,
      rewardPoints: 0,
      deletedAt: null,
    });

    this.users.set(bobId, {
      id: bobId,
      name: 'Bob Smith',
      email: 'bob@bluecarbon.com',
      password: bcrypt.hashSync('password123', 12),
      role: 'buyer',
      username: 'bob',
      location: 'New York, USA',
      creditsPurchased: 0,
      rewardPoints: 0,
      deletedAt: null,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const id = randomUUID();
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      role: (insertUser.role as any) || 'contributor',
      username: null,
      location: insertUser.location || null,
      creditsPurchased: insertUser.role === 'buyer' ? 0 : null,
      rewardPoints: 0,
      deletedAt: null,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.role === role);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.userId === userId);
  }

  async getProjectsByStatus(status: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.status === status);
  }

  async getProjectsByVerifierId(verifierId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.verifierId === verifierId);
  }

  async getVerifiedProjectsByVerifierId(verifierId: string): Promise<Project[]> {
    const statuses = ["verified", "rejected", "needs_clarification"];
    return Array.from(this.projects.values()).filter(
      (p) => p.verifierId === verifierId && statuses.includes(p.status)
    ).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async createProject(insertProject: InsertProjectWithCarbon): Promise<Project> {
    console.log("[Storage:Mem] createProject started", {
      userId: insertProject.userId,
      name: insertProject.name,
      hasBoundary: Boolean(insertProject.landBoundary),
    });
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      status: "pending",
      verifierId: null,
      rejectionReason: null,
      clarificationNote: null, // Task 2.1: Initialize clarification note
      proofFileUrl: insertProject.proofFileUrl || null,
      plantationType: insertProject.plantationType || null,
      landBoundary: insertProject.landBoundary || null,
      polygon: null,
      centroid: null,
      bbox: null,
      areaHectares: null,
      perimeterKm: null,
      country: null,
      adminRegion: null,
      timezone: null,
      monitoringFrequency: null,
      nextMonitoringDue: null,
      baselineCompletedAt: null,
      registryId: null,
      archivedAt: null,
      mrvStatus: insertProject.mrvStatus ?? "NONE",
      creditsEarned: 0, // Credits start at 0, will be set to lifetimeCO2 when verified
      submittedAt: new Date(),
      isListed: true,
      deletedAt: null,
    };
    this.projects.set(id, project);
    console.log("[Storage:Mem] createProject completed", { projectId: id, status: project.status });
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionByTxId(txId: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find((tx) => tx.txId === txId);
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter((tx) => tx.to === userId);
  }

  async getTransactionsByBlockId(blockId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter((tx) => tx.blockId === blockId);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = randomUUID();
    const tx: Transaction = { ...transaction, id };
    this.transactions.set(id, tx);
    return tx;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const tx = this.transactions.get(id);
    if (!tx) return undefined;
    const updated = { ...tx, ...updates };
    this.transactions.set(id, updated);
    return updated;
  }

  async getBlock(id: string): Promise<Block | undefined> {
    return this.blocks.get(id);
  }

  async getBlockByHash(blockHash: string): Promise<Block | undefined> {
    return Array.from(this.blocks.values()).find((block) => block.blockHash === blockHash);
  }

  async getBlockByIndex(index: number): Promise<Block | undefined> {
    return Array.from(this.blocks.values()).find((block) => block.index === index);
  }

  async getAllBlocks(): Promise<Block[]> {
    return Array.from(this.blocks.values()).sort((a, b) => a.index - b.index);
  }

  async getLastBlock(): Promise<Block | undefined> {
    const blocks = await this.getAllBlocks();
    return blocks[blocks.length - 1];
  }

  async createBlock(block: Omit<Block, 'id'>): Promise<Block> {
    const id = randomUUID();
    const newBlock: Block = { ...block, id };
    this.blocks.set(id, newBlock);
    return newBlock;
  }

  async getCreditTransaction(id: string): Promise<CreditTransaction | undefined> {
    return this.creditTransactions.get(id);
  }

  async getAllCreditTransactions(): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values());
  }

  async getCreditTransactionsByBuyerId(buyerId: string): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values())
      .filter((tx) => tx.buyerId === buyerId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getCreditTransactionsByContributorId(contributorId: string): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values())
      .filter((tx) => tx.contributorId === contributorId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createCreditTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction> {
    const id = randomUUID();
    // Ensure certificateStatus is set (Task 3.1)
    const tx: CreditTransaction = {
      ...transaction,
      id,
      certificateStatus: transaction.certificateStatus || 'valid'
    };
    this.creditTransactions.set(id, tx);
    return tx;
  }

  async updateCreditTransaction(id: string, updates: Partial<CreditTransaction>): Promise<CreditTransaction | undefined> {
    const existing = this.creditTransactions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.creditTransactions.set(id, updated);
    return updated;
  }

  async purchaseCredits(
    buyerId: string,
    contributorId: string,
    projectId: string,
    credits: number,
    amount: number,
    idempotencyKey?: string
  ): Promise<{ buyer: User; contributor: User; project: Project; transaction: CreditTransaction }> {
    // Check for duplicate request using idempotency key
    if (idempotencyKey) {
      for (const tx of this.creditTransactions.values()) {
        if (tx.idempotencyKey === idempotencyKey) {
          // Return existing transaction without re-issuing rewards
          const existingBuyer = this.users.get(buyerId);
          const existingContributor = this.users.get(contributorId);
          const existingProject = this.projects.get(projectId);
          if (!existingBuyer || !existingContributor || !existingProject) {
            throw new Error('Transaction data not found');
          }
          console.log(`[MEM_STORAGE_DEBUG] Duplicate request detected for idempotencyKey: ${idempotencyKey}. Returning existing transaction.`);
          return {
            buyer: existingBuyer,
            contributor: existingContributor,
            project: existingProject,
            transaction: tx,
          };
        }
      }
    }

    // Get buyer, contributor, and project
    const buyer = this.users.get(buyerId);
    const contributor = this.users.get(contributorId);
    const project = this.projects.get(projectId);

    if (!buyer || buyer.role !== 'buyer') {
      throw new Error('Invalid buyer');
    }
    if (!contributor || contributor.role !== 'contributor') {
      throw new Error('Invalid contributor');
    }
    if (!project) {
      throw new Error('Project not found');
    }
    if (project.userId !== contributorId) {
      throw new Error('Project does not belong to this contributor');
    }
    if (project.status !== 'verified') {
      throw new Error('Project must be verified to purchase credits');
    }
    if (credits <= 0) {
      throw new Error('Credits must be positive');
    }
    if ((project.creditsEarned || 0) < credits) {
      throw new Error('Insufficient credits available');
    }

    // Atomically update balances
    const updatedProject = {
      ...project,
      creditsEarned: (project.creditsEarned || 0) - credits,
    };
    const updatedBuyer = {
      ...buyer,
      creditsPurchased: (buyer.creditsPurchased || 0) + credits,
    };

    // Create transaction record
    const transaction: CreditTransaction = {
      id: randomUUID(),
      idempotencyKey: idempotencyKey || null,
      buyerId,
      contributorId,
      projectId,
      credits,
      amount: amount || 0,
      timestamp: new Date(),
      certificateStatus: 'valid' as any, // Task 3.1: Default status
    };

    // Add to ledger (Task: Admin Ledger)
    const ledgerTx: any = {
      id: randomUUID(),
      txId: `TX-${Date.now()}`,
      from: buyerId,
      to: contributorId,
      credits,
      projectId,
      timestamp: new Date(),
      proofHash: 'N/A',
      type: 'Buy',
      buyerId,
      contributorId,
      status: 'Completed'
    };
    this.transactions.set(ledgerTx.id, ledgerTx);

    // Calculate Blue Points: 20 BP for contributor, 5 BP for buyer
    const contributorPointsEarned = (Number(credits) || 0) * 20;
    const buyerPointsEarned = (Number(credits) || 0) * 5;

    const updatedBuyerWithPoints = {
      ...updatedBuyer,
      rewardPoints: Number(buyer.rewardPoints || 0) + buyerPointsEarned,
    };
    const updatedContributorWithPoints = {
      ...contributor,
      rewardPoints: Number(contributor.rewardPoints || 0) + contributorPointsEarned,
    };

    // Persist changes
    this.projects.set(projectId, updatedProject);
    this.users.set(buyerId, updatedBuyerWithPoints);
    this.users.set(contributorId, updatedContributorWithPoints);
    this.creditTransactions.set(transaction.id, transaction);

    console.log(`[MEM_STORAGE_DEBUG] Updated rewardPoints: Buyer=${updatedBuyerWithPoints.rewardPoints}, Contributor=${updatedContributorWithPoints.rewardPoints}`);

    return {
      buyer: updatedBuyerWithPoints,
      contributor: updatedContributorWithPoints,
      project: updatedProject,
      transaction,
    };
  }

  // Reverse rewards for a credit transaction (internal method)
  async reverseRewardsForTransaction(transactionId: string): Promise<{ reversed: boolean; buyerId: string; contributorId: string }> {
    // Find the credit transaction
    const creditTx = this.creditTransactions.get(transactionId);
    if (!creditTx) {
      return { reversed: false, buyerId: '', contributorId: '' };
    }

    const buyerId = creditTx.buyerId;
    const contributorId = creditTx.contributorId;

    // Calculate points to reverse (same as original purchase)
    const buyerPointsToReverse = (creditTx.credits || 0) * 5;
    const contributorPointsToReverse = (creditTx.credits || 0) * 20;

    // Reverse buyer's reward points
    const buyer = this.users.get(buyerId);
    if (buyer) {
      this.users.set(buyerId, {
        ...buyer,
        rewardPoints: Math.max(0, (buyer.rewardPoints || 0) - buyerPointsToReverse),
      });
    }

    // Reverse contributor's reward points
    const contributor = this.users.get(contributorId);
    if (contributor) {
      this.users.set(contributorId, {
        ...contributor,
        rewardPoints: Math.max(0, (contributor.rewardPoints || 0) - contributorPointsToReverse),
      });
    }

    console.log(`[MEM_STORAGE_DEBUG] Reversed rewards for transaction: ${transactionId}`);
    return { reversed: true, buyerId, contributorId };
  }

  async getTopBuyers(): Promise<any[]> {
    const buyerMap = new Map<string, any>();
    for (const tx of this.creditTransactions.values()) {
      const buyer = this.users.get(tx.buyerId);
      if (!buyer) continue;
      const stats = buyerMap.get(tx.buyerId) || { id: tx.buyerId, name: buyer.name, credits: 0, amount: 0 };
      stats.credits += tx.credits;
      stats.amount += tx.amount || 0;
      buyerMap.set(tx.buyerId, stats);
    }
    return Array.from(buyerMap.values()).sort((a, b) => b.credits - a.credits);
  }

  async getTopContributors(): Promise<any[]> {
    const contributorMap = new Map<string, any>();
    for (const project of this.projects.values()) {
      const stats = contributorMap.get(project.userId) || { id: project.userId, name: (this.users.get(project.userId)?.name || 'Unknown'), projects: 0, credits: 0 };
      stats.projects += 1;
      stats.credits += project.lifetimeCO2;
      contributorMap.set(project.userId, stats);
    }
    return Array.from(contributorMap.values()).sort((a, b) => b.credits - a.credits);
  }

  async getAdminLedger(): Promise<any[]> {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async issueWarning(data: { contributorId: string; message: string; severity: string }): Promise<any> {
    const id = randomUUID();
    const warning = { ...data, id, date: new Date() };
    this.warnings.set(id, warning);
    return warning;
  }

  async getWarningsByContributorId(contributorId: string): Promise<any[]> {
    return Array.from(this.warnings.values()).filter(w => w.contributorId === contributorId);
  }

  async setMintingStatus(enabled: boolean): Promise<void> {
    this.systemSettings.mintingEnabled = enabled;
  }

  async getMintingStatus(): Promise<boolean> {
    return this.systemSettings.mintingEnabled;
  }

  async rollbackAction(data: { adminId: string; targetId: string; type: string; reason: string }): Promise<void> {
    const id = randomUUID();
    const rollback = { ...data, id, timestamp: new Date() };
    this.rollbacks.set(id, rollback);
    // Logic for actual rollback would go here (e.g. updating transaction status)
    const tx = this.transactions.get(data.targetId) || Array.from(this.transactions.values()).find(t => t.id === data.targetId || t.txId === data.targetId);
    if (tx) {
      tx.status = 'Rolled Back';
    }
  }

  // MRV System (MemStorage stubs)
  private memScores = new Map<string, MrvScore>();
  private memNdvi: NdviMeasurement[] = [];
  async getMrvScore(projectId: string): Promise<MrvScore | undefined> {
    return Array.from(this.memScores.values()).find(s => s.projectId === projectId);
  }
  async createMrvScore(scoreData: any): Promise<MrvScore> {
    const id = Date.now();
    const score: MrvScore = {
      ...scoreData,
      id,
      scoredAt: new Date(),
    };
    this.memScores.set(id.toString(), score);
    return score;
  }
  async createNdviMeasurement(data: any): Promise<NdviMeasurement> {
    const record = {
      id: Date.now(),
      projectId: data.projectId,
      ndviMean: data.ndviMean ?? data.NDVI ?? 0,
      ndviMin: data.ndviMin ?? null,
      ndviMax: data.ndviMax ?? null,
      cloudCoverPct: data.cloudCoverPct ?? null,
      satelliteSource: data.satelliteSource ?? 'Sentinel-2',
      polygon: data.polygon ?? null,
      rawGeeResponse: data.rawGeeResponse ?? null,
      measuredAt: new Date(),
      createdAt: new Date(),
    } as NdviMeasurement;
    this.memNdvi.push(record);
    return record;
  }
  async getNdviMeasurements(projectId: string): Promise<NdviMeasurement[]> {
    return this.memNdvi.filter(m => m.projectId === projectId);
  }
  async updateProjectMrvStatus(projectId: string, status: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (project) {
      project.mrvStatus = status;
    }
  }
}

// Database Storage implementation using Drizzle ORM
export class DbStorage implements IStorage {
  private db: any;
  private projectColumnsCache: Set<string> | null = null;

  constructor(database: any) {
    this.db = database;
  }

  private asDate(value: unknown): Date | null {
    if (!value) return null;
    return value instanceof Date ? value : new Date(String(value));
  }

  private asNumber(value: unknown, fallback = 0): number {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  private hydrateProject(row: any): Project {
    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      location: row.location ? String(row.location) : "PENDING_GEO_ENRICHMENT",
      area: this.asNumber(row.area, 1),
      ecosystemType: String(row.ecosystem_type ?? row.ecosystemType ?? "Other"),
      plantationType: row.plantation_type ?? row.plantationType ?? null,
      annualCO2: this.asNumber(row.annual_co2 ?? row.annualCO2, 0),
      lifetimeCO2: this.asNumber(row.lifetime_co2 ?? row.lifetimeCO2, 0),
      co2Captured: this.asNumber(row.co2_captured ?? row.co2Captured, 0),
      creditsEarned: this.asNumber(row.credits_earned ?? row.creditsEarned, 0),
      status: String(row.status ?? "pending") as any,
      userId: String(row.user_id ?? row.userId),
      proofFileUrl: row.proof_file_url ?? row.proofFileUrl ?? null,
      verifierId: row.verifier_id ?? row.verifierId ?? null,
      rejectionReason: row.rejection_reason ?? row.rejectionReason ?? null,
      clarificationNote: row.clarification_note ?? row.clarificationNote ?? null,
      submittedAt: this.asDate(row.submitted_at ?? row.submittedAt) ?? new Date(),
      landBoundary: row.land_boundary ?? row.landBoundary ?? null,
      polygon: row.polygon ?? null,
      centroid: row.centroid ?? null,
      bbox: row.bbox ?? null,
      areaHectares: row.area_hectares ?? row.areaHectares ?? null,
      perimeterKm: row.perimeter_km ?? row.perimeterKm ?? null,
      country: row.country ?? null,
      adminRegion: row.admin_region ?? row.adminRegion ?? null,
      timezone: row.timezone ?? null,
      monitoringFrequency: row.monitoring_frequency ?? row.monitoringFrequency ?? null,
      nextMonitoringDue: this.asDate(row.next_monitoring_due ?? row.nextMonitoringDue),
      baselineCompletedAt: this.asDate(row.baseline_completed_at ?? row.baselineCompletedAt),
      registryId: row.registry_id ?? row.registryId ?? null,
      archivedAt: this.asDate(row.archived_at ?? row.archivedAt),
      isListed: typeof (row.is_listed ?? row.isListed) === "boolean" ? (row.is_listed ?? row.isListed) : true,
      mrvStatus: row.mrv_status ?? row.mrvStatus ?? "NONE",
      deletedAt: this.asDate(row.deleted_at ?? row.deletedAt),
    };
  }

  private async queryProjects(whereSql: any = sql``, orderSql: any = sql``): Promise<Project[]> {
    const result = await this.db.execute(sql`
      SELECT row_to_json(project_row) AS project
      FROM (
        SELECT *
        FROM public.projects
        ${whereSql}
        ${orderSql}
      ) AS project_row
    `);

    return (result?.rows ?? []).map((row: any) => this.hydrateProject(row.project));
  }

  private async getProjectColumnNames(): Promise<Set<string>> {
    if (this.projectColumnsCache) {
      return this.projectColumnsCache;
    }

    const result = await this.db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'projects'
    `);

    this.projectColumnsCache = new Set(
      (result?.rows ?? []).map((row: any) => String(row.column_name)),
    );

    return this.projectColumnsCache;
  }

  private buildProjectInsertValues(
    insertProject: InsertProjectWithCarbon,
    id: string,
    submittedAt: Date,
    availableColumns: Set<string>,
    ultraMinimalMode: boolean,
  ): Record<string, unknown> {
    const columnMap: Array<[keyof Project | string, string, unknown]> = [
      ["id", "id", id],
      ["name", "name", insertProject.name],
      ["description", "description", insertProject.description],
      ["location", "location", insertProject.location],
      ["area", "area", insertProject.area],
      ["ecosystemType", "ecosystem_type", insertProject.ecosystemType],
      ["annualCO2", "annual_co2", insertProject.annualCO2],
      ["lifetimeCO2", "lifetime_co2", insertProject.lifetimeCO2],
      ["co2Captured", "co2_captured", insertProject.co2Captured],
      ["status", "status", "pending"],
      ["userId", "user_id", insertProject.userId],
      ["submittedAt", "submitted_at", submittedAt],
      ["landBoundary", "land_boundary", insertProject.landBoundary ?? null],
      ["proofFileUrl", "proof_file_url", insertProject.proofFileUrl || null],
      ["monitoringFrequency", "monitoring_frequency", insertProject.monitoringFrequency ?? null],
      ["mrvStatus", "mrv_status", (insertProject as any).mrvStatus ?? "NONE"],
    ];

    const requiredDbColumns = [
      "id",
      "name",
      "description",
      "location",
      "area",
      "ecosystem_type",
      "annual_co2",
      "lifetime_co2",
      "co2_captured",
      "status",
      "user_id",
      "submitted_at",
    ];

    const missingRequiredColumns = requiredDbColumns.filter((columnName) => !availableColumns.has(columnName));
    if (missingRequiredColumns.length > 0) {
      throw new Error(
        `Projects table is missing required columns for submit: ${missingRequiredColumns.join(", ")}`,
      );
    }

    const values: Record<string, unknown> = {};

    for (const [propertyKey, dbColumnName, value] of columnMap) {
      if (!availableColumns.has(dbColumnName)) {
        continue;
      }

      if (ultraMinimalMode && (dbColumnName === "monitoring_frequency" || dbColumnName === "mrv_status" || dbColumnName === "proof_file_url")) {
        continue;
      }

      values[String(propertyKey)] = value;
    }

    return values;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(insertUser.password, 12);
    const [user] = await this.db
      .insert(users)
      .values({
        ...insertUser,
        id,
        password: hashedPassword,
        role: (insertUser.role as any) || 'contributor',
        username: null,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.role, role as any));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.queryProjects(sql`WHERE id = ${id}`);
    return project;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await this.queryProjects(
      sql`WHERE user_id = ${userId}`,
      sql`ORDER BY submitted_at DESC`,
    );
  }

  async getProjectsByStatus(status: string): Promise<Project[]> {
    return await this.queryProjects(
      sql`WHERE status = ${status}`,
      sql`ORDER BY submitted_at DESC`,
    );
  }

  async getProjectsByVerifierId(verifierId: string): Promise<Project[]> {
    return await this.queryProjects(
      sql`WHERE verifier_id = ${verifierId}`,
      sql`ORDER BY submitted_at DESC`,
    );
  }

  async getVerifiedProjectsByVerifierId(verifierId: string): Promise<Project[]> {
    return await this.queryProjects(
      sql`WHERE verifier_id = ${verifierId} AND status IN ('verified', 'rejected', 'needs_clarification')`,
      sql`ORDER BY submitted_at DESC`,
    );
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.queryProjects(sql``, sql`ORDER BY submitted_at DESC`);
  }

  async createProject(insertProject: InsertProjectWithCarbon): Promise<Project> {
    const startedAt = Date.now();
    console.log("[Storage:DB] createProject started", {
      userId: insertProject.userId,
      name: insertProject.name,
      hasBoundary: Boolean(insertProject.landBoundary),
      boundaryBytes: typeof insertProject.landBoundary === "string" ? insertProject.landBoundary.length : 0,
      hasProofFileUrl: Boolean(insertProject.proofFileUrl),
    });
    const id = randomUUID();
    const submittedAt = new Date();
    const availableColumns = await this.getProjectColumnNames();
    const ultraMinimalMode = true;
    const values = this.buildProjectInsertValues(
      insertProject,
      id,
      submittedAt,
      availableColumns,
      ultraMinimalMode,
    );

    console.log("[Storage:DB] createProject insert plan", {
      availableColumns: Array.from(availableColumns).sort(),
      insertKeys: Object.keys(values),
      ultraMinimalMode,
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const insertPromise = this.db.insert(projects).values(values);
    try {
      await Promise.race([
        insertPromise,
        new Promise<any[]>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("DB insert timeout at projects.insert(). Possible lock/slow query."));
          }, 10_000);
        }),
      ]);
    } catch (error: any) {
      console.error("[Storage:DB] createProject failed", {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        hint: error?.hint,
        table: error?.table,
        column: error?.column,
        constraint: error?.constraint,
        insertKeys: Object.keys(values),
        dbMs: Date.now() - startedAt,
      });
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
    const project = this.hydrateProject({
      id,
      name: insertProject.name,
      description: insertProject.description,
      location: insertProject.location,
      area: insertProject.area,
      ecosystem_type: insertProject.ecosystemType,
      annual_co2: insertProject.annualCO2,
      lifetime_co2: insertProject.lifetimeCO2,
      co2_captured: insertProject.co2Captured,
      credits_earned: 0,
      status: "pending",
      user_id: insertProject.userId,
      proof_file_url: insertProject.proofFileUrl || null,
      verifier_id: null,
      rejection_reason: null,
      clarification_note: null,
      submitted_at: submittedAt,
      land_boundary: insertProject.landBoundary ?? null,
      monitoring_frequency: null,
      mrv_status: ultraMinimalMode ? "NONE" : ((insertProject as any).mrvStatus ?? "NONE"),
      is_listed: true,
    });
    console.log("[Storage:DB] createProject completed", {
      projectId: project.id,
      status: project.status,
      dbMs: Date.now() - startedAt,
    });
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await this.db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  // MRV System (DbStorage)
  async getMrvScore(projectId: string): Promise<MrvScore | undefined> {
    const [score] = await this.db
      .select()
      .from(mrvScores)
      .where(eq(mrvScores.projectId, projectId))
      .orderBy(desc(mrvScores.scoredAt))
      .limit(1);
    return score || undefined;
  }

  async createMrvScore(scoreData: any): Promise<MrvScore> {
    const [score] = await this.db
      .insert(mrvScores)
      .values({ ...scoreData })
      .returning();
    return score;
  }

  async createNdviMeasurement(data: any): Promise<NdviMeasurement> {
    const [record] = await this.db
      .insert(ndviMeasurements)
      .values({
        id: Date.now(),
        projectId: data.projectId,
        ndviMean: data.ndviMean,
        ndviMin: data.ndviMin ?? null,
        ndviMax: data.ndviMax ?? null,
        cloudCoverPct: data.cloudCoverPct ?? null,
        satelliteSource: data.satelliteSource ?? 'Sentinel-2',
        polygon: data.polygon ?? null,
        rawGeeResponse: data.rawGeeResponse ?? null,
      })
      .returning();
    return record;
  }

  async getNdviMeasurements(projectId: string): Promise<NdviMeasurement[]> {
    return await this.db
      .select()
      .from(ndviMeasurements)
      .where(eq(ndviMeasurements.projectId, projectId))
      .orderBy(ndviMeasurements.measuredAt);
  }

  async updateProjectMrvStatus(projectId: string, status: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ mrvStatus: status })
      .where(eq(projects.id, projectId));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await this.db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionByTxId(txId: string): Promise<Transaction | undefined> {
    const [transaction] = await this.db.select().from(transactions).where(eq(transactions.txId, txId));
    return transaction || undefined;
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return await this.db.select().from(transactions).where(eq(transactions.to, userId));
  }

  async getTransactionsByBlockId(blockId: string): Promise<Transaction[]> {
    return await this.db.select().from(transactions).where(eq(transactions.blockId, blockId));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await this.db.select().from(transactions);
  }

  async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const id = randomUUID();
    const [tx] = await this.db
      .insert(transactions)
      .values({ ...transaction, id })
      .returning();
    return tx;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [updated] = await this.db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updated || undefined;
  }

  async getBlock(id: string): Promise<Block | undefined> {
    const [block] = await this.db.select().from(blocks).where(eq(blocks.id, id));
    return block || undefined;
  }

  async getBlockByHash(blockHash: string): Promise<Block | undefined> {
    const [block] = await this.db.select().from(blocks).where(eq(blocks.blockHash, blockHash));
    return block || undefined;
  }

  async getBlockByIndex(index: number): Promise<Block | undefined> {
    const [block] = await this.db.select().from(blocks).where(eq(blocks.index, index));
    return block || undefined;
  }

  async getAllBlocks(): Promise<Block[]> {
    return await this.db.select().from(blocks).orderBy(blocks.index);
  }

  async getLastBlock(): Promise<Block | undefined> {
    const [block] = await this.db.select().from(blocks).orderBy(desc(blocks.index)).limit(1);
    return block || undefined;
  }

  async createBlock(block: Omit<Block, 'id'>): Promise<Block> {
    const id = randomUUID();
    const [newBlock] = await this.db
      .insert(blocks)
      .values({ ...block, id })
      .returning();
    return newBlock;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getCreditTransaction(id: string): Promise<CreditTransaction | undefined> {
    const [tx] = await this.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.id, id));
    return tx || undefined;
  }

  async getAllCreditTransactions(): Promise<CreditTransaction[]> {
    return await this.db
      .select()
      .from(creditTransactions)
      .orderBy(desc(creditTransactions.timestamp));
  }

  async getCreditTransactionsByBuyerId(buyerId: string): Promise<CreditTransaction[]> {
    return await this.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.buyerId, buyerId))
      .orderBy(desc(creditTransactions.timestamp));
  }

  async getCreditTransactionsByContributorId(contributorId: string): Promise<CreditTransaction[]> {
    return await this.db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.contributorId, contributorId))
      .orderBy(desc(creditTransactions.timestamp));
  }

  async createCreditTransaction(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction> {
    const id = randomUUID();
    const [tx] = await this.db
      .insert(creditTransactions)
      .values({ ...transaction, id, certificateStatus: transaction.certificateStatus || 'valid' })
      .returning();
    return tx;
  }

  async updateCreditTransaction(id: string, updates: Partial<CreditTransaction>): Promise<CreditTransaction | undefined> {
    const [tx] = await this.db
      .update(creditTransactions)
      .set(updates)
      .where(eq(creditTransactions.id, id))
      .returning();
    return tx;
  }

  async purchaseCredits(
    buyerId: string,
    contributorId: string,
    projectId: string,
    credits: number,
    amount: number,
    idempotencyKey?: string
  ): Promise<{ buyer: User; contributor: User; project: Project; transaction: CreditTransaction }> {
    // Get buyer, contributor, and project (validation only - not in transaction)
    const [buyer] = await this.db.select().from(users).where(eq(users.id, buyerId));
    const [contributor] = await this.db.select().from(users).where(eq(users.id, contributorId));
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));

    if (!buyer || buyer.role !== 'buyer') {
      throw new Error('Invalid buyer');
    }
    if (!contributor || contributor.role !== 'contributor') {
      throw new Error('Invalid contributor');
    }
    if (!project) {
      throw new Error('Project not found');
    }
    if (project.userId !== contributorId) {
      throw new Error('Project does not belong to this contributor');
    }
    if (project.status !== 'verified') {
      throw new Error('Project must be verified to purchase credits');
    }
    if (credits <= 0) {
      throw new Error('Credits must be positive');
    }

    // PART 3 & 4: Wrap ALL database mutations in a transaction for atomicity
    // Credit validation and deduction happen INSIDE the transaction with row-level locking
    const result = await this.db.transaction(async (tx: any) => {
      // Fetch project with FOR UPDATE to lock the row (prevents race conditions)
      const [lockedProject] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .forUpdate();

      // PART 4: Validate credit availability INSIDE transaction
      if (!lockedProject || (lockedProject.creditsEarned || 0) < credits) {
        throw new Error('Insufficient credits available');
      }

      // Attempt to insert transaction record first (for atomic idempotency)
      const transactionId = randomUUID();

      try {
        const [createdTransaction] = await tx
          .insert(creditTransactions)
          .values({
            id: transactionId,
            idempotencyKey: idempotencyKey || null,
            buyerId,
            contributorId,
            projectId,
            credits,
            amount: amount || 0,
            timestamp: new Date(),
          })
          .returning();

        // Add to ledger
        await tx
          .insert(transactions)
          .values({
            id: randomUUID(),
            txId: `TX-${Date.now()}`,
            from: buyerId,
            to: contributorId,
            credits,
            projectId,
            timestamp: new Date(),
            proofHash: 'N/A',
            type: 'Buy',
            buyerId,
            contributorId,
            status: 'Completed'
          });

        // PART 4: Safe credit deduction inside transaction (uses locked row value)
        const [updatedProject] = await tx
          .update(projects)
          .set({ creditsEarned: (lockedProject.creditsEarned || 0) - credits })
          .where(eq(projects.id, projectId))
          .returning();

        // Update buyer credits and reward points (5 BP/credit)
        const [updatedBuyer] = await tx
          .update(users)
          .set({
            creditsPurchased: sql`COALESCE(${users.creditsPurchased}, 0) + ${credits}`,
            rewardPoints: sql`COALESCE(${users.rewardPoints}, 0) + ${credits * 5}`
          })
          .where(eq(users.id, buyerId))
          .returning();

        // Update contributor reward points (20 BP/credit)
        const [updatedContributor] = await tx
          .update(users)
          .set({
            rewardPoints: sql`COALESCE(${users.rewardPoints}, 0) + ${credits * 20}`
          })
          .where(eq(users.id, contributorId))
          .returning();

        // Insert reward transaction record for buyer (5 BP)
        const buyerPoints = credits * 5;
        await tx
          .insert(rewardTransactions)
          .values({
            id: randomUUID(),
            userId: buyerId,
            points: buyerPoints,
            type: "EARNED",
            role: "BUYER",
            sourceTransactionId: createdTransaction.id,
            createdAt: new Date(),
          });

        // Insert reward transaction record for contributor (20 BP)
        const contributorPoints = credits * 20;
        await tx
          .insert(rewardTransactions)
          .values({
            id: randomUUID(),
            userId: contributorId,
            points: contributorPoints,
            type: "EARNED",
            role: "CONTRIBUTOR",
            sourceTransactionId: createdTransaction.id,
            createdAt: new Date(),
          });

        return {
          buyer: updatedBuyer,
          contributor: updatedContributor,
          project: updatedProject,
          transaction: createdTransaction,
        };
      } catch (error: any) {
        // Check if error is due to unique constraint violation on idempotencyKey
        if (idempotencyKey && error?.code === '23505') {
          // Unique constraint violation - fetch existing transaction
          const [existingTx] = await tx
            .select()
            .from(creditTransactions)
            .where(eq(creditTransactions.idempotencyKey, idempotencyKey));

          if (existingTx) {
            console.log(`[DB_STORAGE_DEBUG] Duplicate request detected for idempotencyKey: ${idempotencyKey}. Returning existing transaction.`);
            return {
              buyer,
              contributor,
              project,
              transaction: existingTx,
            };
          }
        }
        // Re-throw if not an idempotency-related error
        throw error;
      }
    });

    console.log(`[DB_STORAGE_DEBUG] Updated rewardPoints: Buyer=${result.buyer.rewardPoints}, Contributor=${result.contributor.rewardPoints}`);

    return result;
  }

  // Reverse rewards for a credit transaction (internal method)
  async reverseRewardsForTransaction(transactionId: string): Promise<{ reversed: boolean; buyerId: string; contributorId: string }> {
    // Find reward transactions linked to this credit transaction
    const rewardTxns = await this.db
      .select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.sourceTransactionId, transactionId));

    if (rewardTxns.length === 0) {
      return { reversed: false, buyerId: '', contributorId: '' };
    }

    // PART 2: Check if already reversed (double reversal prevention)
    const alreadyReversed = rewardTxns.some((r: any) => r.type === 'REVERSAL');
    if (alreadyReversed) {
      console.log(`[DB_STORAGE_DEBUG] Transaction ${transactionId} already reversed. Skipping.`);
      return { reversed: false, buyerId: '', contributorId: '' };
    }

    // Get buyer and contributor IDs
    const buyerReward = rewardTxns.find((r: any) => r.role === 'BUYER');
    const contributorReward = rewardTxns.find((r: any) => r.role === 'CONTRIBUTOR');

    if (!buyerReward || !contributorReward) {
      return { reversed: false, buyerId: '', contributorId: '' };
    }

    const buyerId = buyerReward.userId;
    const contributorId = contributorReward.userId;

    // Reverse all rewards in a transaction
    await this.db.transaction(async (tx: any) => {
      // Reverse buyer's reward points
      await tx
        .insert(rewardTransactions)
        .values({
          id: randomUUID(),
          userId: buyerId,
          points: -buyerReward.points,
          type: "REVERSAL",
          role: "BUYER",
          sourceTransactionId: transactionId,
          createdAt: new Date(),
        });

      await tx
        .update(users)
        .set({
          rewardPoints: sql`COALESCE(${users.rewardPoints}, 0) - ${buyerReward.points}`
        })
        .where(eq(users.id, buyerId));

      // Reverse contributor's reward points
      await tx
        .insert(rewardTransactions)
        .values({
          id: randomUUID(),
          userId: contributorId,
          points: -contributorReward.points,
          type: "REVERSAL",
          role: "CONTRIBUTOR",
          sourceTransactionId: transactionId,
          createdAt: new Date(),
        });

      await tx
        .update(users)
        .set({
          rewardPoints: sql`COALESCE(${users.rewardPoints}, 0) - ${contributorReward.points}`
        })
        .where(eq(users.id, contributorId));
    });

    console.log(`[DB_STORAGE_DEBUG] Reversed rewards for transaction: ${transactionId}`);
    return { reversed: true, buyerId, contributorId };
  }

  async getTopBuyers(): Promise<any[]> {
    const results = await this.db
      .select({
        id: creditTransactions.buyerId,
        name: users.name,
        credits: sql<number>`sum(${creditTransactions.credits})`,
        amount: sql<number>`sum(${creditTransactions.amount})`,
      })
      .from(creditTransactions)
      .innerJoin(users, eq(creditTransactions.buyerId, users.id))
      .groupBy(creditTransactions.buyerId, users.name)
      .orderBy(desc(sql`sum(${creditTransactions.credits})`));
    return results;
  }

  async getTopContributors(): Promise<any[]> {
    const results = await this.db
      .select({
        id: projects.userId,
        name: users.name,
        projectsCount: sql<number>`count(${projects.id})`,
        credits: sql<number>`sum(${projects.lifetimeCO2})`,
      })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .groupBy(projects.userId, users.name)
      .orderBy(desc(sql`sum(${projects.lifetimeCO2})`));
    return results;
  }

  async getAdminLedger(): Promise<any[]> {
    const results = await this.db
      .select({
        id: transactions.id,
        txId: transactions.txId,
        timestamp: transactions.timestamp,
        type: transactions.type,
        credits: transactions.credits,
        status: transactions.status,
        projectName: projects.name,
        contributorName: users.name,
        buyerId: transactions.buyerId,
      })
      .from(transactions)
      .leftJoin(projects, eq(transactions.projectId, projects.id))
      .leftJoin(users, eq(transactions.contributorId, users.id))
      .orderBy(desc(transactions.timestamp));

    // Fetch buyer names separately to avoid complex self-joins or multiple joins if needed,
    // but a simple map works too.
    const buyerIds = results.map((r: any) => r.buyerId).filter(Boolean);
    let buyerUsers: any[] = [];
    if (buyerIds.length > 0) {
      // Use a safe IN clause with proper array handling
      buyerUsers = await this.db
        .select()
        .from(users)
        .where(sql`${users.id} IN (${sql.join(buyerIds, sql`, `)})`);
    }
    const buyerMap = new Map(buyerUsers.map((u: any) => [u.id, u.name]));

    return results.map((r: any) => ({
      ...r,
      buyerName: buyerMap.get(r.buyerId) || '—'
    }));
  }

  async issueWarning(data: { contributorId: string; message: string; severity: string }): Promise<any> {
    const { warnings: warningsTable } = await import("@shared/schema");
    const id = randomUUID();
    const [warning] = await this.db
      .insert(warningsTable)
      .values({ ...data, id, date: new Date() })
      .returning();
    return warning;
  }

  async getWarningsByContributorId(contributorId: string): Promise<any[]> {
    const { warnings: warningsTable } = await import("@shared/schema");
    return await this.db.select().from(warningsTable).where(eq(warningsTable.contributorId, contributorId));
  }

  async setMintingStatus(enabled: boolean): Promise<void> {
    const { systemSettings: settingsTable } = await import("@shared/schema");
    const [existing] = await this.db.select().from(settingsTable).where(eq(settingsTable.id, 'global'));
    if (existing) {
      await this.db.update(settingsTable).set({ mintingEnabled: enabled }).where(eq(settingsTable.id, 'global'));
    } else {
      await this.db.insert(settingsTable).values({ id: 'global', mintingEnabled: enabled });
    }
  }

  async getMintingStatus(): Promise<boolean> {
    const { systemSettings: settingsTable } = await import("@shared/schema");
    const [settings] = await this.db.select().from(settingsTable).where(eq(settingsTable.id, 'global'));
    return settings ? settings.mintingEnabled : true;
  }

  async rollbackAction(data: { adminId: string; targetId: string; type: string; reason: string }): Promise<void> {
    const { rollbacks: rollbacksTable, transactions: transactionsTable } = await import("@shared/schema");
    const id = randomUUID();
    await this.db.insert(rollbacksTable).values({ ...data, id, timestamp: new Date() });

    await this.db
      .update(transactionsTable)
      .set({ status: 'Rolled Back' })
      .where(sql`${transactionsTable.id} = ${data.targetId} OR ${transactionsTable.txId} = ${data.targetId}`);
  }
}

// Storage switcher - use environment variable to choose storage type
async function createStorage(): Promise<IStorage> {
  const useDatabase = process.env.USE_DATABASE === 'true';
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

  if (useDatabase) {
    if (!hasDatabaseUrl) {
      console.warn('⚠️ USE_DATABASE=true but DATABASE_URL is missing. Falling back to in-memory storage.');
      console.log('✅ Using in-memory storage');
      return new MemStorage();
    }

    try {
      // Dynamically import db so memory mode never initializes a database client.
      const { getDb, getDatabaseModeSummary, getPool } = await import('./db');
      const db = getDb();

      // Force a lightweight connectivity check so dev boot fails cleanly into memory mode.
      await getPool().query('select 1');

      console.log('✅ Using PostgreSQL database storage', getDatabaseModeSummary());
      return new DbStorage(db);
    } catch (error: any) {
      console.error('❌ Database connection failed, falling back to in-memory storage');
      console.error({
        message: error?.message,
        code: error?.code,
        name: error?.name,
      });
      console.error(error);
      console.log('✅ Using in-memory storage');
      return new MemStorage();
    }
  }

  console.log('✅ Using in-memory storage');
  return new MemStorage();
}

export const storage = await createStorage();
