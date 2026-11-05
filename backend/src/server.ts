import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, mkdirSync, unlinkSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { z } from 'zod';
import { Prisma, UserRole, OfferStatus, RequestStatus, UsageStatus, LedgerType } from '@prisma/client';
import { prisma } from './prisma.js';
import { allowRoles, requireApplicationKey, requireAuth } from './middleware.js';
import type { AuthedRequest } from './types.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);
const uploadDir = resolve(process.env.UPLOAD_DIR ?? './uploads');
mkdirSync(uploadDir, { recursive: true });
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.mimetype)) return callback(new Error('For this pilot, upload a JPEG, PNG, or WebP image.'));
    callback(null, true);
  },
});

const wrap = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(handler(req, res)).catch(next);
};
const authUser = (req: Request) => (req as AuthedRequest).user!;
const publicUser = (u: { id: string; name: string; email: string; role: UserRole }) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unexpected server error.';

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'tracecart-api' }));

app.post('/api/auth/register', wrap(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), password: z.string().min(10).max(100), role: z.enum(['CREATOR', 'LICENSEE']) }).parse(req.body);
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await prisma.user.create({ data: { name: input.name, email, passwordHash, role: input.role } });
    const token = jwt.sign({ name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET!, { subject: user.id, expiresIn: '12h' });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json({ error: 'An account with that email already exists.' });
    throw error;
  }
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const input = z.object({ email: z.email(), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = jwt.sign({ name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET!, { subject: user.id, expiresIn: '12h' });
  res.json({ token, user: publicUser(user) });
}));

app.get('/api/me', requireAuth, (req, res) => res.json({ user: authUser(req) }));

app.get('/api/assets', requireAuth, wrap(async (req, res) => {
  const user = authUser(req);
  const assets = await prisma.asset.findMany({ where: user.role === UserRole.CREATOR ? { creatorId: user.id } : { status: 'ACTIVE', offers: { some: { status: OfferStatus.PUBLISHED } } }, include: { creator: { select: { id: true, name: true } }, offers: { where: { status: OfferStatus.PUBLISHED }, select: { id: true, version: true, usageType: true, perUseFee: true, currency: true } } }, orderBy: { createdAt: 'desc' } });
  res.json({ assets });
}));

app.post('/api/assets', requireAuth, allowRoles(UserRole.CREATOR), upload.single('file'), wrap(async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Choose an image file to upload.' });
  try {
    const input = z.object({ title: z.string().trim().min(2).max(120), description: z.string().max(1000).optional().default('') }).parse(req.body);
    const hash = createHash('sha256');
    await new Promise<void>((resolveRead, reject) => createReadStream(file.path).on('data', chunk => hash.update(chunk)).on('end', resolveRead).on('error', reject));
    const asset = await prisma.asset.create({ data: { creatorId: authUser(req).id, title: input.title, description: input.description, mimeType: file.mimetype, fileName: basename(file.originalname).slice(0, 255), storageKey: file.filename, sizeBytes: file.size, sha256: hash.digest('hex') } });
    res.status(201).json({ asset });
  } catch (error) {
    try { unlinkSync(file.path); } catch { /* no-op */ }
    throw error;
  }
}));

app.patch('/api/assets/:id/archive', requireAuth, allowRoles(UserRole.CREATOR), wrap(async (req, res) => {
  const asset = await prisma.asset.findFirst({ where: { id: String(req.params.id), creatorId: authUser(req).id } });
  if (!asset) return res.status(404).json({ error: 'Asset not found.' });
  const active = await prisma.licenseRequest.count({ where: { offer: { assetId: asset.id }, status: RequestStatus.APPROVED } });
  if (active) return res.status(409).json({ error: 'This asset has active licences. Revoke them before archiving.' });
  res.json({ asset: await prisma.asset.update({ where: { id: asset.id }, data: { status: 'ARCHIVED' } }) });
}));

app.get('/api/offers', requireAuth, wrap(async (req, res) => {
  const user = authUser(req);
  const offers = await prisma.licenseOffer.findMany({ where: user.role === UserRole.CREATOR ? { creatorId: user.id } : { status: OfferStatus.PUBLISHED }, include: { asset: { select: { id: true, title: true, mimeType: true, sha256: true, creator: { select: { name: true } } } }, creator: { select: { id: true, name: true } }, requests: user.role === UserRole.CREATOR ? { select: { id: true, status: true, intendedUse: true, campaignRef: true, createdAt: true, licensee: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } } : false }, orderBy: { createdAt: 'desc' } });
  res.json({ offers });
}));

app.post('/api/offers', requireAuth, allowRoles(UserRole.CREATOR), wrap(async (req, res) => {
  const input = z.object({ assetId: z.string().min(1), usageType: z.string().trim().min(2).max(80), terms: z.string().trim().min(8).max(2000), perUseFee: z.coerce.number().positive().max(1000000), currency: z.string().regex(/^[A-Z]{3}$/).default('USD') }).parse(req.body);
  const asset = await prisma.asset.findFirst({ where: { id: input.assetId, creatorId: authUser(req).id, status: 'ACTIVE' } });
  if (!asset) return res.status(404).json({ error: 'Active asset not found in your account.' });
  const prior = await prisma.licenseOffer.findFirst({ where: { assetId: asset.id }, orderBy: { version: 'desc' } });
  const offer = await prisma.licenseOffer.create({ data: { ...input, perUseFee: new Prisma.Decimal(input.perUseFee.toFixed(2)), creatorId: authUser(req).id, version: (prior?.version ?? 0) + 1, status: OfferStatus.PUBLISHED } });
  await prisma.auditRecord.create({ data: { actorId: authUser(req).id, action: 'OFFER_PUBLISHED', entityType: 'LicenseOffer', entityId: offer.id, detail: { version: offer.version } } });
  res.status(201).json({ offer });
}));

app.post('/api/offers/:id/requests', requireAuth, allowRoles(UserRole.LICENSEE), wrap(async (req, res) => {
  const input = z.object({ intendedUse: z.string().trim().min(8).max(1000), campaignRef: z.string().max(120).optional().default(''), applicationId: z.string().min(1) }).parse(req.body);
  const offer = await prisma.licenseOffer.findFirst({ where: { id: String(req.params.id), status: OfferStatus.PUBLISHED, asset: { status: 'ACTIVE' } }, include: { asset: true } });
  if (!offer) return res.status(404).json({ error: 'Published offer not found.' });
  const application = await prisma.application.findFirst({ where: { id: input.applicationId, ownerId: authUser(req).id, revokedAt: null } });
  if (!application) return res.status(404).json({ error: 'Register an active application before requesting a licence.' });
  const request = await prisma.licenseRequest.create({ data: { offerId: offer.id, licenseeId: authUser(req).id, applicationId: application.id, intendedUse: input.intendedUse, campaignRef: input.campaignRef } });
  res.status(201).json({ request });
}));

app.post('/api/requests/:id/decision', requireAuth, allowRoles(UserRole.CREATOR), wrap(async (req, res) => {
  const input = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
  const licenseRequest = await prisma.licenseRequest.findFirst({ where: { id: String(req.params.id), offer: { creatorId: authUser(req).id } }, include: { offer: true } });
  if (!licenseRequest) return res.status(404).json({ error: 'Licence request not found.' });
  if (licenseRequest.status !== RequestStatus.PENDING) return res.status(409).json({ error: 'This request has already been decided.' });
  const updated = await prisma.licenseRequest.update({ where: { id: licenseRequest.id }, data: { status: input.decision, decidedAt: new Date() } });
  await prisma.auditRecord.create({ data: { actorId: authUser(req).id, action: `REQUEST_${input.decision}`, entityType: 'LicenseRequest', entityId: updated.id, detail: { offerId: licenseRequest.offerId, version: licenseRequest.offer.version } } });
  res.json({ request: updated });
}));

app.get('/api/requests', requireAuth, wrap(async (req, res) => {
  const user = authUser(req);
  const requests = await prisma.licenseRequest.findMany({ where: user.role === UserRole.CREATOR ? { offer: { creatorId: user.id } } : { licenseeId: user.id }, include: { offer: { include: { asset: { select: { id: true, title: true, sha256: true } }, creator: { select: { id: true, name: true } } } }, licensee: { select: { id: true, name: true, email: true } }, application: { select: { id: true, name: true } }, events: { include: { ledgerEntry: true }, orderBy: { reportedAt: 'desc' } } }, orderBy: { createdAt: 'desc' } });
  res.json({ requests });
}));

app.get('/api/applications', requireAuth, allowRoles(UserRole.LICENSEE), wrap(async (req, res) => {
  const applications = await prisma.application.findMany({ where: { ownerId: authUser(req).id }, select: { id: true, name: true, keyPrefix: true, revokedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  res.json({ applications });
}));

app.post('/api/applications', requireAuth, allowRoles(UserRole.LICENSEE), wrap(async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(100) }).parse(req.body);
  const apiKey = `tc_app_${randomBytes(32).toString('base64url')}`;
  const keyHash = createHash('sha256').update(apiKey).digest('hex');
  const application = await prisma.application.create({ data: { ownerId: authUser(req).id, name, keyHash, keyPrefix: apiKey.slice(0, 16) } });
  await prisma.auditRecord.create({ data: { actorId: authUser(req).id, action: 'APPLICATION_CREATED', entityType: 'Application', entityId: application.id, detail: { name } } });
  res.status(201).json({ application: { id: application.id, name: application.name, keyPrefix: application.keyPrefix }, apiKey });
}));

app.post('/api/applications/:id/revoke', requireAuth, allowRoles(UserRole.LICENSEE), wrap(async (req, res) => {
  const result = await prisma.application.updateMany({ where: { id: String(req.params.id), ownerId: authUser(req).id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) return res.status(404).json({ error: 'Active application not found.' });
  res.json({ ok: true });
}));

const usageSchema = z.object({ eventId: z.string().trim().min(4).max(160), requestId: z.string().min(1), assetId: z.string().min(1), usageType: z.string().trim().min(2).max(80), campaignRef: z.string().max(120).optional().default(''), occurredAt: z.iso.datetime().optional() });
app.post('/api/v1/usage-events', requireApplicationKey, wrap(async (req, res) => {
  const input = usageSchema.parse(req.body);
  const application = res.locals.application as { id: string; ownerId: string };
  const existing = await prisma.usageEvent.findUnique({ where: { applicationId_externalEventId: { applicationId: application.id, externalEventId: input.eventId } }, include: { ledgerEntry: true } });
  if (existing) return res.status(200).json({ event: existing, duplicate: true });
  const licenseRequest = await prisma.licenseRequest.findFirst({ where: { id: input.requestId, applicationId: application.id, status: RequestStatus.APPROVED, offer: { assetId: input.assetId, status: OfferStatus.PUBLISHED, asset: { status: 'ACTIVE' } } }, include: { offer: { include: { asset: true } } } });
  if (!licenseRequest) return res.status(422).json({ error: 'No active approved licence authorizes this application, asset, and usage.' });
  if (licenseRequest.offer.usageType !== input.usageType) return res.status(422).json({ error: 'Reported usage type is outside the accepted licence.' });
  try {
    const event = await prisma.$transaction(async tx => {
      const created = await tx.usageEvent.create({ data: { externalEventId: input.eventId, applicationId: application.id, requestId: licenseRequest.id, assetId: input.assetId, usageType: input.usageType, campaignRef: input.campaignRef, reportedAt: input.occurredAt ? new Date(input.occurredAt) : new Date(), status: UsageStatus.ACCEPTED, royaltyAmount: licenseRequest.offer.perUseFee, currency: licenseRequest.offer.currency } });
      const ledgerEntry = await tx.ledgerEntry.create({ data: { idempotencyKey: `usage:${created.id}`, userId: licenseRequest.offer.creatorId, usageEventId: created.id, type: LedgerType.ROYALTY_CREDIT, amount: licenseRequest.offer.perUseFee, currency: licenseRequest.offer.currency, description: `Per-use royalty for ${licenseRequest.offer.asset.title}` } });
      await tx.auditRecord.create({ data: { actorId: `application:${application.id}`, action: 'USAGE_REPORTED_AND_CREDITED', entityType: 'UsageEvent', entityId: created.id, detail: { eventId: input.eventId, requestId: licenseRequest.id, ledgerEntryId: ledgerEntry.id } } });
      return { ...created, ledgerEntry };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.status(201).json({ event, duplicate: false });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const duplicate = await prisma.usageEvent.findUnique({ where: { applicationId_externalEventId: { applicationId: application.id, externalEventId: input.eventId } }, include: { ledgerEntry: true } });
      if (duplicate) return res.status(200).json({ event: duplicate, duplicate: true });
    }
    throw error;
  }
}));

app.get('/api/usage-events', requireAuth, wrap(async (req, res) => {
  const user = authUser(req);
  const events = await prisma.usageEvent.findMany({ where: user.role === UserRole.CREATOR ? { asset: { creatorId: user.id } } : { request: { licenseeId: user.id } }, include: { asset: { select: { id: true, title: true } }, application: { select: { id: true, name: true } }, request: { select: { id: true, campaignRef: true, offer: { select: { version: true, perUseFee: true, currency: true } } } }, ledgerEntry: true }, orderBy: { reportedAt: 'desc' } });
  res.json({ events });
}));

app.get('/api/ledger', requireAuth, wrap(async (req, res) => {
  const entries = await prisma.ledgerEntry.findMany({ where: { userId: authUser(req).id }, include: { usageEvent: { include: { asset: { select: { title: true } }, application: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } });
  const totals = new Map<string, Prisma.Decimal>();
  for (const entry of entries) totals.set(entry.currency, (totals.get(entry.currency) ?? new Prisma.Decimal(0)).plus(entry.amount));
  res.json({ entries, balances: Array.from(totals.entries()).map(([currency, amount]) => ({ currency, amount: amount.toFixed(2) })) });
}));

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Check the highlighted information and try again.', details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
  if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? `Image exceeds the ${process.env.MAX_UPLOAD_MB ?? 20} MB upload limit.` : 'Upload could not be processed.' });
  if (error instanceof Error && error.message.startsWith('For this pilot, upload')) return res.status(400).json({ error: error.message });
  const message = errorMessage(error);
  console.error(error);
  res.status(500).json({ error: 'The request could not be completed.', detail: process.env.NODE_ENV === 'development' ? message : undefined });
});

app.listen(port, () => console.log(`TraceCart API listening on http://localhost:${port}`));

