// app/[slug]/setup/finance/posting-groups/page.tsx

import PostingGroupsList from "@/app/components/setup/PostingGroupsList";

export default function PostingGroupsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Posting Groups</h1>
      <PostingGroupsList />
    </div>
  );
}