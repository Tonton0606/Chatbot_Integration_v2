import { useMemo, useState } from "react";
import { MousePointer2 } from "lucide-react";

import LandingInspectorPanel from "../inspector/LandingInspectorPanel";
import SectionPropertiesEditor from "../inspector/properties/SectionPropertiesEditor";
import AddServiceCardForm from "./services/AddServiceCardForm";
import ServiceCardInspector from "./services/ServiceCardInspector";
import ServiceGroupSelector from "./services/ServiceGroupSelector";
import ServiceCardNavigator from "./services/ServiceCardNavigator";

import {
  createBlankServiceCard,
  filterCardsByGroup,
  getServiceGroups,
  slugifyCategory,
} from "./services/servicesTabUtils";
import {
  asObject,
  getApplyPayload,
  getSelectedServicesElement,
  mergeCardDraft,
} from "./services/landingServicesSelectionUtils";

export default function LandingServicesTab({
  activePreviewId,
  onEditorFocus,
  cards = [],
  sections = [],
  saving,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onToggleCard,
  onUpdateSection,
  onUploadAsset,
  onPreviewSectionPayloadChange,
  onPreviewServiceCardChange,
  onClearPreviewServiceCard,
}) {
  const [draft, setDraft] = useState(createBlankServiceCard());
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [previewPayloadBySectionId, setPreviewPayloadBySectionId] = useState({});
  const [previewCardDraftsById, setPreviewCardDraftsById] = useState({});

  const previewCards = useMemo(() => {
    return cards.map((card) =>
      mergeCardDraft(card, previewCardDraftsById[String(card.id)])
    );
  }, [cards, previewCardDraftsById]);

  const serviceGroups = useMemo(
    () => getServiceGroups(sections, previewCards),
    [sections, previewCards]
  );

  const selectedGroupBase = selectedGroupId
    ? serviceGroups.find((group) => String(group.id) === String(selectedGroupId))
    : serviceGroups[0];

  const selectedGroupPreviewPayload =
    selectedGroupBase?.sectionId &&
    previewPayloadBySectionId[String(selectedGroupBase.sectionId)]
      ? previewPayloadBySectionId[String(selectedGroupBase.sectionId)]
      : selectedGroupBase?.payload || {};

  const selectedGroup = selectedGroupBase
    ? {
        ...selectedGroupBase,
        payload: {
          ...(selectedGroupBase.payload || {}),
          ...selectedGroupPreviewPayload,
        },
      }
    : null;

  const serviceGroupsWithPreviewPayload = useMemo(() => {
    return serviceGroups.map((group) => {
      if (!group?.sectionId) return group;

      const override = previewPayloadBySectionId[String(group.sectionId)];

      if (!override) return group;

      return {
        ...group,
        payload: {
          ...(group.payload || {}),
          ...override,
        },
      };
    });
  }, [serviceGroups, previewPayloadBySectionId]);

  const selectedElement = useMemo(
    () =>
      getSelectedServicesElement({
        activePreviewId,
        selectedGroup,
        cards: previewCards,
      }),
    [activePreviewId, selectedGroup, previewCards]
  );

  async function handleAddCard(event) {
    event.preventDefault();

    if (!selectedGroup) return;
    if (!draft.title.trim()) return;

    const automaticCategory = slugifyCategory(selectedGroup.title);

    await onAddCard({
      ...draft,
      section_id: selectedGroup.sectionId,
      booking_category: draft.booking_category?.trim() || automaticCategory,
      payload: {
        ...(draft.payload || {}),
        source: "client_created",
        service_group: selectedGroup.title,
        service_group_id: selectedGroup.sectionId,
      },
    });

    setDraft(createBlankServiceCard());
  }

  function handlePreviewPayloadChange(nextPayload) {
    if (!selectedGroup?.sectionId) return;

    const sectionKey = String(selectedGroup.sectionId);

    setPreviewPayloadBySectionId((current) => ({
      ...current,
      [sectionKey]: nextPayload,
    }));

    onPreviewSectionPayloadChange?.(selectedGroup.sectionId, nextPayload);
  }

  async function handleSaveSection(sectionId, payload) {
    if (!sectionId) return;

    await onUpdateSection?.(sectionId, payload);

    setPreviewPayloadBySectionId((current) => {
      const next = { ...current };
      delete next[String(sectionId)];
      return next;
    });
  }

  function handlePreviewCardChange(cardId, nextDraft) {
    if (!cardId) return;

    setPreviewCardDraftsById((current) => ({
      ...current,
      [String(cardId)]: nextDraft,
    }));

    onPreviewServiceCardChange?.(cardId, nextDraft);
  }

  async function handleSaveCard(card) {
    if (!card?.id) return;

    await onUpdateCard?.(card.id, card);

    setPreviewCardDraftsById((current) => {
      const next = { ...current };
      delete next[String(card.id)];
      return next;
    });

    onClearPreviewServiceCard?.(card.id);
  }

  function handleDiscardCardDraft(cardId) {
    if (!cardId) return;

    setPreviewCardDraftsById((current) => {
      const next = { ...current };
      delete next[String(cardId)];
      return next;
    });

    onClearPreviewServiceCard?.(cardId);
  }

  async function handleApplyStylesToSection(applyPayload) {
    const { styles, media } = getApplyPayload(applyPayload);
    const hasStyles = Object.keys(styles).length > 0;
    const hasMedia = Object.keys(media).length > 0;

    if (!hasStyles && !hasMedia) return;

    const targetSectionId =
      selectedElement?.card?.section_id || selectedGroup?.sectionId || null;

    if (!targetSectionId) return;

    const sectionCards = previewCards.filter(
      (card) => String(card.section_id || "") === String(targetSectionId)
    );

    await Promise.all(
      sectionCards.map((card) => {
        const currentPayload = asObject(card.payload);

        const updatedCard = {
          ...card,
          payload: {
            ...currentPayload,
            styles: hasStyles
              ? {
                  ...asObject(currentPayload.styles),
                  ...styles,
                }
              : currentPayload.styles,
            media: hasMedia
              ? {
                  ...asObject(currentPayload.media),
                  ...media,
                }
              : currentPayload.media,
          },
        };

        handlePreviewCardChange(card.id, updatedCard);

        return onUpdateCard?.(card.id, updatedCard);
      })
    );

    sectionCards.forEach((card) => {
      setPreviewCardDraftsById((current) => {
        const next = { ...current };
        delete next[String(card.id)];
        return next;
      });

      onClearPreviewServiceCard?.(card.id);
    });
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-6 overflow-hidden">
        <ServiceGroupSelector
          cards={previewCards}
          serviceGroups={serviceGroupsWithPreviewPayload}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroupId}
        />

        {serviceGroupsWithPreviewPayload.map((group) => (
          <section
            key={group.id}
            className="min-w-0 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
          >
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3 overflow-hidden">
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Services Navigator
                </p>

                <h3 className="mt-1 truncate font-black text-[var(--text-primary)]">
                  {group?.title || "Selected Services"}
                </h3>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Select a card here or click it in the preview to edit it in the
                  inspector.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onEditorFocus?.(
                    group?.sectionId ? `section-${group.sectionId}` : null
                  )
                }
                className="inline-flex shrink-0 items-center rounded-xl border border-[var(--border-color)] bg-[var(--hover-bg)] px-3 py-2 text-xs font-black text-[var(--text-primary)] hover:border-[var(--brand-gold)]"
              >
                <MousePointer2 className="mr-2 h-4 w-4" />
                Section
              </button>
            </div>

            <ServiceCardNavigator
              cards={filterCardsByGroup(previewCards, group)}
              activePreviewId={activePreviewId}
              saving={saving}
              onSelectCard={(previewId) => onEditorFocus?.(previewId)}
              onToggleCard={(card) =>
                onToggleCard(card.id, card.enabled === false)
              }
              onDeleteCard={(card) => onDeleteCard(card.id)}
            />
          </section>
        ))}

        <AddServiceCardForm
          draft={draft}
          saving={saving}
          selectedGroup={selectedGroup}
          onSubmit={handleAddCard}
          onChange={setDraft}
          onUploadAsset={onUploadAsset}
        />
      </div>

      <div className="min-w-0 overflow-hidden">
        <LandingInspectorPanel
          selectedElement={selectedElement}
          eyebrow="Services Inspector"
          title={selectedElement?.title || "Services Inspector"}
          description={
            selectedElement?.description ||
            "Select a section or service card to edit its content."
          }
          emptyTitle="Click a services element in the preview"
          emptyDescription="Select the services section or a service card in the preview to edit only that selected element."
        >
          {selectedElement?.type === "services-section" && selectedGroup && (
            <SectionPropertiesEditor
              selectedGroup={selectedGroup}
              saving={saving}
              onUpdateSection={handleSaveSection}
              onPreviewPayloadChange={handlePreviewPayloadChange}
            />
          )}

          {selectedElement?.type === "service-card" && selectedElement.card && (
            <ServiceCardInspector
              card={selectedElement.card}
              selectedTarget={selectedElement.target}
              saving={saving}
              hasUnsavedChanges={Boolean(
                previewCardDraftsById[String(selectedElement.card.id)]
              )}
              onUpdate={(payload) =>
                handlePreviewCardChange(selectedElement.card.id, payload)
              }
              onSave={(payload) => handleSaveCard(payload)}
              onDiscard={() => handleDiscardCardDraft(selectedElement.card.id)}
              onDelete={() => onDeleteCard(selectedElement.card.id)}
              onToggle={() =>
                onToggleCard(
                  selectedElement.card.id,
                  selectedElement.card.enabled === false
                )
              }
              onUploadAsset={onUploadAsset}
              onApplyToSection={handleApplyStylesToSection}
            />
          )}
        </LandingInspectorPanel>
      </div>
    </div>
  );
}
