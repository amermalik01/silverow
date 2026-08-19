// lib/services/fx/fx-variance.service.ts

import { PoolClient } from "pg";

export interface CalculateFxParams {
  companyId: string;
  allocationType: "AP" | "AR";
  invoiceExchangeRate: number;
  paymentExchangeRate: number;
  allocatedAmountFCY: number;
}

export class FxVarianceService {
  static async calculateVariance(
    client: PoolClient,
    params: CalculateFxParams,
  ) {
    const {
      companyId,
      allocationType,
      invoiceExchangeRate,
      paymentExchangeRate,
      allocatedAmountFCY,
    } = params;

    // 1. Calculate base currency (LCY) delta
    const invoiceLCY = allocatedAmountFCY * invoiceExchangeRate;
    const paymentLCY = allocatedAmountFCY * paymentExchangeRate;
    const rawDelta = Number((paymentLCY - invoiceLCY).toFixed(2));

    if (rawDelta === 0) {
      return { realizedGainLoss: 0, glAccountId: null, isGain: false };
    }

    // 2. Fetch Company FX Movement Accounts Setup
    const setupRes = await client.query(
      `SELECT realised_gain_gl_id, realised_loss_gl_id 
       FROM currency_movement_setup 
       WHERE company_id = $1`,
      [companyId],
    );

    if (!setupRes.rows.length) {
      throw new Error("Currency movement setup missing for this company.");
    }

    const { realised_gain_gl_id, realised_loss_gl_id } = setupRes.rows[0];

    // 3. AP vs AR Gain/Loss rule
    const isGain = allocationType === "AP" ? rawDelta < 0 : rawDelta > 0;
    const glAccountId = isGain ? realised_gain_gl_id : realised_loss_gl_id;

    if (!glAccountId) {
      throw new Error(
        `GL account for foreign exchange ${isGain ? "gain" : "loss"} is not configured.`,
      );
    }

    return {
      realizedGainLoss: Math.abs(rawDelta),
      glAccountId,
      isGain,
    };
  }
}
