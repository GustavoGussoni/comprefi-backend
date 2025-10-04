"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const node_crypto_1 = require("node:crypto");
class Product {
    constructor() {
        this.id = (0, node_crypto_1.randomUUID)();
        this.realImages = [];
        this.isActive = true;
        this.isNew = true;
        this.freight = 100;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}
exports.Product = Product;
//# sourceMappingURL=product.entity.js.map