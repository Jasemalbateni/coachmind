import dynamic from 'next/dynamic';

const EditorShell = dynamic(
  () => import('../../../../v2/components/editor/EditorShell').then(m => m.EditorShell),
  { ssr: false, loading: () => (
    <div className="h-screen-dvh w-screen bg-[#0a0f1c] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded bg-[#63C0B0] animate-pulse" />
        <p className="text-[#6B7280] text-sm">Loading editor...</p>
      </div>
    </div>
  )}
);

interface Props {
  params: { drillId: string };
}

export default function EditorPage({ params }: Props) {
  return <EditorShell drillId={params.drillId} />;
}
