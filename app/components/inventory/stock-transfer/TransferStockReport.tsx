// app/components/inventory/stock-transfer/TransferStockReport.tsx

import React from "react";
import { AllocationPayload } from './TransferStockForm';

export interface DocumentHeaderDetails {
  transferNo: string;
  transferDate: string;
  warehouseFrom: string;
  warehouseTo: string;
  inTransitCode?: string;
  poNo?: string;
  shippingAgent?: string;
  shippingCharge?: number;
}

interface ReportLineItem {
  local_key: string;
  item_code: string;
  item_description: string;
  uom: string;
  to_location_name?: string;
  allocations: AllocationPayload[];
}

interface ReportProps {
  documentDetails: DocumentHeaderDetails; // Fixed: Explicit contract shape instead of any
  lines: ReportLineItem[];                 // Fixed: Explicit array layout instead of any[]
  onClose: () => void;
}

const TransferStockReport: React.FC<ReportProps> = ({
  documentDetails,
  lines,
  onClose,
}) => {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto my-6 border shadow-sm rounded font-sans text-xs text-gray-800">
      {/* Printable Sheet Window Controller Actions */}
      <div className="no-print flex justify-end space-x-2 mb-6 border-b pb-3">
        <button
          onClick={() => window.print()}
          className="bg-gray-800 text-white px-3 py-1 rounded shadow text-xs"
        >
          🖨️ Print Layout
        </button>
        <button
          onClick={onClose}
          className="border px-3 py-1 rounded text-xs bg-white text-gray-600"
        >
          Cancel
        </button>
      </div>

      {/* Header Corporate Identity Block */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-xl font-bold tracking-widest text-gray-900 capitalize">
            Hygge
          </h2>
          <div className="text-gray-500 mt-2 space-y-0.5 leading-relaxed">
            <p>Hygge Bikes Ltd</p>
            <p>Botanica, Ditton Park</p>
            <p>Riding Court Road</p>
            <p>SL3 9LL</p>
            <p className="pt-1 text-gray-700 font-medium">+44 20 3475 0974</p>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-emerald-700 text-lg font-bold capitalize tracking-wider mb-2">
            Transfer Stock
          </h1>
          <p className="font-semibold text-gray-900">
            Stock No.{" "}
            <span className="font-normal font-mono">
              {documentDetails?.transferNo || "TS0002"}
            </span>
          </p>
          <p className="text-gray-500">
            Transfer Stock Date: {documentDetails?.transferDate || "25/11/2022"}
          </p>
        </div>
      </div>

      {/* Routing Locations Manifest Box */}
      <div className="grid grid-cols-2 gap-8 border-t border-b py-4 bg-gray-50/50 px-2 mb-6">
        <div>
          <h4 className="text-blue-600 font-bold capitalize mb-1.5 text-[11px]">
            Collection From
          </h4>
          <div className="font-medium text-gray-900 mb-1">
            {documentDetails?.warehouseFrom || "Alpha Fulfillment - WRH0002"}
          </div>
          <div className="text-gray-500 space-y-0.5">
            <p>Athertonholme Mill</p>
            <p>Railway Street</p>
            <p>Bacup</p>
            <p>Lancs</p>
          </div>
        </div>
        <div>
          <h4 className="text-blue-600 font-bold capitalize mb-1.5 text-[11px]">
            Deliver To
          </h4>
          <div className="font-medium text-gray-900 mb-1">
            {documentDetails?.warehouseTo ||
              "British Bike Hire (BBH) - WRH0008"}
          </div>
          <div className="text-gray-500 space-y-0.5">
            <p>Unit E, Sockmine Business Park</p>
            <p>Coxmoor Road</p>
            <p>Sutton In Ashfield</p>
            <p>Nottinghamshire</p>
          </div>
        </div>
      </div>

      {/* Structured Serial Ledger Details Grid */}
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-emerald-900 text-white font-semibold capitalize tracking-wider text-[10px]">
            <th className="p-2 w-16">No.</th>
            <th className="p-2">Description</th>
            <th className="p-2 w-24">Ref. No.</th>
            <th className="p-2 w-24">Serial No.</th>
            <th className="p-2 w-28">W/H From - Storage Loc.</th>
            <th className="p-2 w-28">W/H To - Storage Loc.</th>
            <th className="p-2 w-12 text-center">U.O.M</th>
            <th className="p-2 w-12 text-center">Qty.</th>
          </tr>
        </thead>
        <tbody>
          {/* Explicitly mapping allocations sequentially to replicate legacy design structure */}
          {lines?.flatMap((line) =>
            line.allocations?.map((alloc: AllocationPayload, allocIdx: number) => (
              <tr
                key={`${line.local_key}-alloc-${allocIdx}`}
                className="border-b border-gray-200 text-gray-700 font-medium"
              >
                <td className="p-2 font-mono text-gray-500">
                  {line.item_code || "HY0007"}
                </td>
                <td className="p-2 text-gray-900">
                  {line.item_description || "Hygge Vester Pro - Black Grey"}
                </td>
                <td className="p-2 font-mono text-gray-500">
                  {alloc.ref_no || "CAAU6592879"}
                </td>
                <td className="p-2 font-mono font-semibold text-gray-800">
                  {alloc.serial_no || "RD801010"}
                </td>
                <td className="p-2 text-gray-600">
                  {alloc.storage_location || "Bikes"}
                </td>
                <td className="p-2 text-gray-600">
                  {line.to_location_name || "Loc1."}
                </td>
                <td className="p-2 text-center text-gray-500">
                  {line.uom || "Pcs"}
                </td>
                <td className="p-2 text-center font-bold text-gray-900">
                  {alloc.current_allocation || 1}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransferStockReport;
