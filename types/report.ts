// types/report.ts

export interface DocumentDetailDTO {
  id: number;
  productCode: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountType: 'Value' | 'Percentage' | 'PerItem';
  discount: number;
  discountAmount: number;
  vatRate: string;
  totalAmount: number;
  warehouseId: number;
  warehouseName: string;
  batchNo?: string;
  volume: number;
  volumeUnit: string;
  weight: number;
  weightUnit: string;
}

export interface DocumentHeaderDTO {
  orderNo: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  currency: string;
  netAmount: number;
  taxAmount: number;
  grandTotal: number;
  totalVolume: number;
  totalWeight: number;
  templateType: string;
  printableAddInfo: string;
  details: DocumentDetailDTO[] | DocumentDetailDTO[][]; // Grouped if separated by warehouse
}