import SeasonPlanPrintView from '@/components/season-plans/SeasonPlanPrintView';

interface Props { params: { id: string }; }

export default function SeasonPlanViewPage({ params }: Props) {
  return <SeasonPlanPrintView planId={params.id} />;
}
