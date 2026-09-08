import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DataCrazyCaptureKind,
  DataCrazyCapturePayload,
  DataCrazyDeliveryReceipt,
  DataCrazyTradePayload,
} from './datacrazy.types';

export class DataCrazyDeliveryError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'DataCrazyDeliveryError';
  }
}

@Injectable()
export class DataCrazyService {
  private readonly logger = new Logger(DataCrazyService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendTrade(
    payload: DataCrazyTradePayload,
  ): Promise<DataCrazyDeliveryReceipt> {
    return this.sendWebhook(
      'DATACRAZY_TRADE_WEBHOOK_URL',
      payload,
      `simulação ${payload.questionarioId}`,
    );
  }

  async sendCapture(
    kind: DataCrazyCaptureKind,
    payload: DataCrazyCapturePayload,
  ): Promise<DataCrazyDeliveryReceipt> {
    const webhookKey =
      kind === 'quiz'
        ? 'DATACRAZY_QUIZ_WEBHOOK_URL'
        : 'DATACRAZY_ECONOMY_WEBHOOK_URL';

    return this.sendWebhook(webhookKey, payload, `captura ${kind}`);
  }

  private async sendWebhook(
    webhookKey: string,
    payload: unknown,
    logContext: string,
  ): Promise<DataCrazyDeliveryReceipt> {
    const webhookUrl = this.configService.getOrThrow<string>(webhookKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.text();

      if (!response.ok) {
        throw new DataCrazyDeliveryError(
          `DataCrazy respondeu HTTP ${response.status}${
            response.statusText ? ` ${response.statusText}` : ''
          }`,
          response.status,
        );
      }

      this.logger.log(`${logContext} enviada ao DataCrazy`);
      return this.extractReceipt(body);
    } catch (error: unknown) {
      if (error instanceof DataCrazyDeliveryError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new DataCrazyDeliveryError('DataCrazy excedeu o tempo de resposta');
      }

      throw new DataCrazyDeliveryError('Não foi possível acessar o DataCrazy');
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractReceipt(body: string): DataCrazyDeliveryReceipt {
    if (!body.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      const data = this.asRecord(parsed.data);

      return {
        externalId: this.firstString(
          parsed.id,
          parsed.negotiationId,
          parsed.dealId,
          data?.id,
        ),
        externalUrl: this.firstString(
          parsed.url,
          parsed.negotiationUrl,
          parsed.dealUrl,
          data?.url,
        ),
      };
    } catch {
      return {};
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value !== null && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : undefined;
  }

  private firstString(...values: unknown[]): string | undefined {
    return values.find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );
  }
}
