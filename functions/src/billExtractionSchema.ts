import { Type } from '@google/genai';

export const BILL_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    billDate: { type: Type.STRING, description: 'Invoice issue date in ISO 8601 format YYYY-MM-DD. The date the bill was generated, NOT when it is due.' },
    dueDate: { type: Type.STRING, description: 'Payment due date in ISO 8601 format YYYY-MM-DD. Null if the bill is due on receipt or no date is specified.' },
    periodStart: { type: Type.STRING, description: 'For usage-based bills (utilities, internet, etc.), the first day of the service period covered. ISO 8601. Null for one-time invoices.' },
    periodEnd: { type: Type.STRING, description: 'For usage-based bills, the last day of the service period covered. ISO 8601. Null for one-time invoices.' },
    vendorName: { type: Type.STRING, description: 'The business name issuing this bill, exactly as it appears on the document (including any corporate suffix like Inc, LLC).' },
    vendorAddress: { type: Type.STRING, description: 'The vendor mailing address as it appears on the bill, single line, comma-separated.' },
    accountNumber: { type: Type.STRING, description: 'The customer account number with this vendor — the identifier of the account being billed. NOT the invoice number. Critical for vendor identification.' },
    invoiceNumber: { type: Type.STRING, description: 'The unique invoice or bill identifier assigned by the vendor.' },
    totalAmount: { type: Type.NUMBER, description: 'The total amount due in this billing cycle, including all line items, taxes, and fees, in the bill currency. Decimal number, no currency symbol.' },
    amountDue: { type: Type.NUMBER, description: 'The amount the customer is being asked to pay NOW — may differ from totalAmount if there is a past-due balance or a credit. Defaults to totalAmount if not specified separately on the bill.' },
    currency: { type: Type.STRING, description: 'ISO 4217 currency code, e.g., USD, EUR. Default USD if not specified.' },
    lineItems: {
      type: Type.ARRAY,
      description: 'Itemized charges on the bill. Most bills have one or two; utilities and complex invoices have many. Capture every line. Do NOT include taxes here — those go in the taxes array.',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          quantity: { type: Type.NUMBER, description: 'Optional. For metered or unit-priced lines (kWh, gallons, hours).' },
          unitPrice: { type: Type.NUMBER, description: 'Optional. Per-unit price.' }
        },
        required: ['description', 'amount']
      }
    },
    taxes: {
      type: Type.ARRAY,
      description: 'Tax lines and regulatory fees, separated from the main line items.',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          rate: { type: Type.NUMBER, description: 'Optional, as a decimal (0.0825 for 8.25%).' }
        },
        required: ['description', 'amount']
      }
    },
    paymentInstructions: {
      type: Type.OBJECT,
      description: 'How the vendor wants to be paid, as printed on the bill.',
      properties: {
        method: { type: Type.STRING, enum: ['ach', 'card', 'check', 'wire', 'auto_debit', 'cash', 'other'], description: 'Preferred or only payment method indicated on the bill. Use "other" if multiple methods are offered or method is unclear.' },
        addressOrAccount: { type: Type.STRING, description: 'Remit-to address for checks, or routing/account number for ACH/wire, or merchant ID for card.' },
        dueIfPaidBy: { type: Type.STRING, description: 'Optional. ISO 8601 date. Some bills offer discount or different terms if paid by a specific date.' }
      }
    },
    suggestedCategoryHint: { type: Type.STRING, description: 'A free-text hint about what kind of expense this looks like (e.g., "utilities-electric", "software-subscription", "professional-fees-legal"). NOT a category ID — just a hint the resolution code can use.' },
    fieldConfidences: {
      type: Type.OBJECT,
      description: 'Per-field confidence scores 0-1 for the extraction. Use 0.95+ when reading values literally from clear text on the bill, 0.7-0.9 when inferring from context, below 0.7 when guessing.',
      properties: {
        billDate: { type: Type.NUMBER },
        dueDate: { type: Type.NUMBER },
        periodStart: { type: Type.NUMBER },
        periodEnd: { type: Type.NUMBER },
        vendorName: { type: Type.NUMBER },
        accountNumber: { type: Type.NUMBER },
        invoiceNumber: { type: Type.NUMBER },
        totalAmount: { type: Type.NUMBER },
        amountDue: { type: Type.NUMBER }
      }
    }
  },
  required: ['vendorName', 'totalAmount', 'lineItems', 'fieldConfidences']
};
