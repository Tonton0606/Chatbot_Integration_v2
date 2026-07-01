import ServiceCardDesignControls from "../../tabs/services/ServiceCardDesignControls";

export default function CardPropertiesEditor({
  payload,
  saving = false,
  onUpdateStyleValue,
  onUpdateTextStyle,
  onResetTextStyle,
}) {
  return (
    <ServiceCardDesignControls
      payload={payload}
      saving={saving}
      onUpdateStyleValue={onUpdateStyleValue}
      onUpdateTextStyle={onUpdateTextStyle}
      onResetTextStyle={onResetTextStyle}
    />
  );
}
