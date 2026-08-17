import { customerLedgerRepository } from "@/lib/repositories/customer_ledger.repository";
import { CustomerLedgerEntry, RecordCustomerPaymentInput } from "@/lib/types/customer_ledger";
import { recordCustomerPaymentSchema } from "@/lib/validations/sale";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export class CustomerLedgerService {
  public async getLedgerByCustomerId(customerId: number, startDate?: string, endDate?: string): Promise<CustomerLedgerEntry[]> {
    if (!customerId) return [];
    const start = startDate !== undefined ? startDate : getDefaultStartDate(60);
    const end = endDate !== undefined ? endDate : getDefaultEndDate();
    return customerLedgerRepository.getLedgerByCustomerId(customerId, start || undefined, end || undefined);
  }

  public async recordCustomerPayment(input: RecordCustomerPaymentInput): Promise<CustomerLedgerEntry> {
    const validated = recordCustomerPaymentSchema.parse(input);
    return customerLedgerRepository.recordPayment(validated);
  }
}

export const customerLedgerService = new CustomerLedgerService();
