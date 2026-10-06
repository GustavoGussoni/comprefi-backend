import { AppService } from "./app.service";
import { PrismaService } from "./database/prisma.service";

describe("AppService", () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports a healthy database when the probe succeeds", async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ "?column?": 1 }]);
    const service = new AppService(prisma);

    const result = await service.getHealth();

    expect(result.status).toBe("healthy");
    expect(result.database).toBe("connected");
    expect(result.services.prisma).toBe("connected");
  });

  it("reports a degraded database when the probe fails", async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error("database unavailable")
    );
    const service = new AppService(prisma);

    const result = await service.getHealth();

    expect(result.status).toBe("degraded");
    expect(result.database).toBe("disconnected");
    expect(result.services.prisma).toBe("disconnected");
  });
});
