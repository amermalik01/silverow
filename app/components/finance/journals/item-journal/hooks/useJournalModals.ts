// app/components/finance/journals/item-journal/hooks/useJournalModals.ts

"use client";

import { useCallback, useState } from "react";

import type { ItemModalState, GLModalState } from "../types";

export function useJournalModals() {
  const [itemActiveModal, setItemActiveModal] = useState<ItemModalState | null>(
    null,
  );

  const [activeModal, setActiveModal] = useState<GLModalState | null>(null);

  const [warehouseIndex, setWarehouseIndex] = useState<number | null>(null);
  const [locationIndex, setLocationIndex] = useState<number | null>(null);

  const openItemModal = useCallback((index: number) => {
    setItemActiveModal({ index, type: "item", target: "item" });
  }, []);

  const closeItemModal = useCallback(() => setItemActiveModal(null), []);

  const openWarehouseModal = useCallback((index: number) => {
    setWarehouseIndex(index);
  }, []);

  const closeWarehouseModal = useCallback(() => setWarehouseIndex(null), []);

  const openLocationModal = useCallback((index: number) => {
    setLocationIndex(index);
  }, []);

  const closeLocationModal = useCallback(() => setLocationIndex(null), []);

  const openGLModal = useCallback((index: number) => {
    setActiveModal({
      index,
      type: "balancing_account",
      target: "gl",
    });
  }, []);

  const closeGLModal = useCallback(() => setActiveModal(null), []);

  const closeAllModals = useCallback(() => {
    setItemActiveModal(null);
    setActiveModal(null);
    setWarehouseIndex(null);
    setLocationIndex(null);
  }, []);

  return {
    itemActiveModal,
    setItemActiveModal,
    activeModal,
    setActiveModal,
    warehouseIndex,
    setWarehouseIndex,
    locationIndex,
    setLocationIndex,
    openItemModal,
    closeItemModal,
    openWarehouseModal,
    closeWarehouseModal,
    openLocationModal,
    closeLocationModal,
    openGLModal,
    closeGLModal,
    closeAllModals,
  };
}
