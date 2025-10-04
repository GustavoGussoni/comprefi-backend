import { randomUUID } from "node:crypto";

export class Product {
  id: string;
  model: string;
  storage: string;
  color: string;
  battery: string;
  originalPrice: string;
  installmentPrice: string;
  pixPrice: string;
  details: string;
  image?: string;
  realImages: string[];
  category: string;
  specs: string;
  cost?: number;
  freight?: number;
  isActive: boolean;
  isNew: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor() {
    this.id = randomUUID();
    this.realImages = [];
    this.isActive = true;
    this.isNew = true;
    this.freight = 100;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
