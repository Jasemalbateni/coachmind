import DrillView from '@/components/views/DrillView';

interface Props { params: { id: string }; }

export default function DrillViewPage({ params }: Props) {
  return <DrillView drillId={params.id} />;
}
