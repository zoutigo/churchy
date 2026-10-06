'use client';
import { ParishMembers } from '@/components/parish/ParishMembers';

export default function Page({ params }: { params: { parishId: string } }) {
  return <ParishMembers parishId={params.parishId} />;
}
