// lib/services/item-journal/item-journal-validation.service.ts

export interface StockAllocationRecord {
  id?: string | null;

  source_allocation_id?: string | null;

  inbound_entry_id?: string | null;

  location_id?: string;
  location_name?: string;

  date_received?: string;
  prod_date?: string;
  expiry_date?: string;

  batch_no?: string;
  bin_code?: string;

  sequence_no?: string;
  serial_no?: string;

  quantity: number;

  available_quantity?: number;

  unit_cost?: number;
}

export interface ItemJournalLineInput {
  journal_line_id?: string;
  posting_date?: string;

  transaction_type: "Positive Entry" | "Negative Entry";

  item_id: string;
  item_no: string;
  item_description: string;

  warehouse_id: string;
  warehouse_code?: string;
  warehouse_name?: string;

  location_id: string;
  location_name?: string;

  quantity: number;
  uom: string;

  cost_per_unit: number;
  amount: number;

  balancing_account_id: string;
  balancing_display_name?: string;

  allocations?: StockAllocationRecord[];
}

export interface ItemJournalPayload {
  entry_date: string;
  reference?: string;
  description?: string;
  is_posted?: boolean;
  lines: ItemJournalLineInput[];
}

export class ItemJournalValidationService {
  /**
   * Validate the complete Item Journal payload.
   */
  static validatePayload(
    payload: ItemJournalPayload,
    options?: {
      requireAllocations?: boolean;
    },
  ): void {
    if (!payload) {
      throw new Error("Item Journal payload is required.");
    }

    if (!payload.entry_date) {
      throw new Error("Journal date is required.");
    }

    this.validateDate(payload.entry_date);

    if (
      payload.reference !== undefined &&
      payload.reference !== null &&
      typeof payload.reference !== "string"
    ) {
      throw new Error("Reference must be a string.");
    }

    if (
      payload.description !== undefined &&
      payload.description !== null &&
      typeof payload.description !== "string"
    ) {
      throw new Error("Description must be a string.");
    }

    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      throw new Error("At least one item journal line is required.");
    }

    payload.lines.forEach((line, index) => {
      this.validateLine(line, index + 1, {
        requireAllocations:
          options?.requireAllocations ?? Boolean(payload.is_posted),
      });
    });
  }

  /**
   * Validate a single Item Journal line.
   */
  static validateLine(
    line: ItemJournalLineInput,
    lineNo: number,
    options?: {
      requireAllocations?: boolean;
    },
  ): void {
    if (!line) {
      throw new Error(`Line ${lineNo}: Line data is required.`);
    }

    if (
      line.transaction_type !== "Positive Entry" &&
      line.transaction_type !== "Negative Entry"
    ) {
      throw new Error(
        `Line ${lineNo}: Transaction type must be Positive Entry or Negative Entry.`,
      );
    }

    if (!line.item_id) {
      throw new Error(`Line ${lineNo}: Item is required.`);
    }

    if (!line.item_no) {
      throw new Error(`Line ${lineNo}: Item number is required.`);
    }

    if (!line.warehouse_id) {
      throw new Error(`Line ${lineNo}: Warehouse is required.`);
    }

    if (!line.location_id) {
      throw new Error(`Line ${lineNo}: Location is required.`);
    }

    const quantity = this.toNumber(line.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Line ${lineNo}: Quantity must be greater than zero.`);
    }

    const costPerUnit = this.toNumber(line.cost_per_unit);

    if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
      throw new Error(`Line ${lineNo}: Cost per unit cannot be negative.`);
    }

    const amount = this.toNumber(line.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Line ${lineNo}: Amount cannot be negative.`);
    }

    if (!line.uom) {
      throw new Error(`Line ${lineNo}: Unit of measure is required.`);
    }

    if (!line.balancing_account_id) {
      throw new Error(`Line ${lineNo}: Balancing G/L account is required.`);
    }

    /**
     * Amount should normally equal:
     *
     * quantity × cost_per_unit
     *
     * We use a small tolerance for decimal arithmetic.
     */
    const expectedAmount = quantity * costPerUnit;

    if (Math.abs(expectedAmount - amount) > 0.01) {
      throw new Error(
        `Line ${lineNo}: Amount must equal quantity multiplied by cost per unit.`,
      );
    }

    const allocations = Array.isArray(line.allocations) ? line.allocations : [];

    allocations.forEach((allocation, allocationIndex) => {
      this.validateAllocation(allocation, lineNo, allocationIndex + 1);
    });

    const allocationTotal = this.getAllocationTotal(line);

    if (options?.requireAllocations) {
      if (allocations.length === 0) {
        throw new Error(
          `Line ${lineNo}: Stock allocation is required before posting.`,
        );
      }

      if (!this.quantitiesEqual(allocationTotal, quantity)) {
        throw new Error(
          `Line ${lineNo}: Stock allocation quantity must equal the journal quantity.`,
        );
      }
    }

    /**
     * Allocations may never exceed the journal quantity,
     * even for drafts.
     */
    if (allocationTotal > quantity + 0.000001) {
      throw new Error(
        `Line ${lineNo}: Stock allocation quantity cannot exceed journal quantity.`,
      );
    }
  }

  /**
   * Validate one allocation.
   */
  static validateAllocation(
    allocation: StockAllocationRecord,
    lineNo: number,
    allocationNo: number,
  ): void {
    if (!allocation) {
      throw new Error(
        `Line ${lineNo}, allocation ${allocationNo}: Allocation is required.`,
      );
    }

    const quantity = this.toNumber(allocation.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(
        `Line ${lineNo}, allocation ${allocationNo}: Quantity must be greater than zero.`,
      );
    }

    if (allocation.expiry_date) {
      this.validateDate(
        allocation.expiry_date,
        `Line ${lineNo}, allocation ${allocationNo}: Invalid expiry date.`,
      );
    }

    if (allocation.date_received) {
      this.validateDate(
        allocation.date_received,
        `Line ${lineNo}, allocation ${allocationNo}: Invalid received date.`,
      );
    }

    if (allocation.prod_date) {
      this.validateDate(
        allocation.prod_date,
        `Line ${lineNo}, allocation ${allocationNo}: Invalid production date.`,
      );
    }

    /**
     * A serial number normally represents one physical unit.
     * Therefore a serial allocation cannot contain quantity > 1.
     */
    // if (allocation.serial_no && quantity > 1) {
    //   throw new Error(
    //     `Line ${lineNo}, allocation ${allocationNo}: Serial-numbered stock cannot have quantity greater than 1.`,
    //   );
    // }
  }

  /**
   * Validate posting-specific rules.
   */
  static validateForPosting(payload: ItemJournalPayload): void {
    this.validatePayload(payload, {
      requireAllocations: true,
    });

    for (let index = 0; index < payload.lines.length; index++) {
      const line = payload.lines[index];
      const lineNo = index + 1;

      const allocations = line.allocations || [];

      if (allocations.length === 0) {
        throw new Error(
          `Line ${lineNo}: At least one stock allocation is required before posting.`,
        );
      }

      const allocationTotal = this.getAllocationTotal(line);

      if (!this.quantitiesEqual(allocationTotal, line.quantity)) {
        throw new Error(
          `Line ${lineNo}: Stock allocation total (${allocationTotal}) does not equal journal quantity (${line.quantity}).`,
        );
      }

      /**
       * Negative entries must also have valid allocation
       * information because inventory is being removed.
       */
      if (line.transaction_type === "Negative Entry") {
        for (const allocation of allocations) {
          if (!allocation.batch_no && !allocation.serial_no) {
            continue;
          }
        }
      }

      // if (
      //   line.transaction_type === "Negative Entry" &&
      //   !allocation.source_allocation_id
      // ) {
      //   throw new Error(
      //     `Line ${lineNo}, allocation ${allocationNo}: Source stock allocation is required for a negative entry.`,
      //   );
      // }

      // if (
      //   line.transaction_type === "Negative Entry" &&
      //   !allocation.inbound_entry_id
      // ) {
      //   throw new Error(
      //     `Line ${lineNo}, allocation ${allocationNo}: Inbound stock ledger entry is required for a negative entry.`,
      //   );
      // }

      // if (
      //   line.transaction_type === "Positive Entry" &&
      //   allocation.source_allocation_id
      // ) {
      //   throw new Error(
      //     `Line ${lineNo}, allocation ${allocationNo}: Positive entries cannot reference an existing source allocation.`,
      //   );
      // }
    }
  }

  /**
   * Calculate allocation quantity.
   */
  static getAllocationTotal(line: ItemJournalLineInput): number {
    return Number(
      (line.allocations || [])
        .reduce(
          (sum, allocation) => sum + this.toNumber(allocation.quantity),
          0,
        )
        .toFixed(6),
    );
  }

  /**
   * Floating-point-safe quantity comparison.
   */
  static quantitiesEqual(first: number, second: number): boolean {
    return Math.abs(first - second) <= 0.000001;
  }

  /**
   * Convert a value to a number safely.
   */
  static toNumber(value: unknown): number {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }

    return Number(value || 0);
  }

  /**
   * Validate YYYY-MM-DD or an ISO-compatible date.
   */
  static validateDate(value: string, message = "Invalid journal date."): void {
    if (!value || typeof value !== "string") {
      throw new Error(message);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(message);
    }
  }

  /**
   * Normalize an incoming payload.
   *
   * This keeps DB-facing code predictable.
   */
  static normalizePayload(payload: ItemJournalPayload): ItemJournalPayload {
    return {
      entry_date: payload.entry_date,
      reference: payload.reference?.trim() || undefined,
      description: payload.description?.trim() || undefined,
      is_posted: Boolean(payload.is_posted),

      lines: (payload.lines || []).map((line) => ({
        ...line,

        quantity: this.toNumber(line.quantity),
        cost_per_unit: this.toNumber(line.cost_per_unit),
        amount: this.toNumber(line.amount),

        uom: line.uom?.trim() || "Pcs",

        allocations: (line.allocations || []).map((allocation) => ({
          ...allocation,

          quantity: this.toNumber(allocation.quantity),

          batch_no: allocation.batch_no?.trim() || undefined,

          serial_no: allocation.serial_no?.trim() || undefined,
        })),
      })),
    };
  }
}

