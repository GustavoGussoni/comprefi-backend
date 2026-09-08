import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';

export class User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;

  constructor() {
    this.id = randomUUID();
    this.role = UserRole.SALES;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

