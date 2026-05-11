import DrillEditorPage from '@/components/drill-editor/DrillEditorPage';

interface Props {
  params: { id: string };
}

export default function DrillPage({ params }: Props) {
  return <DrillEditorPage drillId={params.id} />;
}
