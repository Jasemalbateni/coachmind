import SessionBuilderPage from '@/components/session-builder/SessionBuilderPage';

interface Props {
  params: { id: string };
}

export default function SessionPage({ params }: Props) {
  return <SessionBuilderPage sessionId={params.id} />;
}
