// app/api/purchase-invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoiceService } from "@/lib/services/purchase-invoices/purchase-invoice.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const invoiceData = await PurchaseInvoiceService.get(companyId, id);

    if (!invoiceData) {
      return NextResponse.json(
        { success: false, error: "Purchase invoice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: invoiceData,
    });
  } catch (err) {
    console.error("[GET_PURCHASE_INVOICE_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase invoice details." },
      { status: 500 },
    );
  }
}
/* export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await pool.connect();

    try {
      // Join with parties (p) for Supplier info & fallback posting groups
      const invoiceRes = await client.query(
        `SELECT 
           pi.*,
           po.order_no AS purchase_order_no,
           po.purchaser,
           po.payment_terms,
           po.payment_terms_id,
           po.payment_method_id,
           po.payable_bank,
           po.payable_bank_id,
           po.shipment_method_id,
           po.shipping_agent,
           po.shipment_ref_no,
           po.warehouse_ref_no,
           po.anonymous_supplier,
           COALESCE(po.supplier_posting_group_id, p.purchase_posting_group_id) AS supplier_posting_group_id,
           po.vat_business_posting_group_id,
           p.name AS supplier_name,
           p.supplier_code AS supplier_no
         FROM public.purchase_invoices pi
         LEFT JOIN public.parties p ON p.id = pi.supplier_id AND p.company_id = $2
         LEFT JOIN public.purchase_orders po ON po.id = pi.purchase_order_id AND po.company_id = $2
         WHERE pi.id = $1 AND pi.company_id = $2`,
        [id, companyId]
      );

      if (!invoiceRes.rows.length) {
        return NextResponse.json(
          { success: false, error: "Purchase invoice not found" },
          { status: 404 }
        );
      }

      const invoiceData = invoiceRes.rows[0];

      // 2. Fetch Invoice Lines joined with PO Lines, Items, Warehouses, and UOMs
      const linesRes = await client.query(
        `SELECT 
           pil.id AS purchase_invoice_line_id,
           pil.purchase_invoice_id,
           pil.line_no,
           pil.purchase_order_line_id,
           pil.item_id,
           pil.description,
           pil.quantity,
           pil.unit_cost,
           pil.tax_percent,
           pil.tax_amount,
           pil.net_amount,
           pil.gross_amount,
           COALESCE(pil.warehouse_id, pol.warehouse_id) AS warehouse_id,
           
           -- Joined PO Line details
           pol.line_type,
           pol.gl_account_id,
           pol.account_code,
           pol.warehouse_location_id,
           pol.discount_type,
           pol.discount_value,
           pol.discount_amount,
           pol.original_amount,
           pol.vat_business_posting_group_id,
           pol.vat_product_posting_group_id,
           pol.vat_percent,
           
           -- Joined metadata names
           COALESCE(pol.item_code, i.item_code) AS item_code,
           COALESCE(pol.item_name, i.name) AS item_name,
           COALESCE(pol.uom_id, i.base_uom_id) AS uom_id,
           COALESCE(pol.uom_name, u.name) AS uom_name,
           COALESCE(pol.warehouse_name, w.name) AS warehouse_name
         FROM public.purchase_invoice_lines pil
         LEFT JOIN public.purchase_order_lines pol ON pol.id = pil.purchase_order_line_id AND pol.company_id = $2
         LEFT JOIN public.items i ON i.id = pil.item_id AND i.company_id = $2
         LEFT JOIN public.warehouses w ON w.id = COALESCE(pil.warehouse_id, pol.warehouse_id) AND w.company_id = $2
         LEFT JOIN public.uoms u ON u.id = pol.uom_id AND u.company_id = $2
         WHERE pil.purchase_invoice_id = $1 AND pil.company_id = $2
         ORDER BY pil.line_no ASC`,
        [id, companyId]
      );

      // 3. Fetch linked PO Addresses (primary, billing, shipping)
      const addresses = {
        primary: null,
        billing: null,
        shipping: null,
      };

      if (invoiceData.purchase_order_id) {
        const addressRes = await client.query(
          `SELECT * 
           FROM public.purchase_order_addresses 
           WHERE purchase_order_id = $1 AND company_id = $2`,
          [invoiceData.purchase_order_id, companyId]
        );

        addressRes.rows.forEach((addr) => {
          if (addr.address_type === "primary") addresses.primary = addr;
          if (addr.address_type === "billing") addresses.billing = addr;
          if (addr.address_type === "shipping") addresses.shipping = addr;
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          invoice: invoiceData,
          lines: linesRes.rows,
          primary_address: addresses.primary,
          billing_address: addresses.billing,
          shipping_address: addresses.shipping,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_PURCHASE_INVOICE_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase invoice details." },
      { status: 500 }
    );
  }
} */
