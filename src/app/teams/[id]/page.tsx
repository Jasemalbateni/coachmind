import TeamPage from '@/components/team/TeamPage';

interface Props { params: { id: string }; }

export default function TeamDetailPage({ params }: Props) {
  return <TeamPage teamId={params.id} />;
}
