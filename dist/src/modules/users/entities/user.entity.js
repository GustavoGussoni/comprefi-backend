"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const node_crypto_1 = require("node:crypto");
class User {
    constructor() {
        this.id = (0, node_crypto_1.randomUUID)();
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}
exports.User = User;
//# sourceMappingURL=user.entity.js.map