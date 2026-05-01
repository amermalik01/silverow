// app/[slug]/inventory/items/new/page.tsx

import ItemForm from "@/app/components/inventory/items/ItemForm";

export default function NewItemPage() {
  return (
    <div className="p-6">
      <ItemForm />
    </div>
  );
}
