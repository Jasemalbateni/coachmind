import SeasonPlanEditor from '@/components/season-plans/SeasonPlanEditor';

interface Props { params: { id: string }; }

export default function SeasonPlanPage({ params }: Props) {
  return <SeasonPlanEditor planId={params.id} />;
}
