import ServicesPresentationControls from "../../tabs/services/ServicesPresentationControls";

export default function SectionPropertiesEditor({
  selectedGroup,
  saving = false,
  onUpdateSection,
  onPreviewPayloadChange,
}) {
  return (
    <ServicesPresentationControls
      selectedGroup={selectedGroup}
      saving={saving}
      onUpdateSection={onUpdateSection}
      onPreviewPayloadChange={onPreviewPayloadChange}
    />
  );
}
