// app/api/purchase-orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";

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

    const data = await PurchaseOrderService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Purchase order not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Purchase order get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase order",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const data = await PurchaseOrderService.update(companyId, id, body);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Purchase order update error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update purchase order",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await PurchaseOrderService.delete(companyId, id);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error("Purchase order delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete purchase order",
      },
      {
        status: 500,
      },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const data = await PurchaseOrderService.get(companyId, id);

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load purchase order",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const { id } = await params;

    await PurchaseOrderService.update(companyId, id, body);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to update purchase order",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await PurchaseOrderService.delete(companyId, id);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete purchase order",
      },
      {
        status: 500,
      },
    );
  }
} */
