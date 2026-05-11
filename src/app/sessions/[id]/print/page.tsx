import SessionPrintView from '@/components/views/SessionPrintView';

interface Props { params: { id: string }; }

export default function SessionPrintPage({ params }: Props) {
  return <SessionPrintView sessionId={params.id} />;
}
