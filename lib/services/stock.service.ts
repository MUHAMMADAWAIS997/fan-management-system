import { stockRepository, CalculatedItem } from "@/lib/repositories/stock.repository";
import { productRepository } from "@/lib/repositories/product.repository";
import { supplierRepository } from "@/lib/repositories/supplier.repository";
import { receiveMultiStockSchema } from "@/lib/validations/stock";
import { StockBatchSummary, ReceiveMultiStockInput, AvailableStockRecord } from "@/lib/types/stock";
import { ActionResult } from "@/lib/types/auth";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export class StockService {
  /**
   * Get all available stock records with RP, Discount %, Unit Cost & Profit Margin
   */
  public async getAvailableStockRecords(): Promise<AvailableStockRecord[]> {
    return stockRepository.getAvailableStockRecords();
  }

  /**
   * Get all received stock batches
   */
  public async getStockBatches(startDate?: string, endDate?: string): Promise<StockBatchSummary[]> {
    const start = startDate !== undefined ? startDate : getDefaultStartDate(60);
    const end = endDate !== undefined ? endDate : getDefaultEndDate();
    return stockRepository.getAllBatches(start || undefined, end || undefined);
  }

  /**
   * Get single batch by ID with line items
   */
  public async getBatchById(id: number): Promise<StockBatchSummary | null> {
    return stockRepository.getBatchById(id);
  }

  /**
   * Calculate unit cost based on retail price and discount percentage
   */
  public calculateUnitCost(unitRetailPrice: number, discountPercent: number): number {
    const cost = unitRetailPrice * (1 - discountPercent / 100);
    return Number(Math.max(0, cost).toFixed(2));
  }

  /**
   * Calculate total cost based on unit cost and quantity
   */
  public calculateTotalCost(unitCost: number, quantity: number): number {
    const total = unitCost * quantity;
    return Number(Math.max(0, total).toFixed(2));
  }

  /**
   * Receive multi-product stock batch with ACID principles
   */
  public async receiveMultiStock(input: unknown): Promise<ActionResult<StockBatchSummary>> {
    const validation = receiveMultiStockSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid stock receipt data.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const data: ReceiveMultiStockInput = validation.data;

    // Verify company/supplier exists
    const company = supplierRepository.getById(data.company_id);
    if (!company) {
      return {
        success: false,
        message: "Selected company/supplier does not exist.",
        errors: { company_id: ["Invalid company selection."] },
      };
    }

    // Verify all products in items list exist and calculate rates
    const calculatedItems: CalculatedItem[] = [];
    let grandTotalCost = 0;

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const product = productRepository.getById(item.product_id);

      if (!product) {
        return {
          success: false,
          message: `Product in row ${i + 1} does not exist.`,
          errors: { items: [`Row ${i + 1}: Invalid product selection.`] },
        };
      }

      const unitCost = this.calculateUnitCost(
        item.unit_retail_price,
        item.unit_discount_percent
      );
      const totalCost = this.calculateTotalCost(unitCost, item.quantity);

      grandTotalCost += totalCost;

      calculatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_retail_price: item.unit_retail_price,
        unit_discount_percent: item.unit_discount_percent,
        unit_cost: unitCost,
        total_cost: totalCost,
      });
    }

    grandTotalCost = Number(grandTotalCost.toFixed(2));

    // Handle payment status auto-adjustments
    if (data.payment_status === "paid") {
      data.paid_amount = grandTotalCost;
    } else if (data.payment_status === "unpaid") {
      data.paid_amount = 0;
    }

    const newBatch = stockRepository.receiveMultiStockTransaction(
      data,
      calculatedItems,
      grandTotalCost
    );

    return {
      success: true,
      message: "Stock batch received successfully.",
      data: newBatch,
    };
  }
}

export const stockService = new StockService();
