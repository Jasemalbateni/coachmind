import SessionView from '@/components/views/SessionView';

interface Props { params: { id: string }; }

export default function SessionViewPage({ params }: Props) {
  return <SessionView sessionId={params.id} />;
}
