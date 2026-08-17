import { saleRepository, CalculatedSaleItem } from "@/lib/repositories/sale.repository";
import { productRepository } from "@/lib/repositories/product.repository";
import { CreateSaleInput, Sale } from "@/lib/types/sale";
import { createSaleSchema } from "@/lib/validations/sale";
import { invoiceSettingsService } from "@/lib/services/invoice_settings.service";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export class SaleService {
  public async getAllSales(startDate?: string, endDate?: string): Promise<Sale[]> {
    const start = startDate !== undefined ? startDate : getDefaultStartDate(60);
    const end = endDate !== undefined ? endDate : getDefaultEndDate();
    return saleRepository.getAllSales(start || undefined, end || undefined);
  }

  public async getSaleById(id: number): Promise<Sale | null> {
    return saleRepository.getSaleById(id);
  }

  public async recordSale(input: CreateSaleInput): Promise<Sale> {
    const validated = createSaleSchema.parse(input);

    const calculatedItems: CalculatedSaleItem[] = [];
    let grandTotal = 0;

    for (const item of validated.items) {
      const prod = productRepository.getById(item.product_id);
      if (!prod) {
        throw new Error(`Selected product (ID: ${item.product_id}) not found.`);
      }

      if (prod.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available stock: ${prod.quantity}, Requested: ${item.quantity}`
        );
      }

      // Unit sale price = Retail Price - (Retail Price * Discount %)
      const discountPct = item.unit_discount_percent ?? (prod.retail_price > 0 ? (prod.discount / prod.retail_price) * 100 : 0);
      const discountPerUnit = (item.unit_retail_price * discountPct) / 100;
      const unitSalePrice = Number((item.unit_retail_price - discountPerUnit).toFixed(2));
      const totalPrice = Number((unitSalePrice * item.quantity).toFixed(2));

      calculatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_retail_price: item.unit_retail_price,
        unit_discount_percent: discountPct,
        unit_cost: prod.cost || 0,
        unit_sale_price: unitSalePrice,
        total_price: totalPrice,
      });

      grandTotal += totalPrice;
    }

    grandTotal = Number(grandTotal.toFixed(2));

    // Validate registered customer requirement for partial/credit payments
    if (!validated.customer_id && validated.payment_status !== "paid") {
      throw new Error("Only registered customers can take credit or partial payment. Please register the customer first.");
    }

    // Validate paid amount against total
    if (validated.payment_status === "paid" && validated.paid_amount < grandTotal) {
      throw new Error(`Paid amount (${validated.paid_amount}) cannot be less than total invoice amount (${grandTotal}) for 'Paid' status.`);
    }

    const invoiceSettings = invoiceSettingsService.getInvoiceSettings();

    return saleRepository.createSaleTransaction(
      {
        customer_id: validated.customer_id,
        customer_name: validated.customer_name,
        customer_phone: validated.customer_phone,
        sale_date: validated.sale_date,
        invoice_number: validated.invoice_number,
        payment_status: validated.payment_status as any,
        paid_amount: validated.paid_amount,
        shop_name: validated.shop_name || invoiceSettings.shopName,
        shop_tagline: validated.shop_tagline || invoiceSettings.tagline,
        shop_phone: validated.shop_phone || invoiceSettings.phoneNumber,
        shop_address: validated.shop_address || invoiceSettings.address,
        items: validated.items,
      },
      calculatedItems,
      grandTotal
    );
  }
}

export const saleService = new SaleService();
