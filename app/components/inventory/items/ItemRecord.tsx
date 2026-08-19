// app/components/inventory/items/ItemRecord.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useLoader } from "@/app/context/LoaderContext";

import ItemDetailHeader from "./ItemDetailHeader";
import GeneralTab from "./tabs/GeneralTab";
import PurchaseTab from "./tabs/PurchaseTab";
import SalesTab from "./tabs/SalesTab";
import MarginAnalysisTab from "./tabs/MarginAnalysisTab";
import WarehouseTab from "./tabs/WarehouseTab";
import AccountingTab from "./tabs/AccountingTab";
import AttributesTab from "./tabs/AttributesTab";
import ItemActivityTab from "./tabs/ItemActivityTab";

import {
  ItemFormData,
  ItemLookupOption,
  ItemWarehouseDraft,
} from "@/types/inventory";

type Props = {
  id: string;
  slug: string;
  isReadonly?: boolean;
};

const defaultItemForm: ItemFormData = {
  item_code: "",
  barcode: "",
  name: "",
  description: "",
  item_type: 1,
  status: 1,
  category_id: "",
  brand_id: "",
  base_uom_id: "",
  purchase_uom_id: "",
  sales_uom_id: "",
  stock_tracking: true,
  reorder_qty: "",
  standard_sales_price: "",
  standard_cost: "",
  costing_method: 1,

  inventory_posting_group_id: "",
  inventory_gl_id: "",
  cogs_gl_id: "",
  sales_gl_id: "",
  purchase_gl_id: "",
};

export default function ItemRecord({ id, slug, isReadonly = false }: Props) {
  const router = useRouter();
  const { show, hide } = useLoader();

  const [activeTab, setActiveTab] = useState("general");
  const [item, setItem] = useState<ItemFormData>(defaultItemForm);
  const [autoCode, setAutoCode] = useState<boolean>(true);

  // Lookups state
  const [categories, setCategories] = useState<ItemLookupOption[]>([]);
  const [brands, setBrands] = useState<ItemLookupOption[]>([]);
  const [uoms, setUoms] = useState<ItemLookupOption[]>([]);

  const [vatProductGroups, setVatProductGroups] = useState<ItemLookupOption[]>(
    [],
  );

  // Stock summary metrics (Matching Legacy UI Header)
  const [stockMetrics, setStockMetrics] = useState({
    onRouteStock: 0,
    totalStock: 0,
    availableStock: 0,
    allocatedStock: 0,
  });

  // 1. Add state for warehouses
  const [warehouses, setWarehouses] = useState<ItemWarehouseDraft[]>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      show("Loading item details...");

      try {
        // Always fetch lookups
        const [catRes, brandRes, uomRes, vatRes] = await Promise.all([
          fetch("/api/setup/inventory/categories"),
          fetch("/api/setup/inventory/brands"),
          fetch("/api/setup/inventory/uoms"),
          fetch("/api/setup/vat-product-posting-groups"),
        ]);

        if (catRes.ok) setCategories(await catRes.json());
        if (brandRes.ok) setBrands(await brandRes.json());
        if (uomRes.ok) setUoms(await uomRes.json());

        let fetchedVatGroups: ItemLookupOption[] = [];

        if (vatRes.ok) {
          fetchedVatGroups = await vatRes.json();
          setVatProductGroups(fetchedVatGroups);
        }

        const standardVatGroup = fetchedVatGroups.find(
          (g) => g.name.toLowerCase() === "standard",
        );

        // New Item
        if (!id) {
          if (standardVatGroup) {
            setItem((prev) => ({
              ...prev,
              vat_product_group_id: standardVatGroup.id,
            }));
          }

          return;
        }

        const itemRes = await fetch(`/api/inventory/items/${id}`);

        if (!itemRes.ok) return;

        const result = await itemRes.json();

        const itemData = result.item || result;
        const warehouseData = result.warehouses || [];

        setItem({
          item_code: itemData.item_code || "",
          barcode: itemData.barcode || "",
          name: itemData.name || "",
          description: itemData.description || "",
          item_type: itemData.item_type || 1,
          status: itemData.status || 1,
          category_id: itemData.category_id || "",
          brand_id: itemData.brand_id || "",
          base_uom_id: itemData.base_uom_id || "",
          purchase_uom_id: itemData.purchase_uom_id || "",
          sales_uom_id: itemData.sales_uom_id || "",
          stock_tracking: itemData.stock_tracking ?? true,
          reorder_qty: itemData.reorder_qty?.toString() || "",
          standard_sales_price: itemData.standard_sales_price?.toString() || "",
          standard_cost: itemData.standard_cost?.toString() || "",
          costing_method: itemData.costing_method || 1,

          // If no VAT group exists on item, default to "Standard"
          vat_product_group_id:
            itemData.vat_product_group_id || standardVatGroup?.id || "",
          inventory_posting_group_id: itemData.inventory_posting_group_id || "",
          inventory_gl_id: itemData.inventory_gl_id || "",
          cogs_gl_id: itemData.cogs_gl_id || "",
          sales_gl_id: itemData.sales_gl_id || "",
          purchase_gl_id: itemData.purchase_gl_id || "",
        });

        if (itemData.item_code) setAutoCode(false);

        if (itemData.stock_metrics) setStockMetrics(itemData.stock_metrics);

        // Populate warehouses state safely without re-reading stream
        if (Array.isArray(warehouseData)) setWarehouses(warehouseData);
      } catch (err) {
        console.error("Failed to load item record context", err);
      } finally {
        hide();
      }
    };

    loadInitialData();
  }, [id]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!item.name?.trim()) {
      errors["general.name"] = "Item name is required";
    }
    if (!item.base_uom_id) {
      errors["general.base_uom_id"] = "Base Unit of Measure is required";
    }
    if (!autoCode && !item.item_code?.trim()) {
      errors["general.item_code"] =
        "Item code is required when auto-generation is disabled";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (Object.keys(errors).some((k) => k.startsWith("general."))) {
        setActiveTab("general");
      }
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        item: {
          ...item,
          item_code: autoCode ? "" : item.item_code,
          category_id: item.category_id || null,
          brand_id: item.brand_id || null,
          purchase_uom_id: item.purchase_uom_id || null,
          sales_uom_id: item.sales_uom_id || null,
          reorder_qty: item.reorder_qty || null,
          standard_sales_price: item.standard_sales_price || null,
          standard_cost: item.standard_cost || null,

          // GL Accounting & Posting Group mappings
          vat_product_group_id: item.vat_product_group_id || null,
          inventory_posting_group_id: item.inventory_posting_group_id || null,
          inventory_gl_id: item.inventory_gl_id || null,
          cogs_gl_id: item.cogs_gl_id || null,
          sales_gl_id: item.sales_gl_id || null,
          purchase_gl_id: item.purchase_gl_id || null,
        },
        warehouses,
      };

      const res = await fetch(`/api/inventory/items${id ? `/${id}` : ""}`, {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save item details.");
      }

      router.push(`/${slug}/inventory/items`);
    } catch (err) {
      if (err instanceof Error) {
        setFormErrors({ global: err.message });
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: "general", label: "General" },
    { key: "purchase", label: "Purchase Information" },
    { key: "sales", label: "Sales Information" },
    { key: "margin", label: "Item Margin Analysis" },
    { key: "warehouse", label: "Warehouse Location & Cost" },
    { key: "activities", label: "Activities" },
    { key: "accounting", label: "Accounting GL" },
    { key: "attributes", label: "Attributes" },
  ];

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
      {/* 1. Header with stock summary */}
      <ItemDetailHeader item={item} metrics={stockMetrics} />

      {/* Validation alert */}
      {Object.keys(formErrors).length > 0 && (
        <div className="p-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-950/30 dark:text-red-400 dark:border-red-900">
          <p className="font-semibold mb-1">
            Please resolve errors before saving:
          </p>
          <ul className="list-disc pl-5 space-y-0.5">
            {Object.entries(formErrors).map(([key, msg]) => (
              <li key={key}>
                {/* <span className="capitalize font-medium">
                  {key.replace(".", " ")}
                </span>
                : */} {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Horizontal Tab Bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 pb-px flex-wrap">
        {tabs.map((tab) => {
          const hasError = Object.keys(formErrors).some((k) =>
            k.startsWith(`${tab.key}.`),
          );
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {hasError && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Dynamic Tab Content Viewport */}
      <div className="py-2">
        {activeTab === "general" && (
          <GeneralTab
            item={item}
            setItem={setItem}
            categories={categories}
            brands={brands}
            uoms={uoms}
            vatProductGroups={vatProductGroups}
            autoCode={autoCode}
            setAutoCode={setAutoCode}
            errors={formErrors}
            isReadonly={isReadonly}
          />
        )}
        {activeTab === "purchase" && (
          <PurchaseTab
            item={item}
            setItem={setItem}
            uoms={uoms}
            isReadonly={isReadonly}
          />
        )}
        {activeTab === "sales" && (
          <SalesTab
            item={item}
            setItem={setItem}
            uoms={uoms}
            isReadonly={isReadonly}
          />
        )}
        {activeTab === "margin" && (
          <MarginAnalysisTab itemId={id} isReadonly={isReadonly} />
        )}

        {activeTab === "warehouse" && (
          <WarehouseTab
            warehouses={warehouses}
            setWarehouses={setWarehouses}
            errors={formErrors}
            isReadonly={isReadonly}
          />
        )}

        {activeTab === "activities" && <ItemActivityTab itemId={id} />}

        {activeTab === "accounting" && (
          <AccountingTab
            item={item}
            setItem={setItem}
            isReadonly={isReadonly}
          />
        )}
        {activeTab === "attributes" && (
          <AttributesTab itemId={id} isReadonly={isReadonly} />
        )}
      </div>

      {/* 4. Action Footer */}
      {!isReadonly && (
        <div className="flex justify-end items-center gap-2 pt-5 border-t border-slate-100 dark:border-slate-800">
          
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-2 min-w-[140px] justify-center"
          >
            {saving ? (
              <>
                <Icon
                  icon="svg-spinners:180-ring-with-bg"
                  className="w-4 h-4"
                />
                <span>Saving...</span>
              </>
            ) : (
              "Save Item"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="px-5 font-semibold text-zinc-700 bg-white"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
/* 
  useEffect(() => {
    const loadInitialData = async () => {
      show("Loading item details...");
      try {
        const [itemRes, catRes, brandRes, uomRes, vatRes] = await Promise.all([
          fetch(`/api/inventory/items/${id}`),
          fetch("/api/setup/inventory/categories"),
          fetch("/api/setup/inventory/brands"),
          fetch("/api/setup/inventory/uoms"),
          fetch("/api/setup/vat-product-posting-groups"),
        ]);

        if (catRes.ok) setCategories(await catRes.json());
        if (brandRes.ok) setBrands(await brandRes.json());
        if (uomRes.ok) setUoms(await uomRes.json());

        let fetchedVatGroups: ItemLookupOption[] = [];
        if (vatRes && vatRes.ok) {
          fetchedVatGroups = await vatRes.json();
          setVatProductGroups(fetchedVatGroups);
        }

        // Auto-find default "Standard" group ID
        const standardVatGroup = fetchedVatGroups.find(
          (g) => g.name.toLowerCase() === "standard",
        );

        if (itemRes.ok) {
          const result = await itemRes.json();

          const itemData = result.item || result;
          const warehouseData = result.warehouses || [];

          setItem({
            item_code: itemData.item_code || "",
            barcode: itemData.barcode || "",
            name: itemData.name || "",
            description: itemData.description || "",
            item_type: itemData.item_type || 1,
            status: itemData.status || 1,
            category_id: itemData.category_id || "",
            brand_id: itemData.brand_id || "",
            base_uom_id: itemData.base_uom_id || "",
            purchase_uom_id: itemData.purchase_uom_id || "",
            sales_uom_id: itemData.sales_uom_id || "",
            stock_tracking: itemData.stock_tracking ?? true,
            reorder_qty: itemData.reorder_qty?.toString() || "",
            standard_sales_price:
              itemData.standard_sales_price?.toString() || "",
            standard_cost: itemData.standard_cost?.toString() || "",
            costing_method: itemData.costing_method || 1,

            // If no VAT group exists on item, default to "Standard"
            vat_product_group_id:
              itemData.vat_product_group_id || standardVatGroup?.id || "",
            inventory_posting_group_id:
              itemData.inventory_posting_group_id || "",
            inventory_gl_id: itemData.inventory_gl_id || "",
            cogs_gl_id: itemData.cogs_gl_id || "",
            sales_gl_id: itemData.sales_gl_id || "",
            purchase_gl_id: itemData.purchase_gl_id || "",
          });

          if (itemData.item_code) setAutoCode(false);

          if (itemData.stock_metrics) setStockMetrics(itemData.stock_metrics);

          // Populate warehouses state safely without re-reading stream
          if (Array.isArray(warehouseData)) setWarehouses(warehouseData);
        } else {
          // Handle new item setup with default "Standard" VAT Group
          if (standardVatGroup) {
            setItem((prev) => ({
              ...prev,
              vat_product_group_id: standardVatGroup.id,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load item record context", err);
      } finally {
        hide();
      }
    };

    if (id) loadInitialData();
  }, [id]); */
