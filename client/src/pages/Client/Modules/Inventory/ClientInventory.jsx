import React, { useState } from "react";

import ClientInventoryDashboard from "./UI/ClientInventoryDashboard";
import ClientInventoryCategories from "./UI/ClientInventoryCategories";
import ClientInventoryItems from "./UI/ClientInventoryItems";
import ClientInventoryMovements from "./UI/ClientInventoryMovements";
import ClientInventoryLowStock from "./UI/ClientInventoryLowStock";

import InventoryCategoryModal from "./components/InventoryCategoryModal";
import InventoryItemModal from "./components/InventoryItemModal";
import InventoryMovementModal from "./components/InventoryMovementModal";

import InventoryErrorState from "./components/InventoryErrorState";
import InventoryHeader from "./components/InventoryHeader";
import InventoryLoadingState from "./components/InventoryLoadingState";
import InventoryTabs from "./components/InventoryTabs";
import useInventoryData from "./components/useInventoryData";

import {
  createInventoryCategory,
  updateInventoryCategory,
  archiveInventoryCategory,

  createInventoryItem,
  updateInventoryItem,
  archiveInventoryItem,

  createInventoryMovement,
} from "./services";

export default function ClientInventory() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementItem, setMovementItem] = useState(null);
  const [savingMovement, setSavingMovement] = useState(false);

  const {
    inventoryData,
    loading,
    refreshing,
    error,
    loadInventory,
    refreshInventory,
  } = useInventoryData();

  /*
   * CATEGORY
   */

  const openCreateCategoryModal = () => {
    setSelectedCategory(null);
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category) => {
    setSelectedCategory(category);
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (savingCategory) return;

    setCategoryModalOpen(false);
    setSelectedCategory(null);
  };

  const handleCategorySubmit = async (payload) => {
    try {
      setSavingCategory(true);

      if (selectedCategory?.id) {
        await updateInventoryCategory(selectedCategory.id, payload);
      } else {
        await createInventoryCategory(payload);
      }

      setCategoryModalOpen(false);
      setSelectedCategory(null);

      await refreshInventory();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save category.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleArchiveCategory = async (category) => {
    if (!category?.id) return;

    const confirmed = window.confirm(
      `Archive "${category.name}" category?`
    );

    if (!confirmed) return;

    try {
      await archiveInventoryCategory(category.id);
      await refreshInventory();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to archive category.");
    }
  };

  /*
   * ITEMS
   */

  const openCreateItemModal = () => {
    setSelectedItem(null);
    setItemModalOpen(true);
  };

  const openEditItemModal = (item) => {
    setSelectedItem(item);
    setItemModalOpen(true);
  };

  const closeItemModal = () => {
    if (savingItem) return;

    setItemModalOpen(false);
    setSelectedItem(null);
  };

  const handleItemSubmit = async (payload) => {
    try {
      setSavingItem(true);

      if (selectedItem?.id) {
        await updateInventoryItem(selectedItem.id, payload);
      } else {
        await createInventoryItem(payload);
      }

      setItemModalOpen(false);
      setSelectedItem(null);

      await refreshInventory();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save item.");
    } finally {
      setSavingItem(false);
    }
  };

  const handleArchiveItem = async (item) => {
    if (!item?.id) return;

    const confirmed = window.confirm(
      `Archive "${item.name}" item?`
    );

    if (!confirmed) return;

    try {
      await archiveInventoryItem(item.id);
      await refreshInventory();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to archive item.");
    }
  };

  /*
   * MOVEMENTS
   */

  const openMovementModal = (item = null) => {
    setMovementItem(item);
    setMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    if (savingMovement) return;

    setMovementModalOpen(false);
    setMovementItem(null);
  };

  const handleMovementSubmit = async (payload) => {
    try {
      setSavingMovement(true);

      await createInventoryMovement(payload);

      setMovementModalOpen(false);
      setMovementItem(null);

      await refreshInventory();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to create movement.");
    } finally {
      setSavingMovement(false);
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case "categories":
        return (
          <ClientInventoryCategories
            data={inventoryData}
            onCreateCategory={openCreateCategoryModal}
            onEditCategory={openEditCategoryModal}
            onArchiveCategory={handleArchiveCategory}
          />
        );

      case "items":
        return (
          <ClientInventoryItems
            data={inventoryData}
            onCreateItem={openCreateItemModal}
            onEditItem={openEditItemModal}
            onArchiveItem={handleArchiveItem}
          />
        );

      case "movements":
        return (
          <ClientInventoryMovements
            data={inventoryData}
            onCreateMovement={() => openMovementModal()}
          />
        );

      case "low_stock":
        return (
          <ClientInventoryLowStock
            data={inventoryData}
            onReviewRestock={(item) => openMovementModal(item)}
          />
        );

      default:
        return (
          <ClientInventoryDashboard
            data={inventoryData}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <InventoryHeader
        loading={loading}
        refreshing={refreshing}
        onRefresh={refreshInventory}
      />

      <InventoryTabs
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <InventoryLoadingState />
      ) : error ? (
        <InventoryErrorState
          message={error}
          onRetry={loadInventory}
        />
      ) : (
        renderActivePage()
      )}

      {categoryModalOpen && (
        <InventoryCategoryModal
          category={selectedCategory}
          saving={savingCategory}
          onClose={closeCategoryModal}
          onSubmit={handleCategorySubmit}
        />
      )}

      {itemModalOpen && (
        <InventoryItemModal
          item={selectedItem}
          categories={inventoryData?.categories || []}
          saving={savingItem}
          onClose={closeItemModal}
          onSubmit={handleItemSubmit}
        />
      )}

      {movementModalOpen && (
        <InventoryMovementModal
          item={movementItem}
          items={inventoryData?.items || []}
          saving={savingMovement}
          onClose={closeMovementModal}
          onSubmit={handleMovementSubmit}
        />
      )}
    </div>
  );
}
