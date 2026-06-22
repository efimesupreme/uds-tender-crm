import { requests } from "@/lib/mock-data";
import RequestDetailsClient from "./RequestDetailsClient";

export function generateStaticParams() {
  return requests.map((request) => ({ id: request.id }));
}

export default async function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetailsClient id={id} />;
}
