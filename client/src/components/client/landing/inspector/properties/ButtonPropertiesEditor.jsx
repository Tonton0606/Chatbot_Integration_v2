import ServiceCardActionControls from "../../tabs/services/ServiceCardActionControls";

export default function ButtonPropertiesEditor({
  label = "Button",
  cta,
  disabled = false,
  onChange,
}) {
  return (
    <ServiceCardActionControls
      label={label}
      cta={cta}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
