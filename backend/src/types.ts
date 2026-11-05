import type { Request } from 'express';
import type { UserRole } from '@prisma/client';

export type AuthUser = { id: string; name: string; email: string; role: UserRole };
export type AuthedRequest = Request & { user?: AuthUser };

