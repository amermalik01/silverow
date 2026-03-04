// app/components/admin/DeleteCompanyButton.tsx

"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DeleteCompanyButton({ id }: { id: string }) {
  const router = useRouter();

  const onDelete = async () => {
    if (!confirm("Delete this company? This will remove all associated data.")) return;
    
    const res = await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={onDelete}>
      Delete
    </Button>
  );
}